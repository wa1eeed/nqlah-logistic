import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

/**
 * AES-256-GCM encryption for secrets stored at rest (integration API keys, etc.).
 * The key is derived from `APP_ENCRYPTION_KEY` (preferred) or `JWT_SECRET` so no
 * extra setup is required in dev. Format: `v1:<iv>:<tag>:<ciphertext>` (base64).
 */
const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.JWT_SECRET || 'nqlah-dev-secret';
  return createHash('sha256').update(secret).digest(); // 32 bytes
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload.startsWith('v1:')) return payload; // tolerate legacy/plain
  const [, ivB64, tagB64, dataB64] = payload.split(':');
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function isEncrypted(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith('v1:');
}

/** Mask a secret for display: keep the last 4 chars, e.g. `••••••a1b2`. */
export function maskSecret(plain: string): string {
  if (!plain) return '';
  const tail = plain.slice(-4);
  return `${'•'.repeat(Math.min(8, Math.max(2, plain.length - 4)))}${tail}`;
}
