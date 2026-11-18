import { describe, expect, it } from 'vitest';
import {
  createR2PresignedUrl,
  MAX_ATTACHMENT_SIZE_BYTES,
  sanitizeObjectFileName,
  validateAttachmentFile,
} from './r2Service';

describe('R2 Attachment Validation & SigV4 Presigner', () => {
  it('accepts image, pdf, docx, xlsx files up to 5MB and rejects >5MB or unsupported extensions', () => {
    const validDocx = new File([new Uint8Array(1024)], 'bao-gia.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const validXlsx = new File([new Uint8Array(1024)], 'danh-sach.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const validPdf = new File([new Uint8Array(1024)], 'spec.pdf', {
      type: 'application/pdf',
    });
    const validImg = new File([new Uint8Array(1024)], 'chat.png', {
      type: 'image/png',
    });
    const tooBig = new File([new Uint8Array(MAX_ATTACHMENT_SIZE_BYTES + 1)], 'heavy.pdf', {
      type: 'application/pdf',
    });
    const invalidExe = new File([new Uint8Array(100)], 'script.exe', {
      type: 'application/x-msdownload',
    });

    expect(validateAttachmentFile(validDocx)).toBeNull();
    expect(validateAttachmentFile(validXlsx)).toBeNull();
    expect(validateAttachmentFile(validPdf)).toBeNull();
    expect(validateAttachmentFile(validImg)).toBeNull();
    expect(validateAttachmentFile(tooBig)).toContain('5MB');
    expect(validateAttachmentFile(invalidExe)).toContain('không đúng định dạng');
  });

  it('sanitizes Vietnamese filenames cleanly', () => {
    expect(sanitizeObjectFileName('Báo giá sản phẩm (v2).xlsx')).toBe(
      'Bao-gia-san-pham-v2-.xlsx'
    );
  });

  it('generates valid AWS SigV4 presigned URLs for R2', async () => {
    const url = await createR2PresignedUrl({
      method: 'PUT',
      key: 'tickets/abc/bao-gia.pdf',
      endpoint: 'https://demoaccount.r2.cloudflarestorage.com',
      bucket: 'checklist-portal',
      accessKey: 'testAccessKey',
      secretKey: 'testSecretKey',
      expiresSeconds: 600,
      useDevProxy: true,
      now: new Date('2026-11-18T00:00:00Z'),
    });

    expect(url).toContain('/r2-proxy/checklist-portal/tickets/abc/bao-gia.pdf?');
    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Credential=testAccessKey%2F20261118%2Fauto%2Fs3%2Faws4_request');
    expect(url).toContain('X-Amz-Date=20261118T000000Z');
    expect(url).toContain('X-Amz-Expires=600');
    expect(url).toMatch(/X-Amz-Signature=[a-f0-9]{64}$/);
  });
});
