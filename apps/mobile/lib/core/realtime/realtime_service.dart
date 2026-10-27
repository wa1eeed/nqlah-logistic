import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../api/api_config.dart';
import '../api/token_store.dart';
import '../chat/chat_repository.dart';

/// A chat message plus the order it belongs to (from a realtime `chat:message`).
typedef IncomingChat = ({String orderId, ChatMessage message});

/// Single Socket.io connection to the realtime gateway. Authenticates on the
/// handshake with the access token, joins order rooms on demand, and surfaces
/// `chat:message` events as a broadcast stream. Replaces chat polling.
class RealtimeService {
  RealtimeService(this._tokens);

  final TokenStore _tokens;
  io.Socket? _socket;
  final _chat = StreamController<IncomingChat>.broadcast();
  final Set<String> _orders = {}; // rooms to (re)subscribe on connect

  Stream<IncomingChat> get onChat => _chat.stream;

  Future<void> _ensureConnected() async {
    if (_socket != null) return;
    final token = await _tokens.readAccess();
    // The gateway attaches to the HTTP server root, not under `/api`.
    final origin = ApiConfig.baseUrl.replaceFirst(RegExp(r'/api/?$'), '');
    final socket = io.io(
      origin,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableReconnection()
          .disableAutoConnect()
          .build(),
    );
    socket.onConnect((_) {
      for (final id in _orders) {
        socket.emit('order:subscribe', {'orderId': id});
      }
    });
    socket.on('chat:message', (data) {
      if (data is Map) {
        final m = Map<String, dynamic>.from(data);
        final orderId = m['orderId']?.toString();
        if (orderId != null) {
          _chat.add((orderId: orderId, message: ChatMessage.fromJson(m)));
        }
      }
    });
    _socket = socket;
    socket.connect();
  }

  Future<void> subscribeOrder(String orderId) async {
    _orders.add(orderId);
    await _ensureConnected();
    _socket?.emit('order:subscribe', {'orderId': orderId});
  }

  void unsubscribeOrder(String orderId) {
    _orders.remove(orderId);
    _socket?.emit('order:unsubscribe', {'orderId': orderId});
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
    _chat.close();
  }
}

final realtimeServiceProvider = Provider<RealtimeService>((ref) {
  final svc = RealtimeService(ref.watch(tokenStoreProvider));
  ref.onDispose(svc.dispose);
  return svc;
});
