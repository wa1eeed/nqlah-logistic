'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { PageTransition, FadeItem } from '@/components/page-transition';
import { EmptyState } from '@/components/empty-state';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { CURRENT_CLIENT_ID, formatDate, invoicesForClient } from '@naqla/shared-utils';

export default function ClientInvoicesPage() {
  const t = useTranslations('payments');
  const [tab, setTab] = useState('ALL');
  // GET /invoices — falls back to mock when API is unreachable.
  const { data } = useSWR<unknown>('/invoices', fetcher);
  const all = useMemo(() => {
    const arr =
      Array.isArray(data) ? data :
      Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items :
      [];
    return arr.length > 0 ? arr as ReturnType<typeof invoicesForClient> : invoicesForClient(CURRENT_CLIENT_ID);
  }, [data]);
  const rows = useMemo(() => (tab === 'ALL' ? all : all.filter((i) => i.status === tab)), [tab, all]);

  const paid = all.filter((i) => i.status === 'PAID');
  const issued = all.filter((i) => i.status === 'ISSUED');
  const overdue = all.filter((i) => i.status === 'OVERDUE');

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader title={t('invoicesPage.title')} subtitle={t('invoicesPage.subtitle')} />
      </FadeItem>

      <FadeItem>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            label={t('invoicesPage.totalPaid')}
            value={<Currency amount={paid.reduce((s, i) => s + i.total, 0)} />}
            hint={t('invoicesPage.invoiceCount', { count: paid.length })}
            icon={CheckCircle}
            tone="success"
          />
          <StatsCard
            label={t('invoicesPage.issuedUnpaid')}
            value={<Currency amount={issued.reduce((s, i) => s + i.total, 0)} />}
            hint={t('invoicesPage.invoiceCount', { count: issued.length })}
            icon={FileText}
            tone="default"
          />
          <StatsCard
            label={t('invoicesPage.overdueAmount')}
            value={<Currency amount={overdue.reduce((s, i) => s + i.total, 0)} />}
            hint={t('invoicesPage.invoiceCount', { count: overdue.length })}
            icon={AlertTriangle}
            tone="danger"
          />
        </div>
      </FadeItem>

      <FadeItem>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="ALL">{t('invoicesPage.tabAll')} <Badge variant="secondary" className="ms-1">{all.length}</Badge></TabsTrigger>
            <TabsTrigger value="PAID">{t('invoicesPage.tabPaid')} <Badge variant="secondary" className="ms-1">{paid.length}</Badge></TabsTrigger>
            <TabsTrigger value="ISSUED">{t('invoicesPage.tabIssued')} <Badge variant="secondary" className="ms-1">{issued.length}</Badge></TabsTrigger>
            <TabsTrigger value="OVERDUE">{t('invoicesPage.tabOverdue')} <Badge variant="secondary" className="ms-1">{overdue.length}</Badge></TabsTrigger>
          </TabsList>
        </Tabs>
      </FadeItem>

      <FadeItem>
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={t('invoicesPage.emptyTitle')}
                description={t('invoicesPage.emptyDescription')}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fields.invoiceNumber')}</TableHead>
                    <TableHead>{t('fields.order')}</TableHead>
                    <TableHead>{t('fields.issued')}</TableHead>
                    <TableHead>{t('fields.due')}</TableHead>
                    <TableHead className="text-end">{t('fields.amount')}</TableHead>
                    <TableHead className="text-end">{t('fields.vat')}</TableHead>
                    <TableHead className="text-end">{t('fields.total')}</TableHead>
                    <TableHead>{t('fields.status')}</TableHead>
                    <TableHead className="text-end"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs font-medium">{i.invoiceNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{i.orderId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(i.issuedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(i.dueAt)}</TableCell>
                      <TableCell className="text-end"><Currency amount={i.amount} /></TableCell>
                      <TableCell className="text-end"><Currency amount={i.vat} /></TableCell>
                      <TableCell className="text-end font-medium"><Currency amount={i.total} /></TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                      <TableCell className="text-end">
                        <Button variant="ghost" size="sm">
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}
