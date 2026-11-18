# Interface & Integration Contracts

**Feature**: `001-ticket-task-control` | **Date**: 2026-11-18

## 1. Google Apps Script Email Webhook Contract (`POST`)

Frontend triggers `fetch(gasWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })` right after Firestore commits a transition.

### Request JSON Payload
```json
{
  "secret": "<gasSharedSecret>",
  "eventType": "TICKET_CREATED | OM_COMPLETED | GOLIVE_APPROVED | GOLIVE_SUBMITTED | REWORK_REQUESTED",
  "recipients": ["om1@company.com"],
  "ticket": {
    "id": "abc123",
    "code": "LS-0004",
    "groupLabel": "Listing sản phẩm mới",
    "title": "Listing sản phẩm Bình giữ nhiệt 500ml",
    "statusLabel": "Chờ OM GoLive",
    "deadlineText": "20/11/2026 17:00 (UTC+7)",
    "sku": "SKU-DU-KIEN-01",
    "productUrl": "https://...",
    "note": "Vui lòng cập nhật lại ảnh bìa",
    "actorName": "Minh (PD)",
    "appLink": "https://<username>.github.io/<repo>/#/tickets/abc123"
  }
}
```

### Expected Response JSON
```json
{
  "ok": true,
  "sentTo": ["om1@company.com"],
  "sentAt": "2026-11-18T04:15:00.000Z"
}
```
*(Or `{ "ok": false, "error": "..." }` — caught gracefully by client and logged to `emailLogs`.)*

### Reference `Code.gs` Handler (to deploy in Google Apps Script)
```javascript
const SHARED_SECRET = 'CHANGE_ME_SECRET';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    if (data.secret !== SHARED_SECRET) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }
    const recipients = (data.recipients || []).filter(Boolean);
    if (recipients.length === 0) {
      return jsonOut({ ok: false, error: 'No recipients' });
    }
    const t = data.ticket || {};
    const subject = `[Joytime Checklist][${t.code}] ${buildSubjectPrefix(data.eventType)}: ${t.title}`;
    const htmlBody = buildHtmlBody(data.eventType, t);

    MailApp.sendEmail({
      to: recipients.join(','),
      subject: subject,
      htmlBody: htmlBody
    });

    return jsonOut({ ok: true, sentTo: recipients, sentAt: new Date().toISOString() });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 2. Firestore Security Rules Contract (`firestore.rules`)

Core invariants enforced on Firestore:
1. **Unauthenticated users**: Zero read/write access to `users`, `tickets`, `history`, `emailLogs`.
2. **`users/{uid}`**:
   - Any signed-in user can `read` user directory (needed for `PD` assignee picker & avatar/name display).
   - User can `create` their own profile (`request.auth.uid == uid`), with `role == 'OM'` unless email is in `config/app.bootstrapPdEmails` or matches `pdInviteCode` rule.
   - User can `update` their own `displayName`, `avatarDataUrl`, `updatedAt` **without changing `role`**.
   - Only an existing `PD` can update `role` on any user document.
3. **`tickets/{ticketId}`**:
   - `PD` can `read`, `create`, `update`.
   - `OM` can `read` ONLY when `request.auth.uid in resource.data.assigneeIds`.
   - `OM` can `update` ONLY when `request.auth.uid in resource.data.assigneeIds`, cannot mutate `createdBy`, `groupType`, `assigneeIds`, `deadline`, and cannot set `status == 'CLOSED'`.
4. **`tickets/{ticketId}/history/{historyId}`**:
   - Append-only (`allow create` for authorized actor; `allow update, delete: if false` so history is immutable).

---

## 3. Domain Service Contract (`src/services/ticketTransitions.ts`)

Pure TypeScript transition engine (100% unit-testable without Firebase network):
- `getAvailableActions(ticket, currentUser): TicketAction[]`
- `validateTransition(ticket, actor, action, payload): { valid: boolean; errors: Record<string, string> }`
- `computeTransitionResult(ticket, actor, action, payload, now): { nextTicketPatch, historyEntry, emailEvent }`
- `isTicketOverdue(ticket, nowMs): boolean`
- `computeStatistics(tickets, users, currentUser, nowMs): StatsSummary`
