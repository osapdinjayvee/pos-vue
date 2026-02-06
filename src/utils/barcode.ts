// Barcode utility functions for validation and generation

export type BarcodeFormat = 'EAN-13' | 'UPC-A' | 'CODE-128' | 'UNKNOWN'

/**
 * Detect the barcode format based on the string
 */
export function detectBarcodeFormat(barcode: string): BarcodeFormat {
  if (!barcode || barcode.trim() === '') {
    return 'UNKNOWN'
  }

  const trimmed = barcode.trim()

  // EAN-13: 13 digits
  if (trimmed.length === 13 && /^\d+$/.test(trimmed)) {
    return 'EAN-13'
  }

  // UPC-A: 12 digits
  if (trimmed.length === 12 && /^\d+$/.test(trimmed)) {
    return 'UPC-A'
  }

  // Code 128: alphanumeric, 1-48 characters
  if (trimmed.length >= 1 && trimmed.length <= 48) {
    return 'CODE-128'
  }

  return 'UNKNOWN'
}

/**
 * Calculate EAN-13 check digit
 */
export function calculateEAN13CheckDigit(barcode: string): number {
  if (barcode.length !== 12 && barcode.length !== 13) {
    throw new Error('EAN-13 barcode must be 12 or 13 digits')
  }

  const digits = barcode.slice(0, 12).split('').map(Number)
  let sum = 0

  for (let i = 0; i < 12; i++) {
    const digit = digits[i]
    if (digit !== undefined) {
      sum += digit * (i % 2 === 0 ? 1 : 3)
    }
  }

  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit
}

/**
 * Calculate UPC-A check digit
 */
export function calculateUPCACheckDigit(barcode: string): number {
  if (barcode.length !== 11 && barcode.length !== 12) {
    throw new Error('UPC-A barcode must be 11 or 12 digits')
  }

  const digits = barcode.slice(0, 11).split('').map(Number)
  let oddSum = 0
  let evenSum = 0

  for (let i = 0; i < 11; i++) {
    const digit = digits[i]
    if (digit !== undefined) {
      if (i % 2 === 0) {
        oddSum += digit
      } else {
        evenSum += digit
      }
    }
  }

  const total = (oddSum * 3) + evenSum
  const checkDigit = (10 - (total % 10)) % 10
  return checkDigit
}

/**
 * Validate EAN-13 barcode including check digit
 */
export function validateEAN13(barcode: string): boolean {
  if (barcode.length !== 13 || !/^\d+$/.test(barcode)) {
    return false
  }

  const expectedCheckDigit = calculateEAN13CheckDigit(barcode)
  const lastChar = barcode[12]
  if (lastChar === undefined) return false
  const actualCheckDigit = parseInt(lastChar, 10)

  return expectedCheckDigit === actualCheckDigit
}

/**
 * Validate UPC-A barcode including check digit
 */
export function validateUPCA(barcode: string): boolean {
  if (barcode.length !== 12 || !/^\d+$/.test(barcode)) {
    return false
  }

  const expectedCheckDigit = calculateUPCACheckDigit(barcode)
  const lastChar = barcode[11]
  if (lastChar === undefined) return false
  const actualCheckDigit = parseInt(lastChar, 10)

  return expectedCheckDigit === actualCheckDigit
}

/**
 * Validate any barcode format
 */
export function validateBarcode(barcode: string): { valid: boolean; format: BarcodeFormat; error?: string } {
  if (!barcode || barcode.trim() === '') {
    return { valid: false, format: 'UNKNOWN', error: 'Barcode is empty' }
  }

  const trimmed = barcode.trim()
  const format = detectBarcodeFormat(trimmed)

  switch (format) {
    case 'EAN-13':
      if (validateEAN13(trimmed)) {
        return { valid: true, format }
      }
      return { valid: false, format, error: 'Invalid EAN-13 check digit' }

    case 'UPC-A':
      if (validateUPCA(trimmed)) {
        return { valid: true, format }
      }
      return { valid: false, format, error: 'Invalid UPC-A check digit' }

    case 'CODE-128':
      // Code 128 doesn't have a standard check digit we validate
      return { valid: true, format }

    default:
      return { valid: false, format, error: 'Unknown barcode format' }
  }
}

/**
 * Generate a valid EAN-13 barcode with check digit
 * @param prefix Country/company prefix (1-12 digits)
 * @param productCode Product-specific code
 */
export function generateEAN13(prefix: string, productCode: string): string {
  const combined = (prefix + productCode).padStart(12, '0').slice(0, 12)

  if (!/^\d+$/.test(combined)) {
    throw new Error('EAN-13 barcode must contain only digits')
  }

  const checkDigit = calculateEAN13CheckDigit(combined)
  return combined + checkDigit
}

/**
 * Generate a valid UPC-A barcode with check digit
 * @param manufacturerCode Manufacturer code (1-11 digits)
 * @param productCode Product-specific code
 */
export function generateUPCA(manufacturerCode: string, productCode: string): string {
  const combined = (manufacturerCode + productCode).padStart(11, '0').slice(0, 11)

  if (!/^\d+$/.test(combined)) {
    throw new Error('UPC-A barcode must contain only digits')
  }

  const checkDigit = calculateUPCACheckDigit(combined)
  return combined + checkDigit
}

/**
 * Generate a unique internal barcode (Code 128 format)
 * Uses timestamp and random characters for uniqueness
 */
export function generateInternalBarcode(prefix: string = 'INT'): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Normalize barcode by trimming and removing common prefixes/suffixes
 */
export function normalizeBarcode(barcode: string): string {
  if (!barcode) return ''

  // Trim whitespace
  let normalized = barcode.trim()

  // Remove common scanner prefixes/suffixes (carriage return, line feed)
  normalized = normalized.replace(/[\r\n]/g, '')

  // Remove leading zeros for internal comparison (optional, depends on your needs)
  // normalized = normalized.replace(/^0+/, '')

  return normalized
}

/**
 * Check if two barcodes are equivalent (after normalization)
 */
export function barcodesMatch(barcode1: string, barcode2: string): boolean {
  return normalizeBarcode(barcode1) === normalizeBarcode(barcode2)
}

/**
 * Format barcode for display (add spaces/dashes for readability)
 */
export function formatBarcodeForDisplay(barcode: string): string {
  if (!barcode) return ''

  const format = detectBarcodeFormat(barcode)

  switch (format) {
    case 'EAN-13':
      // Format as X XXXXXX XXXXXX
      return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7)}`

    case 'UPC-A':
      // Format as X XXXXX XXXXX X
      return `${barcode.slice(0, 1)} ${barcode.slice(1, 6)} ${barcode.slice(6, 11)} ${barcode.slice(11)}`

    default:
      return barcode
  }
}
