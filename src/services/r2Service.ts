import { r2Config } from '../config/firebase';
import type { TicketAttachment } from '../types/ticket';

export const MAX_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_ATTACHMENTS_PER_TICKET = 8;

const ALLOWED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
];

const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_EXACT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
]);

export const ATTACHMENT_ACCEPT_ATTR =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv';

export function isImageAttachment(mimeType: string, name = ''): boolean {
  if (mimeType.startsWith('image/')) return true;
  const lower = name.toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].some((ext) => lower.endsWith(ext));
}

export function validateAttachmentFile(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `"${file.name}" vượt quá giới hạn 5MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
  }
  const lowerName = (file.name || '').toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime =
    ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix)) ||
    ALLOWED_EXACT_MIMES.has(file.type);

  if (!hasAllowedExt && !hasAllowedMime) {
    return `"${file.name}" không đúng định dạng cho phép (Ảnh, PDF, Word .doc/.docx, Excel .xls/.xlsx/.csv).`;
  }
  return null;
}

export function sanitizeObjectFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `file-${Date.now()}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// --- AWS SigV4 Presigned URL Helpers (Web Crypto API) ---

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeObjectPath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeRfc3986(seg))
    .join('/');
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
}

async function hmacRaw(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
  const rawKey = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    rawKey as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

function formatAmzDate(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

export async function createR2PresignedUrl(params: {
  method: 'GET' | 'PUT' | 'DELETE';
  key: string;
  endpoint?: string;
  bucket?: string;
  accessKey?: string;
  secretKey?: string;
  expiresSeconds?: number;
  useDevProxy?: boolean;
  now?: Date;
}): Promise<string> {
  const endpoint = (params.endpoint ?? r2Config.endpoint).replace(/\/+$/, '');
  const bucket = params.bucket ?? r2Config.bucket;
  const accessKey = params.accessKey ?? r2Config.accessKey;
  const secretKey = params.secretKey ?? r2Config.secretKey;

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    throw new Error('Chưa cấu hình đầy đủ thông số Cloudflare R2.');
  }

  const endpointUrl = new URL(endpoint);
  const host = endpointUrl.host;
  const encodedKey = encodeObjectPath(params.key);
  const canonicalUri = `/${encodeRfc3986(bucket)}/${encodedKey}`;

  const { amzDate, dateStamp } = formatAmzDate(params.now || new Date());
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const expires = String(params.expiresSeconds ?? 3600);

  const queryParams: Array<[string, string]> = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKey}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', expires],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  queryParams.sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join('&');

  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    params.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const hashedRequest = await sha256Hex(canonicalRequest);
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashedRequest,
  ].join('\n');

  const kDate = await hmacRaw(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacRaw(kDate, 'auto');
  const kService = await hmacRaw(kRegion, 's3');
  const kSigning = await hmacRaw(kService, 'aws4_request');
  const signature = toHex(await hmacRaw(kSigning, stringToSign));

  const prefix = params.useDevProxy ? '/r2-proxy' : endpoint;
  return `${prefix}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

export async function uploadFileToR2(
  file: File,
  ticketId: string
): Promise<{ r2Key: string; url: string }> {
  const err = validateAttachmentFile(file);
  if (err) throw new Error(err);

  const safeName = sanitizeObjectFileName(file.name);
  const key = `tickets/${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
  const contentType = file.type || 'application/octet-stream';

  // Mode 1: Recommended Cloudflare Worker Proxy (hides R2 keys on GitHub Pages)
  if (r2Config.workerUrl) {
    const uploadUrl = `${r2Config.workerUrl}/upload?key=${encodeURIComponent(key)}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(r2Config.workerSecret ? { 'X-Worker-Secret': r2Config.workerSecret } : {}),
      },
      body: file,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`Upload R2 Worker thất bại (HTTP ${res.status}): ${msg}`);
    }
    const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
    if (!json.ok || !json.url) {
      throw new Error(json.error || 'Upload R2 Worker trả về lỗi.');
    }
    return { r2Key: key, url: json.url };
  }

  // Mode 2: Direct R2 S3 SigV4 (uses /r2-proxy on Vite dev to avoid CORS)
  if (r2Config.endpoint && r2Config.bucket && r2Config.accessKey && r2Config.secretKey) {
    const useDevProxy = import.meta.env.DEV;
    const putUrl = await createR2PresignedUrl({
      method: 'PUT',
      key,
      expiresSeconds: 600,
      useDevProxy,
    });

    const res = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`Upload Cloudflare R2 thất bại (HTTP ${res.status}): ${msg}`);
    }

    const publicUrl = r2Config.publicUrl
      ? `${r2Config.publicUrl}/${encodeObjectPath(key)}`
      : `${r2Config.endpoint}/${encodeRfc3986(r2Config.bucket)}/${encodeObjectPath(key)}`;

    return { r2Key: key, url: publicUrl };
  }

  throw new Error(
    'Chưa cấu hình Cloudflare R2 (VITE_R2_WORKER_URL hoặc VITE_R2_ENDPOINT/ACCESS_KEY).'
  );
}

export async function resolveAttachmentViewUrl(att: TicketAttachment): Promise<string> {
  if (att.dataUrl) return att.dataUrl;
  if (!att.r2Key) return att.url || '';

  if (r2Config.workerUrl) {
    return `${r2Config.workerUrl}/file/${encodeObjectPath(att.r2Key)}`;
  }

  if (r2Config.publicUrl) {
    return `${r2Config.publicUrl}/${encodeObjectPath(att.r2Key)}`;
  }

  if (r2Config.endpoint && r2Config.bucket && r2Config.accessKey && r2Config.secretKey) {
    return createR2PresignedUrl({
      method: 'GET',
      key: att.r2Key,
      expiresSeconds: 3600,
      useDevProxy: import.meta.env.DEV,
    });
  }

  return att.url || '';
}

export async function deleteFileFromR2(r2Key: string): Promise<void> {
  if (!r2Key) return;
  try {
    if (r2Config.workerUrl) {
      await fetch(`${r2Config.workerUrl}/file/${encodeObjectPath(r2Key)}`, {
        method: 'DELETE',
        headers: r2Config.workerSecret ? { 'X-Worker-Secret': r2Config.workerSecret } : {},
      });
      return;
    }

    if (r2Config.endpoint && r2Config.bucket && r2Config.accessKey && r2Config.secretKey) {
      const delUrl = await createR2PresignedUrl({
        method: 'DELETE',
        key: r2Key,
        expiresSeconds: 300,
        useDevProxy: import.meta.env.DEV,
      });
      await fetch(delUrl, { method: 'DELETE' });
    }
  } catch {
    // Best-effort cleanup; never block ticket deletion if R2 object is already absent
  }
}
