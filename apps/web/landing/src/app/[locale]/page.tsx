'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  Truck, ShieldCheck, Lock, MapPin, Clock, Radio, UserSearch, Wallet, Star,
  CheckCircle2, ArrowLeft, Plus, Minus, ArrowLeftRight, Package,
} from 'lucide-react';
import { Link } from '@/navigation';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { BidsFragment } from '@/components/landing/bids-fragment';
import { FleetCarousel } from '@/components/landing/fleet-carousel';
import { DirectRequestScene } from '@/components/landing/direct-request-scene';
import { HeroNetwork } from '@/components/landing/hero-network';
import { HeroRequests } from '@/components/landing/hero-requests';

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3002';
const CARRIER_URL = process.env.NEXT_PUBLIC_CARRIER_URL ?? 'http://localhost:3003';

const TILE = 'rounded-2xl p-5 sm:p-6 shadow-tile';

// ── Motion helpers ──────────────────────────────────────────────────────────
function Reveal({
  children, className, delay = 0, as = 'div',
}: {
  children: React.ReactNode; className?: string; delay?: number; as?: 'div' | 'section';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  const Comp = motion[as];
  return (
    <Comp
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </Comp>
  );
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const locale = useLocale();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [n, setN] = useState(0);
  const nf = new Intl.NumberFormat('en-US');
  useEffect(() => {
    if (!inView) return;
    let cur = 0;
    const id = setInterval(() => {
      cur += to / 45;
      if (cur >= to) { setN(to); clearInterval(id); } else setN(Math.round(cur));
    }, 20);
    return () => clearInterval(id);
  }, [inView, to]);
  const display = to >= 1000 ? `${nf.format(Math.round(n / 100) / 10)}K` : nf.format(n);
  return <span ref={ref} className="num tabular-nums">{display}{suffix}</span>;
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const t = useTranslations('landing');
  const locale = useLocale();
  const nf = new Intl.NumberFormat('en-US');

  const nav = [
    { href: '#how', label: t('nav.howItWorks') },
    { href: '#features', label: t('nav.features') },
    { href: '#pricing', label: t('nav.pricing') },
    { href: '#faq', label: t('nav.contact') },
  ];

  return (
    <div className="naqla-light min-h-[100dvh] bg-background text-foreground">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background/70 px-2 pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3 rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--mint))] text-primary">
              <Truck className="h-4 w-4" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">{t('hero.wordmark')}</span>
          </Link>
          <nav className="mx-2 hidden items-center gap-5 md:flex">
            {nav.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-white/70 transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <div className="text-white/80 [&_button:hover]:bg-white/10"><LocaleSwitcher /></div>
            <a href={`${CLIENT_URL}/login`} className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 sm:block">
              {t('nav.clientLogin')}
            </a>
            <a href={`${CARRIER_URL}/login`} className="glow-mint rounded-lg bg-[hsl(var(--mint))] px-3.5 py-1.5 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
              {t('nav.carrierLogin')}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-2 py-2">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20 text-center sm:py-28">
          <div className="pointer-events-none absolute inset-0">
            <HeroNetwork />
          </div>
          <HeroRequests />
          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative mx-auto max-w-3xl"
          >
            <h1 className="mx-auto font-extrabold leading-[1.07] tracking-tight text-foreground" style={{ fontSize: 'clamp(36px, 5.6vw, 68px)' }}>
              {t('hero.heroTitle')}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('hero.heroSub')}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              <a href={`${CLIENT_URL}/login`} className="glow-mint rounded-full bg-[hsl(var(--mint))] px-7 py-3.5 text-sm font-bold text-primary transition-transform hover:scale-[1.03] active:scale-[0.98]">
                {t('hero.ctaClient')}
              </a>
              <a href={`${CARRIER_URL}/login`} className="rounded-full border border-border bg-card px-7 py-3.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
                {t('hero.ctaCarrier')}
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--mint))]" />
              {t('hero.trustLine')}
            </div>
          </motion.div>
        </section>

        {/* ── Marketplace، two sides meet ───────────────────────────────── */}
        <section className="mt-20">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="font-extrabold leading-[1.12] tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>
              {t('hero.marketHeadline')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{t('hero.marketSub')}</p>
          </Reveal>

          <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
            {/* client (light) */}
            <Reveal className="shine-card relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-tile sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
                <Package className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t('hero.clientSide')}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{t('hero.clientSideDesc')}</p>
              <a href={`${CLIENT_URL}/login`} className="glow-mint relative z-[4] mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[hsl(var(--mint))] px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
                {t('hero.ctaClient')} <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </a>
              <img src="/img/fleet/van.webp" alt="" className="pointer-events-none absolute -bottom-2 z-[1] w-[50%] max-w-[250px] object-contain ltr:right-2 rtl:left-2" />
            </Reveal>

            {/* carrier (teal) */}
            <Reveal delay={0.08} className="shine-card relative flex min-h-[300px] flex-col overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-tile sm:p-8">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[hsl(var(--mint))]">
                <Truck className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-2xl font-extrabold sm:text-3xl">{t('hero.carrierSide')}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/70">{t('hero.carrierSideDesc')}</p>
              <a href={`${CARRIER_URL}/login`} className="relative z-[4] mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-[hsl(var(--mint))] px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
                {t('hero.ctaCarrier')} <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </a>
              <img src="/img/fleet/box-truck.webp" alt="" className="pointer-events-none absolute -bottom-2 z-[1] w-[58%] max-w-[300px] object-contain ltr:right-2 rtl:left-2" />
            </Reveal>

            {/* connector node، between the two cards */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 220, delay: 0.3 }}
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            >
              <div className="glow-mint grid h-14 w-14 place-items-center rounded-full border-4 border-background bg-[hsl(var(--mint))] text-primary sm:h-16 sm:w-16">
                <ArrowLeftRight className="h-5 w-5 rotate-90 sm:h-6 sm:w-6 md:rotate-0" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Trust strip ────────────────────────────────────────────────── */}
        <Reveal className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
          {([
            ['escrow', Lock], ['verified', ShieldCheck], ['tracking', MapPin], ['support', Clock],
          ] as const).map(([k, Icon], i) => (
            <div key={k} className={`${TILE} flex items-center gap-3 bg-card`}>
              <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--mint))]" />
              <span className="text-sm font-semibold">{t(`trust.${k}`)}</span>
            </div>
          ))}
        </Reveal>

        {/* ── How it works، connected flow ──────────────────────────────── */}
        <section id="how" className="mt-24 scroll-mt-24">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>{t('howItWorks.title')}</h2>
            <p className="mt-3 text-muted-foreground">{t('howItWorks.subtitle')}</p>
          </Reveal>
          <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <div className="absolute inset-x-[12%] top-7 hidden h-[2px] bg-[hsl(var(--mint))]/20 lg:block" />
            {([[1, Package], [2, Radio], [3, Wallet], [4, MapPin]] as const).map(([n, Icon], i) => (
              <Reveal key={n} delay={i * 0.08} className="relative flex flex-col items-center text-center">
                <div className="relative z-[1] grid h-14 w-14 place-items-center rounded-2xl bg-card text-[hsl(var(--mint))] shadow-tile ring-1 ring-black/5">
                  <Icon className="h-6 w-6" />
                  <span className="num absolute -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[hsl(var(--mint))] text-[10px] font-bold text-primary ltr:-right-1.5 rtl:-left-1.5">{nf.format(n)}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold">{t(`howItWorks.step${n}Title`)}</h3>
                <p className="mt-2 max-w-[230px] text-sm leading-relaxed text-muted-foreground">{t(`howItWorks.step${n}Desc`)}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Features، bento ───────────────────────────────────────────── */}
        <section id="features" className="mt-24 scroll-mt-24">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>{t('features.title')}</h2>
            <p className="mt-3 text-muted-foreground">{t('features.subtitle')}</p>
          </Reveal>
          <div className="grid grid-cols-12 gap-3">
            {/* spotlight: open bidding + live bids UI */}
            <Reveal className="relative col-span-12 overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-tile sm:p-8 lg:col-span-7">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]"><Radio className="h-5 w-5" /></span>
              <h3 className="mt-4 text-2xl font-bold sm:text-3xl">{t('features.marketplace.title')}</h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">{t('features.marketplace.desc')}</p>
              <div className="mt-6"><BidsFragment locale={locale} /></div>
            </Reveal>
            {/* direct */}
            <Reveal delay={0.06} className="relative col-span-12 flex flex-col overflow-hidden rounded-3xl bg-card p-6 shadow-tile sm:p-8 lg:col-span-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]"><UserSearch className="h-5 w-5" /></span>
              <h3 className="mt-4 text-2xl font-bold">{t('features.direct.title')}</h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{t('features.direct.desc')}</p>
              <div className="mt-auto pt-6"><DirectRequestScene /></div>
            </Reveal>
            {/* small features */}
            {([
              ['tracking', MapPin], ['escrow', Wallet], ['verified', ShieldCheck], ['ratings', Star],
            ] as const).map(([k, Icon], i) => (
              <Reveal key={k} delay={i * 0.05} className="col-span-6 flex flex-col rounded-3xl bg-card p-6 shadow-tile lg:col-span-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 text-base font-bold">{t(`features.${k}.title`)}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(`features.${k}.desc`)}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Fleet، compact vehicle cards ───────────────────────────────── */}
        <section className="mt-24">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>{t('fleet.heading')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">{t('fleet.subtitle')}</p>
          </Reveal>
          <Reveal><FleetCarousel /></Reveal>
        </section>

        {/* ── Storage، compact cards ─────────────────────────────────────── */}
        <section className="mt-24">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>{t('fleet.storageHeading')}</h2>
          </Reveal>
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
            {/* description + tags */}
            <Reveal>
              <p className="text-lg leading-relaxed text-foreground/80">{t('fleet.storageDesc')}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['storageTag1', 'storageTag2', 'storageTag3'].map((tag) => (
                  <span key={tag} className="rounded-full bg-[hsl(var(--mint))]/12 px-4 py-1.5 text-sm font-semibold text-[hsl(var(--mint))]">{t(`fleet.${tag}`)}</span>
                ))}
              </div>
            </Reveal>
            {/* two images side by side, no frame */}
            <Reveal delay={0.1} className="grid grid-cols-2 items-center gap-4">
              <img src="/img/fleet/warehouse-yard.webp" alt={t('fleet.storageHeading')} loading="lazy" className="h-auto w-full object-contain" />
              <img src="/img/fleet/warehouse.webp" alt={t('fleet.storageHeading')} loading="lazy" className="h-auto w-full object-contain" />
            </Reveal>
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <section className="mt-24">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>{t('testimonials.title')}</h2>
          </Reveal>
          <div className="grid grid-cols-12 gap-3">
            {t.raw('testimonials.items').map((item: { quote: string; name: string; role: string }, i: number) => (
              <Reveal key={i} delay={i * 0.07} className="col-span-12 flex flex-col rounded-3xl bg-card p-6 shadow-tile sm:p-7 md:col-span-4">
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className="h-4 w-4 fill-[hsl(var(--mint))] text-[hsl(var(--mint))]" />
                  ))}
                </div>
                <p className="mt-4 flex-1 text-base leading-relaxed text-foreground/90">“{item.quote}”</p>
                <div className="mt-6 flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[hsl(var(--mint))]/15 text-sm font-bold text-[hsl(var(--mint))]">
                    {item.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{item.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{item.role}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Pricing، zero commission at launch ────────────────────────── */}
        <section id="pricing" className="mt-24 scroll-mt-24">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>{t('pricing.title')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{t('pricing.subtitle')}</p>
          </Reveal>
          <Reveal className="mx-auto max-w-3xl">
            <div className="relative overflow-hidden rounded-3xl bg-primary p-8 text-center text-primary-foreground shadow-tile sm:p-12">
              <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-72 -translate-x-1/2 -translate-y-1/3 rounded-full" style={{ background: 'hsl(var(--mint) / 0.18)', filter: 'blur(80px)' }} />
              <div className="relative">
                <div className="num font-extrabold leading-none text-[hsl(var(--mint))]" style={{ fontSize: 'clamp(72px, 12vw, 140px)' }}>0%</div>
                <div className="mt-1 text-xl font-bold sm:text-2xl">{t('pricing.zeroLabel')}</div>
                <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/10 p-5 text-start">
                    <div className="flex items-center gap-2 text-base font-bold"><Package className="h-5 w-5 text-[hsl(var(--mint))]" /> {t('pricing.clientFree')}</div>
                    <p className="mt-1.5 text-sm text-white/65">{t('pricing.clientFreeSub')}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-5 text-start">
                    <div className="flex items-center gap-2 text-base font-bold"><Truck className="h-5 w-5 text-[hsl(var(--mint))]" /> {t('pricing.carrierFree')}</div>
                    <p className="mt-1.5 text-sm text-white/65">{t('pricing.carrierFreeSub')}</p>
                  </div>
                </div>
                <p className="mt-7 text-xs text-white/45">{t('pricing.note')}</p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────────────── */}
        <section id="faq" className="mt-24 scroll-mt-20">
          <Reveal className="mb-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('faq.title')}</h2>
          </Reveal>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12 space-y-2 lg:col-span-10 lg:col-start-2">
              {t.raw('faq.items').map((item: { q: string; a: string }, i: number) => (
                <FaqItem key={i} q={item.q} a={item.a} delay={i * 0.05} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <Reveal className={`${TILE} mt-24 flex flex-col items-start justify-between gap-6 bg-primary text-primary-foreground sm:flex-row sm:items-center`}>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('cta.title')}</h2>
            <p className="mt-2 text-white/70">{t('cta.subtitle')}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <a href={`${CLIENT_URL}/login`} className="glow-mint rounded-xl bg-[hsl(var(--mint))] px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
              {t('cta.client')}
            </a>
            <a href={`${CARRIER_URL}/login`} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
              {t('cta.carrier')}
            </a>
          </div>
        </Reveal>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="mt-24 overflow-hidden rounded-3xl bg-primary text-primary-foreground">
          <div className="grid grid-cols-12 gap-x-6 gap-y-10 p-8 sm:p-12">
            {/* brand + newsletter */}
            <div className="col-span-12 lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--mint))] text-primary">
                  <Truck className="h-5 w-5" />
                </span>
                <span className="text-3xl font-extrabold tracking-tight">{t('hero.wordmark')}</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">{t('footer.tagline')}</p>
              <div className="mt-7 max-w-sm">
                <div className="text-sm font-bold">{t('footer.newsletterTitle')}</div>
                <p className="mt-1 text-xs text-white/60">{t('footer.newsletterDesc')}</p>
                <form className="mt-3 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder={t('footer.newsletterPlaceholder')}
                    className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/40 focus:ring-2 focus:ring-[hsl(var(--mint))]"
                  />
                  <button type="submit" className="shrink-0 rounded-full bg-[hsl(var(--mint))] px-5 py-2.5 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
                    {t('footer.newsletterCta')}
                  </button>
                </form>
              </div>
            </div>
            {/* link columns */}
            <div className="col-span-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
              <div>
                <h4 className="mb-4 text-sm font-bold">{t('footer.platform')}</h4>
                <ul className="space-y-2.5 text-sm text-white/60">
                  <li><a href="#how" className="transition-colors hover:text-white">{t('nav.howItWorks')}</a></li>
                  <li><a href="#features" className="transition-colors hover:text-white">{t('nav.features')}</a></li>
                  <li><a href="#pricing" className="transition-colors hover:text-white">{t('nav.pricing')}</a></li>
                  <li><a href="#faq" className="transition-colors hover:text-white">{t('nav.contact')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-sm font-bold">{t('footer.company')}</h4>
                <ul className="space-y-2.5 text-sm text-white/60">
                  <li><Link href="/about" className="transition-colors hover:text-white">{t('footer.links.about')}</Link></li>
                  <li><Link href="/contact" className="transition-colors hover:text-white">{t('footer.links.contact')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-sm font-bold">{t('footer.legal')}</h4>
                <ul className="space-y-2.5 text-sm text-white/60">
                  <li><Link href="/privacy" className="transition-colors hover:text-white">{t('footer.links.privacy')}</Link></li>
                  <li><Link href="/terms" className="transition-colors hover:text-white">{t('footer.links.terms')}</Link></li>
                  <li><Link href="/transport" className="transition-colors hover:text-white">{t('footer.links.transport')}</Link></li>
                </ul>
              </div>
            </div>
          </div>
          {/* bottom bar */}
          <div className="flex flex-col gap-3 border-t border-white/10 px-8 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-12">
            <span className="num">© {new Date().getFullYear()} {t('hero.title')} · {t('footer.rights')}</span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--mint))]" /> {t('footer.compliance')}
              </span>
              <span>{t('footer.madeIn')}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FaqItem({ q, a, delay }: { q: string; a: string; delay: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Reveal delay={delay} className={`${TILE} bg-card`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 text-start">
        <span className="text-base font-bold">{q}</span>
        {open ? <Minus className="h-5 w-5 shrink-0 text-[hsl(var(--mint))]" /> : <Plus className="h-5 w-5 shrink-0 text-[hsl(var(--mint))]" />}
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <p className="pt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
      </motion.div>
    </Reveal>
  );
}
