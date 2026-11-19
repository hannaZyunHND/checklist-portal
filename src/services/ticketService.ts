import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  computeTransitionResult,
  getGroupPrefix,
  getInitialStatusForCreation,
  validateCreateTicketInput,
} from '../domain/ticketStateMachine';
import type {
  AssigneeProgressState,
  CreateTicketInput,
  EmailEventType,
  Ticket,
  TicketAction,
  TicketAttachment,
  TicketHistoryEntry,
  TransitionPayload,
} from '../types/ticket';
import type { UserProfile, UserSnapshot } from '../types/user';
import { dispatchTicketEmail, type AppEmailConfig, type EmailDispatchResult } from './emailService';
import { deleteFileFromR2, uploadFileToR2 } from './r2Service';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function buildSnapshots(
  assigneeIds: string[],
  users: UserProfile[],
  fallbackUser?: UserProfile
): Record<string, UserSnapshot> {
  const map: Record<string, UserSnapshot> = {};
  for (const uid of assigneeIds) {
    const found =
      users.find((u) => u.uid === uid) ||
      (fallbackUser && fallbackUser.uid === uid ? fallbackUser : undefined);
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
  _currentUser: UserProfile,
  callback: (tickets: Ticket[]) => void,
  onError?: (msg: string) => void
): () => void {
  const q = query(collection(db, 'tickets'), orderBy('updatedAt', 'desc'));

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
  creatorUser: UserProfile,
  allUsers: UserProfile[]
): Promise<{ ticket: Ticket; emailResult: EmailDispatchResult }> {
  const validation = validateCreateTicketInput(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors)[0] || 'Thông tin ticket chưa hợp lệ.');
  }

  const now = Date.now();
  const initialStatus = getInitialStatusForCreation(input);
  const isAutoPassListing = input.groupType === 'NEW_LISTING' && Boolean(input.autoPassListing);

  const findUser = (uid?: string): UserProfile | undefined => {
    if (!uid) return undefined;
    return allUsers.find((u) => u.uid === uid) || (creatorUser.uid === uid ? creatorUser : undefined);
  };

  const reviewerUser = findUser(input.reviewerId) || creatorUser;
  const listingUser =
    input.groupType === 'NEW_LISTING'
      ? isAutoPassListing
        ? creatorUser
        : findUser(input.listingAssigneeId) || findUser(input.assigneeIds[0]) || creatorUser
      : undefined;
  const goliveUser =
    input.groupType === 'NEW_LISTING'
      ? findUser(input.goliveAssigneeId) || findUser(input.assigneeIds[0]) || creatorUser
      : undefined;

  const effectiveAssigneeIds: string[] =
    input.groupType === 'EDIT_OLD'
      ? [creatorUser.uid]
      : input.groupType === 'NEW_LISTING'
      ? Array.from(
          new Set([listingUser?.uid, goliveUser?.uid].filter((id): id is string => Boolean(id)))
        )
      : input.assigneeIds;

  const snapshots = buildSnapshots(effectiveAssigneeIds, allUsers, creatorUser);

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

    const expectedSkuVal = input.expectedSku?.trim() || null;
    const productUrlVal = input.productUrl?.trim() || null;

    const docData: Omit<Ticket, 'id'> = {
      code,
      groupType: input.groupType,
      title: input.title.trim(),
      status: initialStatus,
      deadline: input.deadline,
      createdBy: creatorUser.uid,
      createdByName: creatorUser.displayName,
      createdByEmail: creatorUser.email,
      reviewerId: reviewerUser.uid,
      reviewerName: reviewerUser.displayName,
      reviewerEmail: reviewerUser.email,
      ...(input.groupType === 'NEW_LISTING'
        ? {
            listingAssigneeId: listingUser?.uid || null,
            listingAssigneeName: listingUser?.displayName || null,
            listingAssigneeEmail: listingUser?.email || null,
            goliveAssigneeId: goliveUser?.uid || null,
            goliveAssigneeName: goliveUser?.displayName || null,
            goliveAssigneeEmail: goliveUser?.email || null,
          }
        : {}),
      assigneeIds: effectiveAssigneeIds,
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
            expectedSku: expectedSkuVal,
            productUrl: productUrlVal,
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
    tx.set(ticketRef, stripUndefinedDeep(docData));

    const baseNote = isAutoPassListing
      ? `Tạo Listing & chuyển thẳng sang người kiểm tra (${reviewerUser.displayName})`
      : 'Khởi tạo và giao ticket';

    tx.set(
      historyRef,
      stripUndefinedDeep({
        ticketId: ticketRef.id,
        actorId: creatorUser.uid,
        actorName: creatorUser.displayName,
        actorRole: creatorUser.role,
        action: 'CREATE',
        fromStatus: null,
        toStatus: initialStatus,
        note:
          uploadedAttachments.length > 0
            ? `${baseNote} (đính kèm ${uploadedAttachments.length} tệp)`
            : baseNote,
        ...(isAutoPassListing
          ? {
              metadata: {
                ...(expectedSkuVal ? { expectedSku: expectedSkuVal } : {}),
                ...(productUrlVal ? { productUrl: productUrlVal } : {}),
              },
            }
          : {}),
        createdAt: now,
      })
    );

    uploadedAttachments.forEach((att, idx) => {
      const attRef = doc(collection(db, 'tickets', ticketRef.id, 'attachments'));
      tx.set(
        attRef,
        stripUndefinedDeep({
          ...att,
          createdAt: now + idx,
        })
      );
    });

    createdTicket = { id: ticketRef.id, ...docData };
  });

  const recipients: string[] =
    isAutoPassListing
      ? [reviewerUser.email]
      : input.groupType === 'NEW_LISTING'
      ? listingUser?.email
        ? [listingUser.email]
        : []
      : effectiveAssigneeIds
          .map((uid) => snapshots[uid]?.email)
          .filter((e): e is string => Boolean(e));

  const eventType: EmailEventType = isAutoPassListing ? 'OM_COMPLETED' : 'TICKET_CREATED';
  const overrideConfig = await readAppEmailConfig();
  const emailResult = await dispatchTicketEmail({
    ticket: createdTicket,
    eventType,
    recipients,
    actorName: creatorUser.displayName,
    expectedSku: createdTicket.expectedSku || undefined,
    productUrl: createdTicket.productUrl || undefined,
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

    tx.update(ticketRef, stripUndefinedDeep(result.ticketPatch));
    tx.set(
      historyRef,
      stripUndefinedDeep({
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
      })
    );

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
      actorName: actor.displayName,
      note: emailPlan.note,
      expectedSku: emailPlan.expectedSku,
      productUrl: emailPlan.productUrl,
      overrideConfig,
    });
  }

  return { nextTicket: updatedTicket, emailResult };
}

