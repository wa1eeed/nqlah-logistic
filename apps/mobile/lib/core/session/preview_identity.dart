import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import 'identity.dart';

/// Dev-only override driven by the role previewer in the app shell (the preview
/// bar is hidden in release builds, so this stays null for real users). null
/// means "no preview" — screens then fall back to the real account identity.
final previewIdentityProvider = StateProvider<NqIdentity?>((ref) => null);

/// The identity an identity-gated screen (e.g. the truck detail's client-only
/// CTA) should use: the previewed role while the dev previewer is active,
/// otherwise the signed-in account's real identity. This keeps the dev
/// previewer faithful — previewing as a client shows client behavior even when
/// logged in with a carrier account — without changing production behavior.
final effectiveIdentityProvider = Provider<NqIdentity?>((ref) {
  final preview = ref.watch(previewIdentityProvider);
  if (preview != null) return preview;
  return ref.watch(authControllerProvider).user?.identity;
});
