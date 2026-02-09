// Receipt Formatter utility for generating BIR-compliant receipts

import type { ReceiptData, ReceiptLineItem, ReceiptPayment, BusinessInfo, TerminalInfo } from '@/types/receipt'
import { formatCurrency } from './vatCalculator'

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
 * Format line item for receipt
 */
export function formatLineItem(item: ReceiptLineItem): string[] {
  const lines: string[] = []

  // Product name (may wrap)
  const productName = item.variantName
    ? `${item.productName} - ${item.variantName}`
    : item.productName

  if (productName.length > RECEIPT_WIDTH) {
    // Wrap long product names
    lines.push(productName.substring(0, RECEIPT_WIDTH))
    if (productName.length > RECEIPT_WIDTH) {
      lines.push('  ' + productName.substring(RECEIPT_WIDTH, RECEIPT_WIDTH * 2 - 2))
    }
  } else {
    lines.push(productName)
  }

  // Quantity x Unit Price = Line Total
  const qtyPrice = `  ${item.quantity} x ${formatCurrency(item.unitPrice)}`
  const lineTotal = formatCurrency(item.lineTotal)
  lines.push(formatTwoColumns(qtyPrice, lineTotal))

  // Show discount if any
  if (item.discount > 0) {
    lines.push(formatTwoColumns('    Discount:', `-${formatCurrency(item.discount)}`))
  }

  // Show tax type if not VATable
  if (item.taxType !== 'vatable') {
    lines.push(`    (${item.taxTypeLabel})`)
  }

  return lines
}

/**
 * Format payment for receipt
 */
export function formatPayment(payment: ReceiptPayment): string[] {
  const lines: string[] = []

  lines.push(formatTwoColumns(payment.methodLabel, formatCurrency(payment.amount)))

  if (payment.referenceNumber) {
    lines.push(`  Ref: ${payment.referenceNumber}`)
  }

  if (payment.tendered && payment.change) {
    lines.push(formatTwoColumns('  Tendered:', formatCurrency(payment.tendered)))
    lines.push(formatTwoColumns('  Change:', formatCurrency(payment.change)))
  }

  return lines
}

/**
 * Format complete receipt
 */
