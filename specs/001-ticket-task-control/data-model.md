# Data Model & State Machines: Joytime Checklist

**Feature**: `001-ticket-task-control` | **Date**: 2026-11-18

## 1. Firestore Collections

### 1.1 `users/{uid}`
| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `uid` | `string` | Yes | Matches Firebase Auth `uid` |
| `email` | `string` | Yes | Lowercase email, unique in Auth |
| `displayName` | `string` | Yes | 2–80 chars |
| `avatarDataUrl` | `string` | No | Preset key, HTTPS URL, or compressed Base64 Data URL (`<= 120KB`) |
| `role` | `'PD' \| 'OM'` | Yes | Defaults to `'OM'` unless valid PD bootstrap/invite applies |
| `createdAt` | `Timestamp` | Yes | Server timestamp |
| `updatedAt` | `Timestamp` | Yes | Server timestamp |

### 1.2 `tickets/{ticketId}`
| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `id` | `string` | Yes | Firestore doc ID |
| `code` | `string` | Yes | Human-readable code: `CS-0001` (Group I), `LS-0001` (Group II), `VP-0001` (Group III) |
| `groupType` | `'EDIT_OLD' \| 'NEW_LISTING' \| 'OFFICE'` | Yes | Immutable after creation |
| `title` | `string` | Yes | 3–200 chars |
| `status` | `TicketStatus` | Yes | Driven strictly by group state machine |
| `deadline` | `Timestamp` | Yes | Required for all 3 groups (UTC+7 display) |
| `createdBy` | `string` | Yes | `uid` of creating `PD` |
| `createdByName` | `string` | Yes | Snapshot of `PD` displayName |
| `createdByEmail` | `string` | Yes | Snapshot of `PD` email (email notification target) |
| `assigneeIds` | `string[]` | Yes | `length === 1` for Group I & II; `length >= 1` for Group III |
| `assigneeSnapshots` | `Record<string, UserSnapshot>` | Yes | `{ displayName, email, avatarDataUrl }` |
| `createdAt` | `Timestamp` | Yes | Server timestamp |
| `updatedAt` | `Timestamp` | Yes | Server timestamp |
| `closedAt` | `Timestamp \| null` | No | Set when transitioning to `CLOSED` |

#### Group-Specific Payload Fields on `tickets/{ticketId}`
- **Group I (`EDIT_OLD` — Chỉnh sửa sản phẩm cũ)**:
  - `sku`: `string` *(Required at creation — SKU sản phẩm cần kiểm tra)*
  - `editRequirements`: `string` *(Required at creation — Yêu cầu chỉnh sửa)*
- **Group II (`NEW_LISTING` — Listing sản phẩm mới)**:
  - `productBasicInfo`: `string` *(Required at creation — Thông tin sản phẩm cơ bản)*
  - `additionalRequirements`: `string` *(Optional at creation — Yêu cầu bổ sung)*
  - `expectedSku`: `string | null` *(Required when OM completes Listing step)*
  - `productUrl`: `string | null` *(Required when OM completes GoLive step; validated URL)*
- **Group III (`OFFICE` — Công việc văn phòng)**:
  - `officeRequirements`: `string` *(Required at creation — Yêu cầu)*
  - `assigneeStates`: `Record<string, { completed: boolean; completedAt: Timestamp | null; note?: string; reworkRequestedAt?: Timestamp | null }>` *(Tracks per-OM completion & targeted rework)*

### 1.3 `tickets/{ticketId}/history/{historyId}` (Immutable Audit Log)
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Auto ID |
| `ticketId` | `string` | Yes | Parent ticket ID |
| `actorId` | `string` | Yes | `uid` of user performing transition |
| `actorName` | `string` | Yes | Snapshot of actor name |
| `actorRole` | `'PD' \| 'OM'` | Yes | Actor role at action time |
| `action` | `HistoryAction` | Yes | `CREATE` \| `OM_COMPLETE` \| `OM_SUBMIT_LISTING` \| `PD_APPROVE_GOLIVE` \| `OM_SUBMIT_GOLIVE` \| `PD_REJECT_REWORK` \| `PD_CLOSE` \| `OM_CHECK_PARTIAL` |
| `fromStatus` | `TicketStatus \| null` | Yes | `null` on `CREATE` |
| `toStatus` | `TicketStatus` | Yes | Resulting status |
| `note` | `string` | No | Reason for rework or completion note |
| `metadata` | `object` | No | `{ expectedSku?, productUrl?, reworkTargetUids?, reworkTargetNames?, completedCount?, totalCount? }` |
| `createdAt` | `Timestamp` | Yes | Server timestamp |

### 1.3a `tickets/{ticketId}/attachments/{attachmentId}`
| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | Yes | Original filename |
| `mimeType` | `string` | Yes | Image (`image/*`) or Document (`PDF`, `.doc/.docx`, `.xls/.xlsx/.csv`) |
| `sizeBytes` | `number` | Yes | Max `5MB` (`5 * 1024 * 1024` bytes) |
| `storageType` | `'r2' \| 'inline'` | Yes | Stored on Cloudflare R2 (`checklist-portal`) |
| `r2Key` | `string` | No | Object key on R2 (`tickets/{ticketId}/...`) |
| `url` | `string` | No | R2 endpoint or Cloudflare Worker URL |
| `createdAt` | `number` | Yes | Timestamp |

### 1.4 `config/app` & `config/secrets`
- `config/app` (readable by authenticated users & during registration check if needed via minimal public/auth rule):
  - `counters`: `{ EDIT_OLD: number, NEW_LISTING: number, OFFICE: number }`
  - `bootstrapPdEmails`: `string[]` (emails automatically granted `PD` on first registration)
  - `hasPdInviteCode`: `boolean`
  - `gasWebhookUrl`: `string` (Google Apps Script Web App URL)
