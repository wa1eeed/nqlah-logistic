'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DEV_USERS, DEV_BYPASS_TOKEN } from '@naqla/shared-utils';
import { useAuthStore } from '@/lib/auth-store';

export default function ClientLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('client@naqla.sa');
  const [password, setPassword] = useState('Client@1234');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Real auth — POSTs to /api/auth/login, stores accessToken + refreshToken
      // in localStorage, hydrates user state.
      await useAuthStore.getState().login(identifier, password);
      router.push('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string }, message?: string } }, message?: string };
      // If the API is unreachable, fall back to dev-bypass mode so the demo
      // UI still works (no real persistence, but routes render).
      if (!e.response) {
        localStorage.setItem('naqla_client_token', DEV_BYPASS_TOKEN);
        localStorage.setItem('naqla_client_refresh', DEV_BYPASS_TOKEN);
        useAuthStore.setState({ user: { ...DEV_USERS.client, avatar: null } as never });
        router.push('/');
        return;
      }
      setError(e.response?.data?.error?.message ?? e.response?.data?.message ?? e.message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">نقلة لوجيستك</h1>
          <p className="text-sm text-muted-foreground">منصة العميل · للشركات والأفراد</p>
        </div>

        <Card>
          <CardHeader>
            <Badge variant="secondary" className="w-fit gap-1">
              <ShieldCheck className="h-3 w-3" />
              وضع تجريبي
            </Badge>
            <CardTitle className="text-xl">أهلاً بعودتك</CardTitle>
            <CardDescription>سجّل دخولك للمتابعة إلى منصة العميل</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier">البريد الإلكتروني أو رقم الجوال</Label>
                <Input
                  id="identifier"
                  type="text"
                  dir="ltr"
                  className="text-end"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="client@naqla.sa"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <a href="#" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pe-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
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
                {loading ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
              </Button>

              <div className="relative pt-2">
                <div className="absolute inset-x-0 top-1/2 border-t border-border" />
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">جديد على المنصة؟</span>
                </div>
              </div>

              <Link href="/register" className="block">
                <Button type="button" variant="outline" className="w-full" size="lg">
                  سجّل حسابك مجاناً
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
