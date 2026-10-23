'use client';
import { useState, useMemo } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Download, FileSpreadsheet, FileText, ShieldCheck, Wallet,
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
import { PageTransition, FadeItem } from '@/components/page-transition';
import { StatusBadge } from '@/components/status-badge';
import { exportPDF, exportXLSX } from '@/lib/export';
import {
  CURRENT_CLIENT_ID, formatDate, invoicesForClient, transactionsForCompany,
  walletForCompany, type TxKind, type WalletTransaction,
} from '@naqla/shared-utils';

const TX_LABEL: Record<TxKind, string> = {
  CREDIT: 'إيداع', DEBIT: 'خصم', ESCROW_HOLD: 'حجز Escrow',
  ESCROW_RELEASE: 'إفراج Escrow', REFUND: 'استرداد', COMMISSION: 'عمولة', PAYOUT: 'تحويل بنكي',
};
const TX_IN: TxKind[] = ['CREDIT', 'ESCROW_RELEASE', 'REFUND'];

export default function ClientFinancePage() {
  const wallet = walletForCompany(CURRENT_CLIENT_ID);
  const txs = transactionsForCompany(CURRENT_CLIENT_ID);
  const invoices = invoicesForClient(CURRENT_CLIENT_ID);

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

  const exportColumns = [
    { key: 'at',           label: 'التاريخ',      format: (r: WalletTransaction) => formatDate(r.at, 'd MMM yyyy · HH:mm') },
    { key: 'kind',         label: 'النوع',        format: (r: WalletTransaction) => TX_LABEL[r.kind] },
    { key: 'description',  label: 'الوصف' },
    { key: 'amount',       label: 'المبلغ',       format: (r: WalletTransaction) => (TX_IN.includes(r.kind) ? '+ ' : '- ') + r.amount.toLocaleString('en-US') },
    { key: 'balanceAfter', label: 'الرصيد بعد',   format: (r: WalletTransaction) => r.balanceAfter.toLocaleString('en-US') },
  ];

  const handlePDF = () => exportPDF({
    filename: `statement-${Date.now()}.pdf`,
    header: { brand: 'Naqla Logistics', subtitle: 'Client Statement', reportTitle: 'Statement of Account' },
    footer: { closingBalance: wallet?.balance ?? 0, totalCredit, totalDebit },
    columns: exportColumns as any,
    rows: filteredTxs,
  });
  const handleXLSX = () => exportXLSX({ filename: `statement-${Date.now()}.xlsx`, columns: exportColumns as any, rows: filteredTxs });

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader title="الشؤون المالية" subtitle="محفظتك، كشف الحساب، والفواتير" />
      </FadeItem>

      <FadeItem>
      <Tabs defaultValue="wallet">
        <TabsList>
          <TabsTrigger value="wallet">المحفظة</TabsTrigger>
          <TabsTrigger value="statement">كشف الحساب</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
        </TabsList>

        {/* Wallet */}
        <TabsContent value="wallet" className="space-y-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Balance hero */}
            <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-primary-foreground shadow-tile lg:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-white/70">
                    <Wallet className="h-4 w-4" /> الرصيد المتاح
                  </p>
                  <p className="num mt-3 text-5xl font-extrabold tracking-tight">
                    {(wallet?.balance ?? 0).toLocaleString('en-US')}
                    <span className="ms-2 text-xl font-semibold text-[hsl(var(--mint))]">ر.س.</span>
                  </p>
                </div>
                <Button className="shrink-0 bg-[hsl(var(--mint))] text-primary hover:bg-[hsl(var(--mint))]/90">
                  شحن المحفظة
                </Button>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--mint))]" /> محجوز في Escrow
                  </div>
                  <div className="num mt-1 text-lg font-bold">{(wallet?.escrowHeld ?? 0).toLocaleString('en-US')} <span className="text-xs font-normal text-white/60">ر.س.</span></div>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-white/60">
                    <Wallet className="h-3.5 w-3.5 text-[hsl(var(--mint))]" /> صاف متاح للسحب
                  </div>
                  <div className="num mt-1 text-lg font-bold">{Math.max(0, (wallet?.balance ?? 0) - (wallet?.escrowHeld ?? 0)).toLocaleString('en-US')} <span className="text-xs font-normal text-white/60">ر.س.</span></div>
                </div>
              </div>
            </div>
            {/* In / Out this period */}
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/12 text-success"><ArrowDownLeft className="h-5 w-5" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">إجمالي الإيداعات</div>
                  <div className="num text-lg font-extrabold text-success">{totalCredit.toLocaleString('en-US')} <span className="text-xs font-normal text-muted-foreground">ر.س.</span></div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-destructive/12 text-destructive"><ArrowUpRight className="h-5 w-5" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">إجمالي الخصومات</div>
                  <div className="num text-lg font-extrabold text-destructive">{totalDebit.toLocaleString('en-US')} <span className="text-xs font-normal text-muted-foreground">ر.س.</span></div>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>آخر 5 معاملات</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="text-end">المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.slice(0, 5).map((tx) => {
                    const isIn = TX_IN.includes(tx.kind);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(tx.at, 'd MMM · HH:mm')}</TableCell>
                        <TableCell><Badge variant={isIn ? 'success' : 'destructive'}>{TX_LABEL[tx.kind]}</Badge></TableCell>
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

        {/* Statement */}
        <TabsContent value="statement" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle>كشف الحساب</CardTitle>
                  <CardDescription className="mt-1">جميع المعاملات على محفظتك</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handlePDF}>
                    <Download className="h-4 w-4" /> PDF
                  </Button>
                  <Button variant="outline" onClick={handleXLSX}>
                    <FileSpreadsheet className="h-4 w-4" /> Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="space-y-2">
                  <Label htmlFor="from">من تاريخ</Label>
                  <Input id="from" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to">إلى تاريخ</Label>
                  <Input id="to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <StatMini icon={ArrowDownLeft} label="إجمالي الإيداعات" value={totalCredit} tone="success" />
                <StatMini icon={ArrowUpRight}   label="إجمالي الخصومات" value={totalDebit}  tone="danger" />
                <StatMini icon={Wallet}         label="الرصيد الحالي"   value={wallet?.balance ?? 0} tone="default" />
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead className="text-end">المبلغ</TableHead>
                    <TableHead className="text-end">الرصيد بعد</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTxs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">لا توجد معاملات في هذه الفترة</TableCell></TableRow>
                  ) : (
                    filteredTxs.map((tx) => {
                      const isIn = TX_IN.includes(tx.kind);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(tx.at, 'd MMM · HH:mm')}</TableCell>
                          <TableCell><Badge variant={isIn ? 'success' : 'destructive'}>{TX_LABEL[tx.kind]}</Badge></TableCell>
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

        {/* Invoices */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader><CardTitle>فواتيري</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم</TableHead>
                    <TableHead>الطلب</TableHead>
                    <TableHead>الإصدار</TableHead>
                    <TableHead>الاستحقاق</TableHead>
                    <TableHead className="text-end">الإجمالي</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-end"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs font-medium">{i.invoiceNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{i.orderId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(i.issuedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(i.dueAt)}</TableCell>
                      <TableCell className="text-end"><Currency amount={i.total} /></TableCell>
                      <TableCell><StatusBadge status={i.status} /></TableCell>
                      <TableCell className="text-end">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-3.5 w-3.5" />
                          PDF
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </FadeItem>
    </PageTransition>
  );
}

function StatMini({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone: 'success' | 'danger' | 'default' }) {
  const TONES = { success: 'bg-success/15 text-success', danger: 'bg-destructive/15 text-destructive', default: 'bg-primary/10 text-primary' };
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md shrink-0 ${TONES[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-bold num">{value.toLocaleString('en-US')} <span className="text-xs text-muted-foreground font-normal">ر.س.</span></div>
      </div>
    </div>
  );
}
