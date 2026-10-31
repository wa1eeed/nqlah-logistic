import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/orders/order_draft_controller.dart' show truckOptions;
import '../../core/orders/order_models.dart';
import '../../core/orders/orders_repository.dart';
import '../../core/platform/format.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/ltr.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/availability_card.dart' show MetaItem;
import '../../design_system/button.dart';
import '../../design_system/chip.dart';
import '../../design_system/confirm_dialog.dart';
import '../../design_system/load_card.dart';
import '../../design_system/segmented.dart';

const _collectionLabels = {
  'COD': 'الدفع عند التسليم',
  'ESCROW': 'ضمان (إسكرو)',
  'PREPAID_WALLET': 'محفظة مسبقة',
  'PREPAID_GATEWAY': 'دفع إلكتروني',
};

/// Provider available loads / marketplace (handoff 1f) — wired to
/// `GET /orders` (carrier marketplace) with bid submission.
class ProviderLoadsScreen extends ConsumerStatefulWidget {
  const ProviderLoadsScreen({super.key});

  @override
  ConsumerState<ProviderLoadsScreen> createState() =>
      _ProviderLoadsScreenState();
}

class _ProviderLoadsScreenState extends ConsumerState<ProviderLoadsScreen> {
  final _search = TextEditingController();
  String _query = '';
  String? _busyOrderId;
  // 1g filters (client-side on the loaded list).
  String _priceFilter = 'ALL'; // ALL / FIXED / TENDER / DIRECT
  final Set<String> _truckFilter = {};

  int get _activeFilterCount =>
      (_priceFilter != 'ALL' ? 1 : 0) + (_truckFilter.isNotEmpty ? 1 : 0);

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _acceptFixed(OrderSummary o) async {
    final price = o.agreedPrice ?? o.clientBudget;
    if (price == null) return;
    if (!await nqConfirm(context,
        title: 'قبول الحمولة بالسعر الثابت',
        message: 'سيُقدَّم عرضك بالسعر الثابت ${money(price, decimals: 0)} ر.س، وبقبول العميل '
            'يُسنَد إليك الطلب ويلزمك تنفيذه. متابعة؟',
        confirmLabel: 'قبول الحمولة',
        icon: NqIcons.handCoins)) {
      return;
    }
    await _submitBid(o, price);
  }

  Future<void> _declineDirect(OrderSummary o) async {
    if (!await nqConfirm(context,
        title: 'رفض الطلب المباشر',
        message: 'سيُعاد الطلب إلى السوق المفتوح ولن يبقى مخصّصاً لك، وقد يأخذه مزوّد آخر. متابعة؟',
        confirmLabel: 'رفض الطلب',
        danger: true)) {
      return;
    }
    setState(() => _busyOrderId = o.id);
    try {
      await ref.read(ordersRepositoryProvider).declineDirect(o.id);
      ref.invalidate(marketplaceLoadsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تم رفض الطلب وإعادته للسوق.')));
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تعذّر رفض الطلب. حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _busyOrderId = null);
    }
  }

