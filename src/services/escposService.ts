// ESC/POS Encoder Service - Converts receipt text to raw ESC/POS binary commands

export interface EscPosOptions {
  paperWidth: '58mm' | '80mm'
  autoCut: boolean
  openCashDrawer: boolean
  cashDrawerPin: number
}

const ESC = 0x1b
const GS = 0x1d

/**
 * Get characters per line based on paper width
 */
export function getCharsPerLine(paperWidth: '58mm' | '80mm'): number {
  return paperWidth === '58mm' ? 32 : 42
}

/**
 * ESC @ - Initialize printer
 */
function initialize(): number[] {
  return [ESC, 0x40]
}

/**
 * ESC E n - Toggle bold
 */
function bold(on: boolean): number[] {
  return [ESC, 0x45, on ? 0x01 : 0x00]
}

/**
 * ESC a n - Set alignment (0=left, 1=center, 2=right)
 */
function align(mode: 0 | 1 | 2): number[] {
  return [ESC, 0x61, mode]
}

/**
 * ESC d n - Feed n lines
 */
function feedLines(n: number): number[] {
  return [ESC, 0x64, Math.min(n, 255)]
}

/**
 * GS V B n - Partial cut with n lines feed
 */
function cut(): number[] {
  return [GS, 0x56, 0x42, 0x03]
}

/**
 * ESC p m t1 t2 - Open cash drawer
 * Pin 2: m=0, Pin 5: m=1
 */
export function openCashDrawer(pin: number = 2): Uint8Array {
  const m = pin === 5 ? 0x01 : 0x00
  return new Uint8Array([ESC, 0x70, m, 0x19, 0xfa])
}

/**
 * Encode a string to bytes (CP437-compatible ASCII)
 */
function encodeText(text: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    bytes.push(code < 256 ? code : 0x3f) // '?' for non-ASCII
  }
  return bytes
}

/**
 * Encode a line of text with newline
 */
function textLine(text: string): number[] {
  return [...encodeText(text), 0x0a]
}

/**
 * Build a complete receipt buffer from text lines
 */
export function buildReceiptBuffer(lines: string[], options: EscPosOptions): Uint8Array {
  const bytes: number[] = []

  // Initialize printer
  bytes.push(...initialize())

  // Print each line
  for (const line of lines) {
    bytes.push(...textLine(line))
  }

  // Feed before cut
  bytes.push(...feedLines(4))

  // Auto-cut
  if (options.autoCut) {
    bytes.push(...cut())
  }

  // Cash drawer
  if (options.openCashDrawer) {
    bytes.push(...Array.from(openCashDrawer(options.cashDrawerPin)))
  }

  return new Uint8Array(bytes)
}

/**
 * Build a test page buffer
 */
export function buildTestPageBuffer(options: EscPosOptions): Uint8Array {
  const width = getCharsPerLine(options.paperWidth)
  const bytes: number[] = []

  bytes.push(...initialize())

  // Centered header
  bytes.push(...align(1))
  bytes.push(...bold(true))
  bytes.push(...textLine('PRINTER TEST'))
  bytes.push(...bold(false))
  bytes.push(...textLine(''))

  // Left-aligned info
  bytes.push(...align(0))
  bytes.push(...textLine('-'.repeat(width)))
  bytes.push(...textLine(`Paper Width: ${options.paperWidth}`))
  bytes.push(...textLine(`Chars/Line: ${width}`))
  bytes.push(...textLine(`Auto-Cut: ${options.autoCut ? 'Yes' : 'No'}`))
  bytes.push(...textLine('-'.repeat(width)))

  // Character test
  bytes.push(...textLine('ABCDEFGHIJKLMNOPQRSTUVWXYZ'))
  bytes.push(...textLine('abcdefghijklmnopqrstuvwxyz'))
  bytes.push(...textLine('0123456789'))
  bytes.push(...textLine('-'.repeat(width)))

  // Centered footer
  bytes.push(...align(1))
  bytes.push(...textLine('Test Complete'))
  bytes.push(...textLine(''))

  bytes.push(...feedLines(4))
  if (options.autoCut) {
    bytes.push(...cut())
  }

  return new Uint8Array(bytes)
}

export const escposService = {
  getCharsPerLine,
  buildReceiptBuffer,
  buildTestPageBuffer,
  openCashDrawer
}

export default escposService
