'use client';
import { useState } from 'react';
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
import { useFleetStore } from '@/stores/fleet-store';
import { notify } from '@/lib/notify';
import {
  DRIVERS, TRUCKS, auditForTruck, formatDate, tripsForTruck, type TruckStatus,
} from '@naqla/shared-utils';
import {
  AuditTimeline, ConfirmDialog, DriverStatusBadge, ExpiryBadge, expiryState,
  FleetStatusSelect, OwnershipBadge, TripsTimeline, TRUCK_STATUS_OPTIONS,
} from '@/components/fleet-bits';

export default function TruckDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const truckTypes = useTruckTypesStore((s) => s.types);

  const assignMap = useFleetStore((s) => s.assign);
  const truckStatusMap = useFleetStore((s) => s.truckStatus);
  const driverStatusMap = useFleetStore((s) => s.driverStatus);
  const events = useFleetStore((s) => s.events);
  const assignDriver = useFleetStore((s) => s.assignDriver);
  const unassignDriver = useFleetStore((s) => s.unassignDriver);
  const setTruckStatus = useFleetStore((s) => s.setTruckStatus);

  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [pick, setPick] = useState('');

  const truck = TRUCKS.find((t) => t.id === params.id);

  if (!truck) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">الشاحنة غير موجودة</h3>
          <Button onClick={() => router.push('/fleet/trucks')} className="mt-4">عودة للأسطول</Button>
        </CardContent>
      </Card>
    );
  }

  const status: TruckStatus = truckStatusMap[truck.id] ?? truck.status;
  const driverId = truck.id in assignMap ? assignMap[truck.id] : truck.assignedDriverId ?? null;
  const driver = DRIVERS.find((d) => d.id === driverId);
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

  const takenBy = (did: string) => Object.keys(assignMap).find((tid) => assignMap[tid] === did && tid !== truck.id);
  const pickDriver = DRIVERS.find((d) => d.id === pick);

  const doAssign = () => {
    if (!pick) return;
    assignDriver(truck.id, pick);
    notify.success('تم إسناد السائق', `${pickDriver?.fullName ?? ''} → ${truck.code}`);
    setAssignOpen(false);
    setPick('');
  };

  const doUnassign = () => {
    unassignDriver(truck.id);
    notify.success('تم فك الارتباط', `الشاحنة ${truck.code} بدون سائق الآن`);
  };

  return (
    <>
      <PageHeader
        title={`الشاحنة ${truck.code}`}
        subtitle={`${meta.label}${truck.modelYear ? ` · موديل ${truck.modelYear}` : ''} · ${((truck.capacityKg ?? 0) / 1000).toFixed(0)} طن`}
        actions={
          <>
            <FleetStatusSelect
              value={status}
              options={TRUCK_STATUS_OPTIONS}
              onChange={(v) => {
                setTruckStatus(truck.id, v as TruckStatus);
                notify.success('تم تحديث حالة الشاحنة', TRUCK_STATUS_OPTIONS.find((o) => o.value === v)?.label);
              }}
            />
            <Button variant="outline" onClick={() => router.push('/fleet/trucks')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> رجوع
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
              <div className="text-sm text-muted-foreground">لوحة سعودية رسمية · مسجّلة لدى المرور</div>
            </div>
          </CardContent>
        </Card>

        {/* Driver */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>السائق المربوط</CardTitle>
              {driver ? (
                <Button variant="ghost" size="sm" onClick={() => setConfirmUnassign(true)}>
                  <Link2Off className="h-4 w-4" /> فك
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
                  <DriverStatusBadge status={driverStatusMap[driver.id] ?? driver.status} />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => { setPick(driver.id); setAssignOpen(true); }}>
                  <Link2 className="h-4 w-4" /> تغيير السائق
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  لا يوجد سائق مربوط
                </div>
                <Button size="sm" className="w-full" onClick={() => { setPick(''); setAssignOpen(true); }}>
                  <UserPlus className="h-4 w-4" /> إسناد سائق
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: trips / audit / specs */}
      <Tabs defaultValue="trips" className="mt-2">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="trips"><Route className="h-4 w-4 me-1.5" /> الرحلات <Badge variant="secondary" className="ms-1.5">{trips.length}</Badge></TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 me-1.5" /> سجل النشاط <Badge variant="secondary" className="ms-1.5">{audit.length}</Badge></TabsTrigger>
          <TabsTrigger value="specs"><FileText className="h-4 w-4 me-1.5" /> المواصفات والوثائق</TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle>تايم‑لاين الرحلات</CardTitle>
                  <CardDescription className="mt-1">
                    {trips.length} رحلة · <span className="num">{done.length}</span> منجزة · إجمالي مسافة <span className="num">{totalKm.toLocaleString('en-US')}</span> كم
                  </CardDescription>
                </div>
                <div className="text-end">
                  <Currency amount={totalAmount} />
                  <div className="text-xs text-muted-foreground">إجمالي إيراد الرحلات المنجزة</div>
                </div>
              </div>
            </CardHeader>
            <CardContent><TripsTimeline trips={trips} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> سجل النشاط</CardTitle>
              <CardDescription className="mt-1">الإسناد وتغيّر الحالة والرحلات</CardDescription>
            </CardHeader>
            <CardContent><AuditTimeline events={audit} max={30} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specs">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>المواصفات</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Spec icon={Hash}   label="الرقم التعريفي" value={truck.code} mono />
                  <Spec icon={Truck}  label="النوع"          value={meta.label} />
                  <Spec icon={Gauge}  label="الحمولة"        value={`${((truck.capacityKg ?? 0) / 1000).toFixed(0)} طن`} />
                  <Spec icon={Calendar} label="موديل السنة"  value={truck.modelYear ? String(truck.modelYear) : '—'} />
                  <Spec icon={Fuel}   label="الوقود"         value="ديزل" />
                  <Spec icon={Wrench} label="آخر فحص"        value={truck.lastInspection ? formatDate(truck.lastInspection) : '—'} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>الوثائق</CardTitle>
                <CardDescription className="mt-1">تواريخ صلاحية رخص الشاحنة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'الاستمارة', expiry: '2027-04-15' },
                  { label: 'التأمين الشامل', expiry: '2026-12-01' },
                  {
                    label: 'الفحص الدوري',
                    expiry: truck.lastInspection
                      ? truck.lastInspection.slice(0, 10).split('-').map((p, i) => i === 0 ? String(Number(p) + 1) : p).join('-')
                      : '—',
                  },
                ].map((doc) => (
                  <div key={doc.label} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="h-9 w-9 rounded-md bg-muted text-muted-foreground grid place-items-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{doc.label}</div>
                      <div className="text-xs text-muted-foreground">تنتهي: {doc.expiry !== '—' ? formatDate(doc.expiry, 'd MMM yyyy') : '—'}</div>
                    </div>
                    {(() => {
                      const e = expiryState(doc.expiry);
                      return e && e.state !== 'ok'
                        ? <ExpiryBadge date={doc.expiry} />
                        : <Badge variant="success">سارية</Badge>;
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
            <DialogTitle>إسناد سائق للشاحنة {truck.code}</DialogTitle>
            <DialogDescription>اختر سائقًا. إذا كان مرتبطًا بشاحنة أخرى سيُنقل تلقائيًا.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder="اختر سائقًا" /></SelectTrigger>
              <SelectContent>
                {DRIVERS.map((d) => {
                  const on = takenBy(d.id);
                  const onTruck = on ? TRUCKS.find((t) => t.id === on)?.code : null;
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {d.fullName} · {d.code}{onTruck ? ` (على ${onTruck})` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>إلغاء</Button>
            <Button onClick={() => { if (pick) setConfirmAssign(true); }} disabled={!pick}>
              <CheckCircle2 className="h-4 w-4" /> إسناد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm assign */}
      <ConfirmDialog
        open={confirmAssign}
        onOpenChange={setConfirmAssign}
        title="تأكيد إسناد السائق"
        description={pickDriver ? `سيتم ربط ${pickDriver.fullName} بالشاحنة ${truck.code}${takenBy(pick) ? ` ونقله من شاحنته الحالية (${TRUCKS.find((t) => t.id === takenBy(pick))?.code})` : ''}.` : undefined}
        confirmLabel="تأكيد الإسناد"
        onConfirm={doAssign}
      />

      {/* Confirm unassign */}
      <ConfirmDialog
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title="فك ارتباط السائق"
        description={driver ? `سيتم فك ارتباط ${driver.fullName} عن الشاحنة ${truck.code} وتحويله إلى خارج الخدمة.` : undefined}
        confirmLabel="فك الارتباط"
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