  Future<void> _bidTender(OrderSummary o) async {
    final companyId = ref.read(authControllerProvider).user?.companyId;
    final existing = o.myBid(companyId);
    final result = await showModalBottomSheet<({num amount, String notes})>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _BidSheet(order: o, initialAmount: existing?.amount),
    );
    if (result != null) await _submitBid(o, result.amount, notes: result.notes);
  }

  Future<void> _submitBid(OrderSummary o, num amount, {String? notes}) async {
    setState(() => _busyOrderId = o.id);
    try {
      await ref
          .read(ordersRepositoryProvider)
          .createBid(o.id, amount: amount, notes: notes);
      ref.invalidate(marketplaceLoadsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تم تقديم عرضك بنجاح.')));
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(e.message)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('تعذّر تقديم العرض. حاول مجددًا.')));
      }
    } finally {
      if (mounted) setState(() => _busyOrderId = null);
    }
  }

  /// Opens a full detail sheet for a marketplace load (Addendum 7b), with the
  /// same bid / accept / decline actions as the card.
  Future<void> _showLoadDetail(OrderSummary o, String? companyId) async {
    final c = context.nq;
    final directToMe = o.isDirectTo(companyId);
    final mine = o.myBid(companyId);
    final price = o.agreedPrice ?? o.clientBudget;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                        color: c.bd, borderRadius: BorderRadius.circular(2))),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _badge(c, o.isFixedPrice ? 'سعر ثابت' : 'مناقصة',
                      o.isFixedPrice ? c.mintBg : c.infoBg,
                      o.isFixedPrice ? c.mintTx : c.info),
                  if (directToMe) ...[
                    const SizedBox(width: 8),
                    _badge(c, 'طلب مباشر', c.mintBg, c.mintTx,
                        icon: NqIcons.paperPlaneTilt),
                  ],
                  const Spacer(),
                  Text(o.orderNumber,
                      style: NqType.code(size: 14).copyWith(color: c.tx2)),
                ],
              ),
              const SizedBox(height: 16),
              _detailRoute(c, o),
              const SizedBox(height: 16),
              _detailTiles(c, o),
              if (price != null) ...[
                const SizedBox(height: 14),
                _detailPrice(c, o, price),
              ],
              const SizedBox(height: 20),
              if (mine != null && !o.isFixedPrice)
                // Already bid on a tender → show the current offer + an edit CTA.
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: c.sf2,
                        borderRadius: BorderRadius.circular(NqRadius.input),
                      ),
                      child: Text(
                          'عرضك الحالي: ${mine.amount?.toStringAsFixed(0) ?? '—'} ر.س',
                          style: NqType.label.copyWith(color: c.tx2),
                          textAlign: TextAlign.center),
                    ),
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.center,
                      child: NqButton(
                        label: 'تعديل العرض',
                        icon: NqIcons.notePencil,
                        variant: NqButtonVariant.secondary,
                        expand: false,
                        onPressed: () {
                          Navigator.of(context).pop();
                          _bidTender(o);
                        },
                      ),
                    ),
                  ],
                )
              else if (mine != null)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: c.sf2,
                    borderRadius: BorderRadius.circular(NqRadius.input),
                  ),
                  child: Text(
                      'سبق أن قبلت هذا الطلب بمبلغ ${mine.amount?.toStringAsFixed(0) ?? '—'} ر.س.',
                      style: NqType.label.copyWith(color: c.tx2),
                      textAlign: TextAlign.center),
                )
              else
                NqButton(
                  label: o.isFixedPrice ? 'قبول بالسعر الثابت' : 'قدّم عرضك',
                  icon: o.isFixedPrice ? NqIcons.check : NqIcons.gavel,
                  onPressed: () {
                    Navigator.of(context).pop();
                    if (o.isFixedPrice) {
                      _acceptFixed(o);
                    } else {
                      _bidTender(o);
                    }
                  },
                ),
              if (directToMe) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _declineDirect(o);
                  },
                  child: Text('اعتذار',
                      style: NqType.labelStrong.copyWith(color: c.err)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _badge(NqColors c, String label, Color bg, Color fg, {String? icon}) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
            color: bg, borderRadius: BorderRadius.circular(NqRadius.pill)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              NqIcon(icon, size: 13, color: fg),
              const SizedBox(width: 5),
            ],
            Text(label,
                style: NqType.caption
                    .copyWith(color: fg, fontWeight: FontWeight.w700)),
          ],
        ),
      );

  Widget _detailRoute(NqColors c, OrderSummary o) {
    Widget place(String city, String label) => Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(city,
                  style: NqType.h2.copyWith(color: c.tx),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
              Text(label, style: NqType.caption.copyWith(color: c.tx2)),
            ],
          ),
        );
    return Row(
      children: [
        place(o.originCity, 'الاستلام'),
        NqIcon(NqIcons.arrowLeft, size: 20, color: c.tx3),
        const SizedBox(width: 10),
        place(o.destinationCity, 'التفريغ'),
      ],
    );
  }

  Widget _detailTiles(NqColors c, OrderSummary o) {
    Widget tile(String label, String value) => Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: c.sf2,
              borderRadius: BorderRadius.circular(NqRadius.input),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(label, style: NqType.caption.copyWith(color: c.tx2)),
                const SizedBox(height: 2),
                Text(value,
                    style: NqType.labelStrong.copyWith(color: c.tx, fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        );
    return Column(
      children: [
        Row(children: [
          tile('الحمولة', cargoLabel(o.cargoType)),
          const SizedBox(width: 10),
          tile('الوزن', o.weight != null ? '${o.weight} طن' : '—'),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          tile('الشاحنة', truckLabel(o.requiredTruckType)),
          const SizedBox(width: 10),
          tile('موعد الاستلام', fmtDate(o.pickupDate)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          tile('الدفع',
              _collectionLabels[o.collectionMethod.toUpperCase()] ?? 'الدفع'),
          const SizedBox(width: 10),
          tile('العروض', '${o.bidsCount}'),
        ]),
      ],
    );
  }

  Widget _detailPrice(NqColors c, OrderSummary o, num price) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.card),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            Ltr(price.toStringAsFixed(0),
                style: NqType.price(size: 20).copyWith(color: c.tx)),
            const SizedBox(width: 3),
            Text('ر.س', style: NqType.caption.copyWith(color: c.tx2)),
            const Spacer(),
            Text(o.isFixedPrice ? 'السعر الثابت للعميل' : 'ميزانية العميل',
                style: NqType.label.copyWith(color: c.tx2)),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final async = ref.watch(marketplaceLoadsProvider);
    final companyId = ref.watch(authControllerProvider).user?.companyId;
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                Text(
                    async.valueOrNull != null
                        ? '${_loads(async.valueOrNull!, companyId).length} حمولة'
                        : '',
                    style: NqType.label.copyWith(color: c.tx2)),
                const Spacer(),
                Text('الأحمال المتاحة', style: NqType.h1.copyWith(color: c.tx)),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _filterButton(c),
                const SizedBox(width: 10),
                Expanded(child: _searchField(c)),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.refresh(marketplaceLoadsProvider.future),
              color: c.mintTx,
              child: async.when(
                loading: () => _centered(_loader(c)),
                error: (e, _) => _centered(_errorState(
                  c,
                  e is ApiException ? e.message : 'تعذّر تحميل الأحمال.',
                  () => ref.invalidate(marketplaceLoadsProvider),
                )),
                data: (orders) => _list(c, _loads(orders, companyId), companyId),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<OrderSummary> _loads(List<OrderSummary> orders, String? companyId) {
    var items = orders.where((o) {
      final s = o.status.toUpperCase();
      return s == 'PUBLISHED' || s == 'BIDDING';
    }).toList();
    if (_query.isNotEmpty) {
      items = items
          .where((o) =>
              o.orderNumber.toLowerCase().contains(_query.toLowerCase()) ||
              o.originCity.contains(_query) ||
              o.destinationCity.contains(_query))
          .toList();
    }
    // 1g pricing filter.
    items = items.where((o) {
      switch (_priceFilter) {
        case 'FIXED':
          return o.isFixedPrice && !o.isDirect;
        case 'TENDER':
          return !o.isFixedPrice && !o.isDirect;
        case 'DIRECT':
          return o.isDirect;
        default:
          return true;
      }
    }).toList();
    // 1g truck-type filter.
    if (_truckFilter.isNotEmpty) {
      items = items
          .where((o) =>
              o.requiredTruckType != null &&
              _truckFilter.contains(o.requiredTruckType!.toUpperCase()))
          .toList();
    }
    // Direct requests addressed to this carrier are pinned to the top (§5).
    items.sort((a, b) {
      final ad = a.isDirectTo(companyId) ? 0 : 1;
      final bd = b.isDirectTo(companyId) ? 0 : 1;
      return ad.compareTo(bd);
    });
    return items;
  }

  Widget _list(NqColors c, List<OrderSummary> loads, String? companyId) {
    if (loads.isEmpty) {
      return _centered(Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(NqIcons.magnifyingGlass, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text(_query.isNotEmpty ? 'لا نتائج مطابقة' : 'لا توجد أحمال متاحة',
              style: NqType.h3.copyWith(color: c.tx2)),
          const SizedBox(height: 6),
          Text('اسحب للأسفل للتحديث',
              style: NqType.body.copyWith(color: c.tx3)),
        ],
      ));
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: loads.length,
      separatorBuilder: (_, _) => const SizedBox(height: 16),
      itemBuilder: (_, i) => _loadCard(c, loads[i], companyId),
    );
  }

  Widget _loadCard(NqColors c, OrderSummary o, String? companyId) {
    final directToMe = o.isDirectTo(companyId);
    final card = _baseCard(c, o, companyId);
    if (!directToMe) return card;
    final busy = _busyOrderId == o.id;
    return Container(
      decoration: BoxDecoration(
        color: c.mintBg.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(NqRadius.card + 6),
        border: Border.all(color: c.mint),
      ),
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 10),
            child: Row(
              children: [
                _badge(c, 'طلب مباشر', c.mintBg, c.mintTx,
                    icon: NqIcons.paperPlaneTilt),
                const Spacer(),
                Text('موجّه إليك من العميل',
                    style: NqType.caption.copyWith(color: c.tx2)),
              ],
            ),
          ),
          card,
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: busy ? null : () => _declineDirect(o),
              child: Text('اعتذار',
                  style: NqType.labelStrong.copyWith(color: c.err)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _baseCard(NqColors c, OrderSummary o, String? companyId) {
    final mine = o.myBid(companyId);
    final busy = _busyOrderId == o.id;
    final price = o.agreedPrice ?? o.clientBudget;
    if (o.isFixedPrice) {
      return NqLoadCard(
        isTender: false,
        postedAgo: o.createdAt != null ? relativeArabic(o.createdAt) : null,
        originCity: o.originCity,
        originArea: '',
        destCity: o.destinationCity,
        destDistance: '',
        meta: [
          MetaItem(NqIcons.package,
              '${cargoLabel(o.cargoType)}${o.weight != null ? ' · ${o.weight} t' : ''}'),
          MetaItem(NqIcons.calendarBlank, fmtDate(o.pickupDate)),
          MetaItem(NqIcons.truck, truckLabel(o.requiredTruckType)),
          MetaItem(NqIcons.handCoins,
              _collectionLabels[o.collectionMethod.toUpperCase()] ?? 'الدفع'),
        ],
        price: price != null ? money(price, decimals: 0) : null,
        onAccept: busy
            ? null
            : (mine != null ? () => _alreadyBid(mine) : () => _acceptFixed(o)),
        onTap: () => _showLoadDetail(o, companyId),
      );
    }
    return NqLoadCard(
      isTender: true,
      originCity: o.originCity,
      originArea: '',
      destCity: o.destinationCity,
      destDistance: '',
      myBidText: mine != null
          ? 'عرضك: ${mine.amount != null ? money(mine.amount!, decimals: 0) : '—'} ر.س'
          : null,
      offersText: mine != null
          ? '${o.bidsCount} عروض'
          : '${o.bidsCount} عروض مقدّمة',
      hasBid: mine != null,
      onBid: busy ? null : () => _bidTender(o),
      onTap: () => _showLoadDetail(o, companyId),
    );
  }

  void _alreadyBid(BidRef mine) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(
            'سبق أن قدّمت عرضًا بمبلغ ${mine.amount?.toStringAsFixed(0) ?? '—'} ر.س.')));
  }

  Widget _filterButton(NqColors c) => GestureDetector(
        onTap: _showFilterSheet,
        child: SizedBox(
          width: 48,
          height: 48,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 48,
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: c.hero,
                  borderRadius: BorderRadius.circular(NqRadius.input),
                ),
                child: NqIcon(NqIcons.slidersHorizontal,
                    size: 20, color: NqFixed.heroText),
              ),
              if (_activeFilterCount > 0)
                PositionedDirectional(
                  top: -4,
                  start: -4,
                  child: Container(
                    width: 20,
                    height: 20,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: c.mint,
                      shape: BoxShape.circle,
                      border: Border.all(color: c.bg, width: 2),
                    ),
                    child: Text('$_activeFilterCount',
                        style: NqType.caption.copyWith(
                            color: c.onMint,
                            fontWeight: FontWeight.w700,
                            fontSize: 11)),
                  ),
                ),
            ],
          ),
        ),
      );

  void _showFilterSheet() {
    final c = context.nq;
    const pricing = [
      (value: 'ALL', label: 'الكل'),
      (value: 'FIXED', label: 'سعر ثابت'),
      (value: 'TENDER', label: 'مناقصة'),
      (value: 'DIRECT', label: 'مباشر'),
    ];
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: c.bg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheet) {
          void set(void Function() fn) {
            setSheet(fn);
            setState(fn);
          }

          return SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                            color: c.bd,
                            borderRadius: BorderRadius.circular(2))),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      GestureDetector(
                        onTap: () => set(() {
                          _priceFilter = 'ALL';
                          _truckFilter.clear();
                        }),
                        child: Text('مسح الكل',
                            style:
                                NqType.labelStrong.copyWith(color: c.mintTx)),
                      ),
                      const Spacer(),
                      Text(
                          'الفلاتر${_activeFilterCount > 0 ? ' ($_activeFilterCount)' : ''}',
                          style: NqType.h2.copyWith(color: c.tx)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text('نوع التسعير',
                      style: NqType.labelStrong.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                  const SizedBox(height: 8),
                  NqSegmented(
                    options: [for (final p in pricing) p.label],
                    index: pricing.indexWhere((p) => p.value == _priceFilter),
                    onChanged: (i) => set(() => _priceFilter = pricing[i].value),
                    height: 48,
                  ),
                  const SizedBox(height: 18),
                  Text('نوع الشاحنة',
                      style: NqType.labelStrong.copyWith(color: c.tx),
                      textAlign: TextAlign.right),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    alignment: WrapAlignment.end,
                    children: [
                      for (final t in truckOptions)
                        NqChip(
                          label: t.label,
                          selected: _truckFilter.contains(t.value),
                          onTap: () => set(() {
                            if (_truckFilter.contains(t.value)) {
                              _truckFilter.remove(t.value);
                            } else {
                              _truckFilter.add(t.value);
                            }
                          }),
                        ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  NqButton(
                    label: 'عرض النتائج',
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _searchField(NqColors c) => Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: BorderRadius.circular(NqRadius.input),
          border: Border.all(color: c.bd),
        ),
        child: Row(
          children: [
            NqIcon(NqIcons.magnifyingGlass, size: 19, color: c.tx3),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _search,
                onChanged: (v) => setState(() => _query = v.trim()),
                style: NqType.body.copyWith(color: c.tx),
                cursorColor: c.mintS,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'مدينة، رقم الطلب',
                  hintStyle: NqType.body.copyWith(color: c.tx3),
                ),
              ),
            ),
          ],
        ),
      );

  Widget _centered(Widget child) => ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [SizedBox(height: 440, child: Center(child: child))],
      );

  Widget _loader(NqColors c) => SizedBox(
        width: 30,
        height: 30,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: c.mintTx),
      );

  Widget _errorState(NqColors c, String msg, VoidCallback onRetry) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            NqIcon(NqIcons.warningCircle, size: 40, color: c.err),
            const SizedBox(height: 12),
            Text(msg,
                style: NqType.body.copyWith(color: c.tx2),
                textAlign: TextAlign.center),
            const SizedBox(height: 16),
            GestureDetector(
              onTap: onRetry,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                    color: c.mintBg,
                    borderRadius: BorderRadius.circular(NqRadius.pill)),
                child: Text('إعادة المحاولة',
                    style: NqType.labelStrong.copyWith(color: c.mintTx)),
              ),
            ),
          ],
        ),
      );
}

