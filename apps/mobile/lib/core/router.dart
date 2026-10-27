import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/auth/otp_screen.dart';
import '../features/auth/register_account_type_screen.dart';
import '../features/shell/app_shell.dart';

/// App routes (Phase 1). The post-login shell is resolved from the account's
/// identity; for now it defaults to the customer shell (with a dev identity
/// switcher inside) until auth is wired to the API.
final router = GoRouter(
  initialLocation: '/login',
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(
        onLogin: () => context.go('/app'),
        onOtp: () => context.push('/otp'),
        onRegister: () => context.push('/register'),
      ),
    ),
    GoRoute(
      path: '/otp',
      builder: (context, state) => OtpScreen(
        onVerify: () => context.go('/app'),
      ),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => RegisterAccountTypeScreen(
        onNext: () => context.go('/app'),
      ),
    ),
    GoRoute(
      path: '/app',
      builder: (context, state) => const AppShell(),
    ),
  ],
);
