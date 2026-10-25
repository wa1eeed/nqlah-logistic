'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import {
  Banknote, Check, ChevronLeft, ChevronRight, Clock, Coins, Eye, Gavel, Layers, MapPin, Minus,
  Package, Plus, Radio, Search, Send, ShieldCheck, Snowflake, Truck, UserSearch, Wallet,
  Building2, Route,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Currency } from '@/components/currency';
import { playSoundIfEnabled } from '@/lib/sound';
import { DEFAULT_CITIES, CURRENT_CLIENT_ID, companyById, policyForClient, type ClientPolicy } from '@naqla/shared-utils';
import { MapAddressPicker, type MapPoint } from '@/components/map-address-picker';
import { api, fetcher } from '@/lib/api';

/**
 * Pickup window — the client picks one of three time bands. The carrier then
 * confirms the exact pickup time within that window when they accept the bid.
 */
export type PickupWindow = 'MORNING' | 'EVENING' | 'ALL_DAY';

/**
 * Trip type — drives Step 2 layout:
 *   SAME_CITY  → one city dropdown + 2 maps (pickup + delivery within that city)
 *   INTER_CITY → two city dropdowns + optional 2 maps for precise points
 */
export type TripType = 'SAME_CITY' | 'INTER_CITY';

/**
 * Order kind:
 *   SINGLE       → one truck (the platform's current flow)
 *   CONSOLIDATED → a bulk request for N trucks on the SAME route/cargo, billed
 *                  as one order with one order number and one consolidated
 *                  invoice. The awarded carrier then distributes the N legs
 *                  across its own trucks/drivers.
 */
export type OrderKind = 'SINGLE' | 'CONSOLIDATED';

/** Allowed truck count range for a consolidated order. */
const CONSOLIDATED_MIN = 2;
const CONSOLIDATED_MAX = 20;

interface FormState {
  tripType: TripType;
  orderType: OrderKind;
  truckCount: number;
  /** Consolidated: client types a reference per leg; off = system auto-generates. */
  legReferencesManual: boolean;
  legReferences: string[];
  cargoType: string;
  cargoDescription: string;
  weightKg: number;
  originCity: string;
  originAddress: string;
  /** Precise pickup location set via the map. */
  originPin: MapPoint | null;
  destinationCity: string;
  destinationAddress: string;
  /** Precise delivery location set via the map. */
  destinationPin: MapPoint | null;
  pickupDate: string;
  pickupWindow: PickupWindow;
  mode: 'OPEN' | 'DIRECT' | null;
  targetCarrierId: string | null;
  /** MARKET = carriers bid; FIXED = client sets the price. */
  pricingMode: 'MARKET' | 'FIXED';
  fixedPrice: number | null;
  /** PREPAID = Escrow; COD = cash/transfer on delivery. */
  paymentMethod: 'PREPAID' | 'COD';
  truckType: string;
  requiresInsurance: boolean;
  requiresRefrigeration: boolean;
  specialInstructions: string;
}

const STEPS = [
  { id: 1, labelKey: 'wizard.steps.cargo',        icon: Package },
  { id: 2, labelKey: 'wizard.steps.route',        icon: MapPin },
  { id: 3, labelKey: 'wizard.steps.dispatch',     icon: Send },
  { id: 4, labelKey: 'wizard.steps.requirements', icon: Wallet },
  { id: 5, labelKey: 'wizard.steps.review',       icon: Eye },
];

const CARGO_TYPES = [
  { value: 'GENERAL',      labelKey: 'wizard.cargoTypes.general' },
  { value: 'FRAGILE',      labelKey: 'wizard.cargoTypes.fragile' },
  { value: 'PERISHABLE',   labelKey: 'wizard.cargoTypes.perishable' },
  { value: 'HAZARDOUS',    labelKey: 'wizard.cargoTypes.hazardous' },
  { value: 'OVERSIZED',    labelKey: 'wizard.cargoTypes.oversized' },
  { value: 'CONSTRUCTION', labelKey: 'wizard.cargoTypes.construction' },
  { value: 'AUTOMOTIVE',   labelKey: 'wizard.cargoTypes.automotive' },
  { value: 'LIVESTOCK',    labelKey: 'wizard.cargoTypes.livestock' },
];

const TRUCK_TYPES = [
  { value: 'SMALL_VAN',         labelKey: 'wizard.truckTypes.smallVan' },
  { value: 'BOX_TRUCK',         labelKey: 'wizard.truckTypes.boxTruck' },
  { value: 'MEDIUM_FLATBED',    labelKey: 'wizard.truckTypes.mediumFlatbed' },
  { value: 'LARGE_FLATBED',     labelKey: 'wizard.truckTypes.largeFlatbed' },
  { value: 'REFRIGERATED',      labelKey: 'wizard.truckTypes.refrigerated' },
  { value: 'TANKER',            labelKey: 'wizard.truckTypes.tanker' },
  { value: 'LOWBED',            labelKey: 'wizard.truckTypes.lowbed' },
  { value: 'CONTAINER_TRAILER', labelKey: 'wizard.truckTypes.containerTrailer' },
];

