'use client';
import * as React from 'react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// Cookie name per app; the server reads it in src/i18n.ts (which is server-only, so
// not imported here — a client component can't pull in next/headers).
const LOCALE_COOKIE = 'naqla-locale-admin';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
] as const;

/**
 * Navbar language switcher. The locale lives in a cookie that the server reads
 * on render (see src/i18n.ts), so switching sets the cookie and reloads. The
 * current locale is read from <html lang>, which the layout sets from it.
 */
export function LanguageSwitcher() {
  const [current, setCurrent] = React.useState<'ar' | 'en'>('en');
  React.useEffect(() => {
    setCurrent(document.documentElement.lang === 'ar' ? 'ar' : 'en');
  }, []);

  const choose = (code: 'ar' | 'en') => {
    if (code === current) return;
    try {
      document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Language" title="Language / اللغة">
          <Globe className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => choose(l.code)} className="flex items-center justify-between gap-3">
            <span dir={l.code === 'ar' ? 'rtl' : 'ltr'}>{l.label}</span>
            {current === l.code && <Check className="h-4 w-4 text-[hsl(var(--mint))]" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
