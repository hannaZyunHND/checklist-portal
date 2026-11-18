import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  computeTransitionResult,
  getGroupPrefix,
  getInitialStatusForGroup,
  validateCreateTicketInput,
} from '../domain/ticketStateMachine';
import type {
  AssigneeProgressState,
  CreateTicketInput,
  Ticket,
  TicketAction,
  TicketAttachment,
  TicketHistoryEntry,
  TransitionPayload,
} from '../types/ticket';
import type { UserProfile, UserSnapshot } from '../types/user';
import { dispatchTicketEmail, type AppEmailConfig, type EmailDispatchResult } from './emailService';
import { uploadFileToR2 } from './r2Service';

function buildSnapshots(assigneeIds: string[], users: UserProfile[]): Record<string, UserSnapshot> {
  const map: Record<string, UserSnapshot> = {};
  for (const uid of assigneeIds) {
    const found = users.find((u) => u.uid === uid);
    if (found) {
      map[uid] = {
        uid: found.uid,
        displayName: found.displayName,
        email: found.email,
        avatarDataUrl: found.avatarDataUrl || '',
      };
    }
  }
  return map;
}

async function readAppEmailConfig(): Promise<AppEmailConfig> {
  try {
    const snap = await getDoc(doc(db, 'config', 'app'));
    if (snap.exists()) {
      const data = snap.data() as { gasWebhookUrl?: string; gasSharedSecret?: string };
      return {
        gasWebhookUrl: data.gasWebhookUrl,
        gasSharedSecret: data.gasSharedSecret,
      };
    }
  } catch {
    // Fall back to env vars
  }
  return {};
}

export function subscribeVisibleTickets(
  currentUser: UserProfile,
  callback: (tickets: Ticket[]) => void,
  onError?: (msg: string) => void
): () => void {
  const baseRef = collection(db, 'tickets');
  const q =
    currentUser.role === 'PD'
      ? query(baseRef, orderBy('updatedAt', 'desc'))
      : query(
          baseRef,
          where('assigneeIds', 'array-contains', currentUser.uid),
          orderBy('updatedAt', 'desc')
        );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ticket, 'id'>) }));
      callback(list);
    },
    (err) => {
      if (onError) onError(err.message);
      callback([]);
    }
  );
}

export function subscribeTicketDetail(
  ticketId: string,
  callback: (ticket: Ticket | null) => void,
  onError?: (msg: string) => void
): () => void {
  return onSnapshot(
    doc(db, 'tickets', ticketId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ id: snap.id, ...(snap.data() as Omit<Ticket, 'id'>) });
    },
    (err) => {
      if (onError) onError(err.message);
      callback(null);
    }
  );
}

export function subscribeTicketHistory(
  ticketId: string,
  callback: (entries: TicketHistoryEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'tickets', ticketId, 'history'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TicketHistoryEntry, 'id'>),
      }));
      callback(items);
    },
    () => callback([])
  );
}

export function subscribeTicketAttachments(
  ticketId: string,
  callback: (attachments: TicketAttachment[]) => void
): () => void {
  const q = query(
    collection(db, 'tickets', ticketId, 'attachments'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TicketAttachment, 'id'>),
      }));
      callback(items);
    },
    () => callback([])
  );
}

