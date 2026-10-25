'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Building2, Plus, Search, Truck, User as UserIcon, Users, ShieldCheck, Clock, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { COMPANIES, formatDate, normalizeCompanyList, localizeCity, type Company } from '@naqla/shared-utils';

type EntityFilter = 'ALL' | 'COMPANY' | 'INDIVIDUAL';

/**
 * Admin list of one company kind (CLIENT or CARRIER) with Company/Individual
 * tabs. Shared by the /clients and /carriers pages. Company detail stays at the
 * shared /companies/[id] route.
 */
export function CompaniesList({ kind }: { kind: 'CLIENT' | 'CARRIER' }) {
  const t = useTranslations('companies');
  const [entity, setEntity] = useState<EntityFilter>('ALL');
  const [search, setSearch] = useState('');
  const isCarrier = kind === 'CARRIER';

  const { data } = useSWR<unknown>('/admin/companies', fetcher);
  const all: Company[] = useMemo(() => {
    const arr = normalizeCompanyList<Company>(data);
    return arr.length > 0 ? arr : COMPANIES;
  }, [data]);
  const list = useMemo(() => all.filter((c) => c.kind === kind), [all, kind]);
  const entityOf = (c: Company) => (c.accountType === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'COMPANY');

  // Group membership: carriers belong to a CarrierGroup (visibility), clients to
  // a PolicyGroup. Build a company-id → group-name map to tag each row.
  const { data: groupsData } = useSWR<Array<{ name: string; carrierIds?: string[]; clientIds?: string[] }>>(
    isCarrier ? '/policies/carrier-groups' : '/policies/groups', fetcher);
  const groupOf = useMemo(() => {
    const map = new Map<string, string>();
    (Array.isArray(groupsData) ? groupsData : []).forEach((g) => {
      (isCarrier ? g.carrierIds : g.clientIds)?.forEach((id) => map.set(id, g.name));
    });
    return (id: string) => map.get(id);
  }, [groupsData, isCarrier]);

  const counts = {
    ALL: list.length,
    COMPANY: list.filter((c) => entityOf(c) === 'COMPANY').length,
    INDIVIDUAL: list.filter((c) => entityOf(c) === 'INDIVIDUAL').length,
  };
  const approved = list.filter((c) => c.kycStatus === 'APPROVED').length;
  const pending = list.filter((c) => c.kycStatus === 'PENDING_VERIFICATION').length;

  const rows = useMemo(() => {
    let arr = entity === 'ALL' ? list : list.filter((c) => entityOf(c) === entity);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((c) => [c.nameAr, c.nameEn, c.crNumber, c.city].some((v) => v?.toString().toLowerCase().includes(q)));
    }
    return arr;
  }, [list, entity, search]);

  const idCell = (c: Company) =>
    c.accountType === 'INDIVIDUAL'
      ? c.nationalId ? t('list.nationalIdPrefix', { id: c.nationalId }) : t('list.idPrefix', { id: c.id })
      : c.crNumber ? `CR · ${c.crNumber}` : c.id;

  return (
    <>
      <PageHeader
        eyebrow={t(isCarrier ? 'carriersPage.eyebrow' : 'clientsPage.eyebrow')}
        title={t(isCarrier ? 'carriersPage.title' : 'clientsPage.title')}
        subtitle={t(isCarrier ? 'carriersPage.subtitle' : 'clientsPage.subtitle')}
        actions={<Button><Plus className="h-4 w-4" />{t('list.invite')}</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label={t(isCarrier ? 'carriersPage.total' : 'clientsPage.total')} value={counts.ALL} icon={isCarrier ? Truck : Users} index={0} />
        <MiniStat label={t('list.individuals')} value={counts.INDIVIDUAL} icon={UserIcon} tone="default" index={1} />
        <MiniStat label={t('list.kpi.kycApproved')} value={approved} icon={ShieldCheck} tone="success" index={2} />
        <MiniStat label={t('list.kpi.pendingVerification')} value={pending} icon={Clock} tone="warning" index={3} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={entity} onValueChange={(v) => setEntity(v as EntityFilter)}>
          <TabsList>
            <TabsTrigger value="ALL"><Building2 className="h-3.5 w-3.5 me-1.5" />{t('list.tabs.all', { count: String(counts.ALL) })}</TabsTrigger>
            <TabsTrigger value="COMPANY"><Building2 className="h-3.5 w-3.5 me-1.5" />{t('list.tabs.companies', { count: String(counts.COMPANY) })}</TabsTrigger>
            <TabsTrigger value="INDIVIDUAL"><UserIcon className="h-3.5 w-3.5 me-1.5" />{t('list.tabs.individuals', { count: String(counts.INDIVIDUAL) })}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-80">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('list.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      </div>

      <FadeIn delay={0.08}>
        <Card>
          <CardContent className="p-0">
            {/* Mobile cards */}
            <div className="md:hidden divide-y">
              {rows.length === 0 ? (
                <div className="text-center text-muted-foreground py-14">{t('list.empty')}</div>
              ) : rows.map((c) => (
                <Link key={c.id} href={`/companies/${c.id}`} className="block p-4 transition-colors active:bg-muted/60">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback>{c.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{c.nameAr}</span>
                        <StatusBadge status={c.kycStatus} />
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate">{idCell(c)}</div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="inline-flex items-center gap-1">
                        {c.accountType === 'INDIVIDUAL' ? <><UserIcon className="h-3 w-3" />{t('list.individual')}</> : <><Building2 className="h-3 w-3" />{t('list.company')}</>}
                      </Badge>
                      {groupOf(c.id) && (
                        <Badge variant="secondary" className="inline-flex items-center gap-1">
                          <SlidersHorizontal className="h-3 w-3" />{groupOf(c.id)}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{localizeCity(c.city)}</span>
                  </div>
                  <div className="mt-1.5 num text-xs text-muted-foreground">{formatDate(c.joinedAt)}</div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
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
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-14">{t('list.empty')}</TableCell></TableRow>
                  ) : rows.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => (window.location.href = `/companies/${c.id}`)}>
                      <TableCell>
                        <Link href={`/companies/${c.id}`} className="flex items-center gap-3">
                          <Avatar><AvatarFallback>{c.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback></Avatar>
                          <div className="flex flex-col leading-tight">
                            <span className="font-medium hover:text-primary transition-colors">{c.nameAr}</span>
                            <span className="text-xs font-mono text-muted-foreground">{idCell(c)}</span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className="inline-flex items-center gap-1 w-fit">
                            {c.accountType === 'INDIVIDUAL' ? <><UserIcon className="h-3 w-3" />{t('list.individual')}</> : <><Building2 className="h-3 w-3" />{t('list.company')}</>}
                          </Badge>
                          {groupOf(c.id) && (
                            <Badge variant="secondary" className="inline-flex items-center gap-1 w-fit">
                              <SlidersHorizontal className="h-3 w-3" />{groupOf(c.id)}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{localizeCity(c.city)}</TableCell>
                      <TableCell><StatusBadge status={c.kycStatus} /></TableCell>
                      <TableCell className="text-end">
                        {isCarrier ? (
                          <span className="text-xs text-muted-foreground num">{t('list.trips', { count: (c.completedTrips ?? 0).toLocaleString('en-US') })}</span>
                        ) : c.monthlyVolume ? <Currency amount={c.monthlyVolume} /> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.joinedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </>
  );
}
