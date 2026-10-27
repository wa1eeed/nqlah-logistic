import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_exception.dart';

/// The result of a direct-to-store upload: the object [key] (stored on the
/// message) plus the file metadata.
class UploadedMedia {
  const UploadedMedia({
    required this.key,
    required this.name,
    required this.mime,
    required this.size,
  });

  final String key;
  final String name;
  final String mime;
  final int size;
}

/// Uploads files DIRECTLY to the object store via a pre-signed PUT URL — the
/// bytes never pass through our API (cost-efficient; see the integrations
/// gateway). Flow: `POST /uploads/presign` → PUT bytes to `uploadUrl` → keep
/// `key`.
class UploadsRepository {
  UploadsRepository(this._client);

  final ApiClient _client;
  Dio get _dio => _client.dio; // our API (adds Bearer)
  final Dio _bare = Dio(); // raw PUT to the store (no auth, no interceptors)

  Future<UploadedMedia> upload({
    required Uint8List bytes,
    required String filename,
    required String contentType,
    String folder = 'chat',
    ProgressCallback? onProgress,
  }) async {
    try {
      final pre = await _dio.post<dynamic>('/uploads/presign', data: {
        'filename': filename,
        'contentType': contentType,
        'folder': folder,
        'sizeBytes': bytes.length,
      });
      final data = pre.data is Map && (pre.data as Map)['data'] is Map
          ? Map<String, dynamic>.from((pre.data as Map)['data'] as Map)
          : Map<String, dynamic>.from(pre.data as Map);
      final uploadUrl = data['uploadUrl'] as String;
      final key = data['key'] as String;

      await _bare.put<void>(
        uploadUrl,
        data: Stream<List<int>>.fromIterable([bytes]),
        onSendProgress: onProgress,
        options: Options(
          headers: {
            Headers.contentLengthHeader: bytes.length,
            'Content-Type': contentType,
          },
        ),
      );

      return UploadedMedia(
          key: key, name: filename, mime: contentType, size: bytes.length);
    } on DioException catch (e) {
      throw ApiException.fromDio(e);
    }
  }
}

final uploadsRepositoryProvider = Provider<UploadsRepository>((ref) {
  return UploadsRepository(ref.watch(apiClientProvider));
});
