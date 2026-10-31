'use client';
import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Thin status bar pinned to the top of the viewport. Shows red ("offline")
 * when `navigator.onLine` is false, and briefly flashes green ("reconnected")
 * for 3s when the connection comes back. Auto-hides otherwise.
 */
export function OnlineStatusBar() {
  const [online, setOnline] = useState(true);
  const [flash, setFlash] = useState(false);

  // ─── Online/offline status tracking ─────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOnline(navigator.onLine);
    const onOnline = () => {
      setOnline(true);
      setFlash(true);
      setTimeout(() => setFlash(false), 3000);
    };
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online && !flash) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-white shadow-md transition-transform',
        online ? 'bg-emerald-600' : 'bg-red-600',
      )}
    >
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5" />
          تم الاتصال — جاري التزامن
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          أنت غير متصل بالإنترنت
        </>
      )}
    </div>
  );
}
