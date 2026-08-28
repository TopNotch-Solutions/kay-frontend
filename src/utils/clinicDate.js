/** Namibia / CAT — matches backend followUpReminderService clinic calendar. */
const CLINIC_TZ = 'Africa/Windhoek';

/** Today's calendar date in clinic timezone (YYYY-MM-DD). */
export function todayInClinicTz(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/** Earliest allowed follow-up date: day after clinic today. */
export function minFollowUpDateInClinicTz(now = new Date()) {
  const today = todayInClinicTz(now);
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const ny = dt.getUTCFullYear();
  const nm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const nd = String(dt.getUTCDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

/** Follow-up date must be strictly after today's clinic calendar date. */
export function isFollowUpDateInFuture(dateStr, now = new Date()) {
  const date = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date > todayInClinicTz(now);
}
