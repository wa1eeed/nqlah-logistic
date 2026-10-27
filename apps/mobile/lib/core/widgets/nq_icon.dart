import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../theme/tokens.dart';

/// Renders a Phosphor icon from the bundled SVG set (handoff §5.7).
///
/// `NqIcon(NqIcons.truck, fill: true, size: 16, color: ...)`. Icons ship as
/// SVGs with `fill="currentColor"`, so [color] tints them; it defaults to the
/// current text color.
class NqIcon extends StatelessWidget {
  const NqIcon(this.name, {super.key, this.fill = false, this.size = 20, this.color});

  final String name;
  final bool fill;
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? DefaultTextStyle.of(context).style.color ?? context.nq.tx;
    return SvgPicture.asset(
      'assets/icons/${fill ? 'fill' : 'regular'}/$name.svg',
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(c, BlendMode.srcIn),
    );
  }
}

/// Icon-name constants (kebab-case = the SVG file name) used across the app,
/// so references are checked and discoverable. Mirrors the handoff §5.7 list.
class NqIcons {
  NqIcons._();
  static const plus = 'plus';
  static const check = 'check';
  static const checkCircle = 'check-circle';
  static const checkSquare = 'check-square';
  static const checks = 'checks';
  static const lockSimple = 'lock-simple';
  static const lockOpen = 'lock-open';
  static const bell = 'bell';
  static const eye = 'eye';
  static const truck = 'truck';
  static const package = 'package';
  static const gavel = 'gavel';
  static const handshake = 'handshake';
  static const handCoins = 'hand-coins';
  static const megaphone = 'megaphone';
  static const notePencil = 'note-pencil';
  static const sealCheck = 'seal-check';
  static const xCircle = 'x-circle';
  static const warningOctagon = 'warning-octagon';
  static const warningCircle = 'warning-circle';
  static const shippingContainer = 'shipping-container';
  static const signature = 'signature';
  static const broadcast = 'broadcast';
  static const magnifyingGlass = 'magnifying-glass';
  static const slidersHorizontal = 'sliders-horizontal';
  static const mapPin = 'map-pin';
  static const mapTrifold = 'map-trifold';
  static const steeringWheel = 'steering-wheel';
  static const path = 'path';
  static const clipboardText = 'clipboard-text';
  static const wallet = 'wallet';
  static const receipt = 'receipt';
  static const userCircle = 'user-circle';
  static const userPlus = 'user-plus';
  static const houseSimple = 'house-simple';
  static const chats = 'chats';
  static const phone = 'phone';
  static const videoCamera = 'video-camera';
  static const caretLeft = 'caret-left';
  static const caretRight = 'caret-right';
  static const caretDown = 'caret-down';
  static const caretUp = 'caret-up';
  static const arrowLeft = 'arrow-left';
  static const arrowRight = 'arrow-right';
  static const clock = 'clock';
  static const timer = 'timer';
  static const tag = 'tag';
  static const wrench = 'wrench';
  static const briefcase = 'briefcase';
  static const chatCenteredDots = 'chat-centered-dots';
  static const circleNotch = 'circle-notch';
  static const minus = 'minus';
  static const gasPump = 'gas-pump';
  static const chartLineUp = 'chart-line-up';
  static const headset = 'headset';
  static const uploadSimple = 'upload-simple';
  static const fileText = 'file-text';
  static const trash = 'trash';
  static const shieldCheck = 'shield-check';
  static const hourglassMedium = 'hourglass-medium';
  static const info = 'info';
  static const paperPlaneTilt = 'paper-plane-tilt';
  static const sealCheckFill = 'seal-check';
  static const arrowCounterClockwise = 'arrow-counter-clockwise';
  static const calendarBlank = 'calendar-blank';
  static const x = 'x';
  static const stack = 'stack';
  static const plusCircle = 'plus-circle';
  static const dotsThreeVertical = 'dots-three-vertical';
  static const truckTrailer = 'truck-trailer';
  static const flagCheckered = 'flag-checkered';
  static const mapPinLine = 'map-pin-line';
  static const dotsThree = 'dots-three';
  static const listBullets = 'list-bullets';
  static const arrowUDownLeft = 'arrow-u-down-left';
  static const scales = 'scales';
  static const ruler = 'ruler';
  static const shareNetwork = 'share-network';
  static const bank = 'bank';
  static const users = 'users';
  static const globe = 'globe';
  static const moon = 'moon';
  static const question = 'question';
  static const signOut = 'sign-out';
  static const gearSix = 'gear-six';
  static const prohibit = 'prohibit';
  static const drop = 'drop';
  static const gauge = 'gauge';
  static const navigationArrow = 'navigation-arrow';
  static const cameraPlus = 'camera-plus';
}
