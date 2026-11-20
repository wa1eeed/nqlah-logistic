# بيئة Production — النسخة المنشورة الحالية

هذا المجلد مخصّص لبيئة **Production** — النسخة المنشورة حاليًا على Coolify
(`*.nqlah.nx.sa`)، التي رُقّيت مباشرةً من staging في الإطلاق السريع.

## Coolify
- المشروع: `nqlah-logistic` · البيئة: **production**.
- الريسورسز (بعد إزالة لاحقة `-staging`): api / admin / client / carrier /
  landing / driver + PostgreSQL + Redis، كلها على نفس الخادم.
- `NODE_ENV=production` (يفعّل CSP/HSTS، يخفي `/docs`، يشدّد الأسرار، ويُجبر OTP
  على الوضع الحي — مراجعة أبل عبر «وضع مراجعة المتجر»).

## staging (لاحقًا)
بعد اعتماد هذه النسخة، يُنشأ مجلد `staging/` جديد + بيئة Coolify مستقلّة (خادم/قاعدة/تخزين منفصلة) لاختبار التحديثات قبل ترحيلها هنا. انظر «استراتيجية الإطلاق» في [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).
