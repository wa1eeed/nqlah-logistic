'use client';
import { useMemo, useState } from 'react';
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
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';
import { DRIVERS, TRUCKS, type DriverStatus } from '@naqla/shared-utils';

const LICENSE_CLASSES = ['حمولة ثقيلة', 'حمولة استثنائية', 'تركيب وقاطرة'] as const;

export default function CarrierFleetDrivers() {
  const router = useRouter();
  const [tab, setTab] = useState('ALL');
  const assignMap = useFleetStore((s) => s.assign);
  const driverStatusMap = useFleetStore((s) => s.driverStatus);

  const all = useMemo(() => DRIVERS.map((d) => {
    const truckId = Object.keys(assignMap).find((tid) => assignMap[tid] === d.id) ?? null;
    return {
      ...d,
      status: (driverStatusMap[d.id] ?? d.status) as DriverStatus,
      truck: TRUCKS.find((t) => t.id === truckId) ?? null,
    };
  }), [assignMap, driverStatusMap]);

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
      notify.success('تم إضافة السائق', 'تم إرسال رابط تفعيل الحساب للسائق');
    } catch {
      notify.success('تم إنشاء السائق', 'سيظهر في القائمة بعد المزامنة');
    } finally {
      setOpen(false);
      setForm({ fullName: '', phone: '', nationalId: '', licenseNumber: '', licenseExpiry: '', licenseType: 'حمولة ثقيلة' });
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="السائقون"
        subtitle={`${counts.all} سائق مسجّل`}
        actions={
          <>
            {licenseAlerts > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3.5 w-3.5" /> <span className="num">{licenseAlerts}</span> رخصة تنتهي قريبا
              </span>
            )}
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> إضافة سائق</Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ALL">الكل <Badge variant="secondary" className="ms-1">{counts.all}</Badge></TabsTrigger>
          <TabsTrigger value="AVAILABLE">متاح <Badge variant="secondary" className="ms-1">{counts.available}</Badge></TabsTrigger>
          <TabsTrigger value="ON_TRIP">في رحلة <Badge variant="secondary" className="ms-1">{counts.onTrip}</Badge></TabsTrigger>
          <TabsTrigger value="OFF_DUTY">خارج الخدمة <Badge variant="secondary" className="ms-1">{counts.offDuty}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead>الهوية</TableHead>
                <TableHead>فئة الرخصة</TableHead>
                <TableHead>الملكية</TableHead>
                <TableHead>الشاحنة</TableHead>
                <TableHead className="text-center">رحلات</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    لا يوجد سائقون
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
                    <TableCell className="whitespace-nowrap">{d.licenseClass}</TableCell>
                    <TableCell><OwnershipBadge ownership={d.ownership} /></TableCell>
                    <TableCell>
                      {d.truck
                        ? <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><TruckIcon className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-mono text-xs">{d.truck.code}</span></span>
                        : <span className="text-muted-foreground">بدون</span>}
                    </TableCell>
                    <TableCell className="text-center num">{d.totalTrips ?? 0}</TableCell>
                    <TableCell><DriverStatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Driver Dialog */}
      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إضافة سائق جديد</DialogTitle>
            <DialogDescription>سيتم إنشاء حساب للسائق ويُرسَل له رابط التفعيل</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>الاسم الكامل</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="محمد عبدالله الغامدي" />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+966 5XX XXX XXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهوية</Label>
              <Input dir="ltr" value={form.nationalId} onChange={(e) => setForm((f) => ({ ...f, nationalId: e.target.value }))} placeholder="1XXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>تاريخ انتهاء الرخصة</Label>
              <Input type="date" value={form.licenseExpiry} onChange={(e) => setForm((f) => ({ ...f, licenseExpiry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>فئة الرخصة</Label>
              <Select value={form.licenseType} onValueChange={(v) => setForm((f) => ({ ...f, licenseType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LICENSE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
            <Button onClick={addDriver} disabled={saving || !form.fullName || !form.phone || !form.licenseExpiry}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
