/**
 * Date helpers for local timezone date handling.
 * POS systems operate in the local business timezone, not UTC.
 * Replaces toISOString() patterns which produce UTC dates/timestamps.
 */

/**
 * Get YYYY-MM-DD string in local timezone.
 * Replaces `date.toISOString().split('T')[0]` which gives UTC date.
 */
export function toLocalDateStr(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse a stored YYYY-MM-DD string as local midnight.
 *
 * `new Date('2026-07-27')` is parsed as UTC midnight, so comparing it against a
 * locally-derived "today" is off by the UTC offset — in UTC+8 that is enough to
 * report an extra day remaining and to misjudge the expired/not-expired
 * boundary. Anything comparing a date-only column against today must go
 * through here.
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year || 0, (month || 1) - 1, day || 1)
}

/**
 * Whole days from local today to a stored YYYY-MM-DD date.
 * Negative when the date is in the past, 0 when it is today.
 */
export function daysFromToday(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseLocalDate(dateStr)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Get local ISO timestamp string (without Z suffix).
 * Replaces `new Date().toISOString()` for database storage.
 */
export function toLocalTimestamp(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`
}
