import { getApiBase } from './apiBase';

/** Treat access token as expired slightly before `exp` (clock skew). */
const TOKEN_EXPIRY_SKEW_MS = 5000;

/** Refresh proactively this many ms before JWT `exp`. */
const TOKEN_REFRESH_LEAD_MS = 60_000;

let sessionRedirectPending = false;
let refreshInFlight = null;

export function getAccessToken() {
  return localStorage.getItem('accessToken');
}

export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(normalized);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token = getAccessToken(), skewMs = TOKEN_EXPIRY_SKEW_MS) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000 - skewMs;
}

export function accessTokenExpiresInMs(token = getAccessToken()) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return null;
  return payload.exp * 1000 - Date.now();
}

/** True when access token is missing or should be refreshed soon. */
export function shouldRefreshAccessToken(token = getAccessToken()) {
  if (!token) return true;
  const ms = accessTokenExpiresInMs(token);
  if (ms == null) return false;
  return ms <= TOKEN_REFRESH_LEAD_MS;
}

export function getTokenRefreshDelayMs(token = getAccessToken()) {
  const ms = accessTokenExpiresInMs(token);
  if (ms == null) return null;
  return Math.max(ms - TOKEN_REFRESH_LEAD_MS, 0);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

/**
 * Send the user to the login page (full navigation so all modules reset).
 */
export function redirectToLogin() {
  const path = window.location.pathname;
  if (path === '/login' || path === '/') return;
  if (sessionRedirectPending) return;
  sessionRedirectPending = true;

  const from = encodeURIComponent(path + window.location.search);
  window.location.replace(`/login?expired=1&from=${from}`);
}

/** Clear stored credentials and redirect to login. */
export function handleSessionExpired() {
  clearSession();
  redirectToLogin();
}

async function performRefreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;

  const res = await fetch(`${getApiBase()}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.success || !json.data?.accessToken) {
    return null;
  }

  localStorage.setItem('accessToken', json.data.accessToken);
  if (json.data.refreshToken) {
    localStorage.setItem('refreshToken', json.data.refreshToken);
  }
  return json.data.accessToken;
}

/**
 * POST /api/v1/auth/refresh — single-flight so parallel callers share one request.
 */
export async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = performRefreshAccessToken().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

/**
 * Refresh when the access token is missing or near expiry; otherwise no-op.
 * @returns {Promise<boolean>} true when a usable access token is available
 */
export async function ensureAccessTokenFresh() {
  const token = getAccessToken();
  if (token && !shouldRefreshAccessToken(token)) return true;
  const refreshed = await refreshAccessToken();
  return Boolean(refreshed);
}
