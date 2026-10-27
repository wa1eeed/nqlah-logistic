import 'package:go_router/go_router.dart';

import '../features/auth/login_screen.dart';
import '../features/auth/otp_screen.dart';
import '../features/auth/register_account_type_screen.dart';
import '../features/auth/plan_picker_screen.dart';
import '../features/auth/register_documents_screen.dart';
import '../features/auth/register_pending_screen.dart';
import '../features/customer/order/order_step1_cargo.dart';
import '../features/customer/order/order_step2_route.dart';
import '../features/customer/order/order_step3_schedule.dart';
import '../features/customer/order/order_step4_pricing.dart';
import '../features/customer/order/order_step5_consignee.dart';
import '../features/customer/order/order_step6_review.dart';
import '../features/customer/order_detail_screen.dart';
import '../features/customer/tracking_screen.dart';
import '../features/customer/truck_detail_screen.dart';
import '../features/customer/customer_finance_screen.dart';
import '../features/customer/customer_notifications_screen.dart';
import '../features/provider/driver_assignment_screen.dart';
import '../features/provider/provider_maintenance_screen.dart';
import '../features/provider/provider_order_screen.dart';
import '../features/provider/trip_monitor_screen.dart';
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
        onNext: () => context.push('/register/plan'),
      ),
    ),
    GoRoute(
      path: '/register/plan',
      builder: (context, state) => PlanPickerScreen(
        onNext: () => context.push('/register/documents'),
      ),
    ),
    GoRoute(
      path: '/register/documents',
      builder: (context, state) => RegisterDocumentsScreen(
        onNext: () => context.push('/register/pending'),
      ),
    ),
    GoRoute(
      path: '/register/pending',
      builder: (context, state) => RegisterPendingScreen(
        onBrowse: () => context.go('/app'),
      ),
    ),
    GoRoute(
      path: '/app',
      builder: (context, state) => const AppShell(),
    ),
    GoRoute(
      path: '/order',
      builder: (context, state) => OrderStep1Cargo(
        onNext: () => context.push('/order/route'),
      ),
    ),
    GoRoute(
      path: '/order/route',
      builder: (context, state) =>
          OrderStep2Route(onNext: () => context.push('/order/schedule')),
    ),
    GoRoute(
      path: '/order/schedule',
      builder: (context, state) =>
          OrderStep3Schedule(onNext: () => context.push('/order/pricing')),
    ),
    GoRoute(
      path: '/order/pricing',
      builder: (context, state) =>
          OrderStep4Pricing(onNext: () => context.push('/order/consignee')),
    ),
    GoRoute(
      path: '/order/consignee',
      builder: (context, state) =>
          OrderStep5Consignee(onNext: () => context.push('/order/review')),
    ),
    GoRoute(
      path: '/order/review',
      builder: (context, state) =>
          OrderStep6Review(onPublish: () => context.go('/app')),
    ),
    GoRoute(
      path: '/order-detail',
      builder: (context, state) =>
          OrderDetailScreen(onTrack: () => context.push('/tracking')),
    ),
    GoRoute(
      path: '/tracking',
      builder: (context, state) => const TrackingScreen(),
    ),
    GoRoute(
      path: '/truck-detail',
      builder: (context, state) =>
          TruckDetailScreen(onRequest: () => context.push('/order')),
    ),
    GoRoute(
      path: '/finance',
      builder: (context, state) => const CustomerFinanceScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const CustomerNotificationsScreen(),
    ),
    GoRoute(
      path: '/driver-assignment',
      builder: (context, state) =>
          DriverAssignmentScreen(onConfirm: () => context.pop()),
    ),
    GoRoute(
      path: '/provider-order',
      builder: (context, state) => ProviderOrderScreen(
        onChangeDriver: () => context.push('/driver-assignment'),
        onTrack: () => context.push('/trip-monitor'),
      ),
    ),
    GoRoute(
      path: '/trip-monitor',
      builder: (context, state) => const TripMonitorScreen(),
    ),
    GoRoute(
      path: '/maintenance',
      builder: (context, state) => const ProviderMaintenanceScreen(),
    ),
  ],
);
