'use client';
import { Truck } from 'lucide-react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Branding { logoUrl: string; logoUrlDark: string; nameAr: string; nameEn: string }

/**
 * Platform logo block. Reads the configured logo from the public branding
 * endpoint (`GET /settings/platform`) — the same source the client/carrier
 * portals and the invoice PDF use — and renders the light/dark variant by
 * theme. Falls back to the default Truck mark when no logo is configured.
 */
export function Logo({ size = 'compact', className }: { size?: 'compact' | 'lg'; className?: string }) {
  const { data } = useSWR<Branding>('/settings/platform', fetcher);
  const logoUrl = data?.logoUrl || '';
  const logoUrlDark = data?.logoUrlDark || logoUrl;
  const nameAr = data?.nameAr || 'نقلة لوجيستك';
  const dims = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  const icon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  if (logoUrl) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl overflow-hidden', dims, className)} aria-label={nameAr}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={nameAr} className="h-full w-full object-contain dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrlDark} alt={nameAr} className="hidden h-full w-full object-contain dark:block" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold overflow-hidden',
        dims,
        className,
      )}
      aria-label={nameAr}
    >
      <Truck className={icon} />
    </div>
  );
}
