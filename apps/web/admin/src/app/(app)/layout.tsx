'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Render the shell immediately (pages show their own loading skeletons) and
  // only redirect when the token is missing — so an authenticated admin never
  // sees a "redirecting" spinner flash before the page.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('naqla_access_token')) {
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
