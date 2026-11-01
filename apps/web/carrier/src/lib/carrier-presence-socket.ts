/**
 * Carrier presence channel. One socket.io connection (authenticated with the
 * carrier token) that listens for `driver:presence` events the server fans out
 * to the carrier's `company:` room, so the tracking board shows each driver's
 * online/offline state live. Separate from the per-order tracking socket.
 */
import { io, type Socket } from 'socket.io-client';

export interface CarrierPresence {
  driverId: string;
  online: boolean;
  at?: number;
}

export interface CarrierPresenceSocket {
  close: () => void;
}

export function openCarrierPresenceSocket(opts: {
  token?: string;
  onPresence: (p: CarrierPresence) => void;
  url?: string;
}): CarrierPresenceSocket {
  if (!opts.token) return { close: () => {} };
  const url = opts.url
    ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined)
    ?? 'http://localhost:4000';

  let socket: Socket;
  try {
    socket = io(url, { auth: { token: opts.token }, transports: ['websocket'], reconnectionDelayMax: 8000 });
  } catch {
    return { close: () => {} };
  }
  socket.on('driver:presence', (p: CarrierPresence) => {
    if (p && p.driverId) opts.onPresence({ driverId: p.driverId, online: !!p.online, at: p.at });
  });
  return { close: () => socket.disconnect() };
}
