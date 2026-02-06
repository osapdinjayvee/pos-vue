/**
 * CSV Export Utility
 * Generates and downloads CSV files from data arrays
 */

export interface ExportColumn {
  field: string
  header: string
  formatter?: (value: any, row?: any) => string
}

/**
 * Export data to CSV file and trigger browser download
 * @param data - Array of objects to export
 * @param filename - Name of the file (without .csv extension)
 * @param columns - Column definitions with field, header, and optional formatter
 */
export function exportToCsv(
  data: any[],
  filename: string,
  columns: ExportColumn[]
): void {
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

  // Create blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
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