type CatalogCity = { id: string; nameAr: string; nameEn: string; region: string; lat: number; lng: number; active?: boolean };
type CatalogTruckType = { id: string; nameAr: string; active?: boolean };
type CatalogData = { cities: CatalogCity[] | null; cargoTypes: unknown; truckTypes: CatalogTruckType[] | null };
type ApiCarrier = { id: string; nameAr: string; nameEn: string | null; city: string; status: string; kycStatus: string };

export default function NewOrderWizard() {
  const t = useTranslations('orders');
  const router = useRouter();
  // Admin-configurable policy for this client (gates the available options),
  // resolved server-side so admin changes apply immediately. Falls back to the
  // mock resolver when the API is unavailable.
  const { data: apiPolicy } = useSWR<ClientPolicy>('/policies/mine', fetcher);
  const policy = apiPolicy ?? policyForClient(CURRENT_CLIENT_ID);
  const { data: catalog } = useSWR<CatalogData>('/settings/catalogs', fetcher);
  const { data: carriersRaw, isLoading: carriersLoading } =
    useSWR<ApiCarrier[]>('/companies?type=CARRIER&status=ACTIVE&limit=100', fetcher);
  const [step, setStep] = useState(1);
  const [carrierSearch, setCarrierSearch] = useState('');
  const [form, setForm] = useState<FormState>({
    tripType: 'INTER_CITY',
    orderType: 'SINGLE',
    truckCount: 1,
    legReferencesManual: false,
    legReferences: [],
    cargoType: 'GENERAL',
    cargoDescription: '',
    weightKg: 0,
    originCity: 'الرياض',
    originAddress: '',
    originPin: null,
    destinationCity: 'جدة',
    destinationAddress: '',
    destinationPin: null,
    pickupDate: '',
    pickupWindow: 'ALL_DAY',
    // Initial selections honour the client's policy (pre-pick when only one option).
    mode: policy.forcedCarrierId ? 'DIRECT' : (policy.allowMarket ? null : (policy.allowDirect ? 'DIRECT' : null)),
    targetCarrierId: policy.forcedCarrierId ?? null,
    pricingMode: policy.allowMarketPricing ? 'MARKET' : 'FIXED',
    fixedPrice: null,
    paymentMethod: policy.allowPrepaid ? 'PREPAID' : 'COD',
    truckType: 'LARGE_FLATBED',
    requiresInsurance: false,
    requiresRefrigeration: false,
    specialInstructions: '',
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // When the policy loads (or an admin changes it), clamp any now-disallowed
  // selections to a valid option so the form always matches the live policy.
  useEffect(() => {
    if (!apiPolicy) return;
    setForm((s) => {
      const next = { ...s };
      if (policy.forcedCarrierId) {
        next.mode = 'DIRECT';
        next.targetCarrierId = policy.forcedCarrierId;
      } else {
        if (s.mode === null && !policy.allowMarket) next.mode = policy.allowDirect ? 'DIRECT' : null;
        if (s.mode === 'DIRECT' && !policy.allowDirect) next.mode = policy.allowMarket ? null : null;
      }
      if (s.pricingMode === 'MARKET' && !policy.allowMarketPricing) next.pricingMode = 'FIXED';
      if (s.pricingMode === 'FIXED' && !policy.allowFixedPricing) next.pricingMode = 'MARKET';
      if (s.paymentMethod === 'PREPAID' && !policy.allowPrepaid) next.paymentMethod = 'COD';
      if (s.paymentMethod === 'COD' && !policy.allowCOD) next.paymentMethod = 'PREPAID';
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPolicy]);

  const carriers: ApiCarrier[] = useMemo(
    () => (carriersRaw ?? []).filter(
      (c) => !carrierSearch || c.nameAr.includes(carrierSearch) || c.city.includes(carrierSearch),
    ),
    [carriersRaw, carrierSearch],
  );

  // Resolve a carrier's name from the live list first (ids are API cuids now),
  // then the mock catalog, so the forced-carrier notice shows the real name.
  const carrierName = (id?: string | null) =>
    (carriersRaw ?? []).find((c) => c.id === id)?.nameAr ?? companyById(id)?.nameAr ?? t('wizard.dispatch.defaultCarrier');

  // Resolve catalogs: DB data takes priority, fall back to static constants
  const activeCities: CatalogCity[] = catalog?.cities
    ? catalog.cities.filter((c) => c.active !== false)
    : DEFAULT_CITIES.filter((c) => c.active);
  const truckTypesList: { value: string; label: string }[] = catalog?.truckTypes
    ? catalog.truckTypes.filter((tt) => tt.active !== false).map((tt) => ({ value: tt.id, label: tt.nameAr }))
    : TRUCK_TYPES.map((tt) => ({ value: tt.value, label: t(tt.labelKey) }));

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return !!form.cargoType && form.cargoDescription.length > 3 && form.weightKg > 0
        && (form.orderType === 'SINGLE' || form.truckCount >= CONSOLIDATED_MIN);
      case 2: return !!form.originCity && !!form.destinationCity && !!form.pickupDate;
      case 3: return (
        (form.mode === 'OPEN' || (form.mode === 'DIRECT' && !!form.targetCarrierId)) &&
        (form.pricingMode === 'MARKET' || (form.fixedPrice != null && form.fixedPrice > 0))
      );
      case 4: return !!form.truckType;
      default: return true;
    }
  }, [step, form]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Maps the wizard form to the backend `CreateOrderDto` and POSTs it. The
   * mock interceptor in `api.ts` will fall back to a stub response if the
   * API is unreachable — so this still works in pure UI demo mode.
   *
   * After creation, we immediately publish so the order shows up in carrier
   * opportunities. Failure of the publish is non-fatal — admin can publish
   * manually.
   */
  const submit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const origin = activeCities.find((c) => c.nameAr === form.originCity);
      const dest = activeCities.find((c) => c.nameAr === form.destinationCity);

      const body = {
        mode: form.mode ?? 'OPEN',
        tripType: form.tripType,
        orderType: form.orderType,
        ...(form.orderType === 'CONSOLIDATED' ? { truckCount: form.truckCount } : {}),
        // Manual per-leg references (blanks are auto-filled server-side); omit
        // entirely when auto so the server generates every sub-reference.
        ...(form.orderType === 'CONSOLIDATED' && form.legReferencesManual
          ? { legReferences: Array.from({ length: form.truckCount }, (_, i) => (form.legReferences[i] ?? '').trim()) }
          : {}),
        pickupWindow: form.pickupWindow,
        cargoType: form.cargoType,
        cargoDescription: form.cargoDescription,
        weight: form.weightKg,
        originCity: form.originCity,
        originRegion: origin?.region ?? form.originCity,
        originAddress: form.originAddress || form.originPin?.address || form.originCity,
        destinationCity: form.destinationCity,
        destinationRegion: dest?.region ?? form.destinationCity,
        destinationAddress: form.destinationAddress || form.destinationPin?.address || form.destinationCity,
        requiredTruckType: form.truckType,
        requiresRefrigeration: form.requiresRefrigeration,
        requiresInsurance: form.requiresInsurance,
        pickupDate: form.pickupDate,
        // Optional fields: use spread so the key is absent (not undefined) when unset.
        // forbidNonWhitelisted on the backend rejects any key not decorated in the DTO,
        // and some JSON serializers may include undefined keys — explicit spread avoids this.
        ...(form.originPin?.lat   != null ? { originLat: form.originPin.lat }     : {}),
        ...(form.originPin?.lng   != null ? { originLng: form.originPin.lng }     : {}),
        ...(form.destinationPin?.lat != null ? { destinationLat: form.destinationPin.lat } : {}),
        ...(form.destinationPin?.lng != null ? { destinationLng: form.destinationPin.lng } : {}),
        ...(form.specialInstructions ? { specialInstructions: form.specialInstructions } : {}),
        // Note: pricingMode / paymentMethod are UI-only and not part of the API
        // schema (FIXED pricing is sent via agreedPriceUpfront below), so they
        // are intentionally NOT included — the strict API rejects unknown keys.
        // DIRECT-mode only field
        ...(form.mode === 'DIRECT' && form.targetCarrierId
          ? { targetCarrierId: form.targetCarrierId }
          : {}),
        // Client-set fixed price (works with OPEN or DIRECT)
        ...(form.pricingMode === 'FIXED' && form.fixedPrice
          ? { agreedPriceUpfront: form.fixedPrice }
          : {}),
      };
      const res = await api.post('/orders', body);
      const created = res.data?.data ?? res.data;
      const orderId = created?.id;
      if (!orderId) {
        throw new Error(t('wizard.errors.noOrderId'));
      }
      // Publish — required for carriers to see the order. We surface publish
      // failures (don't swallow) because a created-but-not-published order
      // looks identical to "submission failed" from the user's view.
      try {
        await api.post(`/orders/${orderId}/publish`, {});
      } catch (publishErr: unknown) {
        const msg = publishErr instanceof Error ? publishErr.message : String(publishErr);
        setSubmitError(t('wizard.errors.publishFailed', { ref: created.orderNumber ?? orderId, msg }));
        setSubmitting(false);
        router.push(`/orders/${orderId}`);
        return;
      }
      playSoundIfEnabled('orderSent');
      router.push(`/orders/${orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(t('wizard.errors.createFailed', { msg }));
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title={t('wizard.title')} subtitle={t('wizard.subtitle')} />

      {/* Stepper — modern */}
      <div className="rounded-2xl border border-border/70 bg-card px-4 py-5 overflow-x-auto">
        <ol className="flex items-start min-w-max">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = s.id < step;
            const isActive = s.id === step;
            const clickable = isDone;
            return (
              <li key={s.id} className="flex items-start">
                <div className="flex w-[92px] flex-col items-center gap-2">
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && setStep(s.id)}
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-all',
                      isDone && 'bg-[hsl(var(--mint))] text-primary',
                      isActive && 'bg-[hsl(var(--mint))] text-primary ring-4 ring-[hsl(var(--mint))]/20',
                      !isDone && !isActive && 'bg-secondary text-muted-foreground',
                      clickable ? 'cursor-pointer hover:scale-105' : 'cursor-default',
                    )}
                  >
                    {isDone ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}
                  </button>
                  <span className={cn('text-center text-xs font-semibold leading-tight', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                    {t(s.labelKey)}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('mt-5 h-[3px] w-8 rounded-full transition-colors sm:w-14', s.id < step ? 'bg-[hsl(var(--mint))]' : 'bg-border')} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Step content + live summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
       <div className="space-y-4 lg:col-span-2">
      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <Step title={t('wizard.cargo.title')} description={t('wizard.cargo.description')}>
              {/* Order type: single truck vs consolidated (multi-truck) */}
              <div className="space-y-2">
                <Label>{t('wizard.cargo.orderType')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <OrderTypeCard
                    active={form.orderType === 'SINGLE'}
                    icon={Truck}
                    title={t('wizard.cargo.singleTitle')}
                    desc={t('wizard.cargo.singleDesc')}
                    onClick={() => { set('orderType', 'SINGLE'); set('truckCount', 1); }}
                  />
                  <OrderTypeCard
                    active={form.orderType === 'CONSOLIDATED'}
                    icon={Layers}
                    title={t('wizard.cargo.consolidatedTitle')}
                    desc={t('wizard.cargo.consolidatedDesc')}
                    onClick={() => { set('orderType', 'CONSOLIDATED'); set('truckCount', Math.max(CONSOLIDATED_MIN, form.truckCount)); }}
                  />
                </div>
                {form.orderType === 'CONSOLIDATED' && (
                  <>
                    <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 mt-1">
                      <div>
                        <div className="text-sm font-semibold">{t('wizard.cargo.truckCount')}</div>
                        <div className="text-xs text-muted-foreground">{t('wizard.cargo.truckCountHint')}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button" variant="outline" size="icon" className="h-9 w-9"
                          disabled={form.truckCount <= CONSOLIDATED_MIN}
                          onClick={() => set('truckCount', Math.max(CONSOLIDATED_MIN, form.truckCount - 1))}
                          aria-label={t('wizard.cargo.decrease')}
                        ><Minus className="h-4 w-4" /></Button>
                        <span className="num w-10 text-center text-lg font-bold">{form.truckCount}</span>
                        <Button
                          type="button" variant="outline" size="icon" className="h-9 w-9"
                          disabled={form.truckCount >= CONSOLIDATED_MAX}
                          onClick={() => set('truckCount', Math.min(CONSOLIDATED_MAX, form.truckCount + 1))}
                          aria-label={t('wizard.cargo.increase')}
                        ><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>

                    {/* Per-leg shipment references: client types one per shipment, or
                        the system auto-generates a sub-reference for each. */}
                    <div className="rounded-xl border bg-muted/30 p-3 mt-1 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-sm font-semibold">{t('wizard.cargo.legRefs')}</div>
                          <div className="text-xs text-muted-foreground">{t('wizard.cargo.legRefsHint')}</div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            type="button" size="sm"
                            variant={!form.legReferencesManual ? 'default' : 'outline'}
                            onClick={() => set('legReferencesManual', false)}
                          >{t('wizard.cargo.autoGen')}</Button>
                          <Button
                            type="button" size="sm"
                            variant={form.legReferencesManual ? 'default' : 'outline'}
                            onClick={() => set('legReferencesManual', true)}
                          >{t('wizard.cargo.manual')}</Button>
                        </div>
                      </div>
                      {form.legReferencesManual ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Array.from({ length: form.truckCount }).map((_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-16 shrink-0">{t('wizard.cargo.shipment')} <span className="num">{i + 1}</span></span>
                              <Input
                                dir="ltr"
                                value={form.legReferences[i] ?? ''}
                                placeholder={`REF-${i + 1}`}
                                onChange={(e) => setForm((s) => {
                                  const arr = [...s.legReferences];
                                  arr[i] = e.target.value;
                                  return { ...s, legReferences: arr };
                                })}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t('wizard.cargo.autoGenNote')}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('wizard.cargo.cargoType')}</Label>
                  <Select value={form.cargoType} onValueChange={(v) => set('cargoType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CARGO_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('wizard.cargo.weight')}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.weightKg || ''}
                    onChange={(e) => set('weightKg', Number(e.target.value))}
                    placeholder={t('wizard.cargo.weightPlaceholder')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('wizard.cargo.cargoDescription')}</Label>
                <Textarea
                  value={form.cargoDescription}
                  onChange={(e) => set('cargoDescription', e.target.value)}
                  placeholder={t('wizard.cargo.cargoDescPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('wizard.cargo.cargoDescHint')}</p>
              </div>
            </Step>
          )}

          {step === 2 && (
            <Step title={t('wizard.route.title')} description={t('wizard.route.description')}>
              {/* Trip type selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ChoiceCard
                  selected={form.tripType === 'SAME_CITY'}
                  onClick={() => {
                    set('tripType', 'SAME_CITY');
                    // sync destination city to origin when switching to same-city
                    set('destinationCity', form.originCity);
                  }}
                  icon={<Building2 className="h-6 w-6" />}
                  title={t('wizard.route.sameCityTitle')}
                  description={t('wizard.route.sameCityDesc')}
                />
                <ChoiceCard
                  selected={form.tripType === 'INTER_CITY'}
                  onClick={() => set('tripType', 'INTER_CITY')}
                  icon={<Route className="h-6 w-6" />}
                  title={t('wizard.route.interCityTitle')}
                  description={t('wizard.route.interCityDesc')}
                />
              </div>

              {/* Cities */}
              {form.tripType === 'SAME_CITY' ? (
                <div className="space-y-2">
                  <Label>{t('wizard.route.city')}</Label>
                  <Select
                    value={form.originCity}
                    onValueChange={(v) => { set('originCity', v); set('destinationCity', v); }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {activeCities.map((c) => (
                        <SelectItem key={c.id} value={c.nameAr}>{c.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('wizard.route.originCity')}</Label>
                    <Select value={form.originCity} onValueChange={(v) => set('originCity', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {activeCities.map((c) => (
                          <SelectItem key={c.id} value={c.nameAr}>{c.nameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('wizard.route.destinationCity')}</Label>
                    <Select value={form.destinationCity} onValueChange={(v) => set('destinationCity', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {activeCities.map((c) => (
                          <SelectItem key={c.id} value={c.nameAr}>{c.nameAr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Maps + addresses */}
              <RouteMapsBlock
                cities={activeCities}
                originCity={form.originCity}
                destinationCity={form.destinationCity}
                originAddress={form.originAddress}
                destinationAddress={form.destinationAddress}
                originPin={form.originPin}
                destinationPin={form.destinationPin}
                onOriginAddress={(v) => set('originAddress', v)}
                onDestAddress={(v) => set('destinationAddress', v)}
                onOriginPin={(p) => { set('originPin', p); set('originAddress', p.address); }}
                onDestPin={(p) => { set('destinationPin', p); set('destinationAddress', p.address); }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('wizard.route.pickupDate')}</Label>
                  <Input
                    type="date"
                    /* Past dates make no sense — anchor min to today's local date. */
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.pickupDate}
                    onChange={(e) => set('pickupDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('wizard.route.pickupWindow')}</Label>
                  <Select value={form.pickupWindow} onValueChange={(v) => set('pickupWindow', v as PickupWindow)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MORNING">{t('wizard.route.windowMorning')}</SelectItem>
                      <SelectItem value="EVENING">{t('wizard.route.windowEvening')}</SelectItem>
                      <SelectItem value="ALL_DAY">{t('wizard.route.windowAllDay')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('wizard.route.windowHint')}
              </p>
            </Step>
          )}

          {step === 3 && (
            <Step title={t('wizard.dispatch.title')} description={t('wizard.dispatch.description')}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policy.allowMarket && (
                  <ChoiceCard
                    selected={form.mode === 'OPEN'}
                    onClick={() => { set('mode', 'OPEN'); set('targetCarrierId', null); }}
                    icon={<Radio className="h-6 w-6" />}
                    title={t('wizard.dispatch.openTitle')}
                    description={t('wizard.dispatch.openDesc')}
                    badge={t('wizard.dispatch.recommended')}
                  />
                )}
                {policy.allowDirect && (
                  <ChoiceCard
                    selected={form.mode === 'DIRECT'}
                    onClick={() => set('mode', 'DIRECT')}
                    icon={<UserSearch className="h-6 w-6" />}
                    title={t('wizard.dispatch.directTitle')}
                    description={t('wizard.dispatch.directDesc')}
                  />
                )}
              </div>

              {policy.forcedCarrierId && (
                <div className="rounded-lg border bg-[hsl(var(--mint))]/[0.06] p-3 text-sm">
                  <span className="font-semibold">{t('wizard.dispatch.forcedTitle')}</span>{' '}
                  {t('wizard.dispatch.forcedText', { name: carrierName(policy.forcedCarrierId) })}
                </div>
              )}

              {form.mode === 'DIRECT' && !policy.forcedCarrierId && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('wizard.dispatch.selectCarrier')}</Label>
                    <span className="text-xs text-muted-foreground">
                      {carriersLoading ? t('wizard.dispatch.loading') : `${carriers.length} ${t('wizard.dispatch.carriersAvailable')}`}
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('wizard.dispatch.carrierSearchPlaceholder')}
                      value={carrierSearch}
                      onChange={(e) => setCarrierSearch(e.target.value)}
                      className="ps-9"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {carriersLoading && (
                      <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                        <Truck className="h-6 w-6 mx-auto mb-2 animate-pulse" />
                        {t('wizard.dispatch.loadingCarriers')}
                      </div>
                    )}
                    {!carriersLoading && carriers.length === 0 && (
                      <div className="col-span-2 text-center py-8 text-sm text-muted-foreground">
                        {t('wizard.dispatch.noCarriers')}
                      </div>
                    )}
                    {carriers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => set('targetCarrierId', c.id)}
                        className={cn(
                          'text-start p-4 rounded-lg border-2 transition-all flex items-start gap-3',
                          form.targetCarrierId === c.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{c.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{c.nameAr}</div>
                          {c.nameEn && <div className="text-xs text-muted-foreground truncate" dir="ltr">{c.nameEn}</div>}
                          <div className="text-xs text-muted-foreground mt-1">{c.city}</div>
                        </div>
                        {form.targetCarrierId === c.id && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                </div>
              )}

              {/* Pricing — works with either distribution mode */}
              <div className="rounded-lg border p-4 space-y-3">
                <Label>{t('wizard.dispatch.pricing')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {policy.allowMarketPricing && (
                    <ChoiceCard
                      selected={form.pricingMode === 'MARKET'}
                      onClick={() => { set('pricingMode', 'MARKET'); set('fixedPrice', null); }}
                      icon={<Gavel className="h-6 w-6" />}
                      title={t('wizard.dispatch.marketTitle')}
                      description={t('wizard.dispatch.marketDesc')}
                    />
                  )}
                  {policy.allowFixedPricing && (
                    <ChoiceCard
                      selected={form.pricingMode === 'FIXED'}
                      onClick={() => set('pricingMode', 'FIXED')}
                      icon={<Coins className="h-6 w-6" />}
                      title={t('wizard.dispatch.fixedTitle')}
                      description={t('wizard.dispatch.fixedDesc')}
                    />
                  )}
                </div>
                {form.pricingMode === 'FIXED' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fixed-price">{t('wizard.dispatch.fixedPrice')}</Label>
                    <Input
                      id="fixed-price"
                      type="number"
                      dir="ltr"
                      min={1}
                      placeholder="0.00"
                      className="text-end"
                      value={form.fixedPrice ?? ''}
                      onChange={(e) => set('fixedPrice', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="rounded-lg border p-4 space-y-3">
                <Label>{t('wizard.dispatch.payment')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {policy.allowPrepaid && (
                    <ChoiceCard
                      selected={form.paymentMethod === 'PREPAID'}
                      onClick={() => set('paymentMethod', 'PREPAID')}
                      icon={<Wallet className="h-6 w-6" />}
                      title={t('wizard.dispatch.prepaidTitle')}
                      description={t('wizard.dispatch.prepaidDesc')}
                    />
                  )}
                  {policy.allowCOD && (
                    <ChoiceCard
                      selected={form.paymentMethod === 'COD'}
                      onClick={() => set('paymentMethod', 'COD')}
                      icon={<Banknote className="h-6 w-6" />}
                      title={t('wizard.dispatch.codTitle')}
                      description={t('wizard.dispatch.codDesc')}
                    />
                  )}
                </div>
              </div>
            </Step>
          )}

          {step === 4 && (
            <Step title={t('wizard.requirements.title')} description={t('wizard.requirements.description')}>
              <div className="space-y-2">
                <Label>{t('wizard.requirements.truckType')}</Label>
                <Select value={form.truckType} onValueChange={(v) => set('truckType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {truckTypesList.map((tt) => <SelectItem key={tt.value} value={tt.value}>{tt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('wizard.requirements.truckTypeHint')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ToggleCard
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title={t('wizard.requirements.insuranceTitle')}
                  description={t('wizard.requirements.insuranceDesc')}
                  checked={form.requiresInsurance}
                  onChange={(v) => set('requiresInsurance', v)}
                />
                <ToggleCard
                  icon={<Snowflake className="h-5 w-5" />}
                  title={t('wizard.requirements.refrigerationTitle')}
                  description={t('wizard.requirements.refrigerationDesc')}
                  checked={form.requiresRefrigeration}
                  onChange={(v) => set('requiresRefrigeration', v)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('wizard.requirements.specialInstructions')}</Label>
                <Textarea value={form.specialInstructions} onChange={(e) => set('specialInstructions', e.target.value)}
                  placeholder={t('wizard.requirements.specialPlaceholder')} />
              </div>
            </Step>
          )}

          {step === 5 && (
            <Step title={t('wizard.review.title')} description={t('wizard.review.description')}>
              <Section title={t('wizard.review.cargo')}>
                <Row
                  label={t('wizard.review.orderType')}
                  value={form.orderType === 'CONSOLIDATED'
                    ? <span className="num">{t('wizard.consolidatedLabel')} · {form.truckCount} {t('wizard.trucksWord')}</span>
                    : t('wizard.singleLabel')}
                />
                <Row label={t('wizard.review.cargoType')} value={(() => { const c = CARGO_TYPES.find((x) => x.value === form.cargoType); return c ? t(c.labelKey) : undefined; })()} />
                <Row label={t('wizard.review.weight')} value={<span className="num">{form.weightKg.toLocaleString('en-US')} {t('wizard.kgUnit')}</span>} />
                <Row label={t('wizard.review.description2')} value={form.cargoDescription} />
              </Section>
              <Separator />
              <Section title={t('wizard.review.route')}>
                <Row label={t('wizard.review.from')} value={`${form.originCity} — ${form.originAddress || '—'}`} />
                <Row label={t('wizard.review.to')} value={`${form.destinationCity} — ${form.destinationAddress || '—'}`} />
                <Row label={t('wizard.review.pickupDate')} value={form.pickupDate || '—'} />
              </Section>
              <Separator />
              <Section title={t('wizard.review.dispatchPricing')}>
                <Row label={t('wizard.review.distribution')} value={form.mode === 'OPEN' ? t('wizard.dispatch.openTitle') : t('wizard.dispatch.directTitle')} />
                {form.mode === 'DIRECT' && form.targetCarrierId && (
                  <Row label={t('wizard.review.carrier')} value={carriersRaw?.find((c) => c.id === form.targetCarrierId)?.nameAr ?? '—'} />
                )}
                <Row label={t('wizard.review.pricing')} value={form.pricingMode === 'FIXED'
                  ? `${t('wizard.review.fixedValue')} · ${(form.fixedPrice ?? 0).toLocaleString('en-US')} ${t('wizard.sarUnit')}`
                  : t('wizard.dispatch.marketTitle')} />
                <Row label={t('wizard.review.payment')} value={form.paymentMethod === 'COD' ? t('wizard.dispatch.codTitle') : t('wizard.review.prepaidValue')} />
              </Section>
              <Separator />
              <Section title={t('wizard.review.requirements')}>
                <Row label={t('wizard.review.truckType')} value={truckTypesList.find((tt) => tt.value === form.truckType)?.label} />
                <Row label={t('wizard.review.insurance')} value={form.requiresInsurance ? t('wizard.review.yes') : t('wizard.review.no')} />
                <Row label={t('wizard.review.refrigeration')} value={form.requiresRefrigeration ? t('wizard.review.yes') : t('wizard.review.no')} />
                {form.specialInstructions && <Row label={t('wizard.review.instructions')} value={form.specialInstructions} />}
              </Section>
            </Step>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          {t('wizard.nav.prev')}
        </Button>
        {step < STEPS.length ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            {t('wizard.nav.next')}
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={!canNext || submitting}>
            <Send className="h-4 w-4" />
            {submitting ? t('wizard.nav.submitting') : t('wizard.nav.submit')}
          </Button>
        )}
      </div>
      {submitError && (
        <div className="mt-3 rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}
       </div>

       {/* Live order summary */}
       <aside className="lg:col-span-1">
         <OrderSummary form={form} step={step} truckTypes={truckTypesList} carriers={carriersRaw ?? []} />
       </aside>
      </div>
    </>
  );
}

const WINDOW_LABEL_KEY: Record<string, string> = {
  MORNING: 'wizard.windowShort.morning', EVENING: 'wizard.windowShort.evening', ALL_DAY: 'wizard.windowShort.allDay',
};

function SummaryRow({ icon: Icon, label, value, muted }: { icon: React.ElementType; label: string; value: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', muted ? 'text-muted-foreground/40' : 'text-[hsl(var(--mint))]')} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className={cn('text-sm font-semibold', muted && 'text-muted-foreground/50')}>{value}</div>
      </div>
    </div>
  );
}

function OrderTypeCard({
  active, icon: Icon, title, desc, onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-3.5 text-start transition-colors',
        active
          ? 'border-[hsl(var(--mint))] bg-[hsl(var(--mint))]/[0.08] ring-1 ring-[hsl(var(--mint))]'
          : 'hover:bg-muted/40',
      )}
    >
      <span className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
        active ? 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]' : 'bg-muted text-muted-foreground',
      )}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">{title}</div>
        <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{desc}</div>
      </div>
      {active && <Check className="ms-auto h-4 w-4 shrink-0 text-[hsl(var(--mint))]" />}
    </button>
  );
}

function OrderSummary({
  form, step, truckTypes, carriers,
}: {
  form: FormState;
  step: number;
  truckTypes: { value: string; label: string }[];
  carriers: ApiCarrier[];
}) {
  const t = useTranslations('orders');
  const cargoTypeRec = CARGO_TYPES.find((c) => c.value === form.cargoType);
  const cargoLabel = cargoTypeRec ? t(cargoTypeRec.labelKey) : undefined;
  const truckLabel = truckTypes.find((tt) => tt.value === form.truckType)?.label;
  const carrierName = carriers.find((c) => c.id === form.targetCarrierId)?.nameAr;
  const nf = new Intl.NumberFormat('en-US');
  const modeValue = form.mode === 'DIRECT'
    ? `${t('wizard.summary.directShort')}${carrierName ? ` · ${carrierName}` : ''}`
    : form.mode === 'OPEN' ? t('wizard.summary.openMarket') : null;

  return (
    <div className="sticky top-24 overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="border-b border-border/60 bg-secondary/40 px-5 py-3.5">
        <h3 className="text-sm font-bold">{t('wizard.summary.title')}</h3>
        <p className="num mt-0.5 text-xs text-muted-foreground">{t('wizard.summary.step')} {nf.format(step)} {t('wizard.summary.of')} {nf.format(STEPS.length)}</p>
      </div>
      <div className="divide-y divide-border/50 px-5">
        <SummaryRow
          icon={form.orderType === 'CONSOLIDATED' ? Layers : Truck}
          label={t('wizard.summary.orderType')}
          value={form.orderType === 'CONSOLIDATED'
            ? `${t('wizard.consolidatedLabel')} · ${nf.format(form.truckCount)} ${t('wizard.trucksWord')}`
            : t('wizard.singleLabel')}
        />
        <SummaryRow
          icon={MapPin}
          label={t('wizard.summary.route')}
          muted={!form.originCity || !form.destinationCity}
          value={form.originCity && form.destinationCity
            ? `${form.originCity} ← ${form.destinationCity}`
            : t('wizard.summary.notSetM')}
        />
        <SummaryRow
          icon={Package}
          label={t('wizard.summary.cargo')}
          muted={!cargoLabel}
          value={cargoLabel
            ? `${cargoLabel}${form.weightKg > 0 ? ` · ${nf.format(form.weightKg)} ${t('wizard.kgUnit')}` : ''}`
            : t('wizard.summary.notSetF')}
        />
        <SummaryRow
          icon={Clock}
          label={t('wizard.summary.pickupTime')}
          muted={!form.pickupDate}
          value={form.pickupDate
            ? `${form.pickupDate} · ${t(WINDOW_LABEL_KEY[form.pickupWindow])}`
            : t('wizard.summary.notSetM')}
        />
        <SummaryRow
          icon={form.mode === 'DIRECT' ? UserSearch : Radio}
          label={t('wizard.summary.dispatch')}
          muted={!modeValue}
          value={modeValue ?? t('wizard.summary.notSetF')}
        />
        <SummaryRow
          icon={form.pricingMode === 'FIXED' ? Coins : Gavel}
          label={t('wizard.summary.pricing')}
          value={form.pricingMode === 'FIXED'
            ? `${t('wizard.summary.fixedShort')}${form.fixedPrice ? ` · ${nf.format(form.fixedPrice)} ${t('wizard.sarUnit')}` : ''}`
            : t('wizard.dispatch.marketTitle')}
        />
        <SummaryRow
          icon={form.paymentMethod === 'COD' ? Banknote : Wallet}
          label={t('wizard.summary.payment')}
          value={form.paymentMethod === 'COD' ? t('wizard.summary.codShort') : t('wizard.summary.prepaidShort')}
        />
        <SummaryRow
          icon={Truck}
          label={t('wizard.summary.truckType')}
          muted={!truckLabel}
          value={truckLabel ?? t('wizard.summary.notSetM')}
        />
        {(form.requiresInsurance || form.requiresRefrigeration) && (
          <div className="flex flex-wrap gap-1.5 py-3">
            {form.requiresInsurance && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--mint))]/12 px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--mint))]">
                <ShieldCheck className="h-3 w-3" /> {t('wizard.summary.insuranceTag')}
              </span>
            )}
            {form.requiresRefrigeration && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--mint))]/12 px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--mint))]">
                <Snowflake className="h-3 w-3" /> {t('wizard.summary.refrigerationTag')}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-border/60 bg-secondary/30 px-5 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t('wizard.summary.footer')}
        </p>
      </div>
    </div>
  );
}

/**
 * Maps + address pair for the route step. Renders two MapAddressPickers
 * (pickup + delivery) centered on the corresponding city. Drives both the
 * address text fields and the precise pin lat/lng.
 */
function RouteMapsBlock({
  cities,
  originCity, destinationCity,
  originAddress, destinationAddress,
  originPin, destinationPin,
  onOriginAddress, onDestAddress,
  onOriginPin, onDestPin,
}: {
  cities: CatalogCity[];
  originCity: string;
  destinationCity: string;
  originAddress: string;
  destinationAddress: string;
  originPin: MapPoint | null;
  destinationPin: MapPoint | null;
  onOriginAddress: (v: string) => void;
  onDestAddress: (v: string) => void;
  onOriginPin: (p: MapPoint) => void;
  onDestPin: (p: MapPoint) => void;
}) {
  const t = useTranslations('orders');
  const fallback = cities[0] ?? DEFAULT_CITIES[0];
  const originCityRec = cities.find((c) => c.nameAr === originCity) ?? fallback;
  const destCityRec = cities.find((c) => c.nameAr === destinationCity) ?? fallback;
  const originCenter = { lat: originCityRec.lat, lng: originCityRec.lng };
  const destCenter = { lat: destCityRec.lat, lng: destCityRec.lng };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>{t('wizard.route.pickupLocation', { city: originCity })}</Label>
        <MapAddressPicker
          center={originCenter}
          value={originPin ?? undefined}
          onChange={onOriginPin}
          label={t('wizard.route.pickupLocation', { city: originCity })}
          cityName={originCity}
        />
        <Input
          value={originAddress}
          onChange={(e) => onOriginAddress(e.target.value)}
          placeholder={t('wizard.route.addressPlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('wizard.route.deliveryLocation', { city: destinationCity })}</Label>
        <MapAddressPicker
          center={destCenter}
          value={destinationPin ?? undefined}
          onChange={onDestPin}
          label={t('wizard.route.deliveryLocation', { city: destinationCity })}
          cityName={destinationCity}
        />
        <Input
          value={destinationAddress}
          onChange={(e) => onDestAddress(e.target.value)}
          placeholder={t('wizard.route.addressPlaceholder')}
        />
      </div>
    </div>
  );
}

function Step({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ChoiceCard({
  icon, title, description, selected, badge, onClick,
}: { icon: React.ReactNode; title: string; description: string; selected: boolean; badge?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-start p-5 rounded-xl border-2 transition-all flex items-start gap-4',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
      )}
    >
      <div className={cn(
        'shrink-0 h-12 w-12 rounded-xl grid place-items-center',
        selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{title}</h3>
          {badge && <Badge variant="warning" className="text-[10px]">{badge}</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <span className={cn(
        'h-6 w-6 rounded-full border-2 grid place-items-center shrink-0',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
      )}>
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function ToggleCard({
  icon, title, description, checked, onChange,
}: { icon: React.ReactNode; title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'text-start p-4 rounded-lg border-2 transition-all flex items-start gap-3',
        checked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
      )}
    >
      <div className={cn(
        'shrink-0 h-10 w-10 rounded-md grid place-items-center',
        checked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-end max-w-[60%]">{value ?? '—'}</dd>
    </div>
  );
}
