// ─────────────────────────────────────────────────────────────────────────────
// NQLAH PWA service worker (conservative, prod-only).
//
// History: an earlier sw.js (v0.7.0) was registered in dev and trapped users on
// an offline page when the dev server restarted. It was replaced by a
// kill-switch SW. This file re-introduces PWA support with a safe strategy:
//
//   • Registered ONLY in production (see service-worker-register.tsx). The dev
//     server never installs it, so dev restarts can't strand anyone.
//   • Navigations: network-first with an offline fallback — the live site always
//     wins when online; the cache is only a last resort.
//   • API requests (/api/*): never intercepted, never cached — always network.
//   • Static build assets (/_next/static, icons, fonts): stale-while-revalidate.
//   • Versioned caches; every other cache is purged on activate.
//
// Bump CACHE_VERSION to force all clients onto a fresh cache set.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `naqla-static-${CACHE_VERSION}`;
const PAGE_CACHE = `naqla-pages-${CACHE_VERSION}`;
const CURRENT_CACHES = [STATIC_CACHE, PAGE_CACHE];

// Minimal self-contained offline screen (Arabic, RTL). Shown only when a
// navigation fails and nothing cached is available.
const OFFLINE_HTML = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>غير متصل</title>
<style>
  :root{color-scheme:light dark}
  html,body{height:100%;margin:0}
  body{display:flex;align-items:center;justify-content:center;
    font-family:system-ui,'Segoe UI',Tahoma,sans-serif;background:#f5faf9;color:#0a3d3a;
    text-align:center;padding:24px}
  @media(prefers-color-scheme:dark){body{background:#041413;color:#e6f4f1}}
  .card{max-width:340px}
  h1{font-size:20px;margin:0 0 8px}
  p{opacity:.75;line-height:1.6;margin:0 0 20px}
  button{appearance:none;border:0;border-radius:10px;padding:10px 20px;
    background:#0a3d3a;color:#fff;font-size:15px;font-weight:600;cursor:pointer}
</style></head>
<body><div class="card">
  <h1>أنت غير متصل بالإنترنت</h1>
  <p>تعذّر تحميل الصفحة. تحقّق من اتصالك ثم أعد المحاولة.</p>
  <button onclick="location.reload()">إعادة المحاولة</button>
</div></body></html>`;

self.addEventListener('install', (event) => {
  // Seed the offline fallback and take over as soon as it is ready.
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) =>
        cache.put(
          '/__offline',
          new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/_next/image') ||
    /\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|css|js)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle same-origin GETs. Let the browser deal with the rest
  // (POST/PUT, cross-origin, chrome-extension, etc.).
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API traffic is always network — never intercepted, never cached.
  if (url.pathname.startsWith('/api/')) return;

  // App navigations → network-first, offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          // Keep a copy of the last good shell for offline use.
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(PAGE_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match('/__offline')) ||
            new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static build output → stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })(),
    );
  }
  // Everything else: default browser handling (network).
});