- `config/secrets` (readable only by authenticated users or PD/OM for email dispatch):
  - `pdInviteCode`: `string` (checked during registration or stored hashed)
  - `gasSharedSecret`: `string`

### 1.5 `emailLogs/{logId}`
| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | `string` | Yes | Auto ID |
| `ticketId` | `string` | Yes | Reference ticket |
| `ticketCode` | `string` | Yes | Display code |
| `eventType` | `string` | Yes | `TICKET_CREATED` \| `OM_COMPLETED` \| `GOLIVE_APPROVED` \| `GOLIVE_SUBMITTED` \| `REWORK_REQUESTED` \| `TICKET_CLOSED` |
| `recipients` | `string[]` | Yes | Recipient email list |
| `status` | `'SENT' \| 'FAILED'` | Yes | Delivery result |
| `errorMessage` | `string \| null` | No | Error detail if failed |
| `createdAt` | `Timestamp` | Yes | Timestamp |

---

## 2. Deterministic State Machines

### 2.1 Group I — `EDIT_OLD` (`Chỉnh sửa sản phẩm cũ`)
| Current Status | Action | Allowed Role | Validation | Next Status | Email Trigger |
|---|---|---|---|---|---|
| *(new)* | `CREATE` | `PD` | `title`, `sku`, `editRequirements`, `deadline`, `assigneeIds[0]` | `WAITING_OM` | To `OM` (`TICKET_CREATED`) |
| `WAITING_OM` | `OM_COMPLETE` | Assigned `OM` | Optional `note` | `PENDING_PD_CHECK` | To `PD` (`OM_COMPLETED`) |
| `PENDING_PD_CHECK` | `PD_REJECT_REWORK` | `PD` | Required `note` (lý do làm lại) | `WAITING_OM` | To `OM` (`REWORK_REQUESTED`) |
| `PENDING_PD_CHECK` | `PD_CLOSE` | `PD` | Optional `note` | `CLOSED` | Optional / none (`TICKET_CLOSED` logged) |

### 2.2 Group II — `NEW_LISTING` (`Listing sản phẩm mới`)
| Current Status | Action | Allowed Role | Validation | Next Status | Email Trigger |
|---|---|---|---|---|---|
| *(new)* | `CREATE` | `PD` | `title`, `productBasicInfo`, `deadline`, `assigneeIds[0]` | `WAITING_LISTING` | To `OM` (`TICKET_CREATED`) |
| `WAITING_LISTING` | `OM_SUBMIT_LISTING` | Assigned `OM` | Required `expectedSku` | `PENDING_GOLIVE_APPROVAL` | To `PD` (`OM_COMPLETED`) |
| `PENDING_GOLIVE_APPROVAL` | `PD_REJECT_REWORK` | `PD` | Required `note` | `WAITING_LISTING` | To `OM` (`REWORK_REQUESTED`) |
| `PENDING_GOLIVE_APPROVAL` | `PD_APPROVE_GOLIVE` | `PD` | Optional `note` | `WAITING_GOLIVE` | To `OM` (`GOLIVE_APPROVED`) |
| `WAITING_GOLIVE` | `OM_SUBMIT_GOLIVE` | Assigned `OM` | Required valid `productUrl` (`http/https`) | `PENDING_CLOSE` | To `PD` (`GOLIVE_SUBMITTED`) |
| `PENDING_CLOSE` | `PD_REJECT_REWORK` | `PD` | Required `note` (quay lại bước sau listing = `WAITING_GOLIVE`) | `WAITING_GOLIVE` | To `OM` (`REWORK_REQUESTED`) |
| `PENDING_CLOSE` | `PD_CLOSE` | `PD` | Optional `note` | `CLOSED` | Optional / none (`TICKET_CLOSED` logged) |

### 2.3 Group III — `OFFICE` (`Công việc văn phòng`)
| Current Status | Action | Allowed Role | Validation | Next Status | Email Trigger |
|---|---|---|---|---|---|
| *(new)* | `CREATE` | `PD` | `title`, `officeRequirements`, `deadline`, `assigneeIds.length >= 1` | `WAITING_OM` | To all `N` OMs (`TICKET_CREATED`) |
| `WAITING_OM` | `OM_CHECK_PARTIAL` | Assigned `OM` (not yet done) | Transaction updates `assigneeStates[uid].completed = true`; checks if `k < N` | `WAITING_OM` | None (progress `k/N`) |
| `WAITING_OM` | `OM_COMPLETE` | Last pending `OM` (`k === N`) | Transaction sets `completed = true`; all `N` done | `PENDING_PD_CHECK` | To `PD` (`OM_COMPLETED`) |
| `PENDING_PD_CHECK` | `PD_REJECT_REWORK` | `PD` | Required `reworkTargetUids.length >= 1` & `note`; resets ONLY selected `uid`s to `completed: false` | `WAITING_OM` | To ONLY `reworkTargetUids` (`REWORK_REQUESTED`) |
| `PENDING_PD_CHECK` | `PD_CLOSE` | `PD` | Optional `note` | `CLOSED` | Optional / none (`TICKET_CLOSED` logged) |

---

## 3. Overdue Rule (All 3 Groups)
```text
isOverdue(ticket, now) = ticket.status !== 'CLOSED' && ticket.deadline.toMillis() < now
```
- Displayed with Warning styling (`#FEF3C7` background, `#92400E` text, `#F59E0B` border, `AlertTriangle` icon) across Dashboard KPIs, Ticket List, Ticket Detail banner, and Filter chips.
