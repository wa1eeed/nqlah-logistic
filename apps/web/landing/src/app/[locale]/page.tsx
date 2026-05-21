import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, MapPin, Package, Quote, Radio,
  ShieldCheck, Star, Truck, UserSearch, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocaleSwitcher } from '@/components/locale-switcher';

const FEATURES = [
  { icon: Radio,        title: 'سوق مفتوح للعروض',     desc: 'انشر طلبك وادع عشرات الناقلين المعتمدين للتقديم بأسعار تنافسية في دقائق.' },
  { icon: UserSearch,   title: 'إرسال مباشر لناقل',     desc: 'لديك ناقل مفضّل؟ أرسل له الطلب مباشرة، يقبل أو يقترح سعراً بديلاً.' },
  { icon: MapPin,       title: 'تتبّع لحظي على الخريطة', desc: 'تابع شحنتك على الخريطة من لحظة الاستلام حتى التسليم.' },
  { icon: Wallet,       title: 'مدفوعات Escrow الآمنة',  desc: 'تُحتجَز أموالك في حساب وسيط ولا تُحوَّل للناقل إلا بعد تأكيد التسليم.' },
  { icon: ShieldCheck,  title: 'ناقلون موثّقون فقط',    desc: 'كل شركة نقل تخضع لتحقّق KYC: سجل تجاري، تأمين، ورخص نقل سارية.' },
  { icon: Star,         title: 'نظام تقييم شفّاف',      desc: 'قيّم الناقلين بعد كل رحلة، واطّلع على تقييمات الآخرين قبل اختيار عرضك.' },
];

const STEPS = [
  { num: 1, title: 'أنشئ طلبك',     desc: 'صف بضاعتك، حدّد المسار والميزانية في 5 خطوات بسيطة.' },
  { num: 2, title: 'استقبل العروض', desc: 'يقدّم ناقلون معتمدون عروضهم — قارن السعر، التقييم، والمدة.' },
  { num: 3, title: 'اختر ودفع',     desc: 'يُحتجَز المبلغ في Escrow حتى التسليم. لا مفاجآت ولا رسوم خفيّة.' },
  { num: 4, title: 'تابع وسلّم',     desc: 'راقب الشاحنة لحظياً. عند الاستلام يُفرَج المبلغ للناقل تلقائياً.' },
];

const TESTIMONIALS = [
  { name: 'وليد الحربي',  role: 'مدير المشتريات · شركة الجزيرة للطاقة',  q: 'وفّرنا ٢٢٪ من تكاليف النقل خلال شهرين، مع شفافية كاملة في كل رحلة.' },
  { name: 'سارة العمري',  role: 'مدير عمليات · مؤسسة الواحة للأغذية',     q: 'التتبّع اللحظي أنقذنا من تأخيرات كثيرة — نعرف الآن أين شحناتنا في كل لحظة.' },
  { name: 'فهد الدوسري',  role: 'مدير شركة المسار السريع للنقل',          q: 'منصّة سهلة تجلب لنا طلبات حقيقية يومياً، والتحصيل يصل لحسابنا أسبوعياً.' },
];

