'use client';
import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { CheckCircle2, Clock, Mail, MapPin, MessageSquare, Phone, Send } from 'lucide-react';
import { PageShell } from '@/components/page-shell';

const CHANNELS = [
  { icon: Phone, title: 'اتصال هاتفي', value: '+966 920 000 000', desc: 'من السبت إلى الخميس، 8 ص حتى 8 م' },
  { icon: Mail, title: 'بريد إلكتروني', value: 'support@naqla.sa', desc: 'رد خلال 12 ساعة عمل' },
  { icon: MessageSquare, title: 'محادثة فورية', value: 'متاحة 24/7', desc: 'رد فوري خلال دقائق' },
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

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', topic: 'general' });
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setForm({ name: '', email: '', subject: '', message: '', topic: 'general' });
    }, 3000);
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Hero */}
        <section className="py-16 text-center sm:py-24">
          <motion.div
            initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto max-w-2xl"
          >
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[hsl(var(--mint))]/12 px-3.5 py-1.5 text-xs font-bold text-[hsl(var(--mint))]">
              <MessageSquare className="h-3.5 w-3.5" /> تواصل معنا
            </div>
            <h1 className="mt-5 font-extrabold leading-[1.1] tracking-tight text-foreground" style={{ fontSize: 'clamp(32px, 4.6vw, 56px)' }}>
              فريقنا جاهز لمساعدتك
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              استفسار، شراكة، أو دعم تقني، اختر الطريقة الأنسب لك وسنرد عليك بأسرع وقت.
            </p>
          </motion.div>
        </section>

        <div className="grid grid-cols-1 gap-3 pb-6 lg:grid-cols-3 lg:gap-5">
          {/* Form */}
          <Reveal className="lg:col-span-2">
            <div className="rounded-3xl bg-card p-6 shadow-tile sm:p-8">
              <h2 className="text-2xl font-extrabold">أرسل لنا رسالة</h2>
              <p className="mt-1 text-sm text-muted-foreground">سنرد عليك خلال 12 ساعة عمل</p>

              {sent ? (
                <div className="mt-6 flex flex-col items-center rounded-2xl bg-[hsl(var(--mint))]/10 p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-[hsl(var(--mint))]" />
                  <h3 className="mt-3 text-lg font-bold">تم استلام رسالتك</h3>
                  <p className="mt-1 text-sm text-muted-foreground">سنتواصل معك قريبا على بريدك المسجل.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="الاسم الكامل" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="مثال: محمد العتيبي" required />
                    <Field label="البريد الإلكتروني" type="email" dir="ltr" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="email@company.sa" required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">الموضوع</label>
                    <select
                      value={form.topic}
                      onChange={(e) => setForm({ ...form, topic: e.target.value })}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[hsl(var(--mint))]"
                    >
                      <option value="general">استفسار عام</option>
                      <option value="sales">مبيعات وشراكات</option>
                      <option value="support">دعم تقني</option>
                      <option value="legal">قانوني</option>
                      <option value="media">إعلام</option>
                    </select>
                  </div>

                  <Field label="عنوان الرسالة (اختياري)" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="ملخص قصير" />

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">الرسالة</label>
                    <textarea
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      rows={6}
                      placeholder="اشرح استفسارك بتفصيل"
                      className="w-full rounded-xl border border-border bg-background p-3 text-sm leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-[hsl(var(--mint))]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="glow-mint inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--mint))] px-6 py-3 text-sm font-bold text-primary transition-transform hover:scale-[1.03] active:scale-[0.98]"
                  >
                    <Send className="h-4 w-4 rtl:-scale-x-100" /> إرسال الرسالة
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          {/* Sidebar: channels + location */}
          <Reveal delay={0.08} className="flex flex-col gap-3">
            {CHANNELS.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="flex items-start gap-3 rounded-2xl bg-card p-5 shadow-tile">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{c.title}</h3>
                    <div className="num mt-0.5 truncate text-sm font-semibold text-[hsl(var(--mint))]" dir="ltr">{c.value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-tile">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[hsl(var(--mint))]">
                <MapPin className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-bold">مقرنا الرئيسي</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/70">الرياض، طريق الملك فهد، واحة الأعمال، الدور 12</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60">
                <Clock className="h-3.5 w-3.5" /> السبت إلى الخميس، 8 صباحا حتى 8 مساء
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </PageShell>
  );
}

function Field({
  label, value, onChange, placeholder, type = 'text', dir, required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; dir?: 'rtl' | 'ltr'; required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">{label}</label>
      <input
        type={type}
        dir={dir}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-[hsl(var(--mint))]"
      />
    </div>
  );
}
