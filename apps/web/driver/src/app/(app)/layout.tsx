'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DriverTopbar } from '@/components/driver-topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslations('common');
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('naqla_driver_token');
    if (!token) {
      try {
        localStorage.removeItem('naqla_driver_token');
        localStorage.removeItem('naqla_driver_refresh');
        localStorage.removeItem('naqla-driver-auth');
      } catch { /* ignore */ }
      router.replace('/login');
      setAuthed(false);
      return;
    }
    setAuthed(true);
  }, [router]);

  if (authed !== true) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <DriverTopbar />
      <main className="flex-1 p-4 pb-20">
        <div className="mx-auto w-full max-w-lg space-y-4">{children}</div>
      </main>
    </div>
  );
}
