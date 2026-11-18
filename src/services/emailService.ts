import { addDoc, collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, gasConfig } from '../config/firebase';
import {
  TICKET_GROUP_LABELS,
  TICKET_STATUS_LABELS,
  type EmailEventType,
  type EmailLogEntry,
  type Ticket,
} from '../types/ticket';
import { formatVietnamDateTime } from '../utils/dateTime';

export interface AppEmailConfig {
  gasWebhookUrl?: string;
  gasSharedSecret?: string;
}

export interface EmailDispatchResult {
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
}

function getTicketDetailHashLink(ticketId: string): string {
  if (typeof window === 'undefined') return '';
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/tickets/${ticketId}`;
}

export async function dispatchTicketEmail(params: {
  ticket: Ticket;
  eventType: EmailEventType;
  recipients: string[];
  actorName: string;
  note?: string;
  expectedSku?: string;
  productUrl?: string;
  overrideConfig?: AppEmailConfig;
}): Promise<EmailDispatchResult> {
  const { ticket, eventType, recipients, actorName, note, expectedSku, productUrl, overrideConfig } = params;
  const cleanRecipients = Array.from(new Set(recipients.map((e) => e.trim()).filter(Boolean)));

  if (cleanRecipients.length === 0) {
    return { status: 'FAILED', errorMessage: 'Không có địa chỉ email người nhận.' };
  }

  const webhookUrl = (overrideConfig?.gasWebhookUrl || gasConfig.webhookUrl || '').trim();
  const secret = (overrideConfig?.gasSharedSecret || gasConfig.secret || '').trim();

  let status: 'SENT' | 'FAILED' = 'SENT';
  let errorMessage: string | undefined;

  if (!webhookUrl) {
    status = 'FAILED';
    errorMessage = 'Chưa cấu hình Google Apps Script Webhook URL.';
  } else {
    try {
      const payload = {
        secret,
        eventType,
        recipients: cleanRecipients,
        ticket: {
          id: ticket.id,
          code: ticket.code,
          groupLabel: TICKET_GROUP_LABELS[ticket.groupType],
          title: ticket.title,
          statusLabel: TICKET_STATUS_LABELS[ticket.status],
          deadlineText: `${formatVietnamDateTime(ticket.deadline)} (UTC+7)`,
          sku: ticket.sku || '',
          expectedSku: expectedSku || ticket.expectedSku || '',
          productUrl: productUrl || ticket.productUrl || '',
          note: note || '',
          actorName,
          appLink: getTicketDetailHashLink(ticket.id),
        },
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const text = await res.text();
      if (text) {
        const parsed = JSON.parse(text) as { ok?: boolean; error?: string };
        if (parsed.ok === false) {
          throw new Error(parsed.error || 'Apps Script trả về lỗi.');
        }
      }
    } catch (err) {
      status = 'FAILED';
      errorMessage = err instanceof Error ? err.message : 'Lỗi kết nối webhook gửi email.';
    }
  }

  try {
    await addDoc(collection(db, 'emailLogs'), {
      ticketId: ticket.id,
      ticketCode: ticket.code,
      eventType,
      recipients: cleanRecipients,
      status,
      errorMessage: errorMessage || null,
      createdAt: Date.now(),
    });
  } catch {
    // Do not block UI flow if email log write fails
  }

  return { status, errorMessage };
}

export function subscribeTicketEmailLogs(
  ticketId: string,
  callback: (logs: EmailLogEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'emailLogs'),
    where('ticketId', '==', ticketId),
    orderBy('createdAt', 'desc'),
    limit(10)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EmailLogEntry, 'id'>) }));
      callback(items);
    },
    () => callback([])
  );
}
