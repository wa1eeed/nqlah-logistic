'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Filter, Search, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { StatusBadge } from '@/components/status-badge';
import { StatsCard } from '@/components/stats-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Wrench, CheckCircle2 } from 'lucide-react';
import { TRUCKS, carrierById, driverById, formatDate } from '@naqla/shared-utils';

const TRUCK_TYPE_KEYS = [
  'SMALL_VAN', 'BOX_TRUCK', 'MEDIUM_FLATBED', 'LARGE_FLATBED',
  'REFRIGERATED', 'TANKER', 'LOWBED', 'CONTAINER_TRAILER',
] as const;

export default function AdminTrucksPage() {
  const t = useTranslations('fleet');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [type, setType] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return TRUCKS.filter((t) => {
      if (status !== 'ALL' && t.status !== status) return false;
      if (type !== 'ALL' && t.truckType !== type) return false;
      if (q) {
        const hay = `${t.plateNumber} ${t.id} ${carrierById(t.carrierId)?.nameAr ?? ''}`;
        if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [q, status, type]);

  const total = TRUCKS.length;
  const onTrip = TRUCKS.filter((t) => t.status === 'ON_TRIP').length;
  const available = TRUCKS.filter((t) => t.status === 'AVAILABLE').length;
  const maintenance = TRUCKS.filter((t) => t.status === 'MAINTENANCE').length;

  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={t('adminTrucks.title')}
        subtitle={t('adminTrucks.subtitle')}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label={t('adminTrucks.stats.total')} value={total} icon={Truck} index={0} />
        <StatsCard label={t('adminTrucks.stats.onTrip')} value={onTrip} icon={Truck} tone="warning" index={1} />
        <StatsCard label={t('adminTrucks.stats.available')} value={available} icon={CheckCircle2} tone="success" index={2} />
        <StatsCard label={t('adminTrucks.stats.maintenance')} value={maintenance} icon={Wrench} tone="danger" index={3} />
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
                placeholder={t('adminTrucks.searchPlaceholder')}
                className="pe-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('adminTrucks.allStatuses')}</SelectItem>
                <SelectItem value="AVAILABLE">{t('truckStatus.available')}</SelectItem>
                <SelectItem value="ON_TRIP">{t('truckStatus.onTrip')}</SelectItem>
                <SelectItem value="MAINTENANCE">{t('truckStatus.maintenance')}</SelectItem>
                <SelectItem value="OFF_DUTY">{t('truckStatus.offDuty')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('adminTrucks.allTypes')}</SelectItem>
                {TRUCK_TYPE_KEYS.map((k) => (
                  <SelectItem key={k} value={k}>{t(`adminTrucks.types.${k}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile: app-like card list */}
          <div className="md:hidden -mx-4 border-t divide-y">
            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                {t('adminTrucks.noResults')}
              </div>
            ) : (
              filtered.map((truck) => {
                const plate = parsePlateString(truck.plateNumber);
                const carrier = carrierById(truck.carrierId);
                const drv = driverById(truck.assignedDriverId);
                const typeLabel = (TRUCK_TYPE_KEYS as readonly string[]).includes(truck.truckType)
                  ? t(`adminTrucks.types.${truck.truckType}`)
                  : truck.truckType;
                return (
                  <div key={truck.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-[96px]">
                        <SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" />
                      </div>
                      <StatusBadge status={truck.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Link href={`/companies/${truck.carrierId}`} className="text-sm font-medium hover:text-primary truncate">
                        {carrier?.nameAr ?? '—'}
                      </Link>
                      <span className="text-xs text-muted-foreground shrink-0">{typeLabel}</span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="num">
                        {t('adminTrucks.capacityValue', { value: (truck.capacityKg / 1000).toFixed(0) })} · <span className="num">{truck.modelYear}</span>
                      </span>
                      <span className="truncate max-w-[140px]">{drv?.fullName ?? '—'}</span>
                    </div>
                    <div className="mt-1 num text-xs text-muted-foreground">{formatDate(truck.lastInspection)}</div>
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
                <TableHead>{t('adminTrucks.table.plate')}</TableHead>
                <TableHead>{t('adminTrucks.table.carrier')}</TableHead>
                <TableHead>{t('adminTrucks.table.type')}</TableHead>
                <TableHead>{t('adminTrucks.table.capacity')}</TableHead>
                <TableHead>{t('adminTrucks.table.model')}</TableHead>
                <TableHead>{t('adminTrucks.table.driver')}</TableHead>
                <TableHead>{t('adminTrucks.table.lastInspection')}</TableHead>
                <TableHead>{t('adminTrucks.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {t('adminTrucks.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((truck) => {
                  const plate = parsePlateString(truck.plateNumber);
                  const carrier = carrierById(truck.carrierId);
                  const drv = driverById(truck.assignedDriverId);
                  const typeLabel = (TRUCK_TYPE_KEYS as readonly string[]).includes(truck.truckType)
                    ? t(`adminTrucks.types.${truck.truckType}`)
                    : truck.truckType;
                  return (
                    <TableRow key={truck.id}>
                      <TableCell>
                        <SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="thumbnail" />
                      </TableCell>
                      <TableCell>
                        <Link href={`/companies/${truck.carrierId}`} className="font-medium hover:text-primary">
                          {carrier?.nameAr ?? '—'}
                        </Link>
                      </TableCell>
                      <TableCell>{typeLabel}</TableCell>
                      <TableCell className="num">{t('adminTrucks.capacityValue', { value: (truck.capacityKg / 1000).toFixed(0) })}</TableCell>
                      <TableCell className="num">{truck.modelYear}</TableCell>
                      <TableCell className="truncate max-w-[160px]">{drv?.fullName ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(truck.lastInspection)}</TableCell>
                      <TableCell><StatusBadge status={truck.status} /></TableCell>
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
