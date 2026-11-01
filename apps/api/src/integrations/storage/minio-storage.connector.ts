import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client as MinioClient } from 'minio';
import type { Readable } from 'stream';
import type { StorageConnector } from './storage.connector';

/// MinIO (S3-compatible) storage connector. Because R2 and AWS S3 are also
/// S3-compatible, a future R2 connector is largely this class pointed at the R2
/// endpoint with R2 credentials — or a dedicated `R2StorageConnector` selected
/// by `STORAGE_PROVIDER` in `StorageModule`.
@Injectable()
export class MinioStorageConnector implements StorageConnector, OnModuleInit {
  private readonly logger = new Logger(MinioStorageConnector.name);
  private client!: MinioClient; // internal host — server-side object ops
  private signClient!: MinioClient; // public host — presigned URLs for clients
  private bucket = process.env.MINIO_BUCKET ?? 'naqla-files';

  async onModuleInit() {
    this.client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
      accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
      secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
    });

    // Presigned PUT/GET URLs are handed to a phone or browser, which cannot
    // reach the internal MINIO_ENDPOINT (e.g. the docker host "minio:9000").
    // They must be SIGNED against the public host (MINIO_PUBLIC_URL) so the
    // URL is both reachable and signature-valid when it hits MinIO through the
    // reverse proxy. Falls back to the internal client when no public URL is
    // set (local dev, where localhost:9000 is reachable anyway).
    this.signClient = this.buildSignClient() ?? this.client;

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) await this.client.makeBucket(this.bucket);
    } catch {
      /* bucket may already exist, or storage not ready yet */
    }
  }

  /** A MinIO client whose endpoint is the public storage host (from
   *  MINIO_PUBLIC_URL), used only to mint presigned URLs. Returns null when the
   *  public URL is missing or unparseable (then presigning uses the internal
   *  client, as before). */
  private buildSignClient(): MinioClient | null {
    const publicUrl = process.env.MINIO_PUBLIC_URL;
    if (!publicUrl) return null;
    try {
      const u = new URL(publicUrl);
      const useSSL = u.protocol === 'https:';
      return new MinioClient({
        endPoint: u.hostname,
        port: u.port ? Number(u.port) : useSSL ? 443 : 80,
        useSSL,
        accessKey: process.env.MINIO_ROOT_USER ?? 'minioadmin',
        secretKey: process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
      });
    } catch {
      this.logger.warn(
        `MINIO_PUBLIC_URL is set but not a valid URL ("${publicUrl}"); ` +
          'presigned URLs will use the internal endpoint and may be unreachable from clients.',
      );
      return null;
    }
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
    return this.signClient.presignedPutObject(this.bucket, key, expirySeconds);
  }

  presignedGet(key: string, expirySeconds: number): Promise<string> {
    return this.signClient.presignedGetObject(this.bucket, key, expirySeconds);
  }

  publicBaseUrl(): string | null {
    return (
      process.env.MINIO_PUBLIC_URL ??
      `http://${process.env.MINIO_ENDPOINT ?? 'localhost'}:${process.env.MINIO_PORT ?? 9000}/${this.bucket}`
    );
  }
}
