// Receipt Formatter utility for generating BIR-compliant receipts

import type { ReceiptData, ReceiptLineItem, ReceiptPayment, BusinessInfo, TerminalInfo } from '@/types/receipt'

/**
 * Format currency for receipt (plain ASCII, no peso sign — thermal printers can't render ₱)
 */
function fmtAmt(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/**
 * Receipt line width (characters) for thermal printer
 */
export const RECEIPT_WIDTH = 42

/**
 * Format a line of text for receipt
 */
export function formatLine(text: string, width: number = RECEIPT_WIDTH): string {
  return text.substring(0, width).padEnd(width)
}

/**
 * Format centered text
 */
export function centerText(text: string, width: number = RECEIPT_WIDTH): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(padding) + text
}

/**
 * Format right-aligned text
 */
export function rightAlign(text: string, width: number = RECEIPT_WIDTH): string {
  return text.padStart(width)
}

/**
 * Format two columns (label on left, value on right)
 */
export function formatTwoColumns(
  left: string,
  right: string,
  width: number = RECEIPT_WIDTH
): string {
  const leftPart = left.substring(0, width - right.length - 1)
  const spaces = width - leftPart.length - right.length
  return leftPart + ' '.repeat(Math.max(1, spaces)) + right
}

/**
 * Create a separator line
 */
export function separatorLine(char: string = '-', width: number = RECEIPT_WIDTH): string {
  return char.repeat(width)
}

/**
 * Get BIR tax type indicator: V=VATable, E=Exempt, Z=Zero-Rated
 */
function getTaxIndicator(taxType: string): string {
  if (taxType === 'exempt') return 'E'
  if (taxType === 'zero_rated') return 'Z'
  return 'V'
}

/**
 * Format line item for receipt (BIR Sales Invoice format)
 */
export function formatLineItem(item: ReceiptLineItem, width: number = RECEIPT_WIDTH): string[] {
  const lines: string[] = []

  // Product name (may wrap)
  const productName = item.variantName
    ? `${item.productName} - ${item.variantName}`
    : item.productName

  if (productName.length > width) {
    lines.push(productName.substring(0, width))
    if (productName.length > width) {
      lines.push('  ' + productName.substring(width, width * 2 - 2))
    }
  } else {
    lines.push(productName)
  }

  // Quantity x Unit Price = Line Total + Tax Indicator (V/E/Z)
  const qtyPrice = `  ${item.quantity} x ${fmtAmt(item.unitPrice)}`
  const indicator = getTaxIndicator(item.taxType)
  const lineTotal = `${fmtAmt(item.lineTotal)} ${indicator}`
  lines.push(formatTwoColumns(qtyPrice, lineTotal, width))

  // Show discount if any
  if (item.discount > 0) {
    lines.push(formatTwoColumns('    Discount:', `-${fmtAmt(item.discount)}`, width))
  }

  return lines
}

/**
 * Format payment for receipt
 */
export function formatPayment(payment: ReceiptPayment, width: number = RECEIPT_WIDTH): string[] {
  const lines: string[] = []
  // Shorten long method labels for narrow paper
  const label = payment.methodLabel.length > width - 12
    ? payment.methodLabel.substring(0, width - 12)
    : payment.methodLabel

  lines.push(formatTwoColumns(label, fmtAmt(payment.amount), width))

  if (payment.referenceNumber) {
    lines.push(formatLine(`  Ref: ${payment.referenceNumber}`, width))
  }

  if (payment.tendered && payment.change) {
    lines.push(formatTwoColumns('  Tendered:', fmtAmt(payment.tendered), width))
    lines.push(formatTwoColumns('  Change:', fmtAmt(payment.change), width))
  }

  return lines
}

/**
 * Format complete receipt — BIR Sales Invoice layout
 * Per RMC 9-2016 / RR 16-2018 for CAS (Computerized Accounting System)
 */
