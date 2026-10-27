/// A device to deliver a push to.
export interface PushTarget {
  token: string;
  platform: string; // android | ios | web
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/// Port for push notifications. The app depends only on this; concrete
/// connectors (console in dev, FCM / APNs in prod) are swapped behind the
/// `NOTIFICATION_CONNECTOR` token via `NotificationsIntegrationModule` — part
/// of the integrations gateway, so no push vendor leaks into feature code.
export interface NotificationConnector {
  /// Deliver [payload] to every target. Returns the tokens that are now invalid
  /// (unregistered / expired) so the caller can prune them.
  send(targets: PushTarget[], payload: PushPayload): Promise<{ invalidTokens: string[] }>;
}

export const NOTIFICATION_CONNECTOR = Symbol('NOTIFICATION_CONNECTOR');
