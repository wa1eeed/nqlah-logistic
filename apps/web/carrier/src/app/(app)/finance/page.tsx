'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowDownLeft, ArrowUpRight, Download, FileSpreadsheet, ShieldCheck, TrendingUp, Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { Currency } from '@/components/currency';
import { StatusBadge } from '@/components/status-badge';
import { exportPDF, exportXLSX } from '@/lib/export';
import {
  CURRENT_CARRIER_ID, companyById, formatDate, paymentsForCarrier,
  transactionsForCompany, walletForCompany, type TxKind, type WalletTransaction,
} from '@naqla/shared-utils';

const TX_IN: TxKind[] = ['CREDIT', 'ESCROW_RELEASE', 'REFUND'];

export default function CarrierFinancePage() {
  const t = useTranslations('payments');
  const txLabel = (kind: TxKind) => t(`finance.txKind.${kind}`);
  const wallet = walletForCompany(CURRENT_CARRIER_ID);
  const txs = transactionsForCompany(CURRENT_CARRIER_ID);
  const payments = paymentsForCarrier(CURRENT_CARRIER_ID);
  const heldPayments = payments.filter((p) => p.state === 'HELD');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const filteredTxs = useMemo(() => {
    let arr = txs;
    if (fromDate) arr = arr.filter((tx) => tx.at >= fromDate);
    if (toDate)   arr = arr.filter((tx) => tx.at <= toDate + 'T23:59:59Z');
    return arr;
  }, [txs, fromDate, toDate]);

  const totalCredit = filteredTxs.filter((tx) => TX_IN.includes(tx.kind)).reduce((s, tx) => s + tx.amount, 0);
  const totalDebit  = filteredTxs.filter((tx) => !TX_IN.includes(tx.kind)).reduce((s, tx) => s + tx.amount, 0);
  const totalHeldNet = heldPayments.reduce((s, p) => s + (p.amount - p.commission - p.vat), 0);

  const exportColumns = [
    { key: 'at',           label: t('fields.date'),         format: (r: WalletTransaction) => formatDate(r.at, 'd MMM yyyy · HH:mm') },
    { key: 'kind',         label: t('fields.type'),         format: (r: WalletTransaction) => txLabel(r.kind) },
    { key: 'description',  label: t('fields.description') },
    { key: 'amount',       label: t('fields.amount'),       format: (r: WalletTransaction) => (TX_IN.includes(r.kind) ? '+ ' : '- ') + r.amount.toLocaleString('en-US') },
    { key: 'balanceAfter', label: t('fields.balanceAfter'), format: (r: WalletTransaction) => r.balanceAfter.toLocaleString('en-US') },
  ];

  const handlePDF = () => exportPDF({
    filename: `statement-${Date.now()}.pdf`,
    header: { brand: 'Naqla Logistics', subtitle: 'Carrier Statement', reportTitle: 'Statement of Account' },
    footer: { closingBalance: wallet?.balance ?? 0, totalCredit, totalDebit },
    columns: exportColumns as any,
    rows: filteredTxs,
  });
  const handleXLSX = () => exportXLSX({ filename: `statement-${Date.now()}.xlsx`, columns: exportColumns as any, rows: filteredTxs });

  return (
    <>
      <PageHeader title={t('finance.title')} subtitle={t('finance.subtitle')} />

      <Tabs defaultValue="wallet">
        <TabsList>
          <TabsTrigger value="wallet">{t('finance.tabs.wallet')}</TabsTrigger>
          <TabsTrigger value="escrow">{t('finance.tabs.escrow')} ({heldPayments.length})</TabsTrigger>
          <TabsTrigger value="statement">{t('finance.tabs.statement')}</TabsTrigger>
        </TabsList>

        {/* Wallet */}
        <TabsContent value="wallet" className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col sm:flex-row items-start gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shrink-0">
                <Wallet className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{t('finance.availableBalance')}</p>
                <p className="text-4xl font-bold tracking-tight mt-1 num">
                  {(wallet?.balance ?? 0).toLocaleString('en-US')}
                  <span className="text-xl text-muted-foreground ms-2">{t('fields.sar')}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">{t('finance.inEscrow')}</span>
                    <span className="num font-medium">{totalHeldNet.toLocaleString('en-US')}</span>
                    <span className="text-muted-foreground">{t('fields.sar')}</span>
                  </span>
                </div>
              </div>
              <Button>{t('finance.requestPayout')}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('finance.last5Transactions')}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fields.date')}</TableHead>
                    <TableHead>{t('fields.type')}</TableHead>
                    <TableHead>{t('fields.description')}</TableHead>
                    <TableHead className="text-end">{t('fields.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.slice(0, 5).map((tx) => {
                    const isIn = TX_IN.includes(tx.kind);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(tx.at, 'd MMM · HH:mm')}</TableCell>
                        <TableCell><Badge variant={isIn ? 'success' : 'destructive'}>{txLabel(tx.kind)}</Badge></TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className={`text-end font-medium num ${isIn ? 'text-success' : 'text-destructive'}`}>
                          {isIn ? '+ ' : '- '}{tx.amount.toLocaleString('en-US')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escrow */}
        <TabsContent value="escrow" className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/15 text-warning shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('finance.escrowHeldLabel')}</p>
                <p className="text-3xl font-bold tracking-tight mt-1 num">
                  {totalHeldNet.toLocaleString('en-US')}
                  <span className="text-lg text-muted-foreground ms-2">{t('fields.sar')}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t('finance.escrowReleaseNote')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('finance.heldBreakdownTitle')}</CardTitle>
              <CardDescription className="mt-1">{t('finance.heldBreakdownDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fields.order')}</TableHead>
                    <TableHead>{t('fields.client')}</TableHead>
                    <TableHead className="text-end">{t('fields.totalAmount')}</TableHead>
                    <TableHead className="text-end">{t('fields.commission')}</TableHead>
                    <TableHead className="text-end">{t('fields.vat')}</TableHead>
                    <TableHead className="text-end">{t('fields.netProfit')}</TableHead>
                    <TableHead>{t('fields.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heldPayments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">{t('finance.noHeld')}</TableCell></TableRow>
                  ) : (
                    heldPayments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-primary">{p.orderId}</TableCell>
                        <TableCell>{companyById(p.clientId)?.nameAr ?? '—'}</TableCell>
                        <TableCell className="text-end"><Currency amount={p.amount} /></TableCell>
                        <TableCell className="text-end text-destructive"><Currency amount={-p.commission} /></TableCell>
                        <TableCell className="text-end text-destructive"><Currency amount={-p.vat} /></TableCell>
                        <TableCell className="text-end font-bold"><Currency amount={p.amount - p.commission - p.vat} /></TableCell>
                        <TableCell><StatusBadge status={p.state} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statement */}
        <TabsContent value="statement" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>{t('finance.statementTitle')}</CardTitle>
                  <CardDescription className="mt-1">{t('finance.statementDesc')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePDF}><Download className="h-4 w-4" /> PDF</Button>
                  <Button variant="outline" onClick={handleXLSX}><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="space-y-2"><Label htmlFor="from">{t('finance.from')}</Label><Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="to">{t('finance.to')}</Label><Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <StatMini icon={ArrowDownLeft}  label={t('finance.deposits')}       value={totalCredit} tone="success" />
                <StatMini icon={ArrowUpRight}    label={t('finance.withdrawals')}    value={totalDebit}  tone="danger" />
                <StatMini icon={TrendingUp}      label={t('finance.currentBalance')} value={wallet?.balance ?? 0} tone="default" />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fields.date')}</TableHead>
                    <TableHead>{t('fields.type')}</TableHead>
                    <TableHead>{t('fields.description')}</TableHead>
                    <TableHead className="text-end">{t('fields.amount')}</TableHead>
                    <TableHead className="text-end">{t('fields.balanceAfter')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTxs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">{t('finance.noTransactions')}</TableCell></TableRow>
                  ) : (
                    filteredTxs.map((tx) => {
                      const isIn = TX_IN.includes(tx.kind);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(tx.at, 'd MMM · HH:mm')}</TableCell>
                          <TableCell><Badge variant={isIn ? 'success' : 'destructive'}>{txLabel(tx.kind)}</Badge></TableCell>
                          <TableCell className="text-sm">
                            <div>{tx.description}</div>
                            {tx.note && <div className="text-xs text-muted-foreground mt-0.5">{tx.note}</div>}
                          </TableCell>
                          <TableCell className={`text-end font-medium num ${isIn ? 'text-success' : 'text-destructive'}`}>
                            {isIn ? '+ ' : '- '}{tx.amount.toLocaleString('en-US')}
                          </TableCell>
                          <TableCell className="text-end num">{tx.balanceAfter.toLocaleString('en-US')}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function StatMini({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'success' | 'danger' | 'default' }) {
  const t = useTranslations('payments');
  const TONES = { success: 'bg-success/15 text-success', danger: 'bg-destructive/15 text-destructive', default: 'bg-primary/10 text-primary' };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md shrink-0 ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-bold num">{value.toLocaleString('en-US')} <span className="text-xs text-muted-foreground font-normal">{t('fields.sar')}</span></div>
      </div>
    </div>
  );
}
