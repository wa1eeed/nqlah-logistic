'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Render the shell immediately (each page shows its own loading skeleton),
  // and only redirect when the token is missing — so an authenticated user
  // never sees a "redirecting" spinner flash before their content. Running the
  // check in an effect keeps SSR and first client render identical (no
  // hydration mismatch); the unauthenticated case is a brief redirect.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('naqla_client_token')) {
      try {
        localStorage.removeItem('naqla_client_token');
        localStorage.removeItem('naqla_client_refresh');
        localStorage.removeItem('naqla-client-auth');
      } catch { /* ignore */ }
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopbar />
        <main className="flex-1 p-4 lg:p-6 space-y-6">
          <div className="max-w-[1400px] mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
