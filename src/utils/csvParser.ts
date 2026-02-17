/**
 * CSV Parser Utility
 * Manual parser handling quoted fields, escaped quotes, BOM stripping, and empty rows.
 */

export interface CsvParseOptions {
  delimiter?: string
  hasHeaders?: boolean
}

export interface CsvParseResult {
  headers: string[]
  rows: Record<string, string>[]
  rawRows: string[][]
  totalRows: number
}

/**
 * Parse CSV content string into headers and row objects.
 */
export function parseCsv(content: string, options: CsvParseOptions = {}): CsvParseResult {
  const delimiter = options.delimiter ?? ','
  const hasHeaders = options.hasHeaders ?? true

  // Strip BOM
  const cleaned = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content

  const rawRows = parseRows(cleaned, delimiter)

  // Filter empty rows
  const nonEmpty = rawRows.filter(row => row.some(cell => cell.trim() !== ''))

  if (nonEmpty.length === 0) {
    return { headers: [], rows: [], rawRows: [], totalRows: 0 }
  }

  let headers: string[]
  let dataRows: string[][]

  if (hasHeaders) {
    headers = nonEmpty[0].map(h => h.trim())
    dataRows = nonEmpty.slice(1)
  } else {
    headers = nonEmpty[0].map((_, i) => `Column ${i + 1}`)
    dataRows = nonEmpty
  }

  const rows = dataRows.map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((header, i) => {
      obj[header] = (row[i] ?? '').trim()
    })
    return obj
  })

  return {
    headers,
    rows,
    rawRows: dataRows,
    totalRows: dataRows.length
  }
}

/**
 * Parse CSV text into a 2D array of strings, handling quoted fields and escaped quotes.
 */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
    } else {
      if (char === '"') {
        inQuotes = true
        i++
      } else if (char === delimiter) {
        current.push(field)
        field = ''
        i++
      } else if (char === '\r') {
        // Handle \r\n or standalone \r
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
        if (i < text.length && text[i] === '\n') {
          i++
        }
      } else if (char === '\n') {
        current.push(field)
        field = ''
        rows.push(current)
        current = []
        i++
      } else {
        field += char
        i++
      }
    }
  }

  // Push last field/row
  if (field !== '' || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  return rows
}

/**
 * Read a File object as text using FileReader.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Generate a CSV template string from import config fields.
 */
export function generateCsvTemplate(fields: { field: string; label: string; required?: boolean }[]): string {
  const headers = fields.map(f => f.label)
  return headers.join(',') + '\n'
}

/**
 * Download a CSV template file.
 */
export function downloadCsvTemplate(
  fields: { field: string; label: string; required?: boolean }[],
  filename: string
): void {
  const csvContent = generateCsvTemplate(fields)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
