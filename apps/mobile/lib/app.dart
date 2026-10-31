import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/auth/auth_controller.dart';
import 'core/auth/auth_models.dart';
import 'core/i18n/app_strings.dart';
import 'core/i18n/locale_controller.dart';
import 'core/notifications/notifications_repository.dart';
import 'core/notifications/push_service.dart';
import 'core/router.dart';
import 'core/session/identity.dart';
import 'core/theme/app_theme.dart';

/// Lets foreground push messages surface an in-app banner from outside the
/// widget tree.
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

/// Root app. Arabic-first, RTL by default (handoff §4), light + dark themes
/// from the design tokens, routed with GoRouter.
class NqApp extends ConsumerWidget {
  const NqApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Bind the device push lifecycle to the auth state: register the FCM token
    // when signed in, unregister on logout. No-op on web / before Firebase is
    // configured (see PushService).
    ref.listen<AuthState>(authControllerProvider, (prev, next) {
      final push = ref.read(pushServiceProvider);
      final was = prev?.isAuthenticated ?? false;
      if (next.isAuthenticated && !was) {
        push
          ..onForeground = (message) {
            ref.invalidate(notificationsProvider);
            final n = message.notification;
            final text = [n?.title, n?.body]
                .where((e) => e != null && e.isNotEmpty)
                .join(' — ');
            final messenger = scaffoldMessengerKey.currentState;
            if (messenger != null && text.isNotEmpty) {
              messenger.showSnackBar(SnackBar(content: Text(text)));
            }
          }
          ..onNavigate = (data) {
            final user = ref.read(authControllerProvider).user;
            ref.read(routerProvider).go(_routeForData(data, user));
          };
        push.start();
      } else if (!next.isAuthenticated && was) {
        push.stop();
      }
    });

    final lang = ref.watch(localeControllerProvider);
    return MaterialApp.router(
      title: 'نقلة',
      debugShowCheckedModeBanner: false,
      scaffoldMessengerKey: scaffoldMessengerKey,
      theme: NqTheme.light(),
      darkTheme: NqTheme.dark(),
      themeMode: ThemeMode.system,
      locale: lang.locale,
      supportedLocales: const [Locale('ar', 'SA'), Locale('en'), Locale('ur')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      routerConfig: ref.watch(routerProvider),
      // Arabic + Urdu render RTL, English LTR — follows the active language.
      builder: (context, child) => Directionality(
        textDirection: lang.direction,
        child: child!,
      ),
    );
  }

  /// Maps a tapped notification's `data` to a route, by the user's role. Falls
  /// back to the notifications list when no order is referenced.
  String _routeForData(Map<String, dynamic> data, AuthUser? user) {
    final orderId =
        (data['orderId'] ?? data['orderID'] ?? data['order_id'])?.toString();
    if (orderId == null || orderId.isEmpty) return '/notifications';
    switch (user?.identity) {
      case NqIdentity.provider:
        return '/provider-order/$orderId';
      case NqIdentity.employedDriver:
        return '/trip-execution/$orderId';
      default:
        return '/order-detail/$orderId';
    }
  }
}