export function formatReceipt(data: ReceiptData): string[] {
  const lines: string[] = []

  // === HEADER ===
  lines.push(centerText(data.business.name))
  lines.push(centerText(data.business.address))
  lines.push(centerText(`TIN: ${data.business.tin}`))
  if (data.business.phoneNumber) {
    lines.push(centerText(`Tel: ${data.business.phoneNumber}`))
  }
  lines.push('')

  // Terminal info
  lines.push(centerText(`Terminal: ${data.terminalId}`))
  lines.push(centerText(`SN: ${data.terminal.machineSerial}`))
  lines.push(centerText(`MIN: ${data.terminal.minNumber}`))
  lines.push(centerText(`PTU: ${data.terminal.ptuNumber}`))
  lines.push(centerText(`Valid Until: ${data.terminal.ptuValidUntil}`))
  lines.push('')

  // Receipt type header
  if (data.receiptType === 'sale') {
    lines.push(centerText('*** OFFICIAL RECEIPT ***'))
  } else if (data.receiptType === 'void') {
    lines.push(centerText('*** VOID RECEIPT ***'))
    if (data.originalOrNumber) {
      lines.push(centerText(`Original OR: ${data.originalOrNumber}`))
    }
  } else if (data.receiptType === 'refund') {
    lines.push(centerText('*** REFUND RECEIPT ***'))
    if (data.originalOrNumber) {
      lines.push(centerText(`Original OR: ${data.originalOrNumber}`))
    }
  }
  lines.push('')

  // OR number and date/time
  lines.push(formatTwoColumns('OR#:', data.orNumber))
  lines.push(formatTwoColumns('Date:', data.transactionDate))
  lines.push(formatTwoColumns('Time:', data.transactionTime))
  lines.push(formatTwoColumns('Cashier:', data.cashierName))
  lines.push('')

  lines.push(separatorLine())

  // === LINE ITEMS ===
  for (const item of data.items) {
    lines.push(...formatLineItem(item))
  }

  lines.push(separatorLine())

  // === TOTALS ===
  lines.push(formatTwoColumns('Subtotal:', formatCurrency(data.subtotal)))

  if (data.discount) {
    lines.push(formatTwoColumns(`Discount (${data.discount.typeLabel}):`, `-${formatCurrency(data.discount.amount)}`))
    if (data.discount.idNumber) {
      lines.push(`  ID#: ${data.discount.idNumber}`)
    }
    if (data.discount.idName) {
      lines.push(`  Name: ${data.discount.idName}`)
    }
  }

  lines.push(separatorLine('='))
  lines.push(formatTwoColumns('TOTAL:', formatCurrency(data.totalAmount)))
  lines.push(separatorLine('='))
  lines.push('')

  // === VAT BREAKDOWN ===
  lines.push('VAT Breakdown:')
  if (data.vatBreakdown.vatableSales > 0) {
    lines.push(formatTwoColumns('  VATable Sales:', formatCurrency(data.vatBreakdown.vatableSales)))
    const vatLabel = data.vatRatePercent ? `VAT (${data.vatRatePercent}%):` : 'VAT (12%):'
    lines.push(formatTwoColumns(`  ${vatLabel}`, formatCurrency(data.vatBreakdown.vatAmount)))
  }
  if (data.vatBreakdown.vatExemptSales > 0) {
    lines.push(formatTwoColumns('  VAT-Exempt:', formatCurrency(data.vatBreakdown.vatExemptSales)))
  }
  if (data.vatBreakdown.zeroRatedSales > 0) {
    lines.push(formatTwoColumns('  Zero-Rated:', formatCurrency(data.vatBreakdown.zeroRatedSales)))
  }
  lines.push('')

  // === PAYMENTS ===
  lines.push(separatorLine())
  lines.push('Payment:')
  for (const payment of data.payments) {
    lines.push(...formatPayment(payment))
  }
  lines.push('')

  // === CUSTOMER INFO (if present) ===
  if (data.customerName || data.customerTin) {
    lines.push(separatorLine())
    lines.push('Customer:')
    if (data.customerName) {
      lines.push(`  Name: ${data.customerName}`)
    }
    if (data.customerTin) {
      lines.push(`  TIN: ${data.customerTin}`)
    }
    lines.push('')
  }

  // === VOID/REFUND REASON ===
  if (data.voidReason) {
    lines.push(separatorLine())
    lines.push('Void Reason:')
    lines.push(`  ${data.voidReason}`)
    if (data.supervisorName) {
      lines.push(`  Approved by: ${data.supervisorName}`)
    }
    lines.push('')
  }

  if (data.refundReason) {
    lines.push(separatorLine())
    lines.push('Refund Reason:')
    lines.push(`  ${data.refundReason}`)
    if (data.supervisorName) {
      lines.push(`  Approved by: ${data.supervisorName}`)
    }
    lines.push('')
  }

  // === FOOTER ===
  lines.push(separatorLine())
  lines.push(centerText('THIS SERVES AS YOUR'))
  lines.push(centerText('OFFICIAL RECEIPT'))
  lines.push('')
  const footerLine1 = data.footerLine1 || 'Thank you for your purchase!'
  lines.push(centerText(footerLine1))
  if (data.footerLine2) {
    lines.push(centerText(data.footerLine2))
  }
  lines.push('')

  // Remarks
  if (data.remarks) {
    lines.push(centerText(data.remarks))
    lines.push('')
  }

  // BIR footer
  lines.push(separatorLine())
  lines.push(centerText('THIS RECEIPT SHALL BE VALID'))
  lines.push(centerText('FOR FIVE (5) YEARS FROM THE'))
  lines.push(centerText('DATE OF PERMIT TO USE'))
  lines.push(separatorLine())

  return lines
}

/**
 * Format receipt as plain text
 */
export function receiptToText(data: ReceiptData): string {
  return formatReceipt(data).join('\n')
}

/**
 * Format receipt as HTML for printing
 */
export function receiptToHTML(data: ReceiptData): string {
  const lines = formatReceipt(data)
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
