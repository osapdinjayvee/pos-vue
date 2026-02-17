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
