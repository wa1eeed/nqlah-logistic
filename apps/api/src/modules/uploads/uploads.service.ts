import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  STORAGE_CONNECTOR,
  type StorageConnector,
} from '../../integrations/storage/storage.connector';

/// Thin app-side service over the storage connector. The browser/app uploads
/// files DIRECTLY to the object store via the pre-signed PUT URL and reads them
/// via a pre-signed GET URL — no file bytes ever pass through our server (keeps
/// egress/compute cost off our backend; ideal for Cloudflare R2).
@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE_CONNECTOR) private storage: StorageConnector) {}

  private buildKey(filename: string, folder: string) {
    const safeName = (filename || 'file').replace(/[^\w.\-]/g, '_').slice(0, 80);
    const safeFolder = (folder || 'general').replace(/[^\w\-]/g, '').slice(0, 30) || 'general';
    return `${safeFolder}/${Date.now()}-${randomUUID()}-${safeName}`;
  }

  /** A pre-signed PUT URL (client → store) plus the object key to store on the
   *  resource once the upload completes. */
  async presignedUpload(
    filename: string,
    contentType: string,
    folder: string = 'general',
    sizeBytes?: number,
  ) {
    const key = this.buildKey(filename, folder);
    const uploadUrl = await this.storage.presignedPut(key, 60 * 5);
    const base = this.storage.publicBaseUrl();
    return {
      uploadUrl,
      key,
      publicUrl: base ? `${base}/${key}` : null,
      contentType,
      expiresIn: 300,
      maxSizeBytes: 25 * 1024 * 1024,
      declaredSizeBytes: sizeBytes ?? null,
    };
  }

  /** A short-lived pre-signed GET URL to read a stored object directly. */
  presignedDownload(key: string, expirySeconds = 60 * 60) {
    return this.storage.presignedGet(key, expirySeconds);
  }
}
