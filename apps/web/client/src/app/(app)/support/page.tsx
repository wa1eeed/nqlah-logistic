'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
  Clock, HelpCircle, LifeBuoy, Loader2, Mail, MessageSquare, Phone, Plus,
} from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import {
  CURRENT_CLIENT_ID, formatRelative, ticketsFor,
  type TicketStatus, type TicketPriority, type TicketCategory,
} from '@naqla/shared-utils';

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  OPEN: 'warning', IN_PROGRESS: 'default', WAITING_USER: 'destructive',
  RESOLVED: 'success', CLOSED: 'outline',
};
const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
};

// Backend SupportTicketCategory enum — keep in sync with prisma schema.
const API_CATEGORY_VALUES = ['TECHNICAL', 'BILLING', 'ACCOUNT', 'ORDER', 'GENERAL'];

type ApiTicket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function ClientSupportPage() {
  const t = useTranslations('client');
  const STATUS_LABELS: Record<string, string> = {
    OPEN: t('support.status.OPEN'), IN_PROGRESS: t('support.status.IN_PROGRESS'),
    WAITING_USER: t('support.status.WAITING_USER'), RESOLVED: t('support.status.RESOLVED'),
    CLOSED: t('support.status.CLOSED'),
  };
  const PRIORITY_LABELS: Record<string, string> = {
    LOW: t('support.priority.LOW'), MEDIUM: t('support.priority.MEDIUM'),
    HIGH: t('support.priority.HIGH'), URGENT: t('support.priority.URGENT'),
  };
  const CATEGORY_LABELS: Record<string, string> = {
    ACCOUNT: t('support.category.ACCOUNT'), BILLING: t('support.category.BILLING'),
    ORDER: t('support.category.ORDER'), TECHNICAL: t('support.category.TECHNICAL'),
    KYC: t('support.category.KYC'), DRIVER: t('support.category.DRIVER'),
    OTHER: t('support.category.OTHER'), GENERAL: t('support.category.GENERAL'),
  };
  const FAQ = [
    { q: t('support.faq1q'), a: t('support.faq1a') },
    { q: t('support.faq2q'), a: t('support.faq2a') },
    { q: t('support.faq3q'), a: t('support.faq3a') },
    { q: t('support.faq4q'), a: t('support.faq4a') },
  ];
  const API_CATEGORIES = API_CATEGORY_VALUES.map((value) => ({
    value, label: t(`support.category.${value}`),
  }));

  // Live tickets — backend returns the caller's tickets scoped by company.
  const { data: ticketsData, mutate: mutateTickets } = useSWR<ApiTicket[]>('/support/tickets', fetcher);
  const myTickets = useMemo<(ApiTicket | (ReturnType<typeof ticketsFor>[number]))[]>(() => {
    if (Array.isArray(ticketsData) && ticketsData.length > 0) return ticketsData;
    return ticketsFor('CLIENT', CURRENT_CLIENT_ID);
  }, [ticketsData]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', category: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.subject || !form.category || !form.description.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/support/tickets', {
        subject: form.subject,
        category: form.category,
        description: form.description.trim(),
      });
      await mutateTickets();
      notify.success(t('support.toastCreatedTitle'), t('support.toastCreatedDesc'));
      setCreateOpen(false);
      setForm({ subject: '', category: '', description: '' });
    } catch (err) {
      notify.error(err, t('support.toastCreateFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('support.title')}
        subtitle={t('support.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('support.newTicket')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChannelCard
          icon={MessageSquare}
          title={t('support.chatTitle')}
          subtitle={t('support.chatSubtitle')}
          cta={t('support.chatCta')}
          tone="bg-primary/10 text-primary"
        />
        <ChannelCard
          icon={Phone}
          title={t('support.phoneTitle')}
          subtitle={t('support.phoneSubtitle')}
          cta="+966 920 000 000"
          tone="bg-info/15 text-info"
        />
        <ChannelCard
          icon={Mail}
          title={t('support.emailTitle')}
          subtitle={t('support.emailSubtitle')}
          cta="support@naqla.sa"
          tone="bg-success/15 text-success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('support.ticketsTitle')}</CardTitle>
            <CardDescription>{t('support.ticketsSubtitle', { count: myTickets.length })}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myTickets.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-40" />
                {t('support.ticketsEmpty')}
              </div>
            ) : (
             <>
              {/* Mobile: app-like card list */}
              <div className="md:hidden divide-y">
                {myTickets.map((ticket) => {
                  const tk = ticket as Partial<ReturnType<typeof ticketsFor>[number]> & ApiTicket;
                  const priority = tk.priority ?? 'MEDIUM';
                  return (
                    <div key={tk.id} className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">{tk.subject}</span>
                        <Badge variant={STATUS_BADGE[tk.status] ?? 'default'}>{STATUS_LABELS[tk.status] ?? tk.status}</Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono">
                        {tk.id}
                        {tk.messageCount != null && <> · {t('support.messageCount', { count: tk.messageCount })}</>}
                        {tk.orderId && <> · <Link href={`/orders/${tk.orderId}`} className="text-primary">{tk.orderId}</Link></>}
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{CATEGORY_LABELS[tk.category] ?? tk.category}</Badge>
                          <Badge variant={PRIORITY_BADGE[priority]}>{PRIORITY_LABELS[priority]}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline me-1" />{formatRelative(tk.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('support.colSubject')}</TableHead>
                    <TableHead>{t('support.colCategory')}</TableHead>
                    <TableHead>{t('support.colPriority')}</TableHead>
                    <TableHead>{t('support.colUpdated')}</TableHead>
                    <TableHead>{t('support.colStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTickets.map((ticket) => {
                    // Both API and mock shapes have id/subject/category/status/updatedAt.
                    // Mock additionally has priority/orderId/messageCount.
                    const tk = ticket as Partial<ReturnType<typeof ticketsFor>[number]> & ApiTicket;
                    const priority = tk.priority ?? 'MEDIUM';
                    return (
                      <TableRow key={tk.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{tk.subject}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {tk.id}
                            {tk.messageCount != null && <> · {t('support.messageCount', { count: tk.messageCount })}</>}
                            {tk.orderId && <> · <Link href={`/orders/${tk.orderId}`} className="text-primary">{tk.orderId}</Link></>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{CATEGORY_LABELS[tk.category] ?? tk.category}</Badge>
                        </TableCell>
                        <TableCell><Badge variant={PRIORITY_BADGE[priority]}>{PRIORITY_LABELS[priority]}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline me-1" />{formatRelative(tk.updatedAt)}</TableCell>
                        <TableCell><Badge variant={STATUS_BADGE[tk.status] ?? 'default'}>{STATUS_LABELS[tk.status] ?? tk.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
             </>
            )}
          </CardContent>
        </Card>

        {/* FAQ sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                {t('support.faqTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {FAQ.map((item, i) => (
                <details key={i} className="text-sm">
                  <summary className="font-medium cursor-pointer hover:text-primary py-1">{item.q}</summary>
                  <p className="text-muted-foreground text-xs mt-1 ps-3 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('support.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('support.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('support.fieldSubject')}</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t('support.subjectPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('support.colCategory')}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder={t('support.selectCategory')} /></SelectTrigger>
                <SelectContent>
                  {API_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('support.fieldDetails')}</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('support.detailsPlaceholder')}
                className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>{t('support.cancel')}</Button>
            <Button
              onClick={submit}
              disabled={!form.subject || !form.category || !form.description.trim() || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('support.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChannelCard({ icon: Icon, title, subtitle, cta, tone }: { icon: any; title: string; subtitle: string; cta: string; tone: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-start gap-3">
        <div className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold">{title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          <div className="mt-2 text-sm font-medium text-primary truncate">{cta}</div>
        </div>
      </CardContent>
    </Card>
  );
}
