/**
 * Report Formatting Utilities
 * Functions for formatting report data for display and export
 */

// =====================
// Currency Formatting
// =====================

/**
 * Format amount as Philippine Peso
 */
export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Format amount without currency symbol (for tables)
 */
export function formatAmount(amount: number): string {
  return amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/**
 * Format amount for CSV export (no commas)
 */
export function formatAmountForCSV(amount: number): string {
  return amount.toFixed(2)
}

// =====================
// Number Formatting
// =====================

/**
 * Format integer with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-PH')
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format percentage from decimal (0.12 -> 12.0%)
 */
export function formatPercentFromDecimal(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// =====================
// Date/Time Formatting
// =====================

/**
 * Format date for display (long format)
 */
export function formatDateLong(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-PH', { dateStyle: 'long' })
}

/**
 * Format date for display (medium format)
 */
export function formatDateMedium(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-PH', { dateStyle: 'medium' })
}

/**
 * Format date for display (short format)
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-PH', { dateStyle: 'short' })
}

/**
 * Format time for display
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-PH', { timeStyle: 'short' })
}

/**
 * Format date and time together
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

/**
 * Format date for ISO (YYYY-MM-DD)
 */
export function formatDateISO(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Format date range for display
 */
export function formatDateRange(start: string | Date, end: string | Date): string {
  const startStr = formatDateMedium(start)
  const endStr = formatDateMedium(end)

  if (startStr === endStr) {
    return startStr
  }

  return `${startStr} - ${endStr}`
}

/**
 * Format hour for display (e.g., "2:00 PM")
 */
export function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:00 ${period}`
}

// =====================
// OR Number Formatting
// =====================

/**
 * Format OR number with prefix
 */
export function formatORNumber(orNumber: string, prefix: string = 'OR-'): string {
  if (!orNumber) return '-'
  if (orNumber.startsWith(prefix)) return orNumber
  return `${prefix}${orNumber}`
}

/**
 * Format OR range for display
 */
export function formatORRange(beginningOR: string, endingOR: string): string {
  if (!beginningOR && !endingOR) return 'No transactions'
  if (beginningOR === endingOR) return formatORNumber(beginningOR)
  return `${formatORNumber(beginningOR)} to ${formatORNumber(endingOR)}`
}

// =====================
// Counter Formatting
// =====================

/**
 * Format Z-counter with leading zeros
 */
export function formatZCounter(counter: number, digits: number = 6): string {
  return `Z-${counter.toString().padStart(digits, '0')}`
}

/**
 * Format X-counter with leading zeros
 */
export function formatXCounter(counter: number, digits: number = 6): string {
  return `X-${counter.toString().padStart(digits, '0')}`
}

// =====================
// Status Formatting
// =====================

/**
 * Get sync status label
 */
export function getSyncStatusLabel(status: 'synced' | 'pending' | 'offline' | 'complete' | 'partial'): string {
  const labels: Record<string, string> = {
    synced: 'Synced',
    pending: 'Pending Sync',
    offline: 'Offline',
    complete: 'Complete',
    partial: 'Partial'
  }
  return labels[status] || status
}

/**
 * Get sync status severity for PrimeVue Tag
 */
export function getSyncStatusSeverity(status: 'synced' | 'pending' | 'offline' | 'complete' | 'partial'): 'success' | 'warn' | 'danger' | 'info' | 'secondary' {
  const severities: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary'> = {
    synced: 'success',
    pending: 'warn',
    offline: 'secondary',
    complete: 'success',
    partial: 'warn'
  }
  return severities[status] || 'secondary'
}

// =====================
// Payment Method Formatting
// =====================

/**
 * Format payment method for display
 */
export function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    card: 'Card',
    credit_card: 'Credit Card',
    debit_card: 'Debit Card',
    gcash: 'GCash',
    maya: 'Maya',
    other: 'Other'
  }
  return labels[method.toLowerCase()] || method
}

/**
 * Get payment method icon
 */
export function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    cash: 'pi pi-money-bill',
    card: 'pi pi-credit-card',
    credit_card: 'pi pi-credit-card',
    debit_card: 'pi pi-credit-card',
    gcash: 'pi pi-wallet',
    maya: 'pi pi-wallet',
    other: 'pi pi-ellipsis-h'
  }
  return icons[method.toLowerCase()] || 'pi pi-ellipsis-h'
}

// =====================
// Report Title Formatting
// =====================

/**
 * Generate X-Reading report title
 */
export function getXReadingTitle(counter: number, date: string | Date): string {
  return `X-Reading #${counter} - ${formatDateMedium(date)}`
}

/**
 * Generate Z-Reading report title
 */
export function getZReadingTitle(counter: number, date: string | Date): string {
  return `Z-Reading #${counter} - ${formatDateMedium(date)}`
}

/**
 * Generate daily sales report title
 */
export function getDailySalesTitle(date: string | Date): string {
  return `Daily Sales Report - ${formatDateLong(date)}`
}

/**
 * Generate period report title
 */
export function getPeriodReportTitle(type: string, start: string | Date, end: string | Date): string {
  return `${type} - ${formatDateRange(start, end)}`
}

// =====================
// CSV Export Helpers
// =====================

/**
 * Escape value for CSV
 */
export function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: Array<{ key: keyof T; header: string; formatter?: (value: unknown) => string }>
): string {
  const headers = columns.map(col => escapeCSV(col.header)).join(',')

  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      const formatted = col.formatter ? col.formatter(value) : value
      return escapeCSV(formatted as string | number)
    }).join(',')
  )

  return [headers, ...rows].join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// =====================
// Print Helpers
// =====================

/**
 * Open print dialog for current page
 */
export function printReport(): void {
  window.print()
}

/**
 * Format report for thermal printer (58mm/80mm)
 */
export function formatForThermalPrint(lines: string[], charWidth: number = 32): string {
  return lines.map(line => {
    if (line.length > charWidth) {
      return line.substring(0, charWidth)
    }
    return line
  }).join('\n')
}

/**
 * Create centered line for thermal print
 */
export function centerLine(text: string, width: number = 32): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

/**
 * Create separator line
 */
export function separatorLine(char: string = '-', width: number = 32): string {
  return char.repeat(width)
}

/**
 * Create label-value line (left aligned label, right aligned value)
 */
export function labelValueLine(label: string, value: string, width: number = 32): string {
  const gap = width - label.length - value.length
  if (gap <= 0) {
    return `${label.substring(0, width - value.length - 1)} ${value}`
  }
  return `${label}${' '.repeat(gap)}${value}`
}
