import type { MetadataRoute } from 'next';

// PWA web app manifest. Served at /manifest.webmanifest.
// Icons live in public/ (brand truck mark on the NQLAH primary teal).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'نقلة — العميل',
    short_name: 'نقلة العميل',
    description: 'إدارة طلبات النقل بسهولة',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#f5faf9',
    theme_color: '#0a3d3a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
