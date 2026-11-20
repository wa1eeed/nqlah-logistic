import 'package:flutter/foundation.dart' show kReleaseMode;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'guest_cta.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/i18n/locale_controller.dart';
import '../../core/config/app_update.dart';
import '../../core/session/identity.dart';
import '../../core/session/preview_identity.dart';
import '../../core/realtime/realtime_service.dart';
import '../../core/realtime/realtime_invalidator.dart';
import '../update/update_screen.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/nq_icon.dart';
import '../../design_system/tab_bar.dart';
import '../customer/customer_home_screen.dart';
import '../customer/customer_offers_screen.dart';
import '../customer/customer_shipments_screen.dart';
import '../customer/customer_trucks_screen.dart';
import '../provider/provider_assignments_screen.dart';
import '../provider/provider_finance_screen.dart';
import '../provider/provider_fleet_screen.dart';
import '../provider/provider_home_screen.dart';
import '../provider/provider_loads_screen.dart';
import '../provider/owner_driver_home_screen.dart';
import '../driver/driver_my_trips_screen.dart';
import '../driver/driver_active_order_beacon.dart';
import '../driver/driver_presence.dart';
import '../comms/notifications_screen.dart';
import '../comms/conversations_screen.dart';
import '../market/loads_market_screen.dart';
import '../account/account_screen.dart';

/// A request to switch the shell to a specific tab index from outside the
/// shell (e.g. the create-order wizard linking to the Trucks tab). The shell
/// applies it on the next frame and resets it to null.
final requestedShellTabProvider = StateProvider<int?>((ref) => null);

