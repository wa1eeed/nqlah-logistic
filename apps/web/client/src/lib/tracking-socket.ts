/**
 * Realtime tracking channel.
 *
 * When an `orderId` + auth `token` are given, this opens a REAL WebSocket
 * (socket.io) to the API, subscribes to the order, and forwards the discrete
 * GPS pings the server pushes over `tracking:location_update`. If the socket
 * can't connect (offline / design runs), it transparently falls back to a local
 * simulation so the page still shows movement. Without an order/token it uses
 * the simulation directly.
 *
 * The consumer interface is unchanged: subscribe once, receive `TrackingPing`s.
 */
import { io, type Socket } from 'socket.io-client';

export interface TrackingLegPing {
  index: number;
  progress: number;
}

export interface TrackingPing {
  /** 0..1 along the trip (single-shipment orders). */
  progress?: number;
  /** Per-leg positions (consolidated orders). */
  legs?: TrackingLegPing[];
  /** Instantaneous speed in km/h reported with this fix. */
  speedKmh: number;
  /** Epoch ms of the fix. */
  at: number;
}

export interface TrackingSocket {
  close: () => void;
}

export interface TrackingSocketOpts {
  startProgress: number;
  /** Cruising speed reported with each fix (km/h). */
  speedKmh?: number;
  /** How often a GPS fix arrives (ms). */
  pingMs?: number;
  /** Compressed playback: cover the remaining trip over this long (demo). */
  completeInMs?: number;
  onPing: (ping: TrackingPing) => void;
  /** Real-time mode: the API order to subscribe to + the auth token. */
  orderId?: string;
  token?: string;
  /** Socket.io endpoint (defaults to the API origin). */
  url?: string;
}

/** Local simulation — the fallback when there is no live socket. */
function openMockSocket(opts: TrackingSocketOpts): TrackingSocket {
  const { startProgress, speedKmh = 82, pingMs = 4000, completeInMs = 240_000, onPing } = opts;
  let progress = Math.max(0, Math.min(1, startProgress));
  const steps = Math.max(1, completeInMs / pingMs);
  const perPing = (0.995 - progress) / steps;

  const emit = () => onPing({
    progress,
    speedKmh: Math.max(0, Math.round(speedKmh + (Math.random() - 0.5) * 18)),
    at: Date.now(),
  });

  const connectTimer = setTimeout(emit, 150);
  const interval = setInterval(() => {
    progress = Math.min(0.995, progress + perPing);
    emit();
    if (progress >= 0.995) clearInterval(interval);
  }, pingMs);

  return { close: () => { clearTimeout(connectTimer); clearInterval(interval); } };
}

/**
 * Open the tracking channel. Prefers a real socket when `orderId` + `token` are
 * present; otherwise (or on connection failure) uses the local simulation.
 */
export function openTrackingSocket(opts: TrackingSocketOpts): TrackingSocket {
  const { orderId, token } = opts;
  if (!orderId || !token) return openMockSocket(opts);

  const url = opts.url
    ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined)
    ?? 'http://localhost:4000';

  let closed = false;
  let mock: TrackingSocket | null = null;
  const startMock = () => { if (!mock && !closed) mock = openMockSocket(opts); };

  let socket: Socket;
  try {
    socket = io(url, { auth: { token }, transports: ['websocket'], timeout: 4000, reconnectionAttempts: 3 });
  } catch {
    return openMockSocket(opts);
  }

  socket.on('connect', () => {
    socket.emit('order:subscribe', { orderId, startProgress: opts.startProgress });
  });
  socket.on('tracking:location_update', (p: TrackingPing) => {
    // A real fix arrived — stop the fallback simulation if it had started.
    if (mock) { mock.close(); mock = null; }
    const valid = p && (typeof p.progress === 'number' || Array.isArray(p.legs));
    if (!closed && valid) opts.onPing(p);
  });
  socket.on('connect_error', startMock);

  // If no real fix arrives shortly after connecting, fall back.
  const fallbackTimer = setTimeout(startMock, 6000);

  return {
    close: () => {
      closed = true;
      clearTimeout(fallbackTimer);
      try { socket.emit('order:unsubscribe', { orderId }); } catch { /* ignore */ }
      socket.disconnect();
      mock?.close();
    },
  };
}
