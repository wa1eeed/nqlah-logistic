/**
 * Admin live-tracking channel. One socket.io connection that:
 *   • receives every driver's GPS fix across all providers via the server's
 *     `admin` room (`tracking:driver_location`), to move dots on the map live;
 *   • can subscribe to a selected order's room for its route stream
 *     (`tracking:location_update`), same as the carrier board.
 *
 * Auth uses the admin token; without it the socket is a no-op (the map falls
 * back to the last positions from `GET /admin/drivers/locations`).
 */
import { io, type Socket } from 'socket.io-client';

export interface AdminDriverMove {
  driverId: string;
  companyId?: string | null;
  orderId?: string;
  lat: number;
  lng: number;
  speedKmh?: number | null;
  at?: number;
}

export interface AdminOrderPing {
  orderId?: string;
  lat?: number;
  lng?: number;
  progress?: number;
  speedKmh?: number | null;
  at?: number;
  live?: boolean;
}

export interface AdminPresence {
  driverId: string;
  online: boolean;
  at?: number;
}

export interface AdminTrackingSocket {
  subscribeOrder: (orderId: string, startProgress?: number) => void;
  unsubscribeOrder: (orderId: string) => void;
  close: () => void;
}

export interface AdminTrackingOpts {
  token?: string;
  onDriverMove?: (m: AdminDriverMove) => void;
  onOrderPing?: (p: AdminOrderPing) => void;
  onPresence?: (p: AdminPresence) => void;
  url?: string;
}

export function openAdminTrackingSocket(opts: AdminTrackingOpts): AdminTrackingSocket {
  const noop: AdminTrackingSocket = {
    subscribeOrder: () => {},
    unsubscribeOrder: () => {},
    close: () => {},
  };
  if (!opts.token) return noop;

  const url = opts.url
    ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined)
    ?? 'http://localhost:4000';

  let socket: Socket;
  try {
    socket = io(url, { auth: { token: opts.token }, transports: ['websocket'], reconnectionAttempts: 5 });
  } catch {
    return noop;
  }

  let currentOrder: string | null = null;
  const resubscribe = () => {
    if (currentOrder) socket.emit('order:subscribe', { orderId: currentOrder, startProgress: 0.1 });
  };

  socket.on('connect', resubscribe);
  socket.on('tracking:driver_location', (m: AdminDriverMove) => {
    if (m && typeof m.lat === 'number' && typeof m.lng === 'number') opts.onDriverMove?.(m);
  });
  socket.on('tracking:location_update', (p: AdminOrderPing) => {
    if (!p) return;
    const hasCoords = typeof p.lat === 'number' && typeof p.lng === 'number';
    const hasProgress = typeof p.progress === 'number';
    if (hasCoords || hasProgress) opts.onOrderPing?.(p);
  });
  socket.on('driver:presence', (p: AdminPresence) => {
    if (p && p.driverId) opts.onPresence?.({ driverId: p.driverId, online: !!p.online, at: p.at });
  });

  return {
    subscribeOrder: (orderId, startProgress = 0.1) => {
      if (currentOrder && currentOrder !== orderId) {
        try { socket.emit('order:unsubscribe', { orderId: currentOrder }); } catch { /* ignore */ }
      }
      currentOrder = orderId;
      try { socket.emit('order:subscribe', { orderId, startProgress }); } catch { /* ignore */ }
    },
    unsubscribeOrder: (orderId) => {
      if (currentOrder === orderId) currentOrder = null;
      try { socket.emit('order:unsubscribe', { orderId }); } catch { /* ignore */ }
    },
    close: () => {
      try { if (currentOrder) socket.emit('order:unsubscribe', { orderId: currentOrder }); } catch { /* ignore */ }
      socket.disconnect();
    },
  };
}
