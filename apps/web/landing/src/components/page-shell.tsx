import { ShieldCheck, Truck } from 'lucide-react';
import { Link } from '@/navigation';
import { LocaleSwitcher } from './locale-switcher';

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? 'http://localhost:3002';
const CARRIER_URL = process.env.NEXT_PUBLIC_CARRIER_URL ?? 'http://localhost:3003';

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="naqla-light flex min-h-[100dvh] flex-col bg-background text-foreground">
      {/* Top nav, premium pill */}
      <header className="sticky top-0 z-50 bg-background/70 px-2 pt-2 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3 rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[hsl(var(--mint))] text-primary">
              <Truck className="h-4 w-4" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">نقلة لوجيستك</span>
          </Link>
          <nav className="mx-2 hidden items-center gap-5 md:flex">
            <Link href="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-white">عن نقلة</Link>
            <Link href="/contact" className="text-sm font-medium text-white/70 transition-colors hover:text-white">تواصل</Link>
          </nav>
          <div className="ms-auto flex items-center gap-1.5">
            <div className="text-white/80 [&_button:hover]:bg-white/10"><LocaleSwitcher /></div>
            <a href={`${CLIENT_URL}/login`} className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 sm:block">
              دخول العملاء
            </a>
            <a href={`${CARRIER_URL}/login`} className="glow-mint rounded-lg bg-[hsl(var(--mint))] px-3.5 py-1.5 text-sm font-bold text-primary transition-transform hover:scale-[1.03]">
              دخول الناقلين
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer, deep-teal panel */}
      <footer className="mx-auto mb-2 w-full max-w-[1280px] px-2">
        <div className="overflow-hidden rounded-3xl bg-primary text-primary-foreground">
          <div className="grid grid-cols-12 gap-x-6 gap-y-10 p-8 sm:p-12">
            <div className="col-span-12 lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--mint))] text-primary">
                  <Truck className="h-5 w-5" />
                </span>
                <span className="text-2xl font-extrabold tracking-tight">نقلة لوجيستك</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                منصة النقل اللوجستي الذكي في المملكة، نربط الشركات والأفراد بأفضل الناقلين المعتمدين بشفافية كاملة وأمان مالي مضمون.
              </p>
            </div>
            <div className="col-span-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
              <div>
                <h4 className="mb-4 text-sm font-bold">المنصة</h4>
                <ul className="space-y-2.5 text-sm text-white/60">
                  <li><Link href="/" className="transition-colors hover:text-white">الرئيسية</Link></li>
                  <li><Link href="/about" className="transition-colors hover:text-white">عن نقلة</Link></li>
                  <li><Link href="/contact" className="transition-colors hover:text-white">تواصل معنا</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-sm font-bold">قانوني</h4>
                <ul className="space-y-2.5 text-sm text-white/60">
                  <li><Link href="/terms" className="transition-colors hover:text-white">شروط الاستخدام</Link></li>
                  <li><Link href="/privacy" className="transition-colors hover:text-white">سياسة الخصوصية</Link></li>
                  <li><Link href="/transport" className="transition-colors hover:text-white">شروط النقل</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-4 text-sm font-bold">تواصل</h4>
                <ul className="space-y-2.5 text-sm text-white/60">
                  <li dir="ltr" className="num">+966 920 000 000</li>
                  <li dir="ltr" className="num">support@naqla.sa</li>
                  <li>الرياض، المملكة العربية السعودية</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 px-8 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-12">
            <span className="num">© {new Date().getFullYear()} نقلة لوجيستك · جميع الحقوق محفوظة</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--mint))]" /> مدفوعات محمية عبر الوسيط المالي
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
