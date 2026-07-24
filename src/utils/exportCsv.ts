/**
 * CSV Export Utility
 * Generates and downloads CSV files from data arrays
 */

import { saveCsvFile, type SaveFileResult } from './fileDownload'

export interface ExportColumn {
  field: string
  header: string
  formatter?: (value: any, row?: any) => string
}

/**
 * Export data to a CSV file and hand it to the user (download on web/desktop,
 * share sheet on Android — blob downloads no-op inside the WebView).
 * @param data - Array of objects to export
 * @param filename - Name of the file (without .csv extension)
 * @param columns - Column definitions with field, header, and optional formatter
 */
export async function exportToCsv(
  data: any[],
  filename: string,
  columns: ExportColumn[]
): Promise<SaveFileResult> {
  // Generate header row
  const headers = columns.map(c => escapeValue(c.header)).join(',')

  // Generate data rows
  const rows = data.map(row =>
    columns.map(col => {
      const value = getNestedValue(row, col.field)
      const formatted = col.formatter ? col.formatter(value, row) : value
      return escapeValue(String(formatted ?? ''))
    }).join(',')
  )

  // Combine headers and rows
  const csv = [headers, ...rows].join('\n')

  return saveCsvFile(csv, filename)
}

/**
 * Escape CSV value - wraps in quotes if contains comma, quote, or newline
 */
function escapeValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Get nested value from object using dot notation
 * e.g., getNestedValue({ a: { b: 1 } }, 'a.b') returns 1
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
