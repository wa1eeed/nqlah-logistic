import { DEFAULT_LEGAL_DOCS } from '@naqla/shared-utils';
import { FileText, Lock, ScrollText } from 'lucide-react';
import { Link } from '@/navigation';
import { PageShell } from '@/components/page-shell';
import { Markdown } from '@/components/markdown';

export const metadata = {
  title: 'سياسة الخصوصية، نقلة لوجيستك',
  description: 'سياسة الخصوصية لمنصة نقلة لوجيستك',
};

const LEGAL_NAV = [
  { href: '/terms', label: 'شروط الاستخدام', icon: FileText },
  { href: '/privacy', label: 'سياسة الخصوصية', icon: Lock },
  { href: '/transport', label: 'شروط النقل', icon: ScrollText },
] as const;

export default function PrivacyPage() {
  const doc = DEFAULT_LEGAL_DOCS.privacy;
  return (
    <PageShell>
      <div className="mx-auto max-w-[900px] px-4 py-14 sm:py-20">
        {/* Hero */}
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--mint))]/12 px-3.5 py-1.5 text-xs font-bold text-[hsl(var(--mint))]">
          <Lock className="h-3.5 w-3.5" /> سياسة الخصوصية
        </div>
        <h1 className="mt-5 font-extrabold leading-[1.1] tracking-tight text-foreground" style={{ fontSize: 'clamp(28px, 3.6vw, 44px)' }}>
          كيف نحمي بياناتك
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          نوضح هنا البيانات التي نجمعها وكيف نستخدمها ونحميها، وحقوقك الكاملة في التحكم بها.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            الإصدار <span className="num">v{doc.version}</span>
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground num">
            آخر تحديث 1 يناير 2026
          </span>
        </div>

        {/* Legal cross-nav */}
        <nav className="mt-8 flex flex-wrap gap-2">
          {LEGAL_NAV.map((l) => {
            const active = l.href === '/privacy';
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground shadow-tile hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" /> {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Body */}
        <article className="mt-8 rounded-3xl bg-card p-6 shadow-tile sm:p-10">
          <Markdown content={doc.content} />
        </article>
      </div>
    </PageShell>
  );
}
