'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Search, Wallet, Lock } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { FadeIn } from '@/components/ui/fade-in';
import { Currency } from '@/components/currency';
import { COMPANIES, WALLETS, companyById, formatRelative } from '@naqla/shared-utils';

export default function AdminWalletsPage() {
  const t = useTranslations('payments');
  const [kind, setKind] = useState<'ALL' | 'CLIENT' | 'CARRIER'>('ALL');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    let arr = WALLETS.map((w) => ({ wallet: w, company: companyById(w.companyId)! })).filter((r) => r.company);
    if (kind !== 'ALL') arr = arr.filter((r) => r.company.kind === kind);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((r) =>
        r.company.nameAr.includes(search) ||
        r.company.crNumber.includes(search) ||
        r.company.nameEn.toLowerCase().includes(q),
      );
    }
    return arr;
  }, [kind, search]);

  const totalBalance = WALLETS.reduce((s, w) => s + w.balance, 0);
  const totalEscrow  = WALLETS.reduce((s, w) => s + w.escrowHeld, 0);

  return (
    <>
      <PageHeader
        eyebrow={t('wallets.eyebrow')}
        title={t('wallets.title')}
        subtitle={t('wallets.subtitle')}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          label={t('wallets.totalActiveBalances')}
          value={<Currency amount={totalBalance} />}
          hint={t('wallets.acrossWallets', { count: WALLETS.length })}
          icon={Wallet}
          tone="default"
          index={0}
        />
        <StatsCard
          label={t('wallets.heldInEscrow')}
          value={<Currency amount={totalEscrow} />}
          hint={t('wallets.awaitingRelease')}
          icon={Lock}
          tone="warning"
          index={1}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <Tabs value={kind} onValueChange={(v) => setKind(v as any)}>
          <TabsList>
            <TabsTrigger value="ALL">{t('wallets.tabAll', { count: WALLETS.length })}</TabsTrigger>
            <TabsTrigger value="CLIENT">{t('wallets.tabClients', { count: WALLETS.filter((w) => companyById(w.companyId)?.kind === 'CLIENT').length })}</TabsTrigger>
            <TabsTrigger value="CARRIER">{t('wallets.tabCarriers', { count: WALLETS.filter((w) => companyById(w.companyId)?.kind === 'CARRIER').length })}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-80">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('wallets.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
      </div>

      <FadeIn delay={0.08}>
      <Card>
        <CardContent className="p-0">
          {/* Mobile: app-like card list */}
          <div className="md:hidden divide-y">
            {rows.map(({ wallet, company }) => (
              <Link key={wallet.id} href={`/wallets/${company.id}`} className="block p-4 transition-colors active:bg-muted/60">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{company.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{company.nameAr}</span>
                      <Badge variant={company.kind === 'CLIENT' ? 'default' : 'success'}>
                        {company.kind === 'CLIENT' ? t('wallets.client') : t('wallets.carrier')}
                      </Badge>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground truncate">{wallet.id}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="num text-xs text-muted-foreground">{formatRelative(wallet.updatedAt)}</span>
                  <div className="text-end">
                    <div className="text-sm font-semibold"><Currency amount={wallet.balance} /></div>
                    {wallet.escrowHeld > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {t('wallets.colEscrowHeld')}: <Currency amount={wallet.escrowHeld} />
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('wallets.colCompany')}</TableHead>
                <TableHead>{t('wallets.colType')}</TableHead>
                <TableHead className="text-end">{t('wallets.colAvailableBalance')}</TableHead>
                <TableHead className="text-end">{t('wallets.colEscrowHeld')}</TableHead>
                <TableHead>{t('wallets.colLastUpdate')}</TableHead>
                <TableHead className="text-end"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ wallet, company }) => (
                <TableRow key={wallet.id} className="cursor-pointer" onClick={() => (window.location.href = `/wallets/${company.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{company.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{company.nameAr}</div>
                        <div className="text-xs font-mono text-muted-foreground">{wallet.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.kind === 'CLIENT' ? 'default' : 'success'}>
                      {company.kind === 'CLIENT' ? t('wallets.client') : t('wallets.carrier')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end"><Currency amount={wallet.balance} /></TableCell>
                  <TableCell className="text-end">
                    {wallet.escrowHeld > 0 ? <Currency amount={wallet.escrowHeld} /> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatRelative(wallet.updatedAt)}</TableCell>
                  <TableCell className="text-end">
                    <Link href={`/wallets/${company.id}`}>
                      <Button variant="ghost" size="sm">
                        {t('wallets.manageWallet')}
                        <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                      </Button>
                    </Link>
                  </TableCell>
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
