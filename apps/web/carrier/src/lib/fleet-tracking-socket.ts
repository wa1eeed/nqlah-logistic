/**
 * Carrier-side live tracking channel.
 *
 * Opens a socket.io connection to the API, subscribes to an order's room, and
 * forwards the GPS fixes the server pushes over `tracking:location_update`.
 *
 * The realtime gateway broadcasts two shapes on that event:
 *   • a REAL driver fix — `{ lat, lng, speedKmh, at, live: true }` (from the
 *     driver app's `driver:location` beacon), and
 *   • a simulated fix — `{ progress, speedKmh, at }` (0..1 along the route),
 *     used while no real GPS has arrived yet.
 *
 * We forward the raw payload; the map decides whether to drop the truck at the
 * exact coordinates (real fix) or interpolate along the drawn route (progress).
 */
import { io, type Socket } from 'socket.io-client';

export interface FleetTrackingPing {
  orderId?: string;
  /** Real GPS latitude (present on a real driver fix). */
  lat?: number;
  /** Real GPS longitude (present on a real driver fix). */
  lng?: number;
  /** 0..1 along the route (present on a simulated fix). */
  progress?: number;
  /** Instantaneous speed in km/h, when reported. */
  speedKmh?: number | null;
  /** Epoch ms of the fix. */
  at?: number;
  /** True once a real driver GPS fix is driving the stream. */
  live?: boolean;
}

export interface FleetTrackingSocket {
  close: () => void;
}

export interface FleetTrackingSocketOpts {
  orderId: string;
  token?: string;
  /** 0..1 — where the trip is believed to be, so the sim seeds sensibly. */
  startProgress?: number;
  onPing: (ping: FleetTrackingPing) => void;
  /** Socket.io endpoint (defaults to the API origin). */
  url?: string;
}

/**
 * Open the live tracking channel for one order. Without a token there is no way
 * to authenticate the socket, so it is a no-op (the map keeps the last known
 * position from the order's assigned driver).
 */
export function openFleetTrackingSocket(opts: FleetTrackingSocketOpts): FleetTrackingSocket {
  const { orderId, token } = opts;
  if (!orderId || !token) return { close: () => { /* nothing to close */ } };

  const url = opts.url
    ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined)
    ?? 'http://localhost:4000';

  let closed = false;
  let socket: Socket;
  try {
    socket = io(url, { auth: { token }, transports: ['websocket'], timeout: 4000, reconnectionAttempts: 3 });
  } catch {
    return { close: () => { /* failed to connect */ } };
  }

  socket.on('connect', () => {
    socket.emit('order:subscribe', { orderId, startProgress: opts.startProgress ?? 0.1 });
  });
  socket.on('tracking:location_update', (p: FleetTrackingPing) => {
    if (closed || !p) return;
    const hasCoords = typeof p.lat === 'number' && typeof p.lng === 'number';
    const hasProgress = typeof p.progress === 'number';
    if (hasCoords || hasProgress) opts.onPing(p);
  });

  return {
    close: () => {
      closed = true;
      try { socket.emit('order:unsubscribe', { orderId }); } catch { /* ignore */ }
      socket.disconnect();
    },
  };
}