/// The policy-driven app shell (handoff §2a): one app that mounts the matching
/// bottom-tab set for the account's identity. Tab bodies are placeholders in
/// Phase 1; the real per-role screens land in Phases 2–4.
///
/// The identity is resolved from the signed-in user's role; a dev identity
/// switcher (top-left) still lets us preview every shell from one account.
class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key, this.identity, this.ownerDriver = false});

  /// Optional override; when null the identity comes from the auth session.
  final NqIdentity? identity;
  final bool ownerDriver;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  late NqIdentity _identity = widget.identity ??
      ref.read(authControllerProvider).user?.identity ??
      NqIdentity.customer;
  // Owner-driver mode comes from the dev preview (widget.ownerDriver) OR the
  // real signed-in user (carrier who also drives) — so it works in release.
  late bool _ownerDriver = widget.ownerDriver ||
      (ref.read(authControllerProvider).user?.isOwnerDriver ?? false);
  OwnerDriverContext _odContext = OwnerDriverContext.provider;
  int _index = 0;
  // Show the non-forced "update available" sheet at most once per app run.
  bool _softUpdatePrompted = false;

  @override
  void initState() {
    super.initState();
    // Keep the dev-preview identity (read by identity-gated routes opened on top
    // of the shell, e.g. the truck detail) in sync with this shell's identity
    // from the very first mount — so it never lags behind the account/role the
    // shell is actually showing (dev-only; the preview bar is hidden in release).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(previewIdentityProvider.notifier).state = _identity;
        // Open the realtime connection for every signed-in user (not just
        // drivers), so server change signals flow and the invalidator keeps
        // lists/details live across the app.
        ref.read(realtimeServiceProvider).connect();
      }
    });
  }

  List<NqTab> get _tabs => tabsFor(_identity,
      s: ref.read(stringsProvider),
      isOwnerDriver: _ownerDriver,
      ownerDriverContext: _odContext);

  void _switchTo(NqIdentity id, {bool ownerDriver = false}) {
    // Keep identity-gated screens (opened outside the shell, e.g. the truck
    // detail) in sync with the previewed role — dev-only; the preview bar that
    // calls this is hidden in release.
    ref.read(previewIdentityProvider.notifier).state = id;
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
    ref.watch(localeControllerProvider); // rebuild tab labels on language change
    ref.watch(realtimeInvalidatorProvider); // keep live-data invalidation alive
    // A non-forced update offers a one-time, skippable prompt once the policy
    // resolves (forced updates are handled by the app-wide overlay).
    ref.listen(updateRequirementProvider, (_, next) {
      if (next == UpdateRequirement.soft && !_softUpdatePrompted) {
        _softUpdatePrompted = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) showSoftUpdateSheet(context, ref);
        });
      }
    });
    final tabs = _tabs;
    // Honor an external tab request (e.g. the wizard linking to the Trucks tab).
    final requested = ref.watch(requestedShellTabProvider);
    if (requested != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        setState(() => _index = requested.clamp(0, _tabs.length - 1));
        ref.read(requestedShellTabProvider.notifier).state = null;
      });
    }
    final index = _index.clamp(0, tabs.length - 1);
    // A guest is an unauthenticated visitor browsing the (customer) shell.
    final isGuest =
        widget.identity == null && ref.watch(authControllerProvider).user == null;
    // Drivers (employed or owner-driver) keep a socket open app-wide so the
    // server marks them online (presence) the whole time the app is open.
    final isDriver = !isGuest &&
        (_identity == NqIdentity.employedDriver ||
            (_identity == NqIdentity.provider && _ownerDriver));
    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            if (isDriver) const DriverPresence(),
            if (isDriver) const DriverActiveOrderBeacon(),
            // Dev-only role previewer — never shown to real users or guests.
            if (!kReleaseMode && !isGuest) _devBar(c),
            // Thin top bar with the profile avatar (account lives here now, not
            // in the bottom bar). The Home tab (index 0) carries its own hero
            // avatar, so the bar shows on the other tabs.
            if ((isGuest || _identity == NqIdentity.customer) && index != 0)
              _topBar(c, isGuest),
            Expanded(child: _body(c, tabs[index], index, isGuest)),
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

  /// Thin shell top bar: brand on one side, the profile avatar on the other.
  /// Tapping the avatar opens the account (or sign-in for a guest) — account
  /// moved here so the bottom bar can carry the full market (trucks + loads).
  Widget _topBar(NqColors c, bool isGuest) {
    final user = ref.watch(authControllerProvider).user;
    final name = (user?.fullName ?? '').trim();
    final letter = (!isGuest && name.isNotEmpty) ? name.characters.first : null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 6, 16, 2),
      child: Row(
        children: [
          Text('نقلة', style: NqType.h3.copyWith(color: c.mintTx)),
          const Spacer(),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => context.push(isGuest ? '/login' : '/account'),
            child: Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.mintBg,
                shape: BoxShape.circle,
                border: Border.all(color: c.mint.withValues(alpha: 0.15)),
              ),
              child: letter != null
                  ? Text(letter,
                      style: NqType.labelStrong.copyWith(color: c.mintTx))
                  : NqIcon(NqIcons.userCircle, size: 20, color: c.mintTx),
            ),
          ),
        ],
      ),
    );
  }

  Widget _body(NqColors c, NqTab tab, int index, bool isGuest) {
    // Guest (unauthenticated) browses the customer shell: the Trucks tab is the
    // real marketplace (public), the rest invite sign-in. Order/account actions
    // are gated at their routes (redirect → /login).
    if (isGuest) {
      switch (index) {
        case 1:
          return const CustomerTrucksScreen();
        case 2:
          return const LoadsMarketScreen();
        case 3:
          return const GuestCta(
            title: 'شحناتي',
            subtitle: 'سجّل الدخول لمتابعة شحناتك وطلباتك.',
            icon: NqIcons.shippingContainer,
          );
        case 4:
          return const GuestCta(
            title: 'العروض',
            subtitle: 'سجّل الدخول لاستقبال عروض المزوّدين على طلباتك.',
            icon: NqIcons.handshake,
          );
        default:
          return GuestCta(
            title: 'مرحبًا بك في نقلة',
            subtitle:
                'تصفّح السوق كاملاً — الشاحنات والحمولات المتاحة. أنشئ حسابًا عندما تريد الحجز أو إضافة حمولة.',
            icon: NqIcons.truck,
            tiles: [
              GuestBrowseTile(
                icon: NqIcons.truck,
                label: 'تصفّح الشاحنات',
                onTap: () => setState(() => _index = 1),
              ),
              GuestBrowseTile(
                icon: NqIcons.package,
                label: 'تصفّح الحمولات',
                onTap: () => setState(() => _index = 2),
              ),
            ],
          );
      }
    }
    // Real screens as they're built; placeholders otherwise.
    if (_identity == NqIdentity.customer) {
      switch (index) {
        case 0:
          return CustomerHomeScreen(
            onNewOrder: () => context.push('/order'),
            onWallet: () => context.push('/finance'),
            onBell: () => context.push('/notifications'),
            onViewShipments: () => setState(() => _index = 3),
            onOffers: () => setState(() => _index = 4),
            onOpenOrder: (id) => context.push('/order-detail/$id'),
            onProfile: () => context.push('/account'),
          );
        case 1:
          return const CustomerTrucksScreen();
        case 2:
          return const LoadsMarketScreen();
        case 3:
          return const CustomerShipmentsScreen();
        case 4:
          return const CustomerOffersScreen();
      }
    }
    if (_identity == NqIdentity.provider && _ownerDriver) {
      // Index 0 is the owner-driver home in both contexts (it owns the
      // «أعمل كمزوّد» ↔ «أقود الآن» switch); the remaining tabs differ by context.
      if (index == 0) {
        return OwnerDriverHomeScreen(
          driving: _odContext == OwnerDriverContext.driving,
          onSwitch: (i) => setState(() {
            _odContext = i == 1
                ? OwnerDriverContext.driving
                : OwnerDriverContext.provider;
            _index = 0;
          }),
        );
      }
      if (_odContext == OwnerDriverContext.driving) {
        // [رحلاتي(0), الرسائل(1), حسابي(2)]
        switch (index) {
          case 1:
            return const ConversationsScreen();
          case 2:
            return const AccountScreen();
        }
      } else {
        // [الرئيسية(0), الأحمال(1), عملياتي(2), رحلاتي(3), حسابي(4)]
        switch (index) {
          case 1:
            return const ProviderLoadsScreen();
          case 2:
            return ProviderAssignmentsScreen(
              onAssign: (id) => context.push('/driver-assignment/$id'),
              onOpen: (id) => context.push('/provider-order/$id'),
            );
          case 3:
            return DriverMyTripsScreen(
              onOpenTrip: (id) => context.push('/trip-execution/$id'),
              onAcknowledge: (id) => context.push('/trip-execution/$id'),
            );
          case 4:
            return const AccountScreen();
        }
      }
    }
    if (_identity == NqIdentity.provider && !_ownerDriver) {
      switch (index) {
        case 0:
          return ProviderHomeScreen(
            onBell: () => context.push('/notifications'),
            onAssign: (id) => context.push('/driver-assignment/$id'),
            onLoads: () => setState(() => _index = 1),
            onFinance: () => setState(() => _index = 4),
            onAnnounceAvailability: () => setState(() => _index = 3),
            onOpenOrder: (id) => context.push('/provider-order/$id'),
            onProfile: () => context.push('/account'),
          );
        case 1:
          return const ProviderLoadsScreen();
        case 2:
          return ProviderAssignmentsScreen(
            onAssign: (id) => context.push('/driver-assignment/$id'),
            onOpen: (id) => context.push('/provider-order/$id'),
          );
        case 3:
          return ProviderFleetScreen(
            onAddDriver: () => context.push('/add-driver'),
            onManagePlan: () => context.push('/register/plan'),
          );
        case 4:
          return const ProviderFinanceScreen();
      }
    }
    if (_identity == NqIdentity.employedDriver) {
      switch (index) {
        case 0:
          return DriverMyTripsScreen(
            onOpenTrip: (id) => context.push('/trip-execution/$id'),
            onAcknowledge: (id) => context.push('/trip-execution/$id'),
          );
        case 1:
          return const NotificationsScreen(showBack: false);
        case 2:
          return const AccountScreen();
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
