'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { notify } from '@/lib/notify';
import { useAuthStore } from '@/lib/auth-store';
import {
  ArrowRight, Building2, Calendar, CheckCircle2, Clock, History, MapPin, MessageSquare, Package,
  Send, ShieldCheck, Snowflake, Truck, UserSearch, Weight, X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import {
  ORDERS, TRUCKS, companyById, formatDate, formatDateTime, formatRelative, lastRound, localizeCity, proposalForOrder,
  pickupWindowLabel, normalizeOrder,
  CURRENT_CARRIER_ID,
  type DirectProposal,
} from '@naqla/shared-utils';

const TRUCK_LABEL_KEYS = [
  'SMALL_VAN', 'BOX_TRUCK', 'MEDIUM_FLATBED', 'LARGE_FLATBED',
  'REFRIGERATED', 'TANKER', 'LOWBED', 'CONTAINER_TRAILER',
] as const;

export default function CarrierOpportunityDetail() {
  const t = useTranslations('orders');
  const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
    TRUCK_LABEL_KEYS.map((k) => [k, t(`oppDetail.truckLabels.${k}`)]),
  );
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Real-API source of truth, with mock fallback (see api.ts interceptor).
  // normalizeOrder aliases Prisma fields (weight, requiredTruckType) to the
  // mock shape (weightKg, truckType) the UI accesses directly.
  const { data: orderData, mutate: refetchOrder } = useSWR<typeof ORDERS[number]>(
    params?.id ? `/orders/${params.id}` : null,
    fetcher,
  );
  const order = normalizeOrder(orderData) ?? ORDERS.find((o) => o.id === params.id);

  // Detect whether THIS carrier has already submitted a bid on this order.
  // Prefer the real companyId from the JWT (auth-store); fall back to the
  // dev-mock CURRENT_CARRIER_ID so the demo mode still highlights the bid.
  const authedCompanyId = useAuthStore((s) => s.user?.companyId);
  const myCompanyId = authedCompanyId ?? CURRENT_CARRIER_ID;
  type BidLike = {
    id: string;
    carrierId: string;
    amount?: number;
    price?: number;
    status: string;
    estimatedDays?: number;
    proposedPickupDate?: string;
    proposedDeliveryDate?: string;
    notes?: string;
    createdAt?: string;
  };
  const myBid: BidLike | null = (() => {
    if (!order) return null;
    const bids = (order as unknown as { bids?: BidLike[] }).bids;
    if (!Array.isArray(bids)) return null;
    return bids.find((b) => b.carrierId === myCompanyId) ?? null;
  })();

  const [price, setPrice] = useState<number>(0);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pickupConfirm, setPickupConfirm] = useState<'CONFIRM' | 'PROPOSE'>('CONFIRM');
  const [proposedPickup, setProposedPickup] = useState<string>('');
  // Concrete proposed delivery date — replaces the older "days + hours"
  // duration fields. Required by the form so the client sees a real date
  // instead of doing mental math.
  const [proposedDeliveryDate, setProposedDeliveryDate] = useState<string>('');
  const [truckId, setTruckId] = useState<string>(TRUCKS[0]?.id ?? '');
  const [notes, setNotes] = useState('');
  // Carrier can re-bid after rejection: clicking the retry button flips this
  // flag so the rejected-bid card hides and the submission form shows. The
  // backend allows upsert from REJECTED → PENDING.
  const [retrying, setRetrying] = useState(false);

  if (!order) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">{t('oppDetail.notFoundTitle')}</h3>
          <Button onClick={() => router.push('/opportunities')} className="mt-4">{t('oppDetail.notFoundBack')}</Button>
        </CardContent>
      </Card>
    );
  }

  const client = companyById(order.clientId);
  const commission = Math.round(price * 0.08);
  const vat = Math.round(commission * 0.15);
  const net = price - commission - vat;

  // DIRECT orders use a private negotiation flow with 3 actions instead of
  // the open-market bid form. Branch on mode and render a different page.
  if (order.mode === 'DIRECT') {
    const proposal = proposalForOrder(order.id);
    return (
      <DirectNegotiationView
        order={order}
        client={client}
        proposal={proposal}
        onBack={() => router.push('/opportunities')}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={`${localizeCity(order.originCity)} ← ${localizeCity(order.destinationCity)}`}
        subtitle={`${t('oppDetail.opportunity')} · ${order.orderNumber}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <Button variant="outline" onClick={() => router.push('/opportunities')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('oppDetail.back')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* If this carrier already submitted a bid, show its status + values
            instead of the submission form (otherwise the form looks like a
            fresh prompt to bid, which is confusing once you've already bid). */}
        {myBid && !retrying ? (
          <Card className="lg:col-span-2 border-info/40 bg-info/[0.03]">
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-5 w-5 text-info" />
                    <CardTitle>{t('oppDetail.myBidTitle')}</CardTitle>
                  </div>
                  <CardDescription>
                    {myBid.status === 'PENDING' && t('oppDetail.statusDesc.pending')}
                    {myBid.status === 'ACCEPTED' && t('oppDetail.statusDesc.accepted')}
                    {myBid.status === 'REJECTED' && t('oppDetail.statusDesc.rejected')}
                    {myBid.status === 'WITHDRAWN' && t('oppDetail.statusDesc.withdrawn')}
                    {myBid.status === 'EXPIRED' && t('oppDetail.statusDesc.expired')}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    myBid.status === 'ACCEPTED' ? 'success'
                    : myBid.status === 'REJECTED' ? 'destructive'
                    : myBid.status === 'PENDING' ? 'warning'
                    : 'outline'
                  }
                >
                  {myBid.status === 'PENDING'   && t('oppDetail.statusBadge.pending')}
                  {myBid.status === 'ACCEPTED'  && t('oppDetail.statusBadge.accepted')}
                  {myBid.status === 'REJECTED'  && t('oppDetail.statusBadge.rejected')}
                  {myBid.status === 'WITHDRAWN' && t('oppDetail.statusBadge.withdrawn')}
                  {myBid.status === 'EXPIRED'   && t('oppDetail.statusBadge.expired')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t('oppDetail.price')}</div>
                  <div className="mt-0.5 text-lg font-bold num">
                    {((myBid.amount ?? myBid.price ?? 0)).toLocaleString('en-US')}
                    <span className="ms-1 text-xs text-muted-foreground">{t('units.sar')}</span>
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t('oppDetail.proposedDelivery')}</div>
                  <div className="mt-0.5 text-sm font-medium">
                    {myBid.proposedDeliveryDate
                      ? formatDate(myBid.proposedDeliveryDate, 'EEEE d MMM')
                      : '—'}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t('oppDetail.submittedDate')}</div>
                  <div className="mt-0.5 text-sm font-medium">
                    {myBid.createdAt ? formatRelative(myBid.createdAt) : '—'}
                  </div>
                </div>
              </div>
              {myBid.notes && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">{t('oppDetail.yourNote')}</div>
                  {myBid.notes}
                </div>
              )}
              {myBid.status === 'PENDING' && (
                <div className="rounded-md bg-info/10 border border-info/30 p-3 flex items-start justify-between gap-3 flex-wrap text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-info shrink-0 mt-0.5" />
                    <p className="text-muted-foreground leading-relaxed">
                      {t.rich('oppDetail.pendingInfo', { b: (chunks) => <strong>{chunks}</strong> })}
                    </p>
                  </div>
                  <WithdrawBidButton
                    orderId={order.id}
                    bidId={myBid.id}
                    onSuccess={() => refetchOrder()}
                  />
                </div>
              )}
              {myBid.status === 'REJECTED' && ['PUBLISHED', 'BIDDING'].includes(order.status) && (
                <div className="rounded-md bg-destructive/5 border border-destructive/30 p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-2">
                    <Send className="h-4 w-4 text-destructive shrink-0 mt-1" />
                    <div className="text-sm">
                      <div className="font-semibold">{t('oppDetail.rejectedOpenTitle')}</div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {t('oppDetail.rejectedOpenDesc')}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      // Pre-fill the form with the rejected bid's values so the
                      // carrier can iterate (lower price / earlier delivery) instead
                      // of starting from scratch.
                      setPrice(myBid.amount ?? myBid.price ?? 0);
                      setProposedDeliveryDate(
                        myBid.proposedDeliveryDate
                          ? new Date(myBid.proposedDeliveryDate).toISOString().slice(0, 10)
                          : '',
                      );
                      setNotes(myBid.notes ?? '');
                      setRetrying(true);
                    }}
                  >
                    <Send className="h-4 w-4" />
                    {t('oppDetail.resubmit')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{retrying ? t('oppDetail.resubmit') : t('oppDetail.submitYourBid')}</CardTitle>
            <CardDescription>
              {retrying
                ? t('oppDetail.formDescRetry')
                : t('oppDetail.formDescNew')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {retrying && myBid && (
              <div className="rounded-md bg-destructive/5 border border-destructive/30 p-3 text-xs flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <History className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{t('oppDetail.prevRejected')}</span>{' '}
                    <span className="num">{(myBid.amount ?? myBid.price ?? 0).toLocaleString('en-US')}</span> {t('units.sar')}
                    {myBid.proposedDeliveryDate && (
                      <> · {t('oppDetail.deliveryShort')} {formatDate(myBid.proposedDeliveryDate, 'd MMM')}</>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRetrying(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('oppDetail.cancel')}
                </button>
              </div>
            )}
            {/* Price field is the single most-decided value in a bid — make it
                visually dominant: bigger, highlighted border, larger font. */}
            <div className="rounded-xl border-2 border-primary/40 bg-primary/[0.04] p-4 space-y-2">
              <Label htmlFor="price" className="text-sm font-semibold">{t('oppDetail.priceLabel')}</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="0"
                className="h-14 text-3xl font-bold tracking-tight num bg-background"
                autoFocus
              />
              {price > 0 && (
                <div className="text-xs text-muted-foreground">
                  {t('oppDetail.afterFees')}{' '}
                  <span className="font-semibold text-success num">
                    {net.toLocaleString('en-US')} {t('units.sar')}
                  </span>{' '}
                  {t('oppDetail.willTransfer')}
                </div>
              )}
            </div>
            {/* Pickup confirmation — confirm client's requested date or propose alternate */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase">
                {t('oppDetail.pickupDate')}
              </div>
              <div className="text-sm">
                {t('oppDetail.clientRequested')}{' '}
                <span className="font-medium">
                  {formatDate(order.pickupDate, 'EEEE d MMM')}
                  {order.pickupWindow && ` · ${pickupWindowLabel(order.pickupWindow)}`}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickupConfirm('CONFIRM')}
                  className={`flex-1 rounded-md border-2 p-3 text-sm text-start transition-colors ${
                    pickupConfirm === 'CONFIRM' ? 'border-success bg-success/5' : 'border-border hover:border-success/40'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {t('oppDetail.confirmDate')}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setPickupConfirm('PROPOSE')}
                  className={`flex-1 rounded-md border-2 p-3 text-sm text-start transition-colors ${
                    pickupConfirm === 'PROPOSE' ? 'border-warning bg-warning/5' : 'border-border hover:border-warning/40'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Calendar className="h-4 w-4 text-warning" />
                    {t('oppDetail.proposeAnother')}
                  </div>
                </button>
              </div>
              {pickupConfirm === 'PROPOSE' && (
                <Input
                  type="date"
                  /* Earliest sensible alternate = the client's original requested date.
                     We don't allow proposing a date earlier than the client wanted. */
                  min={order.pickupDate ? new Date(order.pickupDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)}
                  value={proposedPickup}
                  onChange={(e) => setProposedPickup(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Proposed delivery date — concrete date instead of "days + hours" math.
                Must be on or after the effective pickup date. */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <Label htmlFor="proposedDeliveryDate" className="text-xs font-semibold text-muted-foreground uppercase">
                {t('oppDetail.proposedDeliveryLabel')}
              </Label>
              <Input
                id="proposedDeliveryDate"
                type="date"
                min={(() => {
                  const pickup = pickupConfirm === 'PROPOSE' && proposedPickup ? proposedPickup : order.pickupDate;
                  return pickup ? new Date(pickup).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
                })()}
                value={proposedDeliveryDate}
                onChange={(e) => setProposedDeliveryDate(e.target.value)}
              />
              {proposedDeliveryDate && (
                <div className="text-xs text-muted-foreground">
                  {t('oppDetail.willShowClient')}{' '}
                  <span className="font-medium num" dir="ltr">
                    {formatDate(proposedDeliveryDate, 'EEEE d MMM')}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t('oppDetail.assignedTruckLabel')}</Label>
              <Select value={truckId} onValueChange={setTruckId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRUCKS.map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.plateNumber} · {TRUCK_LABELS[tr.truckType]} · {(tr.capacityKg / 1000).toFixed(0)} {t('units.ton')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('oppDetail.notesLabel')}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('oppDetail.notesPlaceholder')}
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t('oppDetail.netEstTitle')}
              </div>
              <BreakdownRow label={t('oppDetail.breakdownPrice')} amount={price} sar={t('units.sar')} />
              <BreakdownRow label={t('oppDetail.breakdownCommission')} amount={-commission} sar={t('units.sar')} />
              <BreakdownRow label={t('oppDetail.breakdownVat')} amount={-vat} sar={t('units.sar')} />
              <Separator />
              <div className="flex items-center justify-between pt-1">
                <span className="font-medium">{t('oppDetail.netToAccount')}</span>
                <div className="text-lg font-bold num">{net.toLocaleString('en-US')} <span className="text-xs text-muted-foreground">{t('units.sar')}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => router.back()}>{t('oppDetail.cancel')}</Button>
              <Button
                onClick={async () => {
                  if (!order) return;
                  setSubmitErr(null);
                  setSubmitting(true);
                  try {
                    // Backend bid endpoint: POST /api/orders/:orderId/bids
                    // v0.8.x replaced estimatedDays/Hours with a concrete
                    // proposedDeliveryDate. estimatedDays defaults to 0 in
                    // the DTO so we don't need to send it.
                    await api.post(`/orders/${order.id}/bids`, {
                      amount: price,
                      proposedPickupDate: pickupConfirm === 'PROPOSE' && proposedPickup ? proposedPickup : undefined,
                      proposedDeliveryDate: proposedDeliveryDate || undefined,
                      notes: notes || undefined,
                    });
                    // Re-fetch so the page swaps to the "my bid" view immediately
                    // (instead of going back to /opportunities and losing context).
                    await refetchOrder();
                    // Exit retry mode so the new PENDING bid card shows.
                    setRetrying(false);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    setSubmitErr(t('oppDetail.submitFailed', { msg }));
                  } finally {
                    // Always release the button, whether success or error —
                    // otherwise it stays stuck on "جاري الإرسال" forever.
                    setSubmitting(false);
                  }
                }}
                disabled={!price || !proposedDeliveryDate || !truckId || submitting}
              >
                <Send className="h-4 w-4" />
                {submitting ? t('oppDetail.sending') : t('oppDetail.send')}
              </Button>
            </div>
            {submitErr && (
              <div className="mt-3 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                {submitErr}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <div className="space-y-6">
          {client && (
            <Card>
              <CardHeader><CardTitle>{t('oppDetail.client')}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{(client.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{client.nameAr}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {localizeCity(client.city)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>{t('oppDetail.shipmentDetails')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label={t('oppDetail.cargoType')} icon={Package} value={order.cargoType} />
                <Row label={t('oppDetail.weight')} icon={Weight} value={<span className="num">{(order.weightKg ?? 0).toLocaleString('en-US')} {t('units.kg')}</span>} />
                <Row label={t('oppDetail.truck')} icon={Truck} value={(order.truckType && TRUCK_LABELS[order.truckType]) || order.truckType || '—'} />
                <Row label={t('oppDetail.insurance')} icon={ShieldCheck} value={order.requiresInsurance ? t('oppDetail.required') : '—'} />
                <Row label={t('oppDetail.refrigeration')} icon={Snowflake} value={order.requiresRefrigeration ? t('oppDetail.required') : '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('oppDetail.route')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label={t('oppDetail.from')} icon={MapPin} value={localizeCity(order.originCity)} />
                <Row label={t('oppDetail.to')} icon={MapPin} value={localizeCity(order.destinationCity)} />
                <Row label={t('oppDetail.pickup')} icon={Calendar} value={formatDate(order.pickupDate, 'EEEE d MMM · HH:mm')} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function BreakdownRow({ label, amount, sar }: { label: string; amount: number; sar: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num font-medium ${amount < 0 ? 'text-destructive' : ''}`}>
        {amount < 0 ? '- ' : '+ '}{Math.abs(amount).toLocaleString('en-US')} {sar}
      </span>
    </div>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-sm font-medium text-end max-w-[60%]">{value ?? '—'}</dd>
    </div>
  );
}

// ─── DIRECT negotiation view (carrier side) ───────────────────────────
//
// Three top-level actions:
//   1. ACCEPT — open dialog → enter price → "تأكيد القبول بهذا السعر"
//   2. COUNTER — open dialog → propose a different price + note
//   3. DECLINE — open dialog → optional reason → end the negotiation
//
// When the client has already countered, the carrier sees their counter at
// the top with the same 3 actions (accept it / counter again / decline).

function DirectNegotiationView({
  order, client, proposal, onBack,
}: {
  order: any;
  client: ReturnType<typeof companyById>;
  proposal: DirectProposal | undefined;
  onBack: () => void;
}) {
  const t = useTranslations('orders');
  const [action, setAction] = useState<null | 'ACCEPT' | 'COUNTER' | 'DECLINE'>(null);
  const [price, setPrice] = useState<number>(0);
  const [days, setDays] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const lastClientRound = proposal?.rounds.filter((r) => r.by === 'CLIENT').slice(-1)[0];
  const onTable = lastRound(proposal!);                  // most recent round (any side)
  const isClientTurn = proposal?.status === 'AWAITING_CLIENT';
  const isCarrierTurn = !proposal || proposal.status === 'AWAITING_CARRIER' || proposal.status === 'AWAITING_CARRIER_REPLY';

  // Pre-fill price if client has countered (so carrier sees what to react to)
  const openCounter = () => {
    setAction('COUNTER');
    setPrice(lastClientRound?.price ? Math.round(lastClientRound.price * 0.95) : 0);
    setDays(lastClientRound?.days ?? 2);
    setNotes('');
  };

  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (action === 'ACCEPT' || action === 'COUNTER') {
        // Both ACCEPT and COUNTER map to creating a bid on the order. ACCEPT
        // takes the client's `onTable` price as-is; COUNTER sets a different
        // price. Client still has to formally accept on their side.
        await api.post(`/orders/${order.id}/bids`, {
          amount: price,
          notes: notes || undefined,
        });
        notify.success(
          action === 'ACCEPT' ? t('oppDetail.direct.acceptToast') : t('oppDetail.direct.counterToast'),
          `${price.toLocaleString('en-US')} ${t('units.sar')}`,
        );
      } else if (action === 'DECLINE') {
        // POST /orders/:id/decline-direct → resets order to PUBLISHED so client can reassign
        await api.post(`/orders/${order.id}/decline-direct`, { reason: reason || undefined });
        notify.success(t('oppDetail.direct.declineToast'), t('oppDetail.direct.declineToastDesc'));
      }
      setAction(null);
    } catch (err) {
      notify.error(err, t('oppDetail.direct.actionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={`${t('oppDetail.direct.titlePrefix')} · ${localizeCity(order.originCity)} ← ${localizeCity(order.destinationCity)}`}
        subtitle={`${order.orderNumber} · ${t('oppDetail.direct.fromClient', { name: client?.nameAr ?? '—' })}`}
        actions={
          <>
            <Badge variant="warning" className="gap-1">
              <UserSearch className="h-3 w-3" /> {t('oppDetail.direct.exclusiveBadge')}
            </Badge>
            <Button variant="outline" onClick={onBack}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('oppDetail.back')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN: negotiation card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top: what's currently "on the table" */}
          {onTable && isCarrierTurn ? (
            <Card className="border-warning/40 bg-warning/[0.04]">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardDescription className="mb-1">{t('oppDetail.direct.clientProposedPrice')}</CardDescription>
                    <CardTitle className="text-3xl"><Currency amount={onTable.price} /></CardTitle>
                    {onTable.days && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {t('oppDetail.direct.proposedDuration')} <span className="font-medium num">{onTable.days}</span> {t('oppDetail.direct.days')}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-end">
                    {t('oppDetail.direct.ago', { time: formatRelative(onTable.at) })}
                  </div>
                </div>
              </CardHeader>
              {onTable.notes && (
                <CardContent>
                  <div className="rounded-md bg-card border p-3 text-sm flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{onTable.notes}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ) : !proposal ? (
            <Card className="border-info/30 bg-info/[0.03]">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-info/15 text-info grid place-items-center shrink-0">
                    <UserSearch className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('oppDetail.direct.newTitle', { name: client?.nameAr ?? t('oppDetail.direct.fallbackClient') })}</h3>
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {t('oppDetail.direct.newBody')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Three action cards */}
          {isCarrierTurn && (
            <Card>
              <CardHeader>
                <CardTitle>{t('oppDetail.direct.availableActions')}</CardTitle>
                <CardDescription>{t('oppDetail.direct.availableActionsDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ActionTile
                  icon={CheckCircle2}
                  title={onTable ? t('oppDetail.direct.acceptPrice') : t('oppDetail.direct.acceptRequest')}
                  subtitle={onTable ? t('oppDetail.direct.acceptPriceSub', { price: onTable.price.toLocaleString('en-US') }) : t('oppDetail.direct.proposePriceSub')}
                  tone="success"
                  onClick={() => {
                    setAction('ACCEPT');
                    setPrice(onTable?.price ?? 0);
                    setDays(onTable?.days ?? 2);
                  }}
                />
                <ActionTile
                  icon={Send}
                  title={t('oppDetail.direct.counterTitle')}
                  subtitle={t('oppDetail.direct.counterSub')}
                  tone="warning"
                  onClick={openCounter}
                />
                <ActionTile
                  icon={X}
                  title={t('oppDetail.direct.declineTitle')}
                  subtitle={t('oppDetail.direct.declineSub')}
                  tone="destructive"
                  onClick={() => setAction('DECLINE')}
                />
              </CardContent>
            </Card>
          )}

          {/* If it's the client's turn, show a waiting state */}
          {isClientTurn && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-info/15 text-info mx-auto grid place-items-center mb-3 animate-pulse">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <h3 className="font-semibold">{t('oppDetail.direct.sentTitle')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('oppDetail.direct.sentBody')}</p>
              </CardContent>
            </Card>
          )}

          {proposal?.status === 'ACCEPTED' && (
            <Card className="border-success/30 bg-success/[0.04]">
              <CardContent className="pt-6 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-success">{t('oppDetail.direct.agreedTitle')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('oppDetail.direct.agreedBody')}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {proposal?.status === 'DECLINED' && (
            <Card className="border-destructive/30 bg-destructive/[0.04]">
              <CardContent className="pt-6 flex items-start gap-3">
                <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">{t('oppDetail.direct.declinedTitle')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t('oppDetail.direct.declinedBody')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Negotiation history */}
          {proposal && proposal.rounds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4 w-4" /> {t('oppDetail.direct.negotiationHistory')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {proposal.rounds.map((r, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 text-xs font-bold ${
                        r.by === 'CARRIER' ? 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' : 'bg-secondary text-secondary-foreground'
                      }`}>
                        {r.by === 'CARRIER' ? t('oppDetail.direct.carrierInitial') : t('oppDetail.direct.clientInitial')}
                      </div>
                      <div className="flex-1 min-w-0 rounded-md border bg-card p-3">
                        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-semibold">
                            {r.by === 'CARRIER' ? t('oppDetail.direct.youCarrier') : t('oppDetail.direct.clientWord')} ·{' '}
                            {r.kind === 'COUNTER' ? t('oppDetail.direct.roundCounter') : r.kind === 'ACCEPT' ? t('oppDetail.direct.roundAccept') : t('oppDetail.direct.roundReject')}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(r.at)}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold num"><Currency amount={r.price} /></span>
                          {r.days && <span className="text-xs text-muted-foreground">· {r.days} {t('oppDetail.direct.days')}</span>}
                        </div>
                        {r.notes && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.notes}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SIDE: order details */}
        <div className="space-y-6">
          {client && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> {t('oppDetail.client')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback>{(client.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{client.nameAr}</div>
                    <div className="text-xs text-muted-foreground">{localizeCity(client.city)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">{t('oppDetail.shipmentDetails')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label={t('oppDetail.orderNumber')} value={<span className="font-mono text-xs">{order.orderNumber}</span>} />
                <Row label={t('oppDetail.cargoType')} icon={Package} value={order.cargoType} />
                <Row label={t('oppDetail.description')} value={order.cargoDescription} />
                <Row label={t('oppDetail.weight')} icon={Weight} value={<span className="num">{(order.weightKg ?? 0).toLocaleString('en-US')} {t('units.kg')}</span>} />
                <Row label={t('oppDetail.truckType')} icon={Truck} value={order.truckType} />
                <Row label={t('oppDetail.pickup')} icon={Calendar} value={formatDate(order.pickupDate, 'EEEE d MMM · HH:mm')} />
                <Row label={t('oppDetail.from')} icon={MapPin} value={`${localizeCity(order.originCity)}، ${order.originAddress}`} />
                <Row label={t('oppDetail.to')} icon={MapPin} value={`${localizeCity(order.destinationCity)}، ${order.destinationAddress}`} />
                {order.requiresInsurance && <Row label={t('oppDetail.insurance')} icon={ShieldCheck} value={t('oppDetail.required')} />}
                {order.requiresRefrigeration && <Row label={t('oppDetail.refrigeration')} icon={Snowflake} value={t('oppDetail.required')} />}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Action dialogs ─── */}
      <Dialog open={action === 'ACCEPT'} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('oppDetail.direct.acceptDialogTitle')}</DialogTitle>
            <DialogDescription>
              {onTable
                ? t('oppDetail.direct.acceptDialogDescWithTable', { price: onTable.price.toLocaleString('en-US') })
                : t('oppDetail.direct.acceptDialogDescNoTable')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('oppDetail.direct.finalPrice')}</Label>
                <Input type="number" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} disabled={!!onTable} />
              </div>
              <div className="space-y-2">
                <Label>{t('oppDetail.direct.durationDays')}</Label>
                <Input type="number" value={days || ''} onChange={(e) => setDays(Number(e.target.value))} />
              </div>
            </div>
            {(() => {
              const c = Math.round(price * 0.08);
              const v = Math.round(c * 0.15);
              const n = price - c - v;
              return (
                <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span>{t('oppDetail.direct.bdPrice')}</span><span className="num">{price.toLocaleString('en-US')} {t('units.sar')}</span></div>
                  <div className="flex justify-between text-destructive"><span>{t('oppDetail.direct.bdCommission')}</span><span>−<span className="num">{c.toLocaleString('en-US')}</span></span></div>
                  <div className="flex justify-between text-destructive"><span>{t('oppDetail.direct.bdVat')}</span><span>−<span className="num">{v.toLocaleString('en-US')}</span></span></div>
                  <div className="flex justify-between pt-1 border-t font-semibold"><span>{t('oppDetail.direct.bdNetDue')}</span><span className="num text-success">{n.toLocaleString('en-US')} {t('units.sar')}</span></div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{t('oppDetail.cancel')}</Button>
            <Button onClick={submit} disabled={!price || !days}><CheckCircle2 className="h-4 w-4" /> {t('oppDetail.direct.confirmAccept')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'COUNTER'} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('oppDetail.direct.counterDialogTitle')}</DialogTitle>
            <DialogDescription>{t('oppDetail.direct.counterDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('oppDetail.direct.proposedPrice')}</Label>
                <Input type="number" value={price || ''} onChange={(e) => setPrice(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{t('oppDetail.direct.durationDays')}</Label>
                <Input type="number" value={days || ''} onChange={(e) => setDays(Number(e.target.value))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('oppDetail.direct.counterNoteLabel')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('oppDetail.direct.counterNotePlaceholder')} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{t('oppDetail.cancel')}</Button>
            <Button onClick={submit} disabled={!price}><Send className="h-4 w-4" /> {t('oppDetail.direct.sendPrice')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'DECLINE'} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('oppDetail.direct.declineDialogTitle')}</DialogTitle>
            <DialogDescription>{t('oppDetail.direct.declineDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <Label>{t('oppDetail.direct.declineReasonLabel')}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t('oppDetail.direct.declineReasonPlaceholder')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{t('oppDetail.direct.declineBack')}</Button>
            <Button variant="destructive" onClick={submit}><X className="h-4 w-4" /> {t('oppDetail.direct.confirmDecline')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WithdrawBidButton({ orderId, bidId, onSuccess }: { orderId: string; bidId: string; onSuccess: () => void }) {
  const t = useTranslations('orders');
  const [loading, setLoading] = useState(false);
  const withdraw = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/bids/${bidId}/withdraw`, {});
      notify.success(t('oppDetail.direct.withdrawSuccess'));
      onSuccess();
    } catch (err) {
      notify.error(err, t('oppDetail.direct.withdrawFailed'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 shrink-0" onClick={withdraw} disabled={loading}>
      <X className="h-3 w-3" />
      {loading ? t('oppDetail.withdrawing') : t('oppDetail.withdrawBid')}
    </Button>
  );
}

function ActionTile({ icon: Icon, title, subtitle, tone, onClick }: {
  icon: any; title: string; subtitle: string;
  tone: 'success' | 'warning' | 'destructive';
  onClick: () => void;
}) {
  const styles = {
    success:     { ring: 'hover:border-success/40',     icon: 'bg-success/15 text-success' },
    warning:     { ring: 'hover:border-warning/40',     icon: 'bg-warning/15 text-warning' },
    destructive: { ring: 'hover:border-destructive/40', icon: 'bg-destructive/15 text-destructive' },
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-start transition-colors ${styles.ring}`}
    >
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${styles.icon}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}