export async function createTicket(
  input: CreateTicketInput,
  pdUser: UserProfile,
  allUsers: UserProfile[]
): Promise<{ ticket: Ticket; emailResult: EmailDispatchResult }> {
  if (pdUser.role !== 'PD') {
    throw new Error('Chỉ tài khoản PD mới có quyền tạo ticket.');
  }

  const validation = validateCreateTicketInput(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Thông tin ticket chưa hợp lệ.');
  }

  const now = Date.now();
  const initialStatus = getInitialStatusForGroup(input.groupType);
  const snapshots = buildSnapshots(input.assigneeIds, allUsers);
  const ticketRef = doc(collection(db, 'tickets'));
  const counterRef = doc(db, 'config', 'counters');
  const historyRef = doc(collection(db, 'tickets', ticketRef.id, 'history'));

  const draftAttachments = input.attachments || [];
  const uploadedAttachments: Array<{
    name: string;
    mimeType: string;
    sizeBytes: number;
    storageType: 'r2' | 'inline';
    r2Key?: string;
    url?: string;
    dataUrl?: string;
  }> = [];

  for (const att of draftAttachments) {
    if (att.file) {
      const { r2Key, url } = await uploadFileToR2(att.file, ticketRef.id);
      uploadedAttachments.push({
        name: att.name,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        storageType: 'r2',
        r2Key,
        url,
      });
    } else if (att.dataUrl) {
      uploadedAttachments.push({
        name: att.name,
        mimeType: att.mimeType || 'image/jpeg',
        sizeBytes: att.sizeBytes,
        storageType: 'inline',
        dataUrl: att.dataUrl,
      });
    }
  }

  let createdTicket!: Ticket;

  await runTransaction(db, async (tx) => {
    const counterSnap = await tx.get(counterRef);
    const counters = counterSnap.exists()
      ? (counterSnap.data() as Record<string, number>)
      : { EDIT_OLD: 0, NEW_LISTING: 0, OFFICE: 0 };

    const nextNum = (counters[input.groupType] || 0) + 1;
    const code = `${getGroupPrefix(input.groupType)}-${String(nextNum).padStart(4, '0')}`;

    const officeStates: Record<string, AssigneeProgressState> | undefined =
      input.groupType === 'OFFICE'
        ? Object.fromEntries(
            input.assigneeIds.map((uid) => [uid, { completed: false, completedAt: null }])
          )
        : undefined;

    const docData: Omit<Ticket, 'id'> = {
      code,
      groupType: input.groupType,
      title: input.title.trim(),
      status: initialStatus,
      deadline: input.deadline,
      createdBy: pdUser.uid,
      createdByName: pdUser.displayName,
      createdByEmail: pdUser.email,
      assigneeIds: input.assigneeIds,
      assigneeSnapshots: snapshots,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
      attachmentCount: uploadedAttachments.length,
      ...(input.groupType === 'EDIT_OLD'
        ? {
            sku: input.sku!.trim(),
            editRequirements: input.editRequirements!.trim(),
          }
        : {}),
      ...(input.groupType === 'NEW_LISTING'
        ? {
            productBasicInfo: input.productBasicInfo!.trim(),
            additionalRequirements: input.additionalRequirements?.trim() || '',
            expectedSku: null,
            productUrl: null,
          }
        : {}),
      ...(input.groupType === 'OFFICE'
        ? {
            officeRequirements: input.officeRequirements!.trim(),
            assigneeStates: officeStates,
          }
        : {}),
    };

    tx.set(counterRef, { ...counters, [input.groupType]: nextNum }, { merge: true });
    tx.set(ticketRef, docData);
    tx.set(historyRef, {
      ticketId: ticketRef.id,
      actorId: pdUser.uid,
      actorName: pdUser.displayName,
      actorRole: pdUser.role,
      action: 'CREATE',
      fromStatus: null,
      toStatus: initialStatus,
      note:
        uploadedAttachments.length > 0
          ? `Khởi tạo và giao ticket (đính kèm ${uploadedAttachments.length} tệp)`
          : 'Khởi tạo và giao ticket',
      createdAt: now,
    });

    uploadedAttachments.forEach((att, idx) => {
      const attRef = doc(collection(db, 'tickets', ticketRef.id, 'attachments'));
      tx.set(attRef, {
        ...att,
        createdAt: now + idx,
      });
    });

    createdTicket = { id: ticketRef.id, ...docData };
  });

  const recipients = input.assigneeIds
    .map((uid) => snapshots[uid]?.email)
    .filter((e): e is string => Boolean(e));

  const overrideConfig = await readAppEmailConfig();
  const emailResult = await dispatchTicketEmail({
    ticket: createdTicket,
    eventType: 'TICKET_CREATED',
    recipients,
    actorName: `${pdUser.displayName} (PD)`,
    overrideConfig,
  });

  return { ticket: createdTicket, emailResult };
}

export async function performTicketTransition(params: {
  ticketId: string;
  actor: UserProfile;
  action: TicketAction;
  payload?: TransitionPayload;
}): Promise<{ nextTicket: Ticket; emailResult: EmailDispatchResult | null }> {
  const { ticketId, actor, action, payload = {} } = params;
  const ticketRef = doc(db, 'tickets', ticketId);
  const historyRef = doc(collection(db, 'tickets', ticketId, 'history'));

  const { updatedTicket, emailPlan } = await runTransaction(db, async (tx) => {
    const snap = await tx.get(ticketRef);
    if (!snap.exists()) {
      throw new Error('Ticket không tồn tại hoặc đã bị xóa.');
    }

    const currentTicket = { id: snap.id, ...(snap.data() as Omit<Ticket, 'id'>) };
    const now = Date.now();
    const result = computeTransitionResult(currentTicket, actor, action, payload, now);

    tx.update(ticketRef, result.ticketPatch);
    tx.set(historyRef, {
      ticketId,
      actorId: actor.uid,
      actorName: actor.displayName,
      actorRole: actor.role,
      action: result.historyAction,
      fromStatus: currentTicket.status,
      toStatus: result.nextStatus,
      ...(result.historyNote ? { note: result.historyNote } : {}),
      ...(result.historyMetadata ? { metadata: result.historyMetadata } : {}),
      createdAt: now,
    });

    return {
      updatedTicket: { ...currentTicket, ...result.ticketPatch },
      emailPlan: result.emailPlan,
    };
  });

  let emailResult: EmailDispatchResult | null = null;
  if (emailPlan) {
    const overrideConfig = await readAppEmailConfig();
    emailResult = await dispatchTicketEmail({
      ticket: updatedTicket,
      eventType: emailPlan.eventType,
      recipients: emailPlan.recipients,
      actorName: `${actor.displayName} (${actor.role})`,
      note: emailPlan.note,
      expectedSku: emailPlan.expectedSku,
      productUrl: emailPlan.productUrl,
      overrideConfig,
    });
  }

  return { nextTicket: updatedTicket, emailResult };
}
