'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
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
import { StatsCard } from '@/components/stats-card';
import { DRIVERS, carrierById, formatDate, truckById } from '@naqla/shared-utils';

export default function AdminDriversPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return DRIVERS.filter((d) => {
      if (status !== 'ALL' && d.status !== status) return false;
      if (q) {
        const hay = `${d.fullName} ${d.nationalId} ${d.phone} ${carrierById(d.carrierId)?.nameAr ?? ''}`;
        if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [q, status]);

  const total = DRIVERS.length;
  const onTrip = DRIVERS.filter((d) => d.status === 'ON_TRIP').length;
  const available = DRIVERS.filter((d) => d.status === 'AVAILABLE').length;
  const offDuty = DRIVERS.filter((d) => d.status === 'OFF_DUTY').length;

  return (
    <>
      <PageHeader
        title="كل السائقين في المنصة"
        subtitle="قائمة موحّدة للسائقين عبر جميع شركات النقل"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard label="إجمالي السائقين" value={total.toLocaleString('en-US')} icon={Users} />
        <StatsCard label="في رحلة"        value={onTrip.toLocaleString('en-US')} icon={Users} />
        <StatsCard label="متاحون"          value={available.toLocaleString('en-US')} icon={Users} tone="success" />
        <StatsCard label="خارج الخدمة"     value={offDuty.toLocaleString('en-US')} icon={Users} tone="warning" />
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث باسم، هوية، جوال، أو ناقل..."
                className="pe-10"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحالات</SelectItem>
                <SelectItem value="AVAILABLE">متاح</SelectItem>
                <SelectItem value="ON_TRIP">في رحلة</SelectItem>
                <SelectItem value="OFF_DUTY">خارج الخدمة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>السائق</TableHead>
                <TableHead>الناقل</TableHead>
                <TableHead>الهوية</TableHead>
                <TableHead>فئة الرخصة</TableHead>
                <TableHead>صلاحية الرخصة</TableHead>
                <TableHead>الشاحنة</TableHead>
                <TableHead>الرحلات</TableHead>
                <TableHead>الجوال</TableHead>
                <TableHead>الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const carrier = carrierById(d.carrierId);
                  const truck = truckById(d.assignedTruckId);
                  const initials = d.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('');
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{d.fullName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{d.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/companies/${d.carrierId}`} className="hover:text-primary text-sm">
                          {carrier?.nameAr ?? '—'}
                        </Link>
                      </TableCell>
                      <TableCell className="num text-xs">{d.nationalId}</TableCell>
                      <TableCell className="text-xs">{d.licenseClass}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(d.licenseExpiry)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{truck?.plateNumber ?? '—'}</TableCell>
                      <TableCell className="num text-sm">{d.totalTrips.toLocaleString('en-US')}</TableCell>
                      <TableCell>
                        <a href={`tel:${d.phone}`} className="text-xs num inline-flex items-center gap-1 hover:text-primary" dir="ltr">
                          <Phone className="h-3 w-3" /> {d.phone}
                        </a>
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
