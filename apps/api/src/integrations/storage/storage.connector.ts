import type { Readable } from 'stream';

/// Port for object storage. The app depends only on this interface; concrete
/// connectors (MinIO now, Cloudflare R2 / S3 later) are swapped behind the
/// `STORAGE_CONNECTOR` token via `StorageModule` — part of the integrations
/// gateway so no external provider leaks into the app code.
export interface StorageConnector {
  /** Store an object. */
  put(key: string, buffer: Buffer, size: number, contentType: string): Promise<void>;

  /** Open a readable stream for an object plus its content type and size. */
  getStream(key: string): Promise<{ stream: Readable; contentType: string; size: number }>;

  /** A short-lived pre-signed PUT URL for direct client → store uploads. */
  presignedPut(key: string, expirySeconds: number): Promise<string>;

  /** A short-lived pre-signed GET URL for direct store → client downloads. */
  presignedGet(key: string, expirySeconds: number): Promise<string>;

  /** The provider's own public base URL (for presigned flows), if any. */
  publicBaseUrl(): string | null;
}

export const STORAGE_CONNECTOR = Symbol('STORAGE_CONNECTOR');
