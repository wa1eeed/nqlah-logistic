'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Check, CheckCircle2,
  Eye, EyeOff, FileCheck2, Mail, MapPin, Phone, ShieldCheck, Snowflake,
  Sparkles, Truck, Upload, User, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { localizeCity, localizeRegion } from '@naqla/shared-utils';
import { useTruckTypesStore } from '@/stores/truck-types-store';
import { useAuthStore } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type AccountType = 'COMPANY' | 'INDIVIDUAL';
type VatChoice = 'REGISTERED' | 'NOT_REGISTERED' | '';

interface Form {
  // Step 0 — account type (NEW)
  accountType: AccountType | '';

  // Step 1 — personal/account basics
  fullName: string;
  position: string;        // for COMPANY only — owner/GM/ops/fleet/authorized
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;

  // Step 2 — business/personal info
  companyNameAr: string;        // for COMPANY
  companyNameEn: string;        // for COMPANY
  crNumber: string;             // for COMPANY only (10 digits)
  nationalId: string;           // for INDIVIDUAL only (10 digits)
  vatChoice: VatChoice;         // for both — REGISTERED | NOT_REGISTERED
  vatNumber: string;            // required only if vatChoice === REGISTERED
  city: string;
  region: string;
  address: string;
  yearsInBusiness: string;
  // Step 2 — fleet
  fleetSize: string;
  truckTypes: string[];
  hasGps: boolean;
  hasInsurance: boolean;
  hasRefrigeration: boolean;
  primaryRegions: string[];
  // Subscription plan chosen at signup (empty → default plan is used).
  planId: string;
  // Step 3 — compliance docs
  docs: Record<string, File | null>;
  // Step 4 — bank
  iban: string;
  bankName: string;
  accountHolder: string;
  // Step 5 — verification + terms
  emailOtp: string;
  phoneOtp: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  acceptTransport: boolean;
  acceptCommission: boolean;
}

const CITIES = ['الرياض', 'جدة', 'الدمام', 'الخبر', 'مكة المكرمة', 'المدينة', 'الطائف', 'تبوك', 'حائل', 'بريدة', 'الجبيل', 'ينبع', 'أبها'];
const REGIONS = ['الوسطى', 'الغربية', 'الشرقية', 'الشمالية', 'الجنوبية'];
const FLEET_SIZES = [
  { v: '1-5',   l: 'register.fleet.size_1_5' },
  { v: '6-15',  l: 'register.fleet.size_6_15' },
  { v: '16-50', l: 'register.fleet.size_16_50' },
  { v: '50+',   l: 'register.fleet.size_50plus' },
];
const YEARS_OPTS = [
  { v: '<1',  l: 'register.years.lt1' },
  { v: '1-3', l: 'register.years.1_3' },
  { v: '3-10',l: 'register.years.3_10' },
  { v: '10+', l: 'register.years.10plus' },
];
/**
 * Documents required vary by account type.
 *
 * COMPANY (Saudi MoCI + Ministry of Transport):
 *   - السجل التجاري (CR)
 *   - شهادة الضريبة (VAT) — if registered
 *   - شهادة الزكاة والدخل
 *   - رخصة نقل البضائع (التي تصدرها هيئة النقل العام / TGA)
 *   - بوليصة التأمين
 *
 * INDIVIDUAL (per Saudi TGA regulations for individual freight carriers):
 *   - الهوية الوطنية
 *   - رخصة قيادة سارية بفئة مناسبة لنوع الشاحنة (متوسطة/ثقيلة/تركيب وقاطرة)
 *   - استمارة الشاحنة (الاستمارة) — الملكية
 *   - رخصة النقل بالأجرة للأفراد (إن انطبقت)
 *   - تأمين الشاحنة (شامل أو ضد الغير)
 *   - شهادة الضريبة (VAT) — اختيارية للأفراد إذا تجاوزت إيراداتهم 375,000 ر.س.
 */
const COMPANY_DOCS = [
  { id: 'CR',        label: 'register.kycDocs.cr',               required: true },
  { id: 'ZAKAT',     label: 'register.kycDocs.zakat',            required: true },
  { id: 'TRANSPORT', label: 'register.kycDocs.transport',        required: true },
  { id: 'INSURANCE', label: 'register.kycDocs.insuranceCompany', required: true },
  { id: 'VAT',       label: 'register.kycDocs.vat',              required: false, vatOnly: true },
  { id: 'BANK',      label: 'register.kycDocs.bank',             required: false },
];

