const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function formatVietnamDateTime(ms: number, includeSeconds = false): string {
  if (!ms || Number.isNaN(ms)) return '—';
  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  });
  return formatter.format(new Date(ms));
}

export function toDatetimeLocalValue(ms: number): string {
  const date = new Date(ms);
  // Format in Asia/Ho_Chi_Minh (UTC+7) for <input type="datetime-local">
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

export function parseDatetimeLocalVietnam(value: string): number {
  if (!value) return NaN;
  // Treat input value as UTC+7 explicitly
  const iso = value.length === 16 ? `${value}:00+07:00` : `${value}+07:00`;
  return new Date(iso).getTime();
}

export function formatOverdueDuration(deadlineMs: number, nowMs = Date.now()): string {
  const diffMs = Math.max(0, nowMs - deadlineMs);
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `Quá hạn ${days} ngày ${hours} giờ` : `Quá hạn ${days} ngày`;
  }
  if (hours > 0) {
    return mins > 0 ? `Quá hạn ${hours} giờ ${mins} phút` : `Quá hạn ${hours} giờ`;
  }
  return `Quá hạn ${Math.max(1, mins)} phút`;
}
