import { io, type Socket } from 'socket.io-client';
import { clientEnv } from './env';
import { authStorage } from './authStorage';

/**
 * Socket.IO client wrapper (TECH_STACK.md §6, SOCKET_EVENTS.md §1, §14).
 * Authenticates the handshake with the JWT access token. A lazy singleton so
 * the whole app shares one connection (per-user room + matching/chat events).
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(clientEnv.apiBaseUrl, {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket'],
      auth: (cb) => cb({ token: authStorage.getAccessToken() ?? '' }),
    });
  }
  return socket;
}

/** Connects with a fresh token (call after authentication). */
export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.auth = { token: authStorage.getAccessToken() ?? '' };
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
