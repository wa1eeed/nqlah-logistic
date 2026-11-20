import '../i18n/app_strings.dart';
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

/// Resolves the bottom-tab set for a session (handoff §2a). Labels are
/// localized via [s] (the active-language lookup).
List<NqTab> tabsFor(
  NqIdentity identity, {
  required S s,
  bool isOwnerDriver = false,
  OwnerDriverContext ownerDriverContext = OwnerDriverContext.provider,
}) {
  switch (identity) {
    case NqIdentity.customer:
      // Full market in the bar — both Trucks and Loads are browsable. Account
      // moves to the profile avatar in the shell top bar (so the bar stays at 5).
      return [
        NqTab(s('nav.home'), NqIcons.houseSimple),
        NqTab(s('nav.trucks'), NqIcons.truck),
        NqTab(s('nav.marketLoads'), NqIcons.package),
        NqTab(s('nav.myShipments'), NqIcons.shippingContainer),
        NqTab(s('nav.offers'), NqIcons.handCoins),
      ];
    case NqIdentity.provider:
      if (isOwnerDriver) {
        if (ownerDriverContext == OwnerDriverContext.driving) {
          return [
            NqTab(s('nav.myTrips'), NqIcons.path),
            NqTab(s('nav.messages'), NqIcons.chats),
            NqTab(s('nav.account'), NqIcons.userCircle),
          ];
        }
        return [
          NqTab(s('nav.home'), NqIcons.houseSimple),
          NqTab(s('nav.loads'), NqIcons.magnifyingGlass),
          NqTab(s('nav.operations'), NqIcons.briefcase),
          NqTab(s('nav.myTrips'), NqIcons.path),
          NqTab(s('nav.account'), NqIcons.userCircle),
        ];
      }
      return [
        NqTab(s('nav.home'), NqIcons.houseSimple),
        NqTab(s('nav.loads'), NqIcons.magnifyingGlass),
        NqTab(s('nav.assignments'), NqIcons.clipboardText),
        NqTab(s('nav.fleet'), NqIcons.truck),
        NqTab(s('nav.finance'), NqIcons.wallet),
      ];
    case NqIdentity.employedDriver:
      return [
        NqTab(s('nav.myTrips'), NqIcons.path),
        NqTab(s('nav.notifications'), NqIcons.bell),
        NqTab(s('nav.account'), NqIcons.userCircle),
      ];
  }
}
