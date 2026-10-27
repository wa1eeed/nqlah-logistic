import '../widgets/nq_icon.dart';

/// The three real account identities (handoff §1). The server's policy engine
/// resolves which one an account has; the app mounts the matching shell.
enum NqIdentity { customer, provider, employedDriver }

/// Owner-driver (a provider whose only driver is himself) toggles between
/// operating as a provider and driving (handoff §1 / 2e).
enum OwnerDriverContext { provider, driving }

/// One bottom-navigation destination.
class NqTab {
  const NqTab(this.label, this.icon);
  final String label;
  final String icon;
}

/// Resolves the bottom-tab set for a session (handoff §2a).
List<NqTab> tabsFor(
  NqIdentity identity, {
  bool isOwnerDriver = false,
  OwnerDriverContext ownerDriverContext = OwnerDriverContext.provider,
}) {
  switch (identity) {
    case NqIdentity.customer:
      // Addendum 01 §0: Finance leaves the bar (moves to a wallet button in the
      // Home header); the Trucks tab takes slot 2.
      return const [
        NqTab('الرئيسية', NqIcons.houseSimple),
        NqTab('الشاحنات', NqIcons.truck),
        NqTab('شحناتي', NqIcons.package),
        NqTab('العروض', NqIcons.handCoins),
        NqTab('حسابي', NqIcons.userCircle),
      ];
    case NqIdentity.provider:
      if (isOwnerDriver) {
        if (ownerDriverContext == OwnerDriverContext.driving) {
          return const [
            NqTab('رحلاتي', NqIcons.path),
            NqTab('الرسائل', NqIcons.chats),
            NqTab('حسابي', NqIcons.userCircle),
          ];
        }
        return const [
          NqTab('الرئيسية', NqIcons.houseSimple),
          NqTab('الأحمال', NqIcons.magnifyingGlass),
          NqTab('عملياتي', NqIcons.briefcase),
          NqTab('رحلاتي', NqIcons.path),
          NqTab('حسابي', NqIcons.userCircle),
        ];
      }
      return const [
        NqTab('الرئيسية', NqIcons.houseSimple),
        NqTab('الأحمال', NqIcons.magnifyingGlass),
        NqTab('التكليفات', NqIcons.clipboardText),
        NqTab('الأسطول', NqIcons.truck),
        NqTab('المالية', NqIcons.wallet),
      ];
    case NqIdentity.employedDriver:
      return const [
        NqTab('رحلاتي', NqIcons.path),
        NqTab('الإشعارات', NqIcons.bell),
        NqTab('حسابي', NqIcons.userCircle),
      ];
  }
}
