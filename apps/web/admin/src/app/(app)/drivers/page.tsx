'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import useSWR from 'swr';
import { Filter, Phone, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/stats-card';
import { FadeIn } from '@/components/ui/fade-in';
import { UserCheck, UserMinus } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { formatDate, localizeCity } from '@naqla/shared-utils';

type ApiDriver = {
  id: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY';
  licenseNumber: string;
  licenseExpiry: string;
  licenseType: string;
  rating: number;
  totalTrips: number;
  isActive: boolean;
  createdAt: string;
  user: { firstName: string; lastName: string; phone: string; nationalId: string | null };
  company: { id: string; nameAr: string; entityType?: 'COMPANY' | 'INDIVIDUAL' };
  orderDrivers: Array<{
    order: { id: string; orderNumber: string; status: string; originCity: string; destinationCity: string };
  }>;
};

export default function AdminDriversPage() {
  const t = useTranslations('fleet');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [affiliation, setAffiliation] = useState<'ALL' | 'CARRIER' | 'INDEPENDENT'>('ALL');
  const isIndependent = (d: ApiDriver) => d.company?.entityType === 'INDIVIDUAL';

  const { data: raw } = useSWR<ApiDriver[] | { items?: ApiDriver[] }>('/admin/drivers?limit=200', fetcher);
  const apiDrivers: ApiDriver[] = useMemo(() => {
    if (!raw) return [];
    return Array.isArray(raw) ? raw : (raw as { items?: ApiDriver[] }).items ?? [];
  }, [raw]);

  const filtered = useMemo(() => {
    return apiDrivers.filter((d) => {
      if (status !== 'ALL' && d.status !== status) return false;
      if (affiliation === 'INDEPENDENT' && !isIndependent(d)) return false;
      if (affiliation === 'CARRIER' && isIndependent(d)) return false;
      if (q) {
        const hay = `${d.user.firstName} ${d.user.lastName} ${d.user.phone ?? ''} ${d.user.nationalId ?? ''} ${d.company.nameAr}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [apiDrivers, q, status, affiliation]);

  const total    = apiDrivers.length;
  const onTrip   = apiDrivers.filter((d) => d.status === 'ON_TRIP').length;
  const available = apiDrivers.filter((d) => d.status === 'AVAILABLE').length;
  const offDuty  = apiDrivers.filter((d) => d.status === 'OFF_DUTY').length;

  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={t('adminDrivers.title')}
        subtitle={t('adminDrivers.subtitle')}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label={t('adminDrivers.stats.total')} value={total}   icon={Users} index={0} />
        <StatsCard label={t('adminDrivers.stats.onTrip')}          value={onTrip}  icon={Users} tone="warning" index={1} />
        <StatsCard label={t('adminDrivers.stats.available')}            value={available} icon={UserCheck} tone="success" index={2} />
        <StatsCard label={t('adminDrivers.stats.offDuty')}       value={offDuty} icon={UserMinus} index={3} />
      </div>

      <FadeIn delay={0.1}>
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('adminDrivers.searchPlaceholder')}
                className="pe-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('adminDrivers.allStatuses')}</SelectItem>
                <SelectItem value="AVAILABLE">{t('driverStatus.available')}</SelectItem>
                <SelectItem value="ON_TRIP">{t('driverStatus.onTrip')}</SelectItem>
                <SelectItem value="OFF_DUTY">{t('driverStatus.offDuty')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={affiliation} onValueChange={(v) => setAffiliation(v as 'ALL' | 'CARRIER' | 'INDEPENDENT')}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('adminDrivers.affiliation.all')}</SelectItem>
                <SelectItem value="CARRIER">{t('adminDrivers.affiliation.carrier')}</SelectItem>
                <SelectItem value="INDEPENDENT">{t('adminDrivers.affiliation.independent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: app-like card list */}
          <div className="md:hidden -mx-4 border-t divide-y">
            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {t('adminDrivers.noResults')}
              </div>
            ) : (
              filtered.map((d) => {
                const fullName = `${d.user.firstName} ${d.user.lastName}`;
                const initials = fullName.trim().split(' ').slice(0, 2).map((w) => w[0] ?? '').join('');
                const activeOrder = d.orderDrivers[0]?.order ?? null;
                return (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{fullName}</span>
                          <StatusBadge status={d.status} />
                        </div>
                        <span className="flex items-center gap-1.5">
                          <Link href={`/companies/${d.company.id}`} className="text-xs text-muted-foreground hover:text-primary">
                            {d.company.nameAr}
                          </Link>
                          {isIndependent(d) && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t('adminDrivers.independent')}</Badge>}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{d.licenseType} · {formatDate(d.licenseExpiry, 'd MMM yyyy')}</span>
                      <a href={`tel:${d.user.phone}`} className="num inline-flex items-center gap-1 hover:text-primary" dir="ltr">
                        <Phone className="h-3 w-3" /> {d.user.phone}
                      </a>
                    </div>
                    <div className="mt-1 num text-xs text-muted-foreground">{t('adminDrivers.table.trips')}: {d.totalTrips.toLocaleString('en-US')}</div>
                    {activeOrder && (
                      <Link href={`/orders/${activeOrder.id}`} className="mt-2 block rounded-md bg-muted/40 p-2">
                        <div className="text-xs font-mono text-primary">{activeOrder.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{localizeCity(activeOrder.originCity)} ← {localizeCity(activeOrder.destinationCity)}</div>
                        <div className="mt-1"><StatusBadge status={activeOrder.status} /></div>
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminDrivers.table.driver')}</TableHead>
                <TableHead>{t('adminDrivers.table.carrier')}</TableHead>
                <TableHead>{t('adminDrivers.table.id')}</TableHead>
                <TableHead>{t('adminDrivers.table.licenseClass')}</TableHead>
                <TableHead>{t('adminDrivers.table.licenseExpiry')}</TableHead>
                <TableHead>{t('adminDrivers.table.trips')}</TableHead>
                <TableHead>{t('adminDrivers.table.phone')}</TableHead>
                <TableHead>{t('adminDrivers.table.currentOrder')}</TableHead>
                <TableHead>{t('adminDrivers.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {t('adminDrivers.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const fullName = `${d.user.firstName} ${d.user.lastName}`;
                  const initials = fullName.trim().split(' ').slice(0, 2).map((w) => w[0] ?? '').join('');
                  const activeOrder = d.orderDrivers[0]?.order ?? null;
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{fullName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{d.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1.5">
                          <Link href={`/companies/${d.company.id}`} className="hover:text-primary text-sm">
                            {d.company.nameAr}
                          </Link>
                          {isIndependent(d) && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t('adminDrivers.independent')}</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="num text-xs">{d.user.nationalId ?? '—'}</TableCell>
                      <TableCell className="text-xs">{d.licenseType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(d.licenseExpiry, 'd MMM yyyy')}</TableCell>
                      <TableCell className="num text-sm">{d.totalTrips.toLocaleString('en-US')}</TableCell>
                      <TableCell>
                        <a href={`tel:${d.user.phone}`} className="text-xs num inline-flex items-center gap-1 hover:text-primary" dir="ltr">
                          <Phone className="h-3 w-3" /> {d.user.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        {activeOrder ? (
                          <Link href={`/orders/${activeOrder.id}`} className="group">
                            <div className="text-xs font-mono text-primary hover:underline">{activeOrder.orderNumber}</div>
                            <div className="text-xs text-muted-foreground">{localizeCity(activeOrder.originCity)} ← {localizeCity(activeOrder.destinationCity)}</div>
                            <div className="mt-1"><StatusBadge status={activeOrder.status} /></div>
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      </FadeIn>
    </>
  );
}
