/**
 * Mock realtime tracking channel — a stand-in for a WebSocket.
 *
 * In production this would open a real socket to the tracking service and
 * receive GPS pings pushed by the carrier's device. Here it *simulates* that
 * push channel: the consumer subscribes once and receives `TrackingPing`
 * messages at a realistic cadence; the shipment advances based on an average
 * speed and the trip distance (not a fake continuous animation).
 *
 * Swap `openTrackingSocket` for a real `new WebSocket(url)` + `onmessage`
 * without changing the consumers.
 */
export interface TrackingPing {
  /** 0..1 along the trip, as reported by the latest GPS fix. */
  progress: number;
  /** Instantaneous speed in km/h reported with this fix. */
  speedKmh: number;
  /** Epoch ms of the fix. */
  at: number;
}

export interface TrackingSocket {
  close: () => void;
}

export function openTrackingSocket(opts: {
  startProgress: number;
  /** Cruising speed reported with each fix (km/h). */
  speedKmh?: number;
  /** How often a GPS fix arrives (ms). */
  pingMs?: number;
  /** Compressed playback: cover the remaining trip over this long (demo). */
  completeInMs?: number;
  onPing: (ping: TrackingPing) => void;
}): TrackingSocket {
  const { startProgress, speedKmh = 82, pingMs = 4000, completeInMs = 240_000, onPing } = opts;
  let progress = Math.max(0, Math.min(1, startProgress));

  // Advance one discrete step per GPS fix (truck jumps fix-to-fix, not a
  // continuous crawl). Playback is time-compressed so the trip is watchable.
  const steps = Math.max(1, completeInMs / pingMs);
  const perPing = (0.995 - progress) / steps;

  const emit = () => onPing({
    progress,
    speedKmh: Math.max(0, Math.round(speedKmh + (Math.random() - 0.5) * 18)),
    at: Date.now(),
  });

  // First fix on "connect".
  const connectTimer = setTimeout(emit, 150);

  const interval = setInterval(() => {
    progress = Math.min(0.995, progress + perPing);
    emit();
    if (progress >= 0.995) clearInterval(interval);
  }, pingMs);

  return {
    close: () => {
      clearTimeout(connectTimer);
      clearInterval(interval);
    },
  };
}
