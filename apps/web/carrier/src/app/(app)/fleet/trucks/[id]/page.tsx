'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR, { useSWRConfig } from 'swr';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, Calendar, CheckCircle2, FileText, Fuel, Gauge, Hash, History, Link2, Link2Off,
  Route, Truck, User, UserPlus, Wrench,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { useTruckTypesStore } from '@/stores/truck-types-store';
import { useFleetStore, makeFleetEvent } from '@/stores/fleet-store';
import { notify } from '@/lib/notify';
import { api, fetcher } from '@/lib/api';
import { TruckMaintenanceSection } from '@/components/truck-maintenance-section';
import { FleetNoteCard } from '@/components/fleet-note-card';
import {
  DRIVERS, TRUCKS, auditForTruck, formatDate, tripsForTruck,
  normalizeTruckList, normalizeDriverList,
  type Driver, type Truck as TruckModel, type TruckStatus,
} from '@naqla/shared-utils';
import {
  AuditTimeline, ConfirmDialog, DriverStatusBadge, ExpiryBadge, expiryState,
  FleetStatusSelect, OwnershipBadge, TripsTimeline, TRUCK_STATUS_OPTIONS,
} from '@/components/fleet-bits';

export default function TruckDetailPage() {
  const t = useTranslations('fleet');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const truckTypes = useTruckTypesStore((s) => s.types);

  const events = useFleetStore((s) => s.events);
  const logEvent = useFleetStore((s) => s.logEvent);
  const { mutate } = useSWRConfig();
  const revalidateFleet = () => { mutate('/fleet/trucks'); mutate('/fleet/drivers'); };

  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [pick, setPick] = useState('');

  // Live fleet from the API (mock fallback when the backend is down).
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

  const truck = srcTrucks.find((t) => t.id === params.id);

  if (!truck) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">{t('truckDetail.notFound')}</h3>
          <Button onClick={() => router.push('/fleet/trucks')} className="mt-4">{t('truckDetail.backToFleet')}</Button>
        </CardContent>
      </Card>
    );
  }

  const status: TruckStatus = (truck.status ?? 'AVAILABLE') as TruckStatus;
  const driverId = truck.assignedDriverId ?? null;
  const driver = srcDrivers.find((d) => d.id === driverId);
  const trips = tripsForTruck(truck.id);
  const audit = auditForTruck(truck.id, events);
  const truckType = truckTypes.find((t) => t.id === truck.truckType);
  const meta = {
    label: truckType?.nameAr ?? truck.truckType,
    imageUrl: truckType?.imageUrl,
    description: truckType?.description,
  };
  const parsedPlate = parsePlateString(truck.plateNumber ?? '');

  const totalKm = trips.reduce((s, t) => s + t.distanceKm, 0);
  const done = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'DELIVERED');
  const totalAmount = done.reduce((s, t) => s + t.amount, 0);

  const takenBy = (did: string) => srcTrucks.find((t) => t.assignedDriverId === did && t.id !== truck.id)?.id;
  const pickDriver = srcDrivers.find((d) => d.id === pick);

  const doAssign = async () => {
    if (!pick) return;
    try {
      await api.post(`/fleet/trucks/${truck.id}/assign`, { driverId: pick });
      logEvent(makeFleetEvent('ASSIGN', truck.id, pick,
        t('truckDetail.eventAssign', { name: pickDriver?.fullName ?? '', code: pickDriver?.code ?? '', truck: truck.code })));
      revalidateFleet();
      notify.success(t('truckDetail.assignedTitle'), `${pickDriver?.fullName ?? ''} → ${truck.code}`);
    } catch (e) { notify.error(e); }
    setAssignOpen(false);
    setPick('');
  };

  const doUnassign = async () => {
    try {
      await api.post(`/fleet/trucks/${truck.id}/unassign`);
      logEvent(makeFleetEvent('UNASSIGN', truck.id, driverId ?? undefined,
        t('eventUnassignDriver', { name: driver?.fullName ?? '', truck: truck.code })));
      revalidateFleet();
      notify.success(t('unassignedTitle'), t('truckDetail.unassignedDesc', { truck: truck.code }));
    } catch (e) { notify.error(e); }
  };

  return (
    <>
      <PageHeader
        title={t('truckDetail.title', { code: truck.code })}
        subtitle={`${meta.label}${truck.modelYear ? ` · ${t('modelYearShort', { year: truck.modelYear })}` : ''} · ${((truck.capacityKg ?? 0) / 1000).toFixed(0)} ${t('tons')}`}
        actions={
          <>
            <FleetStatusSelect
              value={status}
              options={TRUCK_STATUS_OPTIONS}
              onChange={async (v) => {
                try {
                  await api.patch(`/fleet/trucks/${truck.id}/status`, { status: v });
                  logEvent(makeFleetEvent('STATUS', truck.id, driverId ?? undefined,
                    t('truckDetail.eventStatus', { truck: truck.code, status: TRUCK_STATUS_OPTIONS.find((o) => o.value === v)?.label ?? v })));
                  revalidateFleet();
                  notify.success(t('truckDetail.statusUpdated'), TRUCK_STATUS_OPTIONS.find((o) => o.value === v)?.label);
                } catch (e) { notify.error(e); }
              }}
            />
            <Button variant="outline" onClick={() => router.push('/fleet/trucks')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('back')}
            </Button>
          </>
        }
      />

      {/* Top: plate + driver */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="h-40 w-60 rounded-xl bg-muted/40 grid place-items-center shrink-0 border overflow-hidden p-3" aria-hidden>
              {meta.imageUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={meta.imageUrl}
                    alt={meta.label}
                    className="max-h-full max-w-full object-contain drop-shadow-md"
                    onError={(e) => {
                      const t = e.target as HTMLImageElement;
                      t.style.display = 'none';
                      const fb = t.nextElementSibling as HTMLElement;
                      if (fb) fb.style.display = 'flex';
                    }}
                  />
                  <div style={{ display: 'none' }} className="text-muted-foreground"><Truck className="h-14 w-14" /></div>
                </>
              ) : (
                <div className="text-muted-foreground"><Truck className="h-14 w-14" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-3 text-center sm:text-start">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <h3 className="text-lg font-bold">{meta.label}</h3>
                <Badge variant="outline" className="num gap-1"><Hash className="h-3 w-3" />{truck.code}</Badge>
                <StatusBadge status={status} />
                <OwnershipBadge ownership={truck.ownership} />
              </div>
              <SaudiLicensePlate letters={parsedPlate.letters} numbers={parsedPlate.numbers} plateType="transport" size="stage" />
              <div className="text-sm text-muted-foreground">{t('truckDetail.plateCaption')}</div>
            </div>
          </CardContent>
        </Card>

        {/* Driver */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('truckDetail.assignedDriver')}</CardTitle>
              {driver ? (
                <Button variant="ghost" size="sm" onClick={() => setConfirmUnassign(true)}>
                  <Link2Off className="h-4 w-4" /> {t('unlink')}
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {driver ? (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 cursor-pointer rounded-lg -m-1 p-1 hover:bg-muted/40"
                  onClick={() => router.push(`/fleet/drivers/${driver.id}`)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{driver.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{driver.fullName}</div>
                    <div className="text-xs text-muted-foreground"><span className="num">{driver.code}</span> · {driver.licenseClass}</div>
                  </div>
                  <DriverStatusBadge status={driver.status} />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setPick(driver.id); setAssignOpen(true); }}>
                  <Link2 className="h-4 w-4" /> {t('truckDetail.changeDriver')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {t('truckDetail.noDriverLinked')}
                </div>
                <Button size="sm" className="w-full" onClick={() => { setPick(''); setAssignOpen(true); }}>
                  <UserPlus className="h-4 w-4" /> {t('truckDetail.assignDriver')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider note */}
      <div className="mt-6">
        <FleetNoteCard kind="truck" id={truck.id} note={truck.note} />
      </div>

      {/* Maintenance management (schedule + log) */}
      <div className="mt-6">
        <TruckMaintenanceSection truckId={truck.id} />
      </div>

      {/* Tabs: trips / audit / specs */}
      <Tabs defaultValue="trips" className="mt-2">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="trips"><Route className="h-4 w-4 me-1.5" /> {t('tripsTab')} <Badge variant="secondary" className="ms-1.5">{trips.length}</Badge></TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 me-1.5" /> {t('activityTab')} <Badge variant="secondary" className="ms-1.5">{audit.length}</Badge></TabsTrigger>
          <TabsTrigger value="specs"><FileText className="h-4 w-4 me-1.5" /> {t('truckDetail.specsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>{t('tripsTimeline')}</CardTitle>
                  <CardDescription className="mt-1">
                    {trips.length} {t('tripsWord')} · <span className="num">{done.length}</span> {t('completedWord')} · {t('totalDistanceInline')} <span className="num">{totalKm.toLocaleString('en-US')}</span> {t('km')}
                  </CardDescription>
                </div>
                <div className="text-end">
                  <Currency amount={totalAmount} />
                  <div className="text-xs text-muted-foreground">{t('truckDetail.totalRevenue')}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent><TripsTimeline trips={trips} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> {t('activityTab')}</CardTitle>
              <CardDescription className="mt-1">{t('activityLogDesc')}</CardDescription>
            </CardHeader>
            <CardContent><AuditTimeline events={audit} max={30} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>{t('specifications')}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Spec icon={Hash}   label={t('truckDetail.specId')} value={truck.code} mono />
                  <Spec icon={Truck}  label={t('truckDetail.specType')}          value={meta.label} />
                  <Spec icon={Gauge}  label={t('truckDetail.specLoad')}        value={`${((truck.capacityKg ?? 0) / 1000).toFixed(0)} ${t('tons')}`} />
                  <Spec icon={Calendar} label={t('truckDetail.specModelYear')}  value={truck.modelYear ? String(truck.modelYear) : '—'} />
                  <Spec icon={Fuel}   label={t('truckDetail.specFuel')}         value={t('truckDetail.diesel')} />
                  <Spec icon={Wrench} label={t('truckDetail.specLastInspection')}        value={truck.lastInspection ? formatDate(truck.lastInspection) : '—'} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('documents')}</CardTitle>
                <CardDescription className="mt-1">{t('truckDetail.docsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: t('truckDetail.docRegistration'), expiry: '2027-04-15' },
                  { label: t('truckDetail.docInsurance'), expiry: '2026-12-01' },
                  {
                    label: t('truckDetail.docInspection'),
                    expiry: truck.lastInspection
                      ? truck.lastInspection.slice(0, 10).split('-').map((p: string, i: number) => i === 0 ? String(Number(p) + 1) : p).join('-')
                      : '—',
                  },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground grid place-items-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{doc.label}</div>
                      <div className="text-xs text-muted-foreground">{t('truckDetail.expiresPrefix')} {doc.expiry !== '—' ? formatDate(doc.expiry, 'd MMM yyyy') : '—'}</div>
                    </div>
                    {(() => {
                      const e = expiryState(doc.expiry);
                      return e && e.state !== 'ok'
                        ? <ExpiryBadge date={doc.expiry} />
                        : <Badge variant="success">{t('truckDetail.valid')}</Badge>;
                    })()}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assign driver dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('truckDetail.assignDialogTitle', { code: truck.code })}</DialogTitle>
            <DialogDescription>{t('truckDetail.assignDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder={t('truckDetail.selectDriver')} /></SelectTrigger>
              <SelectContent>
                {srcDrivers.map((d) => {
                  const on = takenBy(d.id);
                  const onTruck = on ? srcTrucks.find((tr) => tr.id === on)?.code : null;
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName} · {d.code}{onTruck ? t('truckDetail.onTruckSuffix', { code: onTruck }) : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => { if (pick) setConfirmAssign(true); }} disabled={!pick}>
              <CheckCircle2 className="h-4 w-4" /> {t('truckDetail.assignBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm assign */}
      <ConfirmDialog
        open={confirmAssign}
        onOpenChange={setConfirmAssign}
        title={t('truckDetail.confirmAssignTitle')}
        description={pickDriver ? t('truckDetail.confirmAssignDesc', { name: pickDriver.fullName, truck: truck.code, extra: takenBy(pick) ? t('truckDetail.confirmAssignMove', { code: srcTrucks.find((tr) => tr.id === takenBy(pick))?.code ?? '' }) : '' }) : undefined}
        confirmLabel={t('truckDetail.confirmAssignBtn')}
        onConfirm={doAssign}
      />

      {/* Confirm unassign */}
      <ConfirmDialog
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title={t('truckDetail.confirmUnassignTitle')}
        description={driver ? t('confirmUnassignDesc', { name: driver.fullName, truck: truck.code }) : undefined}
        confirmLabel={t('unlinkConfirm')}
        destructive
        onConfirm={doUnassign}
      />
    </>
  );
}

function Spec({ icon: Icon, label, value, mono }: { icon?: React.ComponentType<{ className?: string }>; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && (
        <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground grid place-items-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`mt-0.5 text-sm font-medium truncate ${mono ? 'num' : ''}`}>{value}</div>
      </div>
    </div>
  );
}
