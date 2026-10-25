'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Building2, Plus, Search, Truck, User as UserIcon, Users, ShieldCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { MiniStat } from '@/components/ui/mini-stat';
import { FadeIn } from '@/components/ui/fade-in';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { COMPANIES, formatDate, normalizeCompanyList, type Company } from '@naqla/shared-utils';

export default function AdminCompaniesPage() {
  const t = useTranslations('companies');
  const [filter, setFilter] = useState<'ALL' | 'CLIENT' | 'CARRIER'>('ALL');
  const [search, setSearch] = useState('');

  // GET /admin/companies — the API returns Prisma-shaped rows (`type`,
  // `createdAt`, `kycStatus: PENDING`); normalize them into the mock `Company`
  // shape the UI reads (`kind`, `joinedAt`, `kycStatus: PENDING_VERIFICATION`),
  // so the CLIENT/CARRIER tabs and counts work. Falls back to mock if API down.
  const { data } = useSWR<unknown>('/admin/companies', fetcher);
  const list: Company[] = useMemo(() => {
    const arr = normalizeCompanyList<Company>(data);
    return arr.length > 0 ? arr : COMPANIES;
  }, [data]);

  const counts = {
    ALL: list.length,
    CLIENT: list.filter((c) => c.kind === 'CLIENT').length,
    CARRIER: list.filter((c) => c.kind === 'CARRIER').length,
  };
  const approved = list.filter((c) => c.kycStatus === 'APPROVED').length;
  const pending = list.filter((c) => c.kycStatus === 'PENDING_VERIFICATION').length;

  const rows = useMemo(() => {
    let arr = filter === 'ALL' ? list : list.filter((c) => c.kind === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c) =>
        [c.nameAr, c.nameEn, c.crNumber, c.city].some((v) => v?.toString().toLowerCase().includes(q)),
      );
    }
    return arr;
  }, [list, filter, search]);

  return (
    <>
      <PageHeader
        eyebrow={t('list.eyebrow')}
        title={t('list.title')}
        subtitle={t('list.subtitle')}
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            {t('list.invite')}
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label={t('list.kpi.totalEntities')} value={counts.ALL} icon={Building2} index={0} />
        <MiniStat label={t('list.kpi.carriers')} value={counts.CARRIER} icon={Truck} tone="success" index={1} />
        <MiniStat label={t('list.kpi.kycApproved')} value={approved} icon={ShieldCheck} tone="success" index={2} />
        <MiniStat label={t('list.kpi.pendingVerification')} value={pending} icon={Clock} tone="warning" index={3} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="ALL">
              <Building2 className="h-3.5 w-3.5 me-1.5" />
              {t('list.tabs.all', { count: String(counts.ALL) })}
            </TabsTrigger>
            <TabsTrigger value="CLIENT">
              <Users className="h-3.5 w-3.5 me-1.5" />
              {t('list.tabs.clients', { count: String(counts.CLIENT) })}
            </TabsTrigger>
            <TabsTrigger value="CARRIER">
              <Truck className="h-3.5 w-3.5 me-1.5" />
              {t('list.tabs.carriers', { count: String(counts.CARRIER) })}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('list.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      <FadeIn delay={0.08}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('list.table.company')}</TableHead>
                  <TableHead>{t('list.table.type')}</TableHead>
                  <TableHead>{t('list.table.city')}</TableHead>
                  <TableHead>{t('list.table.kyc')}</TableHead>
                  <TableHead className="text-end">{t('list.table.indicator')}</TableHead>
                  <TableHead>{t('list.table.joined')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-14">
                      {t('list.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => (window.location.href = `/companies/${c.id}`)}>
                      <TableCell>
                        <Link href={`/companies/${c.id}`} className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{c.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium hover:text-primary transition-colors">{c.nameAr}</span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {c.accountType === 'INDIVIDUAL'
                                ? c.nationalId ? t('list.nationalIdPrefix', { id: c.nationalId }) : t('list.idPrefix', { id: c.id })
                                : c.crNumber ? `CR · ${c.crNumber}` : c.id}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={c.kind === 'CLIENT' ? 'default' : 'success'}>
                            {c.kind === 'CLIENT' ? t('kind.client') : t('kind.carrier')}
                          </Badge>
                          {c.accountType === 'INDIVIDUAL' && (
                            <Badge variant="outline" className="inline-flex items-center gap-1 w-fit">
                              <UserIcon className="h-3 w-3" /> {t('list.individual')}
                            </Badge>
                          )}
                          {c.kind === 'CARRIER' && (c.accountType ?? 'COMPANY') === 'COMPANY' && (
                            <Badge variant="outline" className="inline-flex items-center gap-1 w-fit">
                              <Building2 className="h-3 w-3" /> {t('list.company')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c.city}</TableCell>
                      <TableCell><StatusBadge status={c.kycStatus} /></TableCell>
                      <TableCell className="text-end">
                        {c.kind === 'CARRIER' ? (
                          <span className="text-xs text-muted-foreground num">
                            {t('list.trips', { count: (c.completedTrips ?? 0).toLocaleString('en-US') })}
                          </span>
                        ) : c.monthlyVolume ? (
                          <Currency amount={c.monthlyVolume} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.joinedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </FadeIn>
    </>
  );
}
