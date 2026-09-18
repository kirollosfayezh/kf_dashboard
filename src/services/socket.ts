import { io, type Socket } from "socket.io-client";
import { SERVER_ORIGIN } from "./http";
import { getToken } from "./session";

/**
 * Socket.io is a push channel only — every write still goes through REST and the
 * server emits the result back (see kf_backend/src/realtime/io.ts). The handshake
 * carries the admin JWT, which joins this connection to the `admins` room; an
 * invalid token gets disconnected by the server.
 */

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getToken();
  if (!token) return null;

  if (socket && socket.auth && (socket.auth as { token?: string }).token !== token) {
    // Token changed (re-login) — rebuild the connection with the new one.
    disconnectSocket();
  }

  if (!socket) {
    socket = io(SERVER_ORIGIN || "/", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}
