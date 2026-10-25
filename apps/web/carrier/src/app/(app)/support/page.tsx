'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
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
  CURRENT_CARRIER_ID, formatRelative, ticketsFor,
  type TicketStatus, type TicketPriority, type TicketCategory,
} from '@naqla/shared-utils';

const STATUS_LABEL_KEYS: Record<string, string> = {
  OPEN: 'support.status.OPEN', IN_PROGRESS: 'support.status.IN_PROGRESS', WAITING_USER: 'support.status.WAITING_USER',
  RESOLVED: 'support.status.RESOLVED', CLOSED: 'support.status.CLOSED',
};
const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  OPEN: 'warning', IN_PROGRESS: 'default', WAITING_USER: 'destructive',
  RESOLVED: 'success', CLOSED: 'outline',
};
const PRIORITY_LABEL_KEYS: Record<string, string> = {
  LOW: 'support.priority.LOW', MEDIUM: 'support.priority.MEDIUM', HIGH: 'support.priority.HIGH', URGENT: 'support.priority.URGENT',
};
const PRIORITY_BADGE: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  LOW: 'outline', MEDIUM: 'default', HIGH: 'warning', URGENT: 'destructive',
};
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  ACCOUNT: 'support.categoryLabels.ACCOUNT', BILLING: 'support.categoryLabels.BILLING', ORDER: 'support.categoryLabels.ORDER',
  TECHNICAL: 'support.categoryLabels.TECHNICAL', KYC: 'support.categoryLabels.KYC', DRIVER: 'support.categoryLabels.DRIVER', OTHER: 'support.categoryLabels.OTHER',
  GENERAL: 'support.categoryLabels.GENERAL',
};
const API_CATEGORIES: { value: string; labelKey: string }[] = [
  { value: 'TECHNICAL', labelKey: 'support.categoryLabels.TECHNICAL' },
  { value: 'BILLING',   labelKey: 'support.categoryLabels.BILLING' },
  { value: 'ACCOUNT',   labelKey: 'support.categoryLabels.ACCOUNT' },
  { value: 'ORDER',     labelKey: 'support.categoryLabels.ORDER' },
  { value: 'GENERAL',   labelKey: 'support.categoryLabels.GENERAL' },
];
type ApiTicket = { id: string; subject: string; category: string; status: string; createdAt: string; updatedAt: string };

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'];

export default function CarrierSupportPage() {
  const t = useTranslations('carrier');
  const { data: ticketsData, mutate: mutateTickets } = useSWR<ApiTicket[]>('/support/tickets', fetcher);
  const myTickets = useMemo<(ApiTicket | ReturnType<typeof ticketsFor>[number])[]>(() => {
    if (Array.isArray(ticketsData) && ticketsData.length > 0) return ticketsData;
    return ticketsFor('CARRIER', CURRENT_CARRIER_ID);
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
      notify.success(t('support.toastCreatedTitle'), t('support.toastCreatedBody'));
      setCreateOpen(false);
      setForm({ subject: '', category: '', description: '' });
    } catch (err) {
      notify.error(err, t('support.toastErrorTitle'));
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
          title={t('support.channelChatTitle')}
          subtitle={t('support.channelChatSubtitle')}
          cta={t('support.channelChatCta')}
          tone="bg-primary/10 text-primary"
        />
        <ChannelCard
          icon={Phone}
          title={t('support.channelPhoneTitle')}
          subtitle={t('support.channelPhoneSubtitle')}
          cta="+966 920 000 000"
          tone="bg-info/15 text-info"
        />
        <ChannelCard
          icon={Mail}
          title={t('support.channelEmailTitle')}
          subtitle={t('support.channelEmailSubtitle')}
          cta="support@naqla.sa"
          tone="bg-success/15 text-success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('support.myTickets')}</CardTitle>
            <CardDescription>{t('support.ticketsCount', { count: myTickets.length })}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myTickets.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <LifeBuoy className="h-10 w-10 mx-auto mb-3 opacity-40" />
                {t('support.emptyTickets')}
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
                        <div className="font-medium text-sm">{tk.subject}</div>
                        <Badge variant={STATUS_BADGE[tk.status] ?? 'default'}>{STATUS_LABEL_KEYS[tk.status] ? t(STATUS_LABEL_KEYS[tk.status]) : tk.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {tk.id}
                        {tk.messageCount != null && <> · {t('support.messagesCount', { count: tk.messageCount })}</>}
                        {tk.orderId && <> · <Link href={`/orders/${tk.orderId}`} className="text-primary">{tk.orderId}</Link></>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{CATEGORY_LABEL_KEYS[tk.category] ? t(CATEGORY_LABEL_KEYS[tk.category]) : tk.category}</Badge>
                        <Badge variant={PRIORITY_BADGE[priority]}>{PRIORITY_LABEL_KEYS[priority] ? t(PRIORITY_LABEL_KEYS[priority]) : priority}</Badge>
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
                    <TableHead>{t('support.colLastUpdate')}</TableHead>
                    <TableHead>{t('support.colStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTickets.map((ticket) => {
                    const tk = ticket as Partial<ReturnType<typeof ticketsFor>[number]> & ApiTicket;
                    const priority = tk.priority ?? 'MEDIUM';
                    return (
                      <TableRow key={tk.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{tk.subject}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {tk.id}
                            {tk.messageCount != null && <> · {t('support.messagesCount', { count: tk.messageCount })}</>}
                            {tk.orderId && <> · <Link href={`/orders/${tk.orderId}`} className="text-primary">{tk.orderId}</Link></>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{CATEGORY_LABEL_KEYS[tk.category] ? t(CATEGORY_LABEL_KEYS[tk.category]) : tk.category}</Badge>
                        </TableCell>
                        <TableCell><Badge variant={PRIORITY_BADGE[priority]}>{PRIORITY_LABEL_KEYS[priority] ? t(PRIORITY_LABEL_KEYS[priority]) : priority}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground"><Clock className="h-3 w-3 inline me-1" />{formatRelative(tk.updatedAt)}</TableCell>
                        <TableCell><Badge variant={STATUS_BADGE[tk.status] ?? 'default'}>{STATUS_LABEL_KEYS[tk.status] ? t(STATUS_LABEL_KEYS[tk.status]) : tk.status}</Badge></TableCell>
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
              {FAQ_KEYS.map((k) => (
                <details key={k} className="text-sm">
                  <summary className="font-medium cursor-pointer hover:text-primary py-1">{t(`support.faq.${k}`)}</summary>
                  <p className="text-muted-foreground text-xs mt-1 ps-3 leading-relaxed">{t(`support.faq.${k.replace('q', 'a')}`)}</p>
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
            <DialogDescription>{t('support.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('support.subject')}</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t('support.subjectPlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('support.category')}</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder={t('support.selectCategory')} /></SelectTrigger>
                <SelectContent>
                  {API_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('support.details')}</Label>
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