const INDIVIDUAL_DOCS = [
  { id: 'NATIONAL_ID',     label: 'register.kycDocs.nationalId',          required: true },
  { id: 'DRIVING_LICENSE', label: 'register.kycDocs.drivingLicense',      required: true },
  { id: 'ISTIMARA',        label: 'register.kycDocs.istimara',            required: true },
  { id: 'INSURANCE',       label: 'register.kycDocs.insuranceIndividual', required: true },
  { id: 'TGA_PERMIT',      label: 'register.kycDocs.tgaPermit',           required: false },
  { id: 'VAT',             label: 'register.kycDocs.vat',                 required: false, vatOnly: true },
  { id: 'BANK',            label: 'register.kycDocs.bank',                required: false },
];

interface DocSpec { id: string; label: string; required: boolean; vatOnly?: boolean }

function docsFor(accountType: AccountType | '', vatChoice: VatChoice): DocSpec[] {
  const list: DocSpec[] = accountType === 'INDIVIDUAL' ? INDIVIDUAL_DOCS : COMPANY_DOCS;
  // Hide VAT-specific doc rows if user said "Not registered"
  return list.filter((d) => !(d.vatOnly && vatChoice !== 'REGISTERED'));
}
const BANKS = [
  { v: 'الراجحي',        l: 'register.banks.rajhi' },
  { v: 'الأهلي SNB',     l: 'register.banks.snb' },
  { v: 'الرياض',         l: 'register.banks.riyad' },
  { v: 'البلاد',         l: 'register.banks.albilad' },
  { v: 'الإنماء',        l: 'register.banks.alinma' },
  { v: 'ساب',            l: 'register.banks.sab' },
  { v: 'العربي الوطني',  l: 'register.banks.anb' },
  { v: 'الفرنسي',        l: 'register.banks.bsf' },
  { v: 'الاستثمار',      l: 'register.banks.saib' },
];

const STEPS_META = [
  { title: 'register.steps.accountType', icon: User },
  { title: 'register.steps.account',     icon: User },
  { title: 'register.steps.info',        icon: Building2 },
  { title: 'register.steps.fleet',       icon: Truck },
  { title: 'register.steps.docs',        icon: FileCheck2 },
  { title: 'register.steps.bank',        icon: Building2 },
  { title: 'register.steps.verify',      icon: ShieldCheck },
];

