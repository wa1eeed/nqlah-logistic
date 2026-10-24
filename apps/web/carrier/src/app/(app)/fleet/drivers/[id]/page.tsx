'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, Calendar, CheckCircle2, Fingerprint, Hash, History, Link2, Link2Off,
  Phone, Route, Truck as TruckIcon, User, UserCog,
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
import { useFleetStore } from '@/stores/fleet-store';
import { notify } from '@/lib/notify';
import {
  DRIVERS, TRUCKS, auditForDriver, formatDate, tripsForDriver, type DriverStatus,
} from '@naqla/shared-utils';
import {
  AuditTimeline, ConfirmDialog, DRIVER_STATUS_OPTIONS, DriverStatusBadge, ExpiryBadge,
  FleetStatusSelect, TripsTimeline,
} from '@/components/fleet-bits';

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const assignMap = useFleetStore((s) => s.assign);
  const driverStatusMap = useFleetStore((s) => s.driverStatus);
  const truckStatusMap = useFleetStore((s) => s.truckStatus);
  const events = useFleetStore((s) => s.events);
  const assignDriver = useFleetStore((s) => s.assignDriver);
  const unassignDriver = useFleetStore((s) => s.unassignDriver);
  const setDriverStatus = useFleetStore((s) => s.setDriverStatus);

  const [assignOpen, setAssignOpen] = useState(false);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [pick, setPick] = useState('');

  const driver = DRIVERS.find((d) => d.id === params.id);

  if (!driver) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <User className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">السائق غير موجود</h3>
          <Button onClick={() => router.push('/fleet/drivers')} className="mt-4">عودة للسائقين</Button>
        </CardContent>
      </Card>
    );
  }

  const status: DriverStatus = driverStatusMap[driver.id] ?? driver.status;
  const truckId = Object.keys(assignMap).find((tid) => assignMap[tid] === driver.id) ?? null;
  const truck = TRUCKS.find((t) => t.id === truckId);
  const trips = tripsForDriver(driver.id);
  const audit = auditForDriver(driver.id, events);
  const initials = driver.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('');
  const pickTruck = TRUCKS.find((t) => t.id === pick);
  const done = trips.filter((t) => t.status === 'COMPLETED' || t.status === 'DELIVERED');
  const totalKm = trips.reduce((s, t) => s + t.distanceKm, 0);

  const doAssign = () => {
    if (!pick) return;
    assignDriver(pick, driver.id);
    notify.success('تم ربط الشاحنة', `${driver.fullName} → ${pickTruck?.code ?? ''}`);
    setAssignOpen(false);
    setPick('');
  };

  const doUnassign = () => {
    if (!truckId) return;
    unassignDriver(truckId);
    notify.success('تم فك الارتباط', `${driver.fullName} بدون شاحنة الآن`);
  };

  return (
    <>
      <PageHeader
        title={driver.fullName}
        subtitle={`سائق · ${driver.code} · رخصة ${driver.licenseClass}`}
        actions={
          <>
            <FleetStatusSelect
              value={status}
              options={DRIVER_STATUS_OPTIONS}
              onChange={(v) => {
                setDriverStatus(driver.id, v as DriverStatus);
                notify.success('تم تحديث حالة السائق', DRIVER_STATUS_OPTIONS.find((o) => o.value === v)?.label);
              }}
            />
            <Button variant="outline" onClick={() => router.push('/fleet/drivers')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> رجوع
            </Button>
          </>
        }
      />

      {/* Top: info + assigned truck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex flex-col items-center gap-3 text-center">
              <Avatar className="h-20 w-20"><AvatarFallback className="text-2xl">{initials}</AvatarFallback></Avatar>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold">{driver.fullName}</h2>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="num gap-1"><Hash className="h-3 w-3" />{driver.code}</Badge>
                  <DriverStatusBadge status={status} />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <InfoRow icon={Phone} label="الهاتف" value={<span className="num" dir="ltr">{driver.phone}</span>} />
              <InfoRow icon={Fingerprint} label="رقم الهوية" value={<span className="num">{driver.nationalId}</span>} />
              <InfoRow icon={UserCog} label="فئة الرخصة" value={driver.licenseClass} />
              <InfoRow icon={Calendar} label="انتهاء الرخصة" value={
                <span className="inline-flex items-center gap-2">
                  {formatDate(driver.licenseExpiry)}
                  <ExpiryBadge date={driver.licenseExpiry} />
                </span>
              } />
              <InfoRow icon={TruckIcon} label="إجمالي الرحلات" value={<span className="num">{driver.totalTrips}</span>} />
            </dl>
          </CardContent>
        </Card>

        {/* Assigned truck */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>الشاحنة المربوطة</CardTitle>
              {truck ? (
                <Button variant="ghost" size="sm" onClick={() => setConfirmUnassign(true)}><Link2Off className="h-4 w-4" /> فك</Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {truck ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="cursor-pointer" onClick={() => router.push(`/fleet/trucks/${truck.id}`)}>
                  {(() => { const p = parsePlateString(truck.plateNumber ?? ''); return <SaudiLicensePlate letters={p.letters} numbers={p.numbers} plateType="transport" size="card" />; })()}
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-start space-y-1">
                  <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                    <span className="font-semibold">{truck.code}</span>
                    <StatusBadge status={truckStatusMap[truck.id] ?? truck.status} />
                  </div>
                  <div className="text-sm text-muted-foreground num">{((truck.capacityKg ?? 0) / 1000).toFixed(0)} طن · موديل {truck.modelYear}</div>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => { setPick(truck.id); setAssignOpen(true); }}>
                    <Link2 className="h-4 w-4" /> تغيير الشاحنة
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <TruckIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  لا توجد شاحنة مربوطة
                </div>
                <Button size="sm" onClick={() => { setPick(''); setAssignOpen(true); }}>
                  <Link2 className="h-4 w-4" /> ربط شاحنة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trips" className="mt-2">
        <TabsList>
          <TabsTrigger value="trips"><Route className="h-4 w-4 me-1.5" /> الرحلات <Badge variant="secondary" className="ms-1.5">{trips.length}</Badge></TabsTrigger>
          <TabsTrigger value="audit"><History className="h-4 w-4 me-1.5" /> سجل النشاط <Badge variant="secondary" className="ms-1.5">{audit.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="trips">
          <Card>
            <CardHeader>
              <CardTitle>تايم‑لاين الرحلات</CardTitle>
              <CardDescription className="mt-1">
                {trips.length} رحلة · <span className="num">{done.length}</span> منجزة · إجمالي مسافة <span className="num">{totalKm.toLocaleString('en-US')}</span> كم
              </CardDescription>
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
      </Tabs>

      {/* Assign truck dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ربط شاحنة بالسائق {driver.fullName}</DialogTitle>
            <DialogDescription>اختر شاحنة. إذا كان لها سائق آخر سيُستبدل تلقائيًا.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder="اختر شاحنة" /></SelectTrigger>
              <SelectContent>
                {TRUCKS.map((t) => {
                  const curDriverId = assignMap[t.id];
                  const curDriver = curDriverId ? DRIVERS.find((d) => d.id === curDriverId)?.fullName : null;
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      {t.code} · {t.plateNumber}{curDriver && curDriverId !== driver.id ? ` (مع ${curDriver})` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>إلغاء</Button>
            <Button onClick={() => { if (pick) setConfirmAssign(true); }} disabled={!pick}><CheckCircle2 className="h-4 w-4" /> ربط</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm assign */}
      <ConfirmDialog
        open={confirmAssign}
        onOpenChange={setConfirmAssign}
        title="تأكيد ربط الشاحنة"
        description={pickTruck ? `سيتم ربط ${driver.fullName} بالشاحنة ${pickTruck.code}${assignMap[pickTruck.id] && assignMap[pickTruck.id] !== driver.id ? ` واستبدال سائقها الحالي (${DRIVERS.find((d) => d.id === assignMap[pickTruck.id])?.fullName})` : ''}.` : undefined}
        confirmLabel="تأكيد الربط"
        onConfirm={doAssign}
      />

      {/* Confirm unassign */}
      <ConfirmDialog
        open={confirmUnassign}
        onOpenChange={setConfirmUnassign}
        title="فك ارتباط الشاحنة"
        description={truck ? `سيتم فك ارتباط ${driver.fullName} عن الشاحنة ${truck.code} وتحويله إلى خارج الخدمة.` : undefined}
        confirmLabel="فك الارتباط"
        destructive
        onConfirm={doUnassign}
      />
    </>
  );
}

function InfoRow({ label, value, icon: Icon }: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {label}
      </dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
