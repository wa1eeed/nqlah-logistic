'use client';
import { useState, useMemo } from 'react';
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
import { DRIVERS, TRUCKS, formatDate, type TruckStatus } from '@naqla/shared-utils';

const TRUCK_LABELS: Record<string, string> = {
  SMALL_VAN: 'فان صغير', BOX_TRUCK: 'صندوق مغلق', MEDIUM_FLATBED: 'مسطح متوسط',
  LARGE_FLATBED: 'مسطح كبير', REFRIGERATED: 'مبرّد', TANKER: 'صهريج',
  LOWBED: 'لوبد', CONTAINER_TRAILER: 'حاوية',
};

export default function CarrierFleetTrucks() {
  const [tab, setTab] = useState('ALL');
  const [confirmReset, setConfirmReset] = useState(false);
  const assignMap = useFleetStore((s) => s.assign);
  const truckStatusMap = useFleetStore((s) => s.truckStatus);
  const resetFleet = useFleetStore((s) => s.resetFleet);
  const resetConsolidated = useConsolidatedStore((s) => s.resetAll);

  const all = useMemo(() => TRUCKS.map((t) => ({
    ...t,
    status: (truckStatusMap[t.id] ?? t.status) as TruckStatus,
    driverId: t.id in assignMap ? assignMap[t.id] : t.assignedDriverId ?? null,
  })), [assignMap, truckStatusMap]);

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
        title="الأسطول"
        subtitle={`${total} شاحنة مسجّلة`}
        actions={
          <>
            {inspectionAlerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> <span className="num">{inspectionAlerts}</span> فحص يقترب
              </span>
            )}
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" /> إعادة ضبط الديمو
            </Button>
            <Link href="/fleet/trucks/new">
              <Button>
                <Plus className="h-4 w-4" />
                إضافة شاحنة
              </Button>
            </Link>
          </>
        }
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="إعادة ضبط بيانات الديمو"
        description="سيُعاد الأسطول وتوزيع الطلبات المجمّعة إلى الحالة الأصلية، وتُمحى تعديلاتك في هذا المتصفح."
        confirmLabel="إعادة الضبط"
        destructive
        onConfirm={() => { resetFleet(); resetConsolidated(); notify.success('تمت إعادة الضبط', 'عادت بيانات الأسطول للحالة الأصلية'); }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="إجمالي الأسطول" value={total} hint="شاحنة" icon={Truck} tone="default" />
        <StatsCard label="متاحة" value={available} hint="جاهزة الآن" icon={CheckCircle} tone="success" />
        <StatsCard label="في رحلة" value={onTrip} hint="حاليا" icon={Clock} tone="default" />
        <StatsCard label="صيانة" value={maintenance} hint="غير متاحة" icon={Wrench} tone="warning" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="ALL">الكل <Badge variant="secondary" className="ms-1">{total}</Badge></TabsTrigger>
          <TabsTrigger value="AVAILABLE">متاحة <Badge variant="secondary" className="ms-1">{available}</Badge></TabsTrigger>
          <TabsTrigger value="ON_TRIP">في رحلة <Badge variant="secondary" className="ms-1">{onTrip}</Badge></TabsTrigger>
          <TabsTrigger value="MAINTENANCE">صيانة <Badge variant="secondary" className="ms-1">{maintenance}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>لوحة</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الملكية</TableHead>
                <TableHead className="text-end">الحمولة</TableHead>
                <TableHead>السائق</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر فحص</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const drv = DRIVERS.find((d) => d.id === t.driverId);
                const parsed = parsePlateString(t.plateNumber ?? '');
                const tons = (t.capacityKg ?? 0) / 1000;
                return (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => (window.location.href = `/fleet/trucks/${t.id}`)}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><Hash className="h-3 w-3" />{t.code}</span>
                    </TableCell>
                    <TableCell>
                      <SaudiLicensePlate letters={parsed.letters} numbers={parsed.numbers} plateType="transport" size="thumbnail" />
                    </TableCell>
                    <TableCell>{TRUCK_LABELS[t.truckType] ?? t.truckType ?? '—'}</TableCell>
                    <TableCell><OwnershipBadge ownership={t.ownership} /></TableCell>
                    <TableCell className="text-end num">{tons.toFixed(0)} طن</TableCell>
                    <TableCell>
                      {drv
                        ? <span className="whitespace-nowrap">{drv.fullName}</span>
                        : <span className="text-muted-foreground">بدون سائق</span>}
                    </TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        {t.lastInspection ? formatDate(t.lastInspection) : '—'}
                        <ExpiryBadge date={nextInspection(t.lastInspection)} />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
