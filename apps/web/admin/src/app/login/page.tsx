'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { AlertCircle, Eye, EyeOff, Truck, ShieldCheck, Lock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/auth-store';

export default function AdminLoginPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Real auth — POSTs to /api/auth/login, stores accessToken + refreshToken.
      await useAuthStore.getState().login(identifier, password);
      router.push('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }, message?: string } }, message?: string };
      setError(
        !e.response
          ? t('login.errorServer')
          : (e.response?.data?.error?.message ?? e.response?.data?.message ?? e.message ?? t('login.errorGeneric')),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-primary-foreground p-12">
        <div className="absolute inset-0 border-e-2 border-[hsl(var(--mint))]/40" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--mint))]/15 ring-1 ring-[hsl(var(--mint))]/30">
            <Truck className="h-6 w-6 text-[hsl(var(--mint))]" />
          </div>
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-tight">{t('login.brand')}</div>
            <div className="text-xs text-primary-foreground/70">{t('login.brandTagline')}</div>
          </div>
        </div>

        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl font-bold leading-snug tracking-tight">
            {t('login.panelTitle')}
          </h2>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            {t('login.panelSubtitle')}
          </p>
          <ul className="space-y-3 pt-2">
            {[
              { icon: ShieldCheck, text: t('login.feature1') },
              { icon: Activity, text: t('login.feature2') },
              { icon: Lock, text: t('login.feature3') },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative grid grid-cols-3 gap-4 max-w-md border-t border-primary-foreground/15 pt-6">
          {[
            { k: '+2,400', v: t('login.stat1Label') },
            { k: '99.9%', v: t('login.stat2Label') },
            { k: '24/7', v: t('login.stat3Label') },
          ].map((s) => (
            <div key={s.v}>
              <div className="num text-xl font-extrabold text-[hsl(var(--mint))]">{s.k}</div>
              <div className="text-xs text-primary-foreground/70">{s.v}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center bg-background p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md space-y-8"
        >
          <div className="flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight">{t('login.brand')}</div>
              <div className="text-xs text-muted-foreground">{t('login.panelTitle')}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('login.identifier')}</Label>
              <Input
                id="identifier"
                type="text"
                dir="ltr"
                className="text-end h-11"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="name@example.com"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                <a href="#" className="text-xs font-medium text-[hsl(var(--mint))] hover:underline">{t('forgotPassword')}</a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pe-10 h-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={t('login.togglePassword')}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base" size="lg" disabled={loading}>
              {loading ? t('login.submitting') : t('login.submit')}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--mint))]" />
              {t('login.securityNote')}
            </p>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} {t('login.brand')} · {t('login.rights')}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
