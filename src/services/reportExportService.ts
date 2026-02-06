/**
 * Report Export Service (T045)
 * Provides export functionality for report data.
 * Currently supports CSV export with proper escaping.
 */

import type { ReportColumn } from '@/types/analytics'

class ReportExportService {
  /**
   * Export report data to a CSV file and trigger a browser download.
   *
   * @param data    - Array of row objects
   * @param columns - Column definitions for headers and field mapping
   * @param filename - The download filename (without extension)
   */
  exportToCsv(
    data: Record<string, any>[],
    columns: ReportColumn[],
    filename: string
  ): void {
    if (!data.length || !columns.length) {
      console.warn('[ReportExportService] No data or columns to export')
      return
    }

    // Build header row
    const headers = columns.map(col => this.escapeCsvValue(col.header))
    const rows: string[] = [headers.join(',')]

    // Build data rows
    for (const row of data) {
      const values = columns.map(col => {
        const raw = row[col.field]
        const formatted = this.formatValue(raw, col.type)
        return this.escapeCsvValue(formatted)
      })
      rows.push(values.join(','))
    }

    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    // Trigger download via temp anchor element
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()

    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Escape a single CSV value.
   * If the value contains commas, double quotes, or newlines, wrap it in double quotes
   * and escape any internal double quotes by doubling them.
   */
  private escapeCsvValue(value: string): string {
    if (value == null) return ''

    const str = String(value)

    // If the value contains a comma, double-quote, or newline, it needs quoting
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }

  /**
   * Format a raw value based on its column type for CSV output.
   */
  private formatValue(value: any, type: string): string {
    if (value == null || value === undefined) return ''

    switch (type) {
      case 'currency':
        return Number(value).toFixed(2)
      case 'percent':
        return `${(Number(value) * 100).toFixed(1)}%`
      case 'number':
        return String(Number(value))
      case 'date':
        return String(value)
      default:
        return String(value)
    }
  }
}

export const reportExportService = new ReportExportService()
export default reportExportService
