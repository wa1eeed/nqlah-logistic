import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import type { Readable } from 'stream';
import type { StorageConnector } from './storage.connector';

/// Cloudflare R2 storage connector. R2 is S3-compatible, so it reuses the same
/// S3 client as MinIO, pointed at the account's R2 S3 endpoint. Unlike MinIO
/// (internal docker host behind a proxy), the R2 S3 endpoint is already a public
/// HTTPS host, so presigned PUT/GET URLs are reachable from devices as-is.
///
/// Env: R2_ENDPOINT (e.g. https://<account>.r2.cloudflarestorage.com),
/// R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY, R2_REGION (default "auto"),
/// R2_PUBLIC_URL (custom domain for public assets).
@Injectable()
export class R2StorageConnector implements StorageConnector, OnModuleInit {
  private readonly logger = new Logger(R2StorageConnector.name);
  private client!: MinioClient;
  private bucket = process.env.R2_BUCKET ?? 'nqlah-dev';

  onModuleInit() {
    const endpoint = process.env.R2_ENDPOINT ?? '';
    let endPoint = '';
    let useSSL = true;
    let port = 443;
    try {
      const u = new URL(endpoint);
      endPoint = u.hostname;
      useSSL = u.protocol === 'https:';
      port = u.port ? Number(u.port) : useSSL ? 443 : 80;
    } catch {
      this.logger.warn(
        `R2_ENDPOINT is missing or invalid ("${endpoint}") — the R2 connector will fail until it is configured.`,
      );
    }
    this.client = new MinioClient({
      endPoint, // R2 S3 API host (bucket addressed path-style)
      port,
      useSSL,
      // R2 ignores the region but the S3 signer needs one; "auto" is R2's value.
      region: process.env.R2_REGION ?? 'auto',
      accessKey: process.env.R2_ACCESS_KEY ?? '',
      secretKey: process.env.R2_SECRET_KEY ?? '',
    });
    // R2 buckets are provisioned out-of-band (dashboard / wrangler), so we do
    // not create them here.
  }

  async put(key: string, buffer: Buffer, size: number, contentType: string): Promise<void> {
    await this.client.putObject(this.bucket, key, buffer, size, {
      'Content-Type': contentType || 'application/octet-stream',
    });
  }

  async getStream(key: string): Promise<{ stream: Readable; contentType: string; size: number }> {
    const stat = await this.client.statObject(this.bucket, key);
    const stream = (await this.client.getObject(this.bucket, key)) as Readable;
    return {
      stream,
      contentType: stat.metaData?.['content-type'] ?? 'application/octet-stream',
      size: stat.size,
    };
  }

  presignedPut(key: string, expirySeconds: number): Promise<string> {
    return this.client.presignedPutObject(this.bucket, key, expirySeconds);
  }

  presignedGet(key: string, expirySeconds: number): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  /// Public base URL for public assets (branding) — a custom domain bound to the
  /// R2 bucket (e.g. https://storage.nqlah.nx.sa). Presigned URLs do NOT use
  /// this; they use the R2 S3 endpoint above.
  publicBaseUrl(): string | null {
    return process.env.R2_PUBLIC_URL ?? null;
  }
}
