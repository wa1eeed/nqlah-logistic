'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, Clock, Hash, Plus, RotateCcw, Truck, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog, ExpiryBadge, OwnershipBadge, expiryState, nextInspection } from '@/components/fleet-bits';
import { useFleetStore } from '@/stores/fleet-store';
import { useConsolidatedStore } from '@/stores/consolidated-store';
import { notify } from '@/lib/notify';
import { fetcher } from '@/lib/api';
import {
  DRIVERS, TRUCKS, formatDate, normalizeTruckList, normalizeDriverList,
  type Driver, type Truck as TruckModel, type TruckStatus,
} from '@naqla/shared-utils';

export default function CarrierFleetTrucks() {
  const t = useTranslations('fleet');
  const TRUCK_LABELS: Record<string, string> = {
    SMALL_VAN: t('truckTypeLabels.SMALL_VAN'), BOX_TRUCK: t('truckTypeLabels.BOX_TRUCK'), MEDIUM_FLATBED: t('truckTypeLabels.MEDIUM_FLATBED'),
    LARGE_FLATBED: t('truckTypeLabels.LARGE_FLATBED'), REFRIGERATED: t('truckTypeLabels.REFRIGERATED'), TANKER: t('truckTypeLabels.TANKER'),
    LOWBED: t('truckTypeLabels.LOWBED'), CONTAINER_TRAILER: t('truckTypeLabels.CONTAINER_TRAILER'),
  };
  const [tab, setTab] = useState('ALL');
  const [confirmReset, setConfirmReset] = useState(false);
  const assignMap = useFleetStore((s) => s.assign);
  const truckStatusMap = useFleetStore((s) => s.truckStatus);
  const resetFleet = useFleetStore((s) => s.resetFleet);
  const resetConsolidated = useConsolidatedStore((s) => s.resetAll);

  // Live fleet from the API (falls back to mock data when the backend is
  // unavailable, e.g. design-only runs). Drivers are needed to resolve names.
  const { data: trucksRaw } = useSWR<unknown>('/fleet/trucks', fetcher);
  const { data: driversRaw } = useSWR<unknown>('/fleet/drivers', fetcher);
  const srcTrucks = useMemo<TruckModel[]>(() => {
    const api = normalizeTruckList<TruckModel>(trucksRaw);
    return api.length ? api : TRUCKS;
  }, [trucksRaw]);
  const srcDrivers = useMemo<Driver[]>(() => {
    const api = normalizeDriverList<Driver>(driversRaw);
    return api.length ? api : DRIVERS;
  }, [driversRaw]);

  const all = useMemo(() => srcTrucks.map((t) => ({
    ...t,
    status: (truckStatusMap[t.id] ?? t.status) as TruckStatus,
    driverId: t.id in assignMap ? assignMap[t.id] : t.assignedDriverId ?? null,
  })), [srcTrucks, assignMap, truckStatusMap]);

  const rows = useMemo(() => (tab === 'ALL' ? all : all.filter((t) => t.status === tab)), [tab, all]);
  const total = all.length;
  const available = all.filter((t) => t.status === 'AVAILABLE').length;
  const onTrip = all.filter((t) => t.status === 'ON_TRIP').length;
  const maintenance = all.filter((t) => t.status === 'MAINTENANCE').length;
  const inspectionAlerts = useMemo(
    () => all.filter((t) => { const e = expiryState(nextInspection(t.lastInspection)); return e && e.state !== 'ok'; }).length,
    [all],
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('trucksList.registeredCount', { count: total })}
        actions={
          <>
            {inspectionAlerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> <span className="num">{inspectionAlerts}</span> {t('trucksList.inspectionsDueSoon')}
              </span>
            )}
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" /> {t('trucksList.resetDemo')}
            </Button>
            <Link href="/fleet/trucks/new">
              <Button>
                <Plus className="h-4 w-4" />
                {t('addTruck')}
              </Button>
            </Link>
          </>
        }
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t('trucksList.resetTitle')}
        description={t('trucksList.resetDesc')}
        confirmLabel={t('trucksList.resetConfirm')}
        destructive
        onConfirm={() => { resetFleet(); resetConsolidated(); notify.success(t('trucksList.resetDoneTitle'), t('trucksList.resetDoneDesc')); }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label={t('trucksList.stats.total')} value={total} hint={t('trucksList.stats.totalHint')} icon={Truck} tone="default" />
        <StatsCard label={t('truckStatus.available')} value={available} hint={t('trucksList.stats.availableHint')} icon={CheckCircle} tone="success" />
        <StatsCard label={t('truckStatus.onTrip')} value={onTrip} hint={t('trucksList.stats.onTripHint')} icon={Clock} tone="default" />
        <StatsCard label={t('truckStatus.maintenance')} value={maintenance} hint={t('trucksList.stats.maintenanceHint')} icon={Wrench} tone="warning" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="ALL">{t('all')} <Badge variant="secondary" className="ms-1">{total}</Badge></TabsTrigger>
          <TabsTrigger value="AVAILABLE">{t('truckStatus.available')} <Badge variant="secondary" className="ms-1">{available}</Badge></TabsTrigger>
          <TabsTrigger value="ON_TRIP">{t('truckStatus.onTrip')} <Badge variant="secondary" className="ms-1">{onTrip}</Badge></TabsTrigger>
          <TabsTrigger value="MAINTENANCE">{t('truckStatus.maintenance')} <Badge variant="secondary" className="ms-1">{maintenance}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Mobile: app-like card list */}
          <div className="md:hidden divide-y">
            {rows.map((row) => {
              const drv = srcDrivers.find((d) => d.id === row.driverId);
              const parsed = parsePlateString(row.plateNumber ?? '');
              const tons = (row.capacityKg ?? 0) / 1000;
              return (
                <Link key={row.id} href={`/fleet/trucks/${row.id}`} className="block p-4 transition-colors active:bg-muted/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><Hash className="h-3 w-3" />{row.code}</span>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="mt-2">
                    <SaudiLicensePlate letters={parsed.letters} numbers={parsed.numbers} plateType="transport" size="thumbnail" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{TRUCK_LABELS[row.truckType] ?? row.truckType ?? '—'}</span>
                    <OwnershipBadge ownership={row.ownership} />
                  </div>
                  <div className="mt-1 text-sm">
                    {drv ? drv.fullName : <span className="text-muted-foreground">{t('trucksList.noDriver')}</span>}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="num">{tons.toFixed(0)} {t('tons')}</span>
                    <span className="inline-flex items-center gap-2">
                      {row.lastInspection ? formatDate(row.lastInspection) : '—'}
                      <ExpiryBadge date={nextInspection(row.lastInspection)} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('trucksList.table.code')}</TableHead>
                <TableHead>{t('trucksList.table.plate')}</TableHead>
                <TableHead>{t('trucksList.table.type')}</TableHead>
                <TableHead>{t('ownership.label')}</TableHead>
                <TableHead className="text-end">{t('trucksList.table.load')}</TableHead>
                <TableHead>{t('trucksList.table.driver')}</TableHead>
                <TableHead>{t('trucksList.table.status')}</TableHead>
                <TableHead>{t('trucksList.table.lastInspection')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const drv = srcDrivers.find((d) => d.id === row.driverId);
                const parsed = parsePlateString(row.plateNumber ?? '');
                const tons = (row.capacityKg ?? 0) / 1000;
                return (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => (window.location.href = `/fleet/trucks/${row.id}`)}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><Hash className="h-3 w-3" />{row.code}</span>
                    </TableCell>
                    <TableCell>
                      <SaudiLicensePlate letters={parsed.letters} numbers={parsed.numbers} plateType="transport" size="thumbnail" />
                    </TableCell>
                    <TableCell>{TRUCK_LABELS[row.truckType] ?? row.truckType ?? '—'}</TableCell>
                    <TableCell><OwnershipBadge ownership={row.ownership} /></TableCell>
                    <TableCell className="text-end num">{tons.toFixed(0)} {t('tons')}</TableCell>
                    <TableCell>
                      {drv
                        ? <span className="whitespace-nowrap">{drv.fullName}</span>
                        : <span className="text-muted-foreground">{t('trucksList.noDriver')}</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        {row.lastInspection ? formatDate(row.lastInspection) : '—'}
                        <ExpiryBadge date={nextInspection(row.lastInspection)} />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
