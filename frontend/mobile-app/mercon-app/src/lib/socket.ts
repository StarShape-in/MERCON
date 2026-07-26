/**
 * Shared socket.io connection to the MERCON server.
 * The socket server lives at the API origin (not under /api), same as the web
 * dashboard connects. Backend contract (see api-server/src/index.ts):
 *   emit  'driver:location_update'  { tripId, driverId, lat, lng, speed }
 *   → server broadcasts 'trip:location_update:<tripId>' to dashboards.
 */
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';

const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket'] });
  }
  return socket;
}