/// Bottom sheet to enter a bid amount for a tender load.
class _BidSheet extends StatefulWidget {
  const _BidSheet({required this.order, this.initialAmount});
  final OrderSummary order;
  /// When set, the sheet is in EDIT mode — pre-filled with the carrier's current
  /// bid amount (re-submitting updates the existing bid on the backend).
  final num? initialAmount;

  @override
  State<_BidSheet> createState() => _BidSheetState();
}

class _BidSheetState extends State<_BidSheet> {
  final _amount = TextEditingController();
  final _notes = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initialAmount != null) {
      _amount.text = widget.initialAmount!.toStringAsFixed(0);
    }
  }

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    final amount = num.tryParse(_amount.text.trim());
    final valid = amount != null && amount >= 1;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
        decoration: BoxDecoration(
          color: c.sf,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                      color: c.bd, borderRadius: BorderRadius.circular(2))),
            ),
            const SizedBox(height: 16),
            Text(widget.initialAmount != null ? 'تعديل العرض' : 'قدّم عرضك',
                style: NqType.h2.copyWith(color: c.tx),
                textAlign: TextAlign.right),
            const SizedBox(height: 4),
            Text('${widget.order.route} · ${widget.order.orderNumber}',
                style: NqType.caption.copyWith(color: c.tx2),
                textAlign: TextAlign.right),
            const SizedBox(height: 16),
            Container(
              height: NqLayout.input,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              decoration: BoxDecoration(
                color: c.bg,
                borderRadius: BorderRadius.circular(NqRadius.input),
                border: Border.all(color: c.mintS, width: 2),
              ),
              child: Row(
                children: [
                  Text('ر.س', style: NqType.label.copyWith(color: c.tx2)),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextField(
                      controller: _amount,
                      autofocus: true,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      textAlign: TextAlign.right,
                      onChanged: (_) => setState(() {}),
                      style: NqType.price(size: 20).copyWith(color: c.tx),
                      cursorColor: c.mintS,
                      decoration: InputDecoration(
                        isCollapsed: true,
                        border: InputBorder.none,
                        hintText: 'سعرك المقترح',
                        hintStyle: NqType.body.copyWith(color: c.tx3),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Container(
              height: NqLayout.input,
              padding: const EdgeInsets.symmetric(horizontal: 14),
              alignment: Alignment.centerRight,
              decoration: BoxDecoration(
                color: c.bg,
                borderRadius: BorderRadius.circular(NqRadius.input),
                border: Border.all(color: c.bd),
              ),
              child: TextField(
                controller: _notes,
                textAlign: TextAlign.right,
                style: NqType.body.copyWith(color: c.tx),
                cursorColor: c.mintS,
                decoration: InputDecoration(
                  isCollapsed: true,
                  border: InputBorder.none,
                  hintText: 'ملاحظة للعميل (اختياري)',
                  hintStyle: NqType.body.copyWith(color: c.tx3),
                ),
              ),
            ),
            const SizedBox(height: 16),
            NqButton(
              label: 'تقديم العرض',
              onPressed: valid
                  ? () => Navigator.of(context).pop(
                      (amount: amount, notes: _notes.text.trim()))
                  : null,
              locked: !valid,
            ),
          ],
        ),
      ),
    );
  }
}
