'use client';
import { useEffect } from 'react';

/**
 * Registers the PWA service worker — PRODUCTION ONLY.
 *
 * The dev server never installs a service worker (that's what trapped users on
 * an offline page in v0.7.0). In production the SW backs install-to-home-screen
 * and an offline app shell; see public/sw.js for the caching strategy.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration is best-effort; the app works without it */
      });
    };

    if (document.readyState === 'complete') register();
    else {
      window.addEventListener('load', register, { once: true });
      return () => window.removeEventListener('load', register);
    }
  }, []);

  return null;
}
