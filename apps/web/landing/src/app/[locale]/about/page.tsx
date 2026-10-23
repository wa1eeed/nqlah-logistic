'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Award, Lightbulb, MapPin, Shield, Target, Users, ArrowLeft } from 'lucide-react';
import { PageShell } from '@/components/page-shell';

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3002';
const CARRIER_URL = process.env.NEXT_PUBLIC_CARRIER_URL ?? 'http://localhost:3003';

const VALUES = [
  { icon: Shield, title: 'الثقة', desc: 'كل ناقل معتمد، كل دفعة محمية، كل تعامل موثق.' },
  { icon: Lightbulb, title: 'الابتكار', desc: 'حلول تقنية ذكية تختصر الوقت والتكلفة.' },
  { icon: Users, title: 'الشراكة', desc: 'نمو مشترك مع شركاء النقل والعملاء.' },
  { icon: Award, title: 'الجودة', desc: 'معايير صارمة في الخدمة والتقنية.' },
];

const STATS = [
  { num: '500+', label: 'شركة نقل معتمدة' },
  { num: '12,000+', label: 'شحنة شهريا' },
  { num: '15', label: 'مدينة سعودية' },
  { num: '98.4%', label: 'معدل تسليم ناجح' },
];

function Reveal({
  children, className, delay = 0,
}: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Hero */}
        <section className="py-16 text-center sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto max-w-3xl"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[hsl(var(--mint))]/12 px-3.5 py-1.5 text-xs font-bold text-[hsl(var(--mint))]">
              <Shield className="h-3.5 w-3.5" /> عن المنصة
            </div>
            <h1 className="mt-5 font-extrabold leading-[1.1] tracking-tight text-foreground" style={{ fontSize: 'clamp(32px, 4.6vw, 56px)' }}>
              نعيد تعريف النقل اللوجستي في المملكة
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              منصة تقنية متكاملة تربط الشركات بأفضل الناقلين المعتمدين، بشفافية كاملة وأمان مالي مضمون في كل خطوة.
            </p>
          </motion.div>
        </section>

        {/* Stats */}
        <Reveal className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl bg-card p-5 text-center shadow-tile sm:p-6">
              <div className="num text-3xl font-extrabold text-[hsl(var(--mint))] sm:text-4xl">{s.num}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </Reveal>

        {/* Mission & Vision */}
        <section className="mt-24 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
          <Reveal className="flex flex-col rounded-3xl bg-card p-6 shadow-tile sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
              <Target className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">رسالتنا</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              توحيد سوق النقل اللوجستي في منصة واحدة شفافة، يجد فيها العميل أفضل الأسعار والخدمات في دقائق، ويجد الناقل طلبات حقيقية ومستقرة لتوسيع أعماله.
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              نسهم بذلك في تحقيق أهداف رؤية المملكة 2030 لرقمنة القطاع اللوجستي، أحد الركائز الأساسية للاقتصاد الوطني.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="flex flex-col rounded-3xl bg-primary p-6 text-primary-foreground shadow-tile sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[hsl(var(--mint))]">
              <Lightbulb className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">رؤيتنا</h2>
            <p className="mt-3 text-base leading-relaxed text-white/75">
              أن نكون المنصة الأولى للنقل والشحن اللوجستي في الشرق الأوسط، نخدم آلاف الشركات يوميا عبر شبكة موسعة من الناقلين المعتمدين.
            </p>
            <p className="mt-3 text-base leading-relaxed text-white/75">
              تجربة سلسة وتقنية متقدمة: تتبع لحظي، حماية مالية للمدفوعات، ومطابقة ذكية للطلبات، مع دعم على مدار الساعة.
            </p>
          </Reveal>
        </section>

        {/* Values */}
        <section className="mt-24">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>قيمنا</h2>
            <p className="mt-3 text-muted-foreground">الأسس التي نبني عليها كل قرار في المنصة</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <Reveal key={v.title} delay={i * 0.06} className="flex flex-col rounded-3xl bg-card p-6 shadow-tile">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Location */}
        <section className="mt-24">
          <Reveal className="flex flex-col items-start gap-4 rounded-3xl bg-card p-6 shadow-tile sm:flex-row sm:items-center sm:p-8">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
              <MapPin className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-bold">مقرنا الرئيسي</h2>
              <p className="mt-1 text-muted-foreground">المملكة العربية السعودية، الرياض، طريق الملك فهد، واحة الأعمال، الدور 12</p>
            </div>
          </Reveal>
        </section>

        {/* CTA */}
        <Reveal className="mb-6 mt-24 flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground shadow-tile sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">جاهز للبدء؟</h2>
            <p className="mt-2 text-white/70">انضم لآلاف الشركات التي تستخدم نقلة يوميا</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <a href={`${CLIENT_URL}/register`} className="glow-mint inline-flex items-center gap-1.5 rounded-xl bg-[hsl(var(--mint))] px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
              سجل كعميل <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            </a>
            <a href={`${CARRIER_URL}/register`} className="rounded-xl bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20">
              سجل كناقل
            </a>
          </div>
        </Reveal>
      </div>
    </PageShell>
  );
}