export default function CarrierRegisterPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<Form>({
    accountType: '',
    fullName: '', position: '', email: '', phone: '', password: '', confirmPassword: '',
    companyNameAr: '', companyNameEn: '', crNumber: '', nationalId: '',
    vatChoice: '', vatNumber: '',
    city: '', region: '', address: '', yearsInBusiness: '',
    fleetSize: '', truckTypes: [], hasGps: true, hasInsurance: true, hasRefrigeration: false,
    primaryRegions: [], planId: '',
    docs: {},
    iban: '', bankName: '', accountHolder: '',
    emailOtp: '', phoneOtp: '',
    acceptTerms: false, acceptPrivacy: false, acceptTransport: false, acceptCommission: false,
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((s) => ({ ...s, [k]: v }));

  const isIndividual = form.accountType === 'INDIVIDUAL';
  const docsList = useMemo(() => docsFor(form.accountType, form.vatChoice), [form.accountType, form.vatChoice]);

  const stepValid: Record<number, boolean> = {
    // Step 0: choose account type
    0: form.accountType === 'COMPANY' || form.accountType === 'INDIVIDUAL',

    // Step 1: account basics (position only required for companies)
    1: !!form.fullName.trim() &&
       (isIndividual || !!form.position) &&
       /\S+@\S+\.\S+/.test(form.email) &&
       /^(\+?966|0)?5\d{8}$/.test(form.phone.replace(/\s+/g, '')) &&
       form.password.length >= 8 && form.password === form.confirmPassword,

    // Step 2: business info — different requirements per account type
    2: !!form.city && !!form.region && !!form.yearsInBusiness && !!form.vatChoice &&
       (form.vatChoice !== 'REGISTERED' || /^\d{15}$/.test(form.vatNumber)) &&
       (isIndividual
          ? /^\d{10}$/.test(form.nationalId)
          : !!form.companyNameAr && /^\d{10}$/.test(form.crNumber)
       ),

    // Step 3: fleet
    3: !!form.fleetSize && form.truckTypes.length > 0 && form.primaryRegions.length > 0,

    // Step 4: docs — only required ones
    4: docsList.filter((d) => d.required).every((d) => !!form.docs[d.id]),

    // Step 5: bank
    5: /^SA\d{22}$/.test(form.iban.replace(/\s+/g, '')) && !!form.bankName && !!form.accountHolder,

    // Step 6: verification + consent
    6: form.emailOtp.length === 4 && form.phoneOtp.length === 4 &&
       form.acceptTerms && form.acceptPrivacy && form.acceptTransport && form.acceptCommission,
  };

  const goNext = () => {
    if (!stepValid[step]) return;
    if (step < 6) setStep((step + 1) as Step);
    else submit();
  };
  const goBack = () => { if (step > 0) setStep((step - 1) as Step); };

  const submit = async () => {
    setSubmitting(true);
    try {
      const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
      await api.post('/auth/register', {
        companyType: 'CARRIER',
        accountType: form.accountType || 'COMPANY',
        // Individuals have no trade name — use the person's name as the account name.
        companyNameAr: (form.companyNameAr || form.fullName).trim(),
        ...(form.companyNameEn ? { companyNameEn: form.companyNameEn.trim() } : {}),
        city: form.city,
        region: form.region,
        contactPhone: form.phone,
        ...(form.email ? { contactEmail: form.email, email: form.email } : {}),
        firstName: firstName || form.fullName,
        lastName: rest.join(' ') || firstName || form.fullName,
        phone: form.phone,
        password: form.password,
        ...(form.nationalId ? { nationalId: form.nationalId } : {}),
        ...(form.accountType === 'COMPANY' && form.crNumber ? { crNumber: form.crNumber } : {}),
        // VAT (ZATCA): send the registration choice + the 15-digit number when registered.
        ...(form.vatChoice ? { vatRegistered: form.vatChoice === 'REGISTERED' } : {}),
        ...(form.vatChoice === 'REGISTERED' && form.vatNumber ? { vatNumber: form.vatNumber } : {}),
        ...(form.planId ? { planId: form.planId } : {}),
        acceptedTerms: form.acceptTerms,
        acceptedPrivacy: form.acceptPrivacy,
        acceptedTransport: form.acceptTransport,
      });
      // Account created — sign in (phone verification can be completed later).
      await useAuthStore.getState().login(form.phone, form.password);
      router.push('/');
    } catch (e) {
      notify.error(e);
      setSubmitting(false);
    }
  };

  const toggleTruck = (id: string) => set('truckTypes', form.truckTypes.includes(id) ? form.truckTypes.filter((x) => x !== id) : [...form.truckTypes, id]);
  const toggleRegion = (r: string) => set('primaryRegions', form.primaryRegions.includes(r) ? form.primaryRegions.filter((x) => x !== r) : [...form.primaryRegions, r]);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight">{t('register.brandHeader')}</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
            {t('register.haveAccount')} <span className="text-primary font-semibold">{t('login.signIn')}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6 order-2 lg:order-1">
          {/* Stepper */}
          <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-thin pb-2">
            {STEPS_META.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <li key={s.title} className="flex items-center gap-1 sm:gap-2 shrink-0">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs whitespace-nowrap',
                      isActive ? 'bg-primary text-primary-foreground font-semibold' :
                      isDone ? 'text-success' : 'text-muted-foreground',
                    )}
                  >
                    <div className={cn(
                      'h-6 w-6 rounded-full grid place-items-center text-[10px] font-bold',
                      isActive ? 'bg-primary-foreground text-primary' :
                      isDone ? 'bg-success/15' : 'bg-muted',
                    )}>
                      {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    </div>
                    <span className="hidden sm:inline">{t(s.title)}</span>
                  </div>
                  {i < STEPS_META.length - 1 && <div className="h-px w-3 sm:w-5 bg-border" />}
                </li>
              );
            })}
          </ol>

          <Card>
            <CardContent className="pt-6 space-y-6">
              {step === 0 && <StepAccountType form={form} set={set} />}
              {step === 1 && <StepBasics form={form} set={set} showPw={showPw} setShowPw={setShowPw} isIndividual={isIndividual} />}
              {step === 2 && <StepCompany form={form} set={set} isIndividual={isIndividual} />}
              {step === 3 && <StepFleet form={form} set={set} toggleTruck={toggleTruck} toggleRegion={toggleRegion} />}
              {step === 4 && <StepDocs form={form} set={set} docsList={docsList} />}
              {step === 5 && <StepBank form={form} set={set} />}
              {step === 6 && <StepVerify form={form} set={set} />}

              <div className="flex items-center justify-between gap-3 pt-4 border-t">
                <Button variant="outline" onClick={goBack} disabled={step === 0 || submitting}>
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('register.back')}
                </Button>
                <Button onClick={goNext} disabled={!stepValid[step] || submitting} size="lg">
                  {step === 6
                    ? (submitting ? t('register.submitting') : t('register.submit'))
                    : (<>{t('register.next')} <ArrowLeft className="h-4 w-4 rtl:rotate-180" /></>)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-8 space-y-4">
            <Card className="bg-primary text-primary-foreground border-primary">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="font-bold">{t('register.sidebar.title')}</h3>
                </div>
                <ul className="space-y-3 text-sm">
                  <Benefit text={t('register.sidebar.benefit1')} />
                  <Benefit text={t('register.sidebar.benefit2')} />
                  <Benefit text={t('register.sidebar.benefit3')} />
                  <Benefit text={t('register.sidebar.benefit4')} />
                  <Benefit text={t('register.sidebar.benefit5')} />
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-warning">
                  <FileCheck2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">{t('register.sidebar.reviewTitle')}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('register.sidebar.reviewText')}
                </p>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <BadgeCheck className="h-4 w-4 shrink-0 mt-0.5" />
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

function StepHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Step 0: Account Type — Company vs Individual ────────────────────

function StepAccountType({
  form, set,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const t = useTranslations('auth');
  return (
    <>
      <StepHeader icon={User} title={t('register.accountType.title')} subtitle={t('register.accountType.subtitle')} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KindCard
          selected={form.accountType === 'COMPANY'}
          onClick={() => set('accountType', 'COMPANY')}
          icon={Building2}
          title={t('register.accountType.company.title')}
          subtitle={t('register.accountType.company.subtitle')}
          bullets={[t('register.accountType.company.bullet1'), t('register.accountType.company.bullet2'), t('register.accountType.company.bullet3'), t('register.accountType.company.bullet4')]}
          tag={t('register.accountType.company.tag')}
        />
        <KindCard
          selected={form.accountType === 'INDIVIDUAL'}
          onClick={() => set('accountType', 'INDIVIDUAL')}
          icon={User}
          title={t('register.accountType.individual.title')}
          subtitle={t('register.accountType.individual.subtitle')}
          bullets={[t('register.accountType.individual.bullet1'), t('register.accountType.individual.bullet2'), t('register.accountType.individual.bullet3'), t('register.accountType.individual.bullet4')]}
          tag={t('register.accountType.individual.tag')}
        />
      </div>

      <div className="rounded-lg bg-info/10 border border-info/30 p-3 flex items-start gap-2 text-sm">
        <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('register.accountType.infoNote')}
        </p>
      </div>
    </>
  );
}

function KindCard({
  selected, onClick, icon: Icon, title, subtitle, bullets, tag,
}: {
  selected: boolean; onClick: () => void; icon: any;
  title: string; subtitle: string; bullets: string[]; tag: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start p-5 rounded-xl border-2 text-start transition-all',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex items-center justify-between gap-2 w-full mb-3">
        <div className={cn('h-11 w-11 rounded-xl grid place-items-center', selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          <Icon className="h-5 w-5" />
        </div>
        {selected && <CheckCircle2 className="h-5 w-5 text-primary" />}
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">{subtitle}</p>
      <ul className="space-y-1.5 text-xs mb-3">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <Check className="h-3 w-3 shrink-0 mt-0.5 text-success" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
      <Badge variant="outline" className="text-[10px]">{tag}</Badge>
    </button>
  );
}

// ─── Step 1: Basics ───────────────────────────────────────────────────

function StepBasics({
  form, set, showPw, setShowPw, isIndividual,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; showPw: boolean; setShowPw: (v: boolean) => void; isIndividual: boolean }) {
  const t = useTranslations('auth');
  return (
    <>
      <StepHeader
        icon={User}
        title={isIndividual ? t('register.basics.titleIndividual') : t('register.basics.titleCompany')}
        subtitle={isIndividual ? t('register.basics.subtitleIndividual') : t('register.basics.subtitleCompany')}
      />
      <div className="space-y-4">
        <div className={cn('grid grid-cols-1 gap-4', !isIndividual && 'sm:grid-cols-2')}>
          <div className="space-y-2">
            <Label>{t('register.basics.fullName')}</Label>
            <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder={t('register.basics.fullNamePlaceholder')} />
          </div>
          {!isIndividual && (
            <div className="space-y-2">
              <Label>{t('register.basics.position')}</Label>
              <Select value={form.position} onValueChange={(v) => set('position', v)}>
                <SelectTrigger><SelectValue placeholder={t('register.basics.positionPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">{t('register.basics.positions.owner')}</SelectItem>
                  <SelectItem value="GM">{t('register.basics.positions.gm')}</SelectItem>
                  <SelectItem value="OPS_MANAGER">{t('register.basics.positions.opsManager')}</SelectItem>
                  <SelectItem value="FLEET_MANAGER">{t('register.basics.positions.fleetManager')}</SelectItem>
                  <SelectItem value="AUTHORIZED">{t('register.basics.positions.authorized')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label><Mail className="h-3.5 w-3.5 inline me-1" /> {t('register.basics.email')}</Label>
            <Input type="email" dir="ltr" className="text-end" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="ops@company.sa" />
          </div>
          <div className="space-y-2">
            <Label><Phone className="h-3.5 w-3.5 inline me-1" /> {t('phone')}</Label>
            <Input dir="ltr" className="text-end" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+966 5XX XXX XXXX" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('password')}</Label>
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} className="pe-10"
              value={form.password} onChange={(e) => set('password', e.target.value)}
              placeholder={t('register.basics.passwordPlaceholder')}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('confirmPassword')}</Label>
          <Input type={showPw ? 'text' : 'password'}
            value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)}
            placeholder={t('register.basics.confirmPlaceholder')}
          />
          {form.confirmPassword && form.password !== form.confirmPassword && (
            <p className="text-xs text-destructive">{t('register.basics.passwordMismatch')}</p>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Step 2: Company / Individual info ───────────────────────────────

function StepCompany({
  form, set, isIndividual,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void; isIndividual: boolean }) {
  const t = useTranslations('auth');
  return (
    <>
      <StepHeader
        icon={Building2}
        title={isIndividual ? t('register.company.titleIndividual') : t('register.company.titleCompany')}
        subtitle={isIndividual ? t('register.company.subtitleIndividual') : t('register.company.subtitleCompany')}
      />
      <div className="space-y-4">
        {isIndividual ? (
          // ── INDIVIDUAL: National ID instead of CR ─────────────────
          <div className="space-y-2">
            <Label>{t('register.company.nationalId')}</Label>
            <Input
              dir="ltr" className="num text-end" maxLength={10}
              value={form.nationalId}
              onChange={(e) => set('nationalId', e.target.value.replace(/\D/g, ''))}
              placeholder="1xxxxxxxxx"
            />
            <p className="text-xs text-muted-foreground">{t('register.company.nationalIdHint')}</p>
          </div>
        ) : (
          // ── COMPANY: Company name + CR ────────────────────────────
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('register.company.companyNameAr')}</Label>
                <Input value={form.companyNameAr} onChange={(e) => set('companyNameAr', e.target.value)} placeholder={t('register.company.companyNameArPlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('register.company.companyNameEn')} <span className="text-muted-foreground">{t('register.optional')}</span></Label>
                <Input dir="ltr" value={form.companyNameEn} onChange={(e) => set('companyNameEn', e.target.value)} placeholder="Al Jazirah Cargo" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('register.company.crNumber')}</Label>
              <Input dir="ltr" className="num text-end" maxLength={10}
                value={form.crNumber} onChange={(e) => set('crNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="1010000000"
              />
            </div>
          </>
        )}

        {/* VAT — both account types, with explicit "not registered" option */}
        <div className="space-y-2">
          <Label>{t('register.company.vatLabel')}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set('vatChoice', 'REGISTERED')}
              className={cn(
                'p-3 rounded-lg border-2 text-start text-sm transition-colors',
                form.vatChoice === 'REGISTERED' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="font-semibold mb-0.5">{t('register.company.vatRegistered')}</div>
              <div className="text-xs text-muted-foreground">{t('register.company.vatRegisteredDesc')}</div>
            </button>
            <button
              type="button"
              onClick={() => set('vatChoice', 'NOT_REGISTERED')}
              className={cn(
                'p-3 rounded-lg border-2 text-start text-sm transition-colors',
                form.vatChoice === 'NOT_REGISTERED' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="font-semibold mb-0.5">{t('register.company.vatNotRegistered')}</div>
              <div className="text-xs text-muted-foreground">
                {isIndividual ? t('register.company.vatNotRegisteredDescIndividual') : t('register.company.vatNotRegisteredDescCompany')}
              </div>
            </button>
          </div>

          {form.vatChoice === 'REGISTERED' && (
            <div className="mt-2 space-y-1">
              <Label>{t('register.company.vatNumber')}</Label>
              <Input
                dir="ltr" className="num text-end" maxLength={15}
                value={form.vatNumber}
                onChange={(e) => set('vatNumber', e.target.value.replace(/\D/g, ''))}
                placeholder="300000000000003"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('register.company.city')}</Label>
            <Select value={form.city} onValueChange={(v) => set('city', v)}>
              <SelectTrigger><SelectValue placeholder={t('register.company.selectPlaceholder')} /></SelectTrigger>
              <SelectContent>{CITIES.map((c) => <SelectItem key={c} value={c}>{localizeCity(c)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('register.company.region')}</Label>
            <Select value={form.region} onValueChange={(v) => set('region', v)}>
              <SelectTrigger><SelectValue placeholder={t('register.company.selectPlaceholder')} /></SelectTrigger>
              <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{localizeRegion(r)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{isIndividual ? t('register.company.yearsIndividual') : t('register.company.yearsCompany')}</Label>
            <Select value={form.yearsInBusiness} onValueChange={(v) => set('yearsInBusiness', v)}>
              <SelectTrigger><SelectValue placeholder={t('register.company.selectPlaceholder')} /></SelectTrigger>
              <SelectContent>{YEARS_OPTS.map((o) => <SelectItem key={o.v} value={o.v}>{t(o.l)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label><MapPin className="h-3.5 w-3.5 inline me-1" /> {isIndividual ? t('register.company.addressIndividual') : t('register.company.addressCompany')} <span className="text-muted-foreground">{t('register.optional')}</span></Label>
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder={t('register.company.addressPlaceholder')} />
        </div>
      </div>
    </>
  );
}

// ─── Step 2: Fleet capacity ──────────────────────────────────────────

function StepFleet({
  form, set, toggleTruck, toggleRegion,
}: {
  form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  toggleTruck: (id: string) => void; toggleRegion: (r: string) => void;
}) {
  const t = useTranslations('auth');
  const truckTypes = useTruckTypesStore((s) => s.types.filter((tt) => tt.active));
  return (
    <>
      <StepHeader icon={Truck} title={t('register.fleet.title')} subtitle={t('register.fleet.subtitle')} />
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>{t('register.fleet.sizeLabel')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FLEET_SIZES.map((s) => (
              <button
                key={s.v}
                type="button"
                onClick={() => set('fleetSize', s.v)}
                className={cn(
                  'p-3 rounded-lg border-2 text-sm transition-colors',
                  form.fleetSize === s.v ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-border hover:border-primary/40',
                )}
              >
                {t(s.l)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('register.fleet.truckTypesLabel')}</Label>
          <p className="text-xs text-muted-foreground">{t('register.fleet.truckTypesHint')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {truckTypes.map((tt) => {
              const on = form.truckTypes.includes(tt.id);
              return (
                <button
                  key={tt.id}
                  type="button"
                  onClick={() => toggleTruck(tt.id)}
                  className={cn(
                    'group rounded-lg border-2 text-start transition-all relative overflow-hidden',
                    on ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40',
                  )}
                >
                  <div className="aspect-[16/10] bg-muted/40 flex items-center justify-center p-2 border-b">
                    {tt.imageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={tt.imageUrl}
                          alt={tt.nameAr}
                          className="max-h-full max-w-full object-contain drop-shadow-md"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fb = target.nextElementSibling as HTMLElement;
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                        <div className="text-3xl items-center justify-center" style={{ display: 'none' }}>{tt.icon}</div>
                      </>
                    ) : (
                      <div className="text-3xl">{tt.icon}</div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{tt.nameAr}</span>
                      <span className="text-[10px] num text-muted-foreground shrink-0">{t('register.fleet.tons', { n: (tt.capacityKg / 1000).toFixed(0) })}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{tt.description}</p>
                  </div>
                  {on && (
                    <div className="absolute top-2 end-2 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('register.fleet.regionsLabel')}</Label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => {
              const on = form.primaryRegions.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRegion(r)}
                  className={cn(
                    'px-3 py-1.5 rounded-full border text-sm transition-colors',
                    on ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/40',
                  )}
                >
                  {on && <Check className="h-3 w-3 inline me-1" />}
                  {localizeRegion(r)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t">
          <Label>{t('register.fleet.equipmentLabel')}</Label>
          <ToggleRow label={t('register.fleet.gpsLabel')} desc={t('register.fleet.gpsDesc')} checked={form.hasGps} onChange={(v) => set('hasGps', v)} />
          <ToggleRow label={t('register.fleet.insuranceLabel')} desc={t('register.fleet.insuranceDesc')} checked={form.hasInsurance} onChange={(v) => set('hasInsurance', v)} />
          <ToggleRow label={t('register.fleet.refrigerationLabel')} desc={t('register.fleet.refrigerationDesc')} icon={Snowflake} checked={form.hasRefrigeration} onChange={(v) => set('hasRefrigeration', v)} />
        </div>

        {/* Subscription plan selection (bound at signup). */}
        <div className="space-y-2 pt-2 border-t">
          <Label>اختر باقتك</Label>
          <PlanPicker value={form.planId} onChange={(id) => set('planId', id)} />
        </div>
      </div>
    </>
  );
}

/** Carrier plan selection at signup — fetches the public plan list (no auth). */
function PlanPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [plans, setPlans] = useState<Array<{ id: string; name: string; isFree: boolean; isDefault: boolean; price: { monthly: number }; includedTruckLimit: number | null; trialDays: number; modules: Array<{ key: string; name: string }> }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    api.get('/policies/plans/public?audience=CARRIER')
      .then((r) => { if (alive) { const list = r.data?.data ?? []; setPlans(list); if (!value) { const def = list.find((p: { isDefault: boolean }) => p.isDefault) ?? list[0]; if (def) onChange(def.id); } } })
      .catch(() => { /* non-blocking — default plan is applied server-side */ })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (loading) return <p className="text-xs text-muted-foreground">جارِ تحميل الباقات…</p>;
  if (plans.length === 0) return <p className="text-xs text-muted-foreground">ستُطبَّق الباقة الافتراضية.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {plans.map((p) => {
        const on = value === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              'text-start p-3 rounded-xl border-2 transition-colors',
              on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">{p.name}</span>
              {on && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
            </div>
            <div className="mt-1 text-sm font-bold text-primary num">
              {p.isFree ? 'مجانية' : <>{p.price.monthly.toLocaleString('en-US')} <span className="text-[11px] font-normal text-muted-foreground">ر.س/شهر</span></>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {p.includedTruckLimit != null && <span className="rounded bg-muted px-1.5 py-0.5 num">{p.includedTruckLimit} شاحنة</span>}
              {p.trialDays > 0 && <span className="rounded bg-muted px-1.5 py-0.5 num">{p.trialDays} يوم تجربة</span>}
              {p.modules.slice(0, 3).map((m) => <span key={m.key} className="rounded bg-muted px-1.5 py-0.5">{m.name}</span>)}
              {p.modules.length > 3 && <span className="rounded bg-muted px-1.5 py-0.5 num">+{p.modules.length - 3}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange, icon: Icon }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; icon?: any }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ─── Step 3: Compliance docs ─────────────────────────────────────────

function StepDocs({
  form, set, docsList,
}: {
  form: Form;
  set: <K extends keyof Form>(k: K, v: Form[K]) => void;
  docsList: Array<{ id: string; label: string; required: boolean; vatOnly?: boolean }>;
}) {
  const t = useTranslations('auth');
  const handleFile = (id: string, files: FileList | null) => {
    const file = files?.[0] ?? null;
    set('docs', { ...form.docs, [id]: file });
  };
  const isIndividual = form.accountType === 'INDIVIDUAL';
  return (
    <>
      <StepHeader
        icon={FileCheck2}
        title={t('register.docs.title')}
        subtitle={
          isIndividual
            ? t('register.docs.subtitleIndividual')
            : t('register.docs.subtitleCompany')
        }
      />
      <div className="space-y-3">
        {docsList.map((d) => {
          const file = form.docs[d.id];
          return (
            <div key={d.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('h-10 w-10 rounded-lg grid place-items-center shrink-0', file ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground')}>
                    {file ? <Check className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t(d.label)}</span>
                      {d.required && <Badge variant="destructive" className="text-[10px]">{t('register.docs.required')}</Badge>}
                    </div>
                    {file ? (
                      <div className="text-xs text-success font-mono truncate" dir="ltr">{file.name}</div>
                    ) : (
                      <div className="text-xs text-muted-foreground">{t('register.docs.fileHint')}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {file ? (
                    <Button size="sm" variant="ghost" onClick={() => set('docs', { ...form.docs, [d.id]: null })}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <label>
                      <Button asChild size="sm" variant="outline">
                        <span className="cursor-pointer">
                          <Upload className="h-3.5 w-3.5" /> {t('register.docs.upload')}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        className="hidden"
                        onChange={(e) => handleFile(d.id, e.target.files)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Step 4: Bank info ───────────────────────────────────────────────

function StepBank({
  form, set,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const t = useTranslations('auth');
  return (
    <>
      <StepHeader icon={Building2} title={t('register.bank.title')} subtitle={t('register.bank.subtitle')} />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('register.bank.accountHolder')}</Label>
          <Input value={form.accountHolder} onChange={(e) => set('accountHolder', e.target.value)} placeholder={t('register.bank.accountHolderPlaceholder')} />
        </div>

        <div className="space-y-2">
          <Label>{t('register.bank.bankLabel')}</Label>
          <Select value={form.bankName} onValueChange={(v) => set('bankName', v)}>
            <SelectTrigger><SelectValue placeholder={t('register.bank.bankPlaceholder')} /></SelectTrigger>
            <SelectContent>{BANKS.map((b) => <SelectItem key={b.v} value={b.v}>{t(b.l)}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('register.bank.iban')}</Label>
          <Input
            dir="ltr"
            className="num text-end font-mono"
            value={form.iban}
            onChange={(e) => set('iban', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24))}
            placeholder="SA0000000000000000000000"
            maxLength={24}
          />
          <p className="text-xs text-muted-foreground">{t('register.bank.ibanHint')}</p>
        </div>

        <div className="rounded-lg bg-info/10 border border-info/30 p-3 flex items-start gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('register.bank.infoNote')}
          </p>
        </div>
      </div>
    </>
  );
}

// ─── Step 5: Verification + Terms ────────────────────────────────────

function StepVerify({
  form, set,
}: { form: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const t = useTranslations('auth');
  return (
    <>
      <StepHeader icon={ShieldCheck} title={t('register.verify.title')} subtitle={t('register.verify.subtitle')} />
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('register.verify.emailOtpLabel')} <span className="font-mono text-primary">1234</span>)</Label>
            <OtpInput value={form.emailOtp} onChange={(v) => set('emailOtp', v)} />
          </div>
          <div className="space-y-2">
            <Label>{t('register.verify.phoneOtpLabel')} <span className="font-mono text-primary">5678</span>)</Label>
            <OtpInput value={form.phoneOtp} onChange={(v) => set('phoneOtp', v)} />
          </div>
        </div>

        <div className="space-y-2 pt-4 border-t">
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 mb-3">
            <p className="text-sm font-semibold">{t('register.verify.beforeTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {t('register.verify.beforeText')}
            </p>
          </div>

          <ConsentRow checked={form.acceptTerms}     onChange={(v) => set('acceptTerms', v)}     label={t('consent.terms')}        href={`${process.env.NEXT_PUBLIC_LANDING_URL ?? 'http://localhost:3000'}/terms`} />
          <ConsentRow checked={form.acceptPrivacy}   onChange={(v) => set('acceptPrivacy', v)}   label={t('consent.privacy')}        href={`${process.env.NEXT_PUBLIC_LANDING_URL ?? 'http://localhost:3000'}/privacy`} />
          <ConsentRow checked={form.acceptTransport} onChange={(v) => set('acceptTransport', v)} label={t('consent.transport')}      href={`${process.env.NEXT_PUBLIC_LANDING_URL ?? 'http://localhost:3000'}/transport`} />

          <label className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer">
            <input type="checkbox" checked={form.acceptCommission} onChange={(e) => set('acceptCommission', e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span className="text-sm leading-relaxed">
              {t('register.verify.commissionPrefix')}{' '}
              <strong>{t('register.verify.commissionBold')}</strong>
              {' '}{t('register.verify.commissionSuffix')}
            </span>
          </label>
        </div>

        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 flex items-start gap-2 text-sm">
          <FileCheck2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-warning-foreground">{t('register.verify.afterTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {t('register.verify.afterText')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ''}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '');
            const next = (value.slice(0, i) + v + value.slice(i + 1)).slice(0, 4);
            onChange(next);
            if (v && i < 3) {
              const el = e.target.parentElement?.children[i + 1] as HTMLInputElement;
              el?.focus();
            }
          }}
          className="h-12 w-12 rounded-lg border-2 bg-card text-center text-xl font-bold num focus:border-primary focus:outline-none"
        />
      ))}
    </div>
  );
}

function ConsentRow({
  checked, onChange, label, href,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; href: string }) {
  const t = useTranslations('auth');
  return (
    <label className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50">
      <div className="flex items-start gap-3 min-w-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <span className="text-sm leading-relaxed">{label}</span>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-xs text-primary hover:underline whitespace-nowrap shrink-0"
      >
        {t('register.verify.readFull')}
      </a>
    </label>
  );
}
