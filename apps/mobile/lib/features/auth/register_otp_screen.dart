import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/auth/auth_repository.dart';
import '../../core/auth/registration_controller.dart';
import 'otp_screen.dart';

/// Register phone verification. Wraps [OtpScreen] with the live
/// `/auth/verify-phone` + `/auth/send-otp` handlers for the phone captured in
/// the registration draft.
class RegisterOtpScreen extends ConsumerWidget {
  const RegisterOtpScreen({super.key, this.onVerified});

  final VoidCallback? onVerified;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final phone = ref.read(registrationControllerProvider).phone;
    final repo = ref.read(authRepositoryProvider);
    return OtpScreen(
      phone: '+966 ${_pretty(phone)}',
      resendSeconds: 60,
      onVerify: (code) async {
        try {
          await repo.verifyPhone(phone, code);
          return null;
        } on ApiException catch (e) {
          return e.message;
        } catch (_) {
          return 'تعذّر التحقق. حاول مجددًا.';
        }
      },
      onResend: () => repo.sendOtp(phone),
      onSuccess: onVerified,
    );
  }

  String _pretty(String local) {
    // Group a 5XXXXXXXX local number as "5X XXX XXXX" for display (LTR context).
    final d = local.replaceAll(RegExp(r'\D'), '');
    if (d.length < 9) return local;
    return '${d.substring(0, 2)} ${d.substring(2, 5)} ${d.substring(5)}';
  }
}
