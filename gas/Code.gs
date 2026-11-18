/**
 * Google Apps Script Web App — Joytime Checklist Email Notifier
 *
 * Hướng dẫn deploy (Miễn phí):
 * 1. Mở https://script.google.com -> Tạo project mới.
 * 2. Dán toàn bộ code này vào Code.gs.
 * 3. Sửa SHARED_SECRET trùng với VITE_GAS_SECRET trong file .env / GitHub Secrets.
 * 4. Nhấn Deploy -> New deployment -> Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy Web App URL (dạng https://script.google.com/macros/s/.../exec) vào VITE_GAS_WEBHOOK_URL.
 */

const SHARED_SECRET = 'joytime-secret-change-me';

function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    if (data.secret !== SHARED_SECRET) {
      return jsonResponse({ ok: false, error: 'Unauthorized: invalid secret' });
    }

    const recipients = Array.isArray(data.recipients)
      ? data.recipients.map(function (r) { return String(r || '').trim(); }).filter(Boolean)
      : [];

    if (recipients.length === 0) {
      return jsonResponse({ ok: false, error: 'No valid recipients' });
    }

    const ticket = data.ticket || {};
    const eventType = String(data.eventType || 'NOTIFICATION');
    const subject = '[Joytime Checklist][' + (ticket.code || 'TASK') + '] ' + getEventHeadline(eventType) + ': ' + (ticket.title || '');
    const htmlBody = buildEmailHtml(eventType, ticket);

    MailApp.sendEmail({
      to: recipients.join(','),
      subject: subject,
      htmlBody: htmlBody,
    });

    return jsonResponse({
      ok: true,
      sentTo: recipients,
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function getEventHeadline(eventType) {
  switch (eventType) {
    case 'TICKET_CREATED':
      return 'Ticket mới được giao';
    case 'OM_COMPLETED':
      return 'OM đã hoàn thành — Chờ PD kiểm tra';
    case 'GOLIVE_APPROVED':
      return 'PD đã duyệt GoLive sản phẩm';
    case 'GOLIVE_SUBMITTED':
      return 'OM đã điền URL GoLive — Chờ PD đóng ticket';
    case 'REWORK_REQUESTED':
      return 'Yêu cầu làm lại ticket';
    default:
      return 'Cập nhật trạng thái ticket';
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml(eventType, ticket) {
  const headline = getEventHeadline(eventType);
  const accentColor = eventType === 'REWORK_REQUESTED' ? '#DC2626' : (eventType === 'GOLIVE_APPROVED' ? '#EA580C' : '#0D9488');

  let extraRows = '';
  if (ticket.sku) {
    extraRows += '<tr><td style="padding:6px 0;color:#475569;width:140px;">SKU:</td><td style="padding:6px 0;font-weight:600;">' + escapeHtml(ticket.sku) + '</td></tr>';
  }
  if (ticket.expectedSku) {
    extraRows += '<tr><td style="padding:6px 0;color:#475569;">SKU dự kiến:</td><td style="padding:6px 0;font-weight:600;">' + escapeHtml(ticket.expectedSku) + '</td></tr>';
  }
  if (ticket.productUrl) {
    extraRows += '<tr><td style="padding:6px 0;color:#475569;">URL sản phẩm:</td><td style="padding:6px 0;"><a href="' + escapeHtml(ticket.productUrl) + '">' + escapeHtml(ticket.productUrl) + '</a></td></tr>';
  }
  if (ticket.note) {
    extraRows += '<tr><td style="padding:6px 0;color:#475569;vertical-align:top;">Ghi chú / Lý do:</td><td style="padding:6px 0;color:#0F172A;">' + escapeHtml(ticket.note) + '</td></tr>';
  }

  const ctaHtml = ticket.appLink
    ? '<p style="margin-top:20px;"><a href="' + escapeHtml(ticket.appLink) + '" style="display:inline-block;padding:10px 18px;background:' + accentColor + ';color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Mở Ticket trên App</a></p>'
    : '';

  return (
    '<div style="font-family:Arial,sans-serif;background:#F8FAFC;padding:24px;">' +
      '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">' +
        '<div style="background:' + accentColor + ';color:#FFFFFF;padding:16px 20px;">' +
          '<div style="font-size:12px;opacity:0.9;">JOYTIME CHECKLIST</div>' +
          '<h2 style="margin:4px 0 0;font-size:18px;">' + escapeHtml(headline) + '</h2>' +
        '</div>' +
        '<div style="padding:20px;color:#0F172A;font-size:14px;line-height:1.5;">' +
          '<table style="width:100%;border-collapse:collapse;">' +
            '<tr><td style="padding:6px 0;color:#475569;width:140px;">Mã Ticket:</td><td style="padding:6px 0;font-weight:700;">' + escapeHtml(ticket.code) + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#475569;">Nhóm việc:</td><td style="padding:6px 0;">' + escapeHtml(ticket.groupLabel) + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#475569;">Tiêu đề:</td><td style="padding:6px 0;font-weight:600;">' + escapeHtml(ticket.title) + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#475569;">Trạng thái mới:</td><td style="padding:6px 0;font-weight:600;">' + escapeHtml(ticket.statusLabel) + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#475569;">Deadline:</td><td style="padding:6px 0;">' + escapeHtml(ticket.deadlineText) + '</td></tr>' +
            '<tr><td style="padding:6px 0;color:#475569;">Người thao tác:</td><td style="padding:6px 0;">' + escapeHtml(ticket.actorName) + '</td></tr>' +
            extraRows +
          '</table>' +
          ctaHtml +
        '</div>' +
      '</div>' +
    '</div>'
  );
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
