'use client';

import { useEffect, useRef } from 'react';
import { useSWRConfig } from 'swr';
import { io, type Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Keeps the dashboard live: opens one socket.io connection (authenticated with
 * the stored token) and, whenever the server pushes a change signal, revalidates
 * SWR so any action — a plan change, a status update, a new order, an edit —
 * appears without a page refresh. Mounted inside the SWR provider.
 *
 * The server broadcasts `data:changed` after every mutation (scoped to the
 * actor's company + user; admins get all tenants). We also listen for the
 * targeted order/notification events. Revalidation is throttled so a burst of
 * changes collapses into one refresh.
 */
export function RealtimeInvalidator({ tokenKey }: { tokenKey: string }) {
  const { mutate } = useSWRConfig();
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    const revalidate = () => {
      if (timerRef.current) return; // trailing throttle (~1.2s)
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        mutate(() => true, undefined, { revalidate: true });
      }, 1200);
    };

    const connect = () => {
      if (disposed || socketRef.current) return;
      let token: string | null = null;
      try { token = localStorage.getItem(tokenKey); } catch { /* storage blocked */ }
      if (!token) return;
      let s: Socket;
      try {
        s = io(API_URL, {
          auth: { token },
          transports: ['websocket'],
          reconnectionDelayMax: 8000,
        });
      } catch { return; }
      socketRef.current = s;
      for (const ev of ['data:changed', 'order:status_changed', 'order:new_bid', 'notification:new']) {
        s.on(ev, revalidate);
      }
    };

    connect();
    const onWake = () => connect();
    window.addEventListener('focus', onWake);
    window.addEventListener('storage', onWake);

    return () => {
      disposed = true;
      window.removeEventListener('focus', onWake);
      window.removeEventListener('storage', onWake);
      if (timerRef.current) clearTimeout(timerRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [tokenKey, mutate]);

  return null;
}
