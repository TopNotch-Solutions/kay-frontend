import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  getAccessToken,
  getStoredUser,
  clearSession,
  ensureAccessTokenFresh,
  handleSessionExpired,
  shouldRefreshAccessToken,
} from '../api/authSession';
import { authRoleSlug, homePathForRole, isRoleAllowedForPath } from '../utils/homePathForRole';
import SessionExpiryWatcher from './SessionExpiryWatcher';

/**
 * Requires a valid session. Optional `role` restricts the route to that role only.
 * Wrong role or missing token → login page (session cleared on role mismatch).
 */
export default function RequireAuth({ children, role, roles }) {
  const location = useLocation();
  const token = getAccessToken();
  const [sessionReady, setSessionReady] = useState(() => {
    const t = getAccessToken();
    return Boolean(t && !shouldRefreshAccessToken(t));
  });

  useEffect(() => {
    if (!token) {
      setSessionReady(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      if (!shouldRefreshAccessToken(token)) {
        if (!cancelled) setSessionReady(true);
        return;
      }
      const ok = await ensureAccessTokenFresh();
      if (cancelled) return;
      if (!ok) handleSessionExpired();
      else setSessionReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!sessionReady) {
    return null;
  }

  const user = getStoredUser();
  if (user?.must_change_password) {
    return <Navigate to="/login" replace state={{ from: location.pathname, forcePassword: true }} />;
  }
  const userRole = authRoleSlug(user).toLowerCase();

  const allowedRoles = roles?.length
    ? roles.map((r) => String(r).toLowerCase())
    : role
      ? [String(role).toLowerCase()]
      : null;

  if (allowedRoles) {
    if (!userRole || !allowedRoles.includes(userRole)) {
      const home = homePathForRole(userRole);
      if (userRole && home && home !== location.pathname) {
        return <Navigate to={home} replace />;
      }
      clearSession();
      return (
        <Navigate
          to="/login?forbidden=1"
          replace
          state={{ attemptedRole: userRole, attemptedPath: location.pathname }}
        />
      );
    }
  } else if (!isRoleAllowedForPath(location.pathname, user)) {
    const home = homePathForRole(userRole);
    if (userRole && home && home !== location.pathname) {
      return <Navigate to={home} replace />;
    }
    clearSession();
    return (
      <Navigate
        to="/login?forbidden=1"
        replace
        state={{ attemptedRole: userRole, attemptedPath: location.pathname }}
      />
    );
  }

  return (
    <>
      <SessionExpiryWatcher />
      {children}
    </>
  );
}
