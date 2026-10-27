import 'package:flutter/material.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/button.dart';
import '../../design_system/chip.dart';
import '../../design_system/segmented.dart';
import '../../design_system/status_chip.dart';

/// Phase-0 design-system gallery: a living version of the
/// `00-design-system-sheet.png` to verify tokens + core components render
/// correctly in light and dark before building real screens.
class GalleryScreen extends StatefulWidget {
  const GalleryScreen({super.key});

  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  int _seg = 1;
  int _chip = 0;

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    return Scaffold(
      appBar: AppBar(title: const Text('نقلة · نظام التصميم')),
      body: ListView(
        padding: const EdgeInsets.all(NqSpace.gutter),
        children: [
          _section('الألوان'),
          _swatches(c),
          const SizedBox(height: NqSpace.x6),
          _section('الطباعة'),
          Text('إلى أين تتجه شحنتك اليوم؟', style: NqType.display.copyWith(color: c.tx)),
          const SizedBox(height: 4),
          Text('الأحمال المتاحة', style: NqType.h1.copyWith(color: c.tx)),
          Text('مسار الرحلة', style: NqType.h2.copyWith(color: c.tx)),
          Text('الدخول من البوابة 3', style: NqType.body.copyWith(color: c.tx)),
          Text('آخر تحديث قبل 2 د', style: NqType.caption.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          Row(children: [
            Ltr('2,898.00', style: NqType.price(size: 24).copyWith(color: c.tx)),
            const SizedBox(width: 6),
            Text('ر.س', style: NqType.label.copyWith(color: c.tx2)),
          ]),
          Ltr('NQ-24-08812 · TGHU 771392-0', style: NqType.code().copyWith(color: c.tx)),
          const SizedBox(height: NqSpace.x6),
          _section('الحالات'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in NqStatus.values) NqStatusChip(s),
            ],
          ),
          const SizedBox(height: NqSpace.x6),
          _section('الأزرار'),
          NqButton(label: 'طلب نقل جديد', icon: NqIcons.plus, onPressed: () {}),
          const SizedBox(height: 10),
          NqButton(label: 'تقديم عرض', variant: NqButtonVariant.secondary, onPressed: () {}),
          const SizedBox(height: 10),
          NqButton(label: 'إلغاء الطلب', variant: NqButtonVariant.destructive, onPressed: () {}),
          const SizedBox(height: 10),
          const NqButton(label: 'أكمل الخطوات أولاً', onPressed: null, locked: true),
          const SizedBox(height: 10),
          const NqButton(label: 'إرسال', loading: true),
          const SizedBox(height: NqSpace.x6),
          _section('المُقسّم والرقائق'),
          NqSegmented(
            options: const ['شحنة واحدة', 'مجمّع'],
            index: _seg,
            onChanged: (i) => setState(() => _seg = i),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (var i = 0; i < 3; i++)
                NqChip(
                  label: const ['الكل', 'سعر ثابت', 'مناقصة'][i],
                  selected: _chip == i,
                  count: i == 0 ? 24 : null,
                  onTap: () => setState(() => _chip = i),
                ),
            ],
          ),
          const SizedBox(height: NqSpace.x8),
        ],
      ),
    );
  }

  Widget _section(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 10, top: 2),
        child: Text(t, style: NqType.h2.copyWith(color: context.nq.tx)),
      );

  Widget _swatches(NqColors c) {
    final items = <(String, Color)>[
      ('mint', c.mint),
      ('mintS', c.mintS),
      ('mintBg', c.mintBg),
      ('hero', c.hero),
      ('ok', c.ok),
      ('warn', c.warn),
      ('err', c.err),
      ('info', c.info),
      ('bg', c.bg),
      ('sf2', c.sf2),
      ('bd', c.bd),
      ('tx2', c.tx2),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final (name, color) in items)
          Column(
            children: [
              Container(
                width: 64,
                height: 44,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: c.bd),
                ),
              ),
              const SizedBox(height: 4),
              Text(name, style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
      ],
    );
  }
}
