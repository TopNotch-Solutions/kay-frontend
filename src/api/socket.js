import { io } from 'socket.io-client';
import {
  getAccessToken,
  handleSessionExpired,
  ensureAccessTokenFresh,
  refreshAccessToken,
} from './authSession';
import { getApiBase } from './apiBase';

let socket = null;

function isAuthTokenError(message = '') {
  const msg = String(message).toLowerCase();
  return (
    msg === 'invalid token'
    || msg === 'authentication required'
    || msg.includes('jwt expired')
    || msg.includes('token')
  );
}

/**
 * Shared Socket.io client (JWT in handshake.auth.token).
 */
export async function getSocketAsync() {
  const ready = await ensureAccessTokenFresh();
  if (!ready) {
    handleSessionExpired();
    return null;
  }

  const token = getAccessToken();
  if (!token) return null;

  if (!socket || socket.disconnected) {
    socket = io(getApiBase(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socket.on('connect_error', async (err) => {
      const msg = err?.message || '';
      if (!isAuthTokenError(msg)) return;

      const refreshed = await refreshAccessToken();
      if (refreshed) {
        socket.auth = { token: refreshed };
        socket.connect();
        return;
      }

      disconnectSocket();
      handleSessionExpired();
    });
  } else if (socket.auth?.token !== token) {
    socket.auth = { token };
    socket.disconnect().connect();
  }

  return socket;
}

/** @deprecated Prefer getSocketAsync — sync path may skip refresh. */
export function getSocket() {
  const token = getAccessToken();
  if (!token) return null;

  ensureAccessTokenFresh().then((ready) => {
    if (!ready) {
      handleSessionExpired();
      return;
    }
    getSocketAsync();
  });

  return socket?.connected ? socket : null;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function requestDepartmentQueueRefresh(department) {
  getSocketAsync().then((s) => {
    if (s?.connected) {
      s.emit('queue:request_refresh', department);
    }
  });
}

export function requestNurseQueueRefresh() {
  requestDepartmentQueueRefresh('nurse');
}

export function requestDoctorQueueRefresh() {
  requestDepartmentQueueRefresh('doctor');
}