const STATS = [
  { value: '+1,200', label: 'ناقل معتمد' },
  { value: '+25',    label: 'مدينة مغطّاة' },
  { value: '98%',    label: 'نسبة الرضا' },
  { value: '+15K',   label: 'شحنة منجزة' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-[1280px] mx-auto h-16 px-6 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-bold tracking-tight">نقلة لوجيستك</span>
              <span className="text-xs text-muted-foreground">منصة النقل الذكي</span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 ms-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">المميزات</a>
            <a href="#how"      className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">كيف نعمل</a>
            <a href="#pricing"  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">الأسعار</a>
            <a href="#contact"  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">تواصل</a>
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <LocaleSwitcher />
            <Link href="http://localhost:3002/login"><Button variant="ghost" size="sm">دخول العميل</Button></Link>
            <Link href="http://localhost:3003/login"><Button size="sm">دخول الناقل</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)',
          backgroundSize: '24px 24px', color: 'hsl(var(--primary))',
        }} />
        <div className="max-w-[1280px] mx-auto px-6 pt-20 pb-24 text-center">
          <Badge variant="default" className="mb-6 gap-1">
            <ShieldCheck className="h-3 w-3" />
            معتمدون من قِبل أكثر من 1,200 شركة نقل
          </Badge>
          <h1 className="text-[40px] sm:text-[56px] leading-[1.1] font-bold tracking-tight max-w-3xl mx-auto">
            انقل شحناتك بثقة — <span className="text-primary">للشركات والأفراد</span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            منصة <strong className="text-foreground">نقلة لوجيستك</strong> تربطك بأفضل ناقلي المملكة —
            أسعار شفافة، تتبّع لحظي، ومدفوعات Escrow آمنة.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="http://localhost:3002/login">
              <Button size="lg" className="w-full sm:w-auto">
                <Package className="h-4 w-4" />
                ابدأ كعميل
              </Button>
            </Link>
            <Link href="http://localhost:3003/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Truck className="h-4 w-4" />
                انضم كناقل
              </Button>
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {['مدفوعات Escrow', 'تأمين شامل', 'ناقلون معتمدون', 'دعم ٢٤/٧'].map((t) => (
              <div key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-card">
        <div className="max-w-[1280px] mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-bold text-primary num">{s.value}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge className="mb-4">المميزات</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">كل ما تحتاجه لإدارة شحناتك</h2>
            <p className="mt-4 text-base text-muted-foreground">من تقديم الطلب إلى التسليم — كل خطوة محسوبة.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Card key={f.title} className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-5">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 bg-muted/30 border-y">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge className="mb-4">كيف نعمل</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">٤ خطوات وشحنتك في الطريق</h2>
            <p className="mt-4 text-base text-muted-foreground">عملية مبسّطة — بدون مكالمات لا نهائية أو مفاجآت.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <Card key={s.num}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-5 num text-xl font-bold">
                    {s.num}
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="py-24">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-10 pb-10 px-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/15 text-info mb-5">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold">للعملاء</h3>
              <p className="mt-3 text-base text-muted-foreground">شركات صناعية، تجارية، أو حتى أفراد — وفّر وقتك ومالك مع أسعار تنافسية وضمانات قوية.</p>
              <ul className="mt-6 space-y-3">
                {['انشر طلباً في دقائق واحصل على عروض متعددة', 'قارن السعر، التقييم، والمدة قبل الاختيار', 'ادفع مرّة واحدة عبر Escrow الآمن', 'تتبّع شحنتك على الخريطة لحظياً'].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link href="http://localhost:3002/login" className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-primary hover:underline">
                ابدأ كعميل
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-primary text-primary-foreground border-primary relative overflow-hidden">
            <div aria-hidden className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
            <CardContent className="pt-10 pb-10 px-8 relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white mb-5">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold">للناقلين</h3>
              <p className="mt-3 text-base text-white/80">طلبات نقل حقيقية يومياً، إدارة كاملة لأسطولك، وتحصيل مضمون أسبوعياً.</p>
              <ul className="mt-6 space-y-3">
                {['استكشف عشرات الفرص ضمن خطوط سيرك', 'قدّم عروضك بسرعة من الجوال أو الويب', 'أدِر سائقيك وشاحناتك من لوحة واحدة', 'استلم مدفوعاتك أسبوعياً عبر تحويل بنكي'].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-sm text-white/90">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Link href="http://localhost:3003/login" className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold hover:underline">
                انضم كناقل
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-muted/30 border-y">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge className="mb-4">آراء عملائنا</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">ثقة بنيناها صفقة بعد أخرى</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name}>
                <CardContent className="pt-6">
                  <Quote className="h-6 w-6 text-primary/40 mb-4" />
                  <p className="text-base leading-relaxed">&ldquo;{t.q}&rdquo;</p>
                  <div className="mt-6 flex items-center gap-3 pt-5 border-t">
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary grid place-items-center font-semibold text-sm">
                      {t.name.split(' ').map((w) => w[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{t.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{t.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <Badge className="mb-4">التسعير</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">عمولة بسيطة — لا رسوم خفيّة</h2>
            <p className="mt-4 text-base text-muted-foreground">عمولة ٨٪ على قيمة الصفقة عند نجاحها فقط. لا اشتراك. لا رسوم تسجيل.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-sm font-semibold text-muted-foreground">للعميل</div>
                <div className="mt-3 text-5xl font-bold num">مجاناً</div>
                <div className="mt-3 text-sm text-muted-foreground">لا تدفع شيئاً للمنصة</div>
              </CardContent>
            </Card>
            <Card className="bg-primary text-primary-foreground border-primary shadow-md">
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-sm font-semibold text-white/80">للناقل</div>
                <div className="mt-3 text-5xl font-bold num">٨٪</div>
                <div className="mt-3 text-sm text-white/80">من قيمة كل صفقة ناجحة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <div className="text-sm font-semibold text-muted-foreground">VAT</div>
                <div className="mt-3 text-5xl font-bold num">١٥٪</div>
                <div className="mt-3 text-sm text-muted-foreground">على العمولة فقط</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-20">
        <div className="max-w-[1280px] mx-auto px-6">
          <Card className="bg-primary text-primary-foreground border-primary overflow-hidden relative">
            <div aria-hidden className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />
            <CardContent className="py-16 px-8 sm:px-12 text-center relative">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">جاهز لشحن أول طلب لك؟</h2>
              <p className="mt-3 text-base text-white/80 max-w-xl mx-auto">سجّل خلال دقيقتين وتلقَّ عروض ناقلين معتمدين قبل ما تكمّل قهوتك.</p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="http://localhost:3002/login">
                  <Button size="lg" variant="secondary">ابدأ كعميل</Button>
                </Link>
                <Link href="http://localhost:3003/login">
                  <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">انضم كناقل</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t">
        <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Truck className="h-5 w-5" />
              </div>
              <span className="text-base font-bold">نقلة لوجيستك</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              منصة النقل اللوجستي الذكي في المملكة — نربط الشركات والأفراد بأفضل ناقلي المملكة بشفافية كاملة.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">المنصة</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="text-muted-foreground hover:text-foreground">المميزات</a></li>
              <li><a href="#how"      className="text-muted-foreground hover:text-foreground">كيف نعمل</a></li>
              <li><a href="#pricing"  className="text-muted-foreground hover:text-foreground">التسعير</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">الشركة</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground">عن نقلة</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">تواصل معنا</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">سياسة الخصوصية</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">الشروط والأحكام</Link></li>
              <li><Link href="/transport" className="text-muted-foreground hover:text-foreground">شروط النقل</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="max-w-[1280px] mx-auto px-6 py-5 text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} نقلة لوجيستك · جميع الحقوق محفوظة
          </div>
        </div>
      </footer>
    </div>
  );
}
