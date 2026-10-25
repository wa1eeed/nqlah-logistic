'use client';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { LogOut, Truck, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LanguageSwitcher } from '@/components/language-switcher';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type DriverMe = { id: string; name: string; phone: string; status: string };

export function DriverTopbar() {
  const t = useTranslations('driver');
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { data } = useSWR<DriverMe>('/driver/me', fetcher);

  const name = data?.name || (user ? `${user.firstName} ${user.lastName}`.trim() : '') || t('fallbackName');
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || 'D';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Truck className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold tracking-tight">نقلة</span>
      </div>

      <div className="ms-auto flex items-center gap-2">
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-accent/40">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm font-medium max-w-[9rem] truncate">{name}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="truncate">{name}</span>
              {data?.phone && (
                <span className="text-xs font-normal text-muted-foreground num" dir="ltr">{data.phone}</span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="h-4 w-4" />
              {t('roleDriver')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
