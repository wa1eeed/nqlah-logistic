import type { Metadata, Viewport } from 'next';
import { Tajawal, Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Toaster } from 'sonner';
import { isRtlLocale } from '@/i18n';
import { OnlineStatusBar } from '@/components/online-status-bar';
import { ServiceWorkerRegister } from '@/components/service-worker-register';
import { SWRProvider } from '@/components/swr-provider';
import { ConfirmProvider } from '@/components/confirm';
import './globals.css';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
});
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'نقلة لوجيستك — لوحة الإدارة',
  description: 'إدارة المنصة، الشركات، الطلبات، النزاعات',
  manifest: '/manifest.webmanifest',
  applicationName: 'نقلة — الإدارة',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'نقلة الإدارة',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a3d3a' },
    { media: '(prefers-color-scheme: dark)', color: '#041413' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = isRtlLocale(locale);

  return (
    <html
      lang={locale}
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${tajawal.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('naqla-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={isRtl ? 'font-sans' : 'font-sans-en'}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SWRProvider>
            <ServiceWorkerRegister />
            <OnlineStatusBar />
            <ConfirmProvider>{children}</ConfirmProvider>
          </SWRProvider>
          <Toaster
            position="top-center"
            richColors
            closeButton
            dir={isRtl ? 'rtl' : 'ltr'}
            toastOptions={{ duration: 4000 }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
