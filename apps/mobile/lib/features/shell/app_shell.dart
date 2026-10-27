import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/session/identity.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/tab_bar.dart';
import '../customer/customer_account_screen.dart';
import '../customer/customer_home_screen.dart';
import '../customer/customer_offers_screen.dart';
import '../customer/customer_shipments_screen.dart';
import '../customer/customer_trucks_screen.dart';
import '../provider/provider_home_screen.dart';
import '../provider/provider_loads_screen.dart';

/// The policy-driven app shell (handoff §2a): one app that mounts the matching
/// bottom-tab set for the account's identity. Tab bodies are placeholders in
/// Phase 1; the real per-role screens land in Phases 2–4.
///
/// A dev identity switcher (top-left) lets us preview every shell without a
/// backend; it is removed once auth is wired to the API.
class AppShell extends StatefulWidget {
  const AppShell({super.key, this.identity = NqIdentity.customer});

  final NqIdentity identity;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late NqIdentity _identity = widget.identity;
  bool _ownerDriver = false;
  OwnerDriverContext _odContext = OwnerDriverContext.provider;
  int _index = 0;

  List<NqTab> get _tabs => tabsFor(_identity,
      isOwnerDriver: _ownerDriver, ownerDriverContext: _odContext);

  void _switchTo(NqIdentity id, {bool ownerDriver = false}) {
    setState(() {
      _identity = id;
      _ownerDriver = ownerDriver;
      _odContext = OwnerDriverContext.provider;
      _index = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.nq;
    final tabs = _tabs;
    final index = _index.clamp(0, tabs.length - 1);
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            _devBar(c),
            Expanded(child: _body(c, tabs[index], index)),
          ],
        ),
      ),
      bottomNavigationBar: NqTabBar(
        tabs: tabs,
        index: index,
        onChanged: (i) => setState(() => _index = i),
      ),
    );
  }

  Widget _body(NqColors c, NqTab tab, int index) {
    // Real screens as they're built; placeholders otherwise.
    if (_identity == NqIdentity.customer) {
      switch (index) {
        case 0:
          return CustomerHomeScreen(
            onNewOrder: () => context.push('/order'),
            onWallet: () => context.push('/finance'),
            onBell: () => context.push('/notifications'),
          );
        case 1:
          return const CustomerTrucksScreen();
        case 2:
          return const CustomerShipmentsScreen();
        case 3:
          return const CustomerOffersScreen();
        case 4:
          return const CustomerAccountScreen();
      }
    }
    if (_identity == NqIdentity.provider && !_ownerDriver) {
      switch (index) {
        case 0:
          return ProviderHomeScreen(
            onBell: () => context.push('/notifications'),
          );
        case 1:
          return const ProviderLoadsScreen();
      }
    }
    return _placeholderBody(c, tab);
  }

  Widget _placeholderBody(NqColors c, NqTab tab) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          NqIcon(tab.icon, fill: true, size: 40, color: c.tx3),
          const SizedBox(height: 12),
          Text(tab.label, style: NqType.h1.copyWith(color: c.tx)),
          const SizedBox(height: 6),
          Text('قيد البناء', style: NqType.body.copyWith(color: c.tx2)),
        ],
      ),
    );
  }

  // Temporary: preview any identity's shell.
  Widget _devBar(NqColors c) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      alignment: AlignmentDirectional.centerStart,
      child: Row(
        children: [
          Text('معاينة الدور:', style: NqType.caption.copyWith(color: c.tx3)),
          const SizedBox(width: 8),
          PopupMenuButton<String>(
            onSelected: (v) {
              switch (v) {
                case 'customer':
                  _switchTo(NqIdentity.customer);
                case 'provider':
                  _switchTo(NqIdentity.provider);
                case 'owner':
                  _switchTo(NqIdentity.provider, ownerDriver: true);
                case 'driver':
                  _switchTo(NqIdentity.employedDriver);
              }
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'customer', child: Text('عميل')),
              PopupMenuItem(value: 'provider', child: Text('مزوّد')),
              PopupMenuItem(value: 'owner', child: Text('مزوّد وسائق (مستقل)')),
              PopupMenuItem(value: 'driver', child: Text('سائق تابع')),
            ],
            child: Row(
              children: [
                Text(_identityLabel, style: NqType.labelStrong.copyWith(color: c.mintTx)),
                NqIcon(NqIcons.caretLeft, size: 14, color: c.mintTx),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String get _identityLabel {
    if (_identity == NqIdentity.customer) return 'عميل';
    if (_identity == NqIdentity.employedDriver) return 'سائق تابع';
    return _ownerDriver ? 'مزوّد وسائق' : 'مزوّد';
  }
}
