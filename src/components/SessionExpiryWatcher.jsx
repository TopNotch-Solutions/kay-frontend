import { useEffect } from 'react';
import {
  ensureAccessTokenFresh,
  getAccessToken,
  getTokenRefreshDelayMs,
  handleSessionExpired,
  shouldRefreshAccessToken,
} from '../api/authSession';

/**
 * While signed in, call /api/v1/auth/refresh before the access token expires.
 */
export default function SessionExpiryWatcher() {
  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function refreshSoon() {
      const stillValid = await ensureAccessTokenFresh();
      if (cancelled) return;
      if (!stillValid) {
        handleSessionExpired();
        return;
      }
      schedule();
    }

    function schedule() {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      const token = getAccessToken();
      if (!token) return;

      if (shouldRefreshAccessToken(token)) {
        refreshSoon();
        return;
      }

      const delayMs = getTokenRefreshDelayMs(token);
      if (delayMs == null) return;

      timerId = setTimeout(refreshSoon, delayMs + 250);
    }

    schedule();

    function onVisibility() {
      if (document.visibilityState === 'visible') {
        schedule();
      }
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
