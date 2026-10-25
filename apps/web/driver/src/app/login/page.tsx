'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Eye, EyeOff, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useAuthStore } from '@/lib/auth-store';

export default function DriverLoginPage() {
  const t = useTranslations('auth');
  const td = useTranslations('driver');
  const router = useRouter();
  const [phone, setPhone] = useState('');
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
      await useAuthStore.getState().login(phone, password);
      router.push('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }, message?: string } }, message?: string };
      setError(
        !e.response
          ? t('login.serverError')
          : (e.response?.data?.error?.message ?? e.response?.data?.message ?? e.message ?? t('login.genericError')),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-muted/20">
      <div className="absolute top-4 end-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">نقلة لوجيستك</h1>
          <p className="text-sm text-muted-foreground">{td('portalSubtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{td('login.title')}</CardTitle>
            <CardDescription>{td('login.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  className="text-end num"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('phonePlaceholder')}
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pe-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? t('login.signingIn') : t('login.signIn')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">{t('login.copyright')}</p>
      </div>
    </div>
  );
}
