import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  STORAGE_CONNECTOR,
  type StorageConnector,
} from '../../integrations/storage/storage.connector';

/// The authenticated uploader, as far as key-building needs it.
export type UploadActor = { userId?: string; companyId?: string | null; role?: string };

/// A closed set of upload purposes whose object key is built SERVER-SIDE from
/// the actor's own ids — never a client-supplied folder. See
/// docs/architecture/storage.md. (chat/pod/cod stay on the legacy `folder`
/// path until per-order ownership checks are added.)
export type UploadPurpose = 'kyc' | 'companyLogo' | 'avatar' | 'branding';

export interface PresignInput {
  filename: string;
  contentType: string;
  sizeBytes?: number;
  /** Preferred: server builds the key prefix from the actor + purpose. */
  purpose?: UploadPurpose;
  /** For `kyc`: the document type (e.g. CR, VAT) — becomes a key segment. */
  docType?: string;
  actor?: UploadActor;
  /** Legacy: a client-supplied folder (used only when `purpose` is absent). */
  folder?: string;
}

/// Thin app-side service over the storage connector. The browser/app uploads
/// files DIRECTLY to the object store via the pre-signed PUT URL and reads them
/// via a pre-signed GET URL — no file bytes ever pass through our server (keeps
/// egress/compute cost off our backend; ideal for Cloudflare R2).
@Injectable()
export class UploadsService {
  constructor(@Inject(STORAGE_CONNECTOR) private storage: StorageConnector) {}

  private seg(v: string | undefined, fallback: string) {
    return (v || fallback).replace(/[^\w\-]/g, '').slice(0, 40) || fallback;
  }

  private isAdmin(actor?: UploadActor) {
    return actor?.role === 'ADMIN' || actor?.role === 'SUPER_ADMIN';
  }

  /// Resolve the key prefix. For a known `purpose` the prefix is derived from
  /// the actor's OWN ids (no cross-entity risk); otherwise the legacy folder.
  private resolvePrefix(input: PresignInput): string {
    const { purpose, actor } = input;
    if (!purpose) return this.seg(input.folder, 'general');
    switch (purpose) {
      case 'kyc':
        if (!actor?.companyId) throw this.forbidden();
        return `companies/${actor.companyId}/kyc/${this.seg(input.docType, 'general')}`;
      case 'companyLogo':
        if (!actor?.companyId) throw this.forbidden();
        return `companies/${actor.companyId}/logo`;
      case 'avatar':
        if (!actor?.userId) throw this.forbidden();
        return `users/${actor.userId}/avatar`;
      case 'branding':
        if (!this.isAdmin(actor)) throw this.forbidden();
        return 'branding';
      default:
        throw this.forbidden();
    }
  }

  private forbidden() {
    return new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية الرفع' });
  }

  private buildKey(prefix: string, filename: string) {
    const safeName = (filename || 'file').replace(/[^\w.\-]/g, '_').slice(0, 80);
    return `${prefix}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
  }

  /** A pre-signed PUT URL (client → store) plus the object key to store on the
   *  resource once the upload completes. */
  async presignedUpload(input: PresignInput) {
    const key = this.buildKey(this.resolvePrefix(input), input.filename);
    const uploadUrl = await this.storage.presignedPut(key, 60 * 5);
    const base = this.storage.publicBaseUrl();
    return {
      uploadUrl,
      key,
      publicUrl: base ? `${base}/${key}` : null,
      contentType: input.contentType,
      expiresIn: 300,
      maxSizeBytes: 25 * 1024 * 1024,
      declaredSizeBytes: input.sizeBytes ?? null,
    };
  }

  /** A short-lived pre-signed GET URL to read a stored object directly. */
  presignedDownload(key: string, expirySeconds = 60 * 60) {
    return this.storage.presignedGet(key, expirySeconds);
  }
}