export function formatReceipt(data: ReceiptData, width: number = RECEIPT_WIDTH): string[] {
  const lines: string[] = []

  // ═══════════════════════════════════════
  // SECTION 1 — BUSINESS IDENTITY (HEADER)
  // ═══════════════════════════════════════
  lines.push(centerText(data.business.name, width))
  if (data.business.tradeName && data.business.tradeName !== data.business.name) {
    lines.push(centerText(`"${data.business.tradeName}"`, width))
  }
  // Wrap long address across multiple lines
  const addr = data.business.address
  if (addr.length > width) {
    const words = addr.split(' ')
    let line = ''
    for (const word of words) {
      if ((line + ' ' + word).trim().length > width) {
        lines.push(centerText(line.trim(), width))
        line = word
      } else {
        line = line ? line + ' ' + word : word
      }
    }
    if (line) lines.push(centerText(line.trim(), width))
  } else {
    lines.push(centerText(addr, width))
  }
  if (data.business.phoneNumber) {
    lines.push(centerText(`Tel: ${data.business.phoneNumber}`, width))
  }
  lines.push(centerText(`TIN: ${data.business.tin}`, width))
  if (data.business.accreditationNumber) {
    lines.push(centerText(`Accr#: ${data.business.accreditationNumber}`, width))
  }
  if (data.business.dateAccredited) {
    lines.push(centerText(`Accr Date: ${data.business.dateAccredited}`, width))
  }
  lines.push('')

  // ═══════════════════════════════════════
  // SECTION 2 — MACHINE / PERMIT INFO
  // ═══════════════════════════════════════
  lines.push(centerText(`PTU No: ${data.terminal.ptuNumber}`, width))
  if (data.business.ptuDateIssued) {
    lines.push(centerText(`Date Issued: ${data.business.ptuDateIssued}`, width))
  }
  lines.push(centerText(`Valid Until: ${data.terminal.ptuValidUntil}`, width))
  lines.push(centerText(`MIN: ${data.terminal.minNumber}`, width))
  lines.push(centerText(`S/N: ${data.terminal.machineSerial}`, width))
  lines.push('')

  // ═══════════════════════════════════════
  // SECTION 3 — DOCUMENT TITLE
  // ═══════════════════════════════════════
  if (data.receiptType === 'sale') {
    lines.push(centerText('*** SALES INVOICE ***', width))
  } else if (data.receiptType === 'void') {
    lines.push(centerText('*** VOID SALES INVOICE ***', width))
    if (data.originalOrNumber) {
      lines.push(centerText(`Original SI: ${data.originalOrNumber}`, width))
    }
  } else if (data.receiptType === 'refund') {
    lines.push(centerText('*** REFUND SALES INVOICE ***', width))
    if (data.originalOrNumber) {
      lines.push(centerText(`Original SI: ${data.originalOrNumber}`, width))
    }
  }
  lines.push('')

  // ═══════════════════════════════════════
  // SECTION 4 — TRANSACTION INFO
  // ═══════════════════════════════════════
  lines.push(formatTwoColumns('SI No:', data.orNumber, width))
  lines.push(formatTwoColumns('Date:', data.transactionDate, width))
  lines.push(formatTwoColumns('Time:', data.transactionTime, width))
  lines.push(formatTwoColumns('Cashier:', data.cashierName, width))
  lines.push(formatTwoColumns('Terminal:', data.terminalId, width))
  lines.push('')

  lines.push(separatorLine('-', width))

  // ═══════════════════════════════════════
  // SECTION 5 — LINE ITEMS
  // ═══════════════════════════════════════
  for (const item of data.items) {
    lines.push(...formatLineItem(item, width))
  }

  lines.push(separatorLine('-', width))

  // Item count
  if (data.itemCount != null) {
    lines.push(formatTwoColumns('Item(s) Sold:', String(data.itemCount), width))
  }

  // ═══════════════════════════════════════
  // SECTION 6 — TOTALS
  // ═══════════════════════════════════════
  lines.push(formatTwoColumns('Subtotal:', fmtAmt(data.subtotal), width))

  if (data.discount) {
    lines.push(formatTwoColumns(`Less: ${data.discount.typeLabel}`, `-${fmtAmt(data.discount.amount)}`, width))
    if (data.discount.idNumber) {
      lines.push(`  SC/PWD ID#: ${data.discount.idNumber}`)
    }
    if (data.discount.idName) {
      lines.push(`  Name: ${data.discount.idName}`)
    }
  }

  lines.push(separatorLine('=', width))
  lines.push(formatTwoColumns('TOTAL DUE:', fmtAmt(data.totalAmount), width))
  lines.push(separatorLine('=', width))
  lines.push('')

  // ═══════════════════════════════════════
  // SECTION 7 — VAT ANALYSIS
  // ═══════════════════════════════════════
  const narrow = width <= 32
  lines.push(centerText('--- VAT Analysis ---', width))
  lines.push(formatTwoColumns(narrow ? 'VATable:' : '  VATable Sales:', fmtAmt(data.vatBreakdown.vatableSales), width))
  const vatLabel = data.vatRatePercent ? `VAT ${data.vatRatePercent}%:` : 'VAT 12%:'
  lines.push(formatTwoColumns(narrow ? vatLabel : `  ${vatLabel}`, fmtAmt(data.vatBreakdown.vatAmount), width))
  lines.push(formatTwoColumns(narrow ? 'VAT-Exempt:' : '  VAT-Exempt Sales:', fmtAmt(data.vatBreakdown.vatExemptSales), width))
  lines.push(formatTwoColumns(narrow ? 'Zero-Rated:' : '  Zero-Rated Sales:', fmtAmt(data.vatBreakdown.zeroRatedSales), width))
  lines.push('')

  // ═══════════════════════════════════════
  // SECTION 8 — PAYMENT
  // ═══════════════════════════════════════
  lines.push(separatorLine('-', width))
  lines.push('Payment:')
  for (const payment of data.payments) {
    lines.push(...formatPayment(payment, width))
  }
  lines.push('')

  // ═══════════════════════════════════════
  // SECTION 9 — CUSTOMER INFO
  // ═══════════════════════════════════════
  const blankFill = '_'.repeat(Math.max(8, width - 10))
  if (data.customerName || data.customerTin || data.customerAddress) {
    lines.push(separatorLine('-', width))
    lines.push('Customer:')
    lines.push(formatLine(`  Name: ${data.customerName || blankFill}`, width))
    lines.push(formatLine(`  Addr: ${data.customerAddress || blankFill}`, width))
    lines.push(formatLine(`  TIN: ${data.customerTin || blankFill}`, width))
    if (data.customerBusinessStyle) {
      lines.push(formatLine(`  Biz: ${data.customerBusinessStyle}`, width))
    }
    lines.push('')
  } else {
    lines.push(separatorLine('-', width))
    lines.push('Customer:')
    lines.push(formatLine(`  Name: ${blankFill}`, width))
    lines.push(formatLine(`  Addr: ${blankFill}`, width))
    lines.push(formatLine(`  TIN: ${blankFill}`, width))
    lines.push('')
  }

  // ═══════════════════════════════════════
  // SECTION 10 — VOID/REFUND REASON
  // ═══════════════════════════════════════
  if (data.voidReason) {
    lines.push(separatorLine('-', width))
    lines.push('Void Reason:')
    lines.push(`  ${data.voidReason}`)
    if (data.supervisorName) {
      lines.push(`  Approved by: ${data.supervisorName}`)
    }
    lines.push('')
  }

  if (data.refundReason) {
    lines.push(separatorLine('-', width))
    lines.push('Refund Reason:')
    lines.push(`  ${data.refundReason}`)
    if (data.supervisorName) {
      lines.push(`  Approved by: ${data.supervisorName}`)
    }
    lines.push('')
  }

  // ═══════════════════════════════════════
  // SECTION 11 — BIR COMPLIANCE FOOTER
  // ═══════════════════════════════════════
  lines.push(separatorLine('-', width))

  // BIR conditional notice
  const hasCustomerTin = !!data.customerTin
  if (!hasCustomerTin || data.totalAmount < 1000) {
    lines.push(centerText('THIS DOCUMENT IS NOT VALID', width))
    lines.push(centerText('FOR CLAIM OF INPUT TAX', width))
  } else {
    lines.push(centerText('THIS SALES INVOICE SHALL BE', width))
    lines.push(centerText('VALID FOR FIVE (5) YEARS FROM', width))
    lines.push(centerText('THE DATE OF THE PERMIT TO USE', width))
  }
  lines.push(separatorLine('-', width))
  lines.push('')

  // Custom footer from settings
  const footerLine1 = data.footerLine1 || 'Thank you for your purchase!'
  lines.push(centerText(footerLine1, width))
  if (data.footerLine2) {
    lines.push(centerText(data.footerLine2, width))
  }
  lines.push('')

  // Remarks
  if (data.remarks) {
    lines.push(centerText(data.remarks, width))
    lines.push('')
  }

  // POS provider / software info (BIR requires)
  lines.push(centerText('Zoomin POS', width))
  lines.push('')

  return lines
}

