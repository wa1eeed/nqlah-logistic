import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api/api_exception.dart';
import 'package:go_router/go_router.dart';

import 'auth/auth_controller.dart';
import 'auth/registration_controller.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/otp_screen.dart';
import '../features/auth/register_credentials_screen.dart';
import '../features/auth/register_account_type_screen.dart';
import '../features/auth/plan_picker_screen.dart';
import '../features/auth/register_documents_screen.dart';
import '../features/auth/register_otp_screen.dart';
import '../features/auth/register_pending_screen.dart';
import '../features/customer/order/order_step1_cargo.dart';
import '../features/customer/order/order_step2_route.dart';
import '../features/customer/order/order_step3_schedule.dart';
import '../features/customer/order/order_step4_pricing.dart';
import '../features/customer/order/order_step5_consignee.dart';
import '../features/customer/order/order_step6_review.dart';
import '../features/customer/order/order_created_screen.dart';
import '../features/customer/order_detail_screen.dart';
import '../features/customer/tracking_screen.dart';
import '../features/customer/truck_detail_screen.dart';
import 'marketplace/marketplace_repository.dart';
import '../features/customer/customer_finance_screen.dart';
import '../features/comms/notifications_screen.dart';
import '../features/provider/driver_assignment_screen.dart';
import '../features/provider/provider_add_driver_screen.dart';
import '../features/provider/provider_maintenance_screen.dart';
import '../features/provider/provider_order_screen.dart';
import '../features/provider/provider_subscription_screen.dart';
import '../features/provider/provider_maintenance_hub_screen.dart';
import '../features/account/account_screen.dart';
import '../features/provider/trip_monitor_screen.dart';
import '../features/driver/driver_trip_execution_screen.dart';
import '../features/driver/driver_epod_screen.dart';
import '../features/comms/chat_screen.dart';
import '../features/shell/app_shell.dart';

/// App router. Authentication-aware: a stored/valid session routes into the
/// shell, otherwise the auth pages (login / OTP / register) are shown. The
/// post-login shell resolves its identity from the signed-in user's role.
final routerProvider = Provider<GoRouter>((ref) {
  // Bridge Riverpod auth-state changes to GoRouter's refresh.
  final refresh = ValueNotifier<int>(0);
  ref.listen(authControllerProvider, (_, _) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/login',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      // Hold position while the session is still being restored on launch.
      if (!auth.isResolved) return null;
      final loc = state.matchedLocation;
      final onAuthPage =
          loc == '/login' || loc == '/login-otp' || loc.startsWith('/register');
      if (!auth.isAuthenticated) {
        return onAuthPage ? null : '/login';
      }
      // Signed in: keep them out of the login / OTP entry pages.
      if (loc == '/login' || loc == '/login-otp') return '/app';
      return null;
    },
    routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginScreen(
        // OTP login is handled inside the login screen (sends the code, then
        // pushes /login-otp).
        onRegister: () => context.push('/register'),
      ),
    ),
    GoRoute(
      // Passwordless login: the phone comes in via `extra`; verifying the code
      // calls `POST /auth/login-otp` and issues a session.
      path: '/login-otp',
      builder: (context, state) {
        final phone = state.extra is String ? state.extra as String : '';
        return Consumer(
          builder: (context, ref, _) => OtpScreen(
            phone: phone,
            onResend: () =>
                ref.read(authControllerProvider.notifier).requestLoginOtp(phone),
            onVerify: (code) async {
              try {
                await ref
                    .read(authControllerProvider.notifier)
                    .loginWithOtp(phone, code);
                return null;
              } on ApiException catch (e) {
                return e.message;
              } catch (_) {
                return 'تعذّر الدخول. حاول مجددًا.';
              }
            },
            onSuccess: () => context.go('/app'),
          ),
        );
      },
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => RegisterCredentialsScreen(
        onNext: () => context.push('/register/account-type'),
      ),
    ),
    GoRoute(
      path: '/register/account-type',
      builder: (context, state) => RegisterAccountTypeScreen(
        onNext: () => ref.read(registrationControllerProvider).isCarrier
            ? context.push('/register/plan')
            : context.push('/register/documents'),
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
        onSubmitted: () => context.push('/register/otp'),
      ),
    ),
    GoRoute(
      path: '/register/otp',
      builder: (context, state) => RegisterOtpScreen(
        onVerified: () => context.go('/register/pending'),
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
      builder: (context, state) => OrderStep6Review(
          onPublished: (id, direct) =>
              context.go('/order/created/$id', extra: direct)),
    ),
    GoRoute(
      path: '/order/created/:id',
      builder: (context, state) => OrderCreatedScreen(
        orderId: state.pathParameters['id']!,
        direct: state.extra is bool ? state.extra as bool : false,
      ),
    ),
    GoRoute(
      path: '/order-detail/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return OrderDetailScreen(
          orderId: id,
          onTrack: () => context.push('/tracking/$id'),
        );
      },
    ),
    GoRoute(
      path: '/tracking/:id',
      builder: (context, state) =>
          TrackingScreen(orderId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/truck-detail',
      builder: (context, state) =>
          TruckDetailScreen(listing: state.extra as TruckListing),
    ),
    GoRoute(
      path: '/finance',
      builder: (context, state) => const CustomerFinanceScreen(),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/account',
      builder: (context, state) => const AccountScreen(),
    ),
    GoRoute(
      path: '/subscription',
      builder: (context, state) => const ProviderSubscriptionScreen(),
    ),
    GoRoute(
      path: '/maintenance-hub',
      builder: (context, state) => const ProviderMaintenanceHubScreen(),
    ),
    GoRoute(
      path: '/driver-assignment/:id',
      builder: (context, state) =>
          DriverAssignmentScreen(orderId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/provider-order/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return ProviderOrderScreen(
          orderId: id,
          onChangeDriver: () => context.push('/driver-assignment/$id'),
          onTrack: () => context.push('/trip-monitor/$id'),
          onChat: () => context.push('/chat/$id'),
        );
      },
    ),
    GoRoute(
      path: '/trip-monitor/:id',
      builder: (context, state) =>
          TripMonitorScreen(orderId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/maintenance/:truckId',
      builder: (context, state) => ProviderMaintenanceScreen(
        truckId: state.pathParameters['truckId']!,
      ),
    ),
    GoRoute(
      path: '/add-driver',
      builder: (context, state) => const ProviderAddDriverScreen(),
    ),
    GoRoute(
      path: '/trip-execution/:id',
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return DriverTripExecutionScreen(
          orderId: id,
          onArrive: (oid) => context.push('/epod/$oid'),
        );
      },
    ),
    GoRoute(
      path: '/epod/:id',
      builder: (context, state) => DriverEpodScreen(
        orderId: state.pathParameters['id']!,
        onDone: () {},
      ),
    ),
    GoRoute(
      path: '/chat/:orderId',
      builder: (context, state) => ChatScreen(
        orderId: state.pathParameters['orderId']!,
        partyName: state.extra is String ? state.extra as String : null,
      ),
    ),
    ],
  );
});
