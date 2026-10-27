import 'package:dio/dio.dart';

/// A normalized API error. The NestJS API returns either a plain
/// `{ statusCode, message, error }` or a domain error `{ code, message,
/// details }`; this flattens both into a single Arabic-ready message + code.
class ApiException implements Exception {
  ApiException({required this.message, this.code, this.statusCode, this.details});

  final String message;
  final String? code;
  final int? statusCode;
  final Map<String, dynamic>? details;

  bool get isNetwork => statusCode == null;

  @override
  String toString() => 'ApiException($code/$statusCode): $message';

  /// Builds an [ApiException] from a Dio failure, extracting the server's
  /// message/code when present and falling back to a friendly Arabic string.
  factory ApiException.fromDio(DioException e) {
    final res = e.response;
    final data = res?.data;
    if (data is Map) {
      var body = Map<String, dynamic>.from(data);
      // The API wraps errors in `{success:false, error:{code,message,details}}`.
      if (body['error'] is Map) {
        body = Map<String, dynamic>.from(body['error'] as Map);
      }
      final rawMsg = body['message'] ?? body['messageAr'];
      final message = rawMsg is List
          ? rawMsg.join('\n')
          : (rawMsg?.toString() ?? _fallbackFor(e.type));
      return ApiException(
        message: message,
        code: body['code']?.toString(),
        statusCode: res?.statusCode,
        details: body['details'] is Map
            ? Map<String, dynamic>.from(body['details'] as Map)
            : null,
      );
    }
    return ApiException(
      message: _fallbackFor(e.type),
      statusCode: res?.statusCode,
    );
  }

  static String _fallbackFor(DioExceptionType type) {
    switch (type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'انتهت مهلة الاتصال. تحقّق من الشبكة وحاول مجددًا.';
      case DioExceptionType.connectionError:
        return 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.';
      case DioExceptionType.badCertificate:
        return 'تعذّر التحقق من شهادة الخادم.';
      default:
        return 'حدث خطأ غير متوقع. حاول مجددًا.';
    }
  }
}