/**
 * Format receipt as plain text
 */
export function receiptToText(data: ReceiptData, width?: number): string {
  return formatReceipt(data, width).join('\n')
}

/**
 * Format receipt as HTML for printing
 */
export function receiptToHTML(data: ReceiptData, width?: number): string {
  const lines = formatReceipt(data, width)
  const htmlLines = lines.map(line =>
    line.replace(/ /g, '&nbsp;')
  )

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.2;
      margin: 0;
      padding: 10px;
      width: 280px;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    @media print {
      body {
        width: auto;
      }
    }
  </style>
</head>
<body>
  <pre>${htmlLines.join('\n')}</pre>
</body>
</html>
  `.trim()
}

/**
 * Format date for receipt
 */
export function formatReceiptDate(date: Date): string {
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Format time for receipt
 */
export function formatReceiptTime(date: Date): string {
  return date.toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

/**
 * Create receipt data from transaction
 */
export function createReceiptData(
  transaction: {
    orNumber: string
    createdAt: string
    subtotal: number
    discountTotal: number
    discountType?: string | null
    discountIdNumber?: string | null
    discountIdName?: string | null
    vatableSales: number
    vatAmount: number
    vatExemptSales: number
    zeroRatedSales: number
    totalAmount: number
  },
  items: ReceiptLineItem[],
  payments: ReceiptPayment[],
  business: BusinessInfo,
  terminal: TerminalInfo,
  cashierName: string
): ReceiptData {
  const txDate = new Date(transaction.createdAt)

  return {
    receiptType: 'sale',
    orNumber: transaction.orNumber,
    transactionDate: formatReceiptDate(txDate),
    transactionTime: formatReceiptTime(txDate),
    cashierName,
    terminalId: terminal.terminalId,
    business,
    terminal,
    items,
    subtotal: transaction.subtotal,
    discount: transaction.discountType ? {
      type: transaction.discountType,
      typeLabel: transaction.discountType.replace('_', ' ').toUpperCase(),
      amount: transaction.discountTotal,
      idNumber: transaction.discountIdNumber || undefined,
      idName: transaction.discountIdName || undefined
    } : undefined,
    vatBreakdown: {
      vatableSales: transaction.vatableSales,
      vatAmount: transaction.vatAmount,
      vatExemptSales: transaction.vatExemptSales,
      zeroRatedSales: transaction.zeroRatedSales
    },
    totalAmount: transaction.totalAmount,
    payments
  }
}
