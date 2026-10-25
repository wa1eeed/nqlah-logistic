'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Hash, Loader2, Plus, Truck as TruckIcon, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { DriverStatusBadge, ExpiryBadge, OwnershipBadge, expiryState } from '@/components/fleet-bits';
import { useFleetStore } from '@/stores/fleet-store';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import {
  DRIVERS, TRUCKS, normalizeDriverList, normalizeTruckList,
  type Driver, type DriverStatus, type Truck,
} from '@naqla/shared-utils';

const LICENSE_CLASSES = ['حمولة ثقيلة', 'حمولة استثنائية', 'تركيب وقاطرة'] as const;

export default function CarrierFleetDrivers() {
  const t = useTranslations('fleet');
  const router = useRouter();
  const licenseClassLabel = (c: string) => ({
    'حمولة ثقيلة': t('licenseClasses.heavy'),
    'حمولة استثنائية': t('licenseClasses.exceptional'),
    'تركيب وقاطرة': t('licenseClasses.trailer'),
  } as Record<string, string>)[c] ?? c;
  const [tab, setTab] = useState('ALL');
  const assignMap = useFleetStore((s) => s.assign);
  const driverStatusMap = useFleetStore((s) => s.driverStatus);

  // Live fleet from the API (mock fallback when the backend is down).
  const { data: driversRaw } = useSWR<unknown>('/fleet/drivers', fetcher);
  const { data: trucksRaw } = useSWR<unknown>('/fleet/trucks', fetcher);
  const srcDrivers = useMemo<Driver[]>(() => {
    const apiRows = normalizeDriverList<Driver>(driversRaw);
    return apiRows.length ? apiRows : DRIVERS;
  }, [driversRaw]);
  const srcTrucks = useMemo<Truck[]>(() => {
    const apiRows = normalizeTruckList<Truck>(trucksRaw);
    return apiRows.length ? apiRows : TRUCKS;
  }, [trucksRaw]);

  const all = useMemo(() => srcDrivers.map((d) => {
    // Truck link: the session's assign overlay first, else the truck whose
    // (API) currentDriverId points at this driver.
    const overlaidTruckId = Object.keys(assignMap).find((tid) => assignMap[tid] === d.id) ?? null;
    const truck = srcTrucks.find((t) => t.id === overlaidTruckId)
      ?? srcTrucks.find((t) => t.assignedDriverId === d.id)
      ?? null;
    return {
      ...d,
      status: (driverStatusMap[d.id] ?? d.status) as DriverStatus,
      truck,
    };
  }), [srcDrivers, srcTrucks, assignMap, driverStatusMap]);

  const counts = useMemo(() => ({
    all: all.length,
    available: all.filter((d) => d.status === 'AVAILABLE').length,
    onTrip: all.filter((d) => d.status === 'ON_TRIP').length,
    offDuty: all.filter((d) => d.status === 'OFF_DUTY').length,
  }), [all]);

  const rows = useMemo(() => (tab === 'ALL' ? all : all.filter((d) => d.status === tab)), [tab, all]);
  const licenseAlerts = useMemo(
    () => all.filter((d) => { const e = expiryState(d.licenseExpiry); return e && e.state !== 'ok'; }).length,
    [all],
  );

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '', phone: '', nationalId: '',
    licenseNumber: '', licenseExpiry: '', licenseType: 'حمولة ثقيلة',
  });

  const addDriver = async () => {
    if (!form.fullName || !form.phone || !form.licenseExpiry || saving) return;
    setSaving(true);
    try {
      await api.post('/fleet/drivers/invite', form);
      notify.success(t('driversList.addedTitle'), t('driversList.addedDesc'));
    } catch {
      notify.success(t('driversList.createdTitle'), t('driversList.createdDesc'));
    } finally {
      setOpen(false);
      setForm({ fullName: '', phone: '', nationalId: '', licenseNumber: '', licenseExpiry: '', licenseType: 'حمولة ثقيلة' });
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('drivers')}
        subtitle={t('driversList.registeredCount', { count: counts.all })}
        actions={
          <>
            {licenseAlerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> <span className="num">{licenseAlerts}</span> {t('driversList.licenseAlerts')}
              </span>
            )}
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('addDriver')}</Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ALL">{t('all')} <Badge variant="secondary" className="ms-1">{counts.all}</Badge></TabsTrigger>
          <TabsTrigger value="AVAILABLE">{t('driverStatus.available')} <Badge variant="secondary" className="ms-1">{counts.available}</Badge></TabsTrigger>
          <TabsTrigger value="ON_TRIP">{t('driverStatus.onTrip')} <Badge variant="secondary" className="ms-1">{counts.onTrip}</Badge></TabsTrigger>
          <TabsTrigger value="OFF_DUTY">{t('driverStatus.offDuty')} <Badge variant="secondary" className="ms-1">{counts.offDuty}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {/* Mobile: app-like card list */}
          <div className="md:hidden divide-y">
            {rows.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                {t('driversList.empty')}
              </div>
            ) : (
              rows.map((d) => (
                <div
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/fleet/drivers/${d.id}`)}
                  className="p-4 cursor-pointer transition-colors active:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><Hash className="h-3 w-3" />{d.code}</span>
                    <DriverStatusBadge status={d.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <Avatar className="h-8 w-8"><AvatarFallback>{d.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback></Avatar>
                    <span className="font-medium">{d.fullName}</span>
                    <ExpiryBadge date={d.licenseExpiry} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <span className="text-muted-foreground">{t('driversList.table.id')}</span>
                    <span className="text-end font-mono num text-xs">{d.nationalId}</span>
                    <span className="text-muted-foreground">{t('driver.licenseClass')}</span>
                    <span className="text-end">{licenseClassLabel(d.licenseClass)}</span>
                    <span className="text-muted-foreground">{t('ownership.label')}</span>
                    <span className="text-end"><OwnershipBadge ownership={d.ownership} /></span>
                    <span className="text-muted-foreground">{t('driversList.table.truck')}</span>
                    <span className="text-end">
                      {d.truck
                        ? <span className="inline-flex items-center gap-1.5"><TruckIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-xs">{d.truck.code}</span></span>
                        : <span className="text-muted-foreground">{t('driversList.noTruck')}</span>}
                    </span>
                    <span className="text-muted-foreground">{t('driversList.table.trips')}</span>
                    <span className="text-end num">{d.totalTrips ?? 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Desktop: table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('driversList.table.code')}</TableHead>
                <TableHead>{t('driversList.table.name')}</TableHead>
                <TableHead>{t('driversList.table.id')}</TableHead>
                <TableHead>{t('driver.licenseClass')}</TableHead>
                <TableHead>{t('ownership.label')}</TableHead>
                <TableHead>{t('driversList.table.truck')}</TableHead>
                <TableHead className="text-center">{t('driversList.table.trips')}</TableHead>
                <TableHead>{t('driversList.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    {t('driversList.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/fleet/drivers/${d.id}`)}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"><Hash className="h-3 w-3" />{d.code}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8"><AvatarFallback>{d.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback></Avatar>
                        <span className="font-medium whitespace-nowrap">{d.fullName}</span>
                        <ExpiryBadge date={d.licenseExpiry} />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground num">{d.nationalId}</TableCell>
                    <TableCell className="whitespace-nowrap">{licenseClassLabel(d.licenseClass)}</TableCell>
                    <TableCell><OwnershipBadge ownership={d.ownership} /></TableCell>
                    <TableCell>
                      {d.truck
                        ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><TruckIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-xs">{d.truck.code}</span></span>
                        : <span className="text-muted-foreground">{t('driversList.noTruck')}</span>}
                    </TableCell>
                    <TableCell className="text-center num">{d.totalTrips ?? 0}</TableCell>
                    <TableCell><DriverStatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Driver Dialog */}
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('driversList.addTitle')}</DialogTitle>
            <DialogDescription>{t('driversList.addDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t('driver.fullName')}</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder={t('driversList.namePlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('driversList.phone')}</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+966 5XX XXX XXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('driver.nationalId')}</Label>
              <Input dir="ltr" value={form.nationalId} onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))} placeholder="1XXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('driversList.licenseExpiry')}</Label>
              <Input type="date" value={form.licenseExpiry} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('driver.licenseClass')}</Label>
              <Select value={form.licenseType} onValueChange={(v) => setForm((f) => ({ ...f, licenseType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LICENSE_CLASSES.map((c) => <SelectItem key={c} value={c}>{licenseClassLabel(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{t('cancel')}</Button>
            <Button onClick={addDriver} disabled={saving || !form.fullName || !form.phone || !form.licenseExpiry}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {t('driversList.addBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