export async function deleteTicket(ticketId: string, actor: UserProfile): Promise<void> {
  const ticketRef = doc(db, 'tickets', ticketId);
  const ticketSnap = await getDoc(ticketRef);
  if (!ticketSnap.exists()) {
    throw new Error('Ticket không tồn tại hoặc đã bị xóa.');
  }

  const ticketData = ticketSnap.data() as Omit<Ticket, 'id'>;
  if (ticketData.createdBy !== actor.uid) {
    throw new Error('Chỉ tài khoản đã tạo ticket này mới có quyền xóa.');
  }

  const [historySnap, attachmentsSnap] = await Promise.all([
    getDocs(collection(db, 'tickets', ticketId, 'history')),
    getDocs(collection(db, 'tickets', ticketId, 'attachments')),
  ]);

  const r2Keys = attachmentsSnap.docs
    .map((d) => (d.data() as { r2Key?: string }).r2Key)
    .filter((k): k is string => Boolean(k));

  const refsToDelete = [
    ...historySnap.docs.map((d) => d.ref),
    ...attachmentsSnap.docs.map((d) => d.ref),
    ticketRef,
  ];

  for (let i = 0; i < refsToDelete.length; i += 450) {
    const batch = writeBatch(db);
    for (const ref of refsToDelete.slice(i, i + 450)) {
      batch.delete(ref);
    }
    await batch.commit();
  }

  await Promise.all(r2Keys.map((key) => deleteFileFromR2(key)));
}
