// Receipt Service - Business logic for generating and printing receipts
import { transactionRepository } from '@/repositories/transactionRepository'
import { transactionItemRepository } from '@/repositories/transactionItemRepository'
import { paymentRepository } from '@/repositories/paymentRepository'
import { orSeriesRepository } from '@/repositories/orSeriesRepository'
import {
  formatReceipt,
  receiptToText,
  receiptToHTML,
  formatReceiptDate,
  formatReceiptTime,
  createReceiptData,
  RECEIPT_WIDTH
} from '@/utils/receiptFormatter'
import type {
  ReceiptData,
  ReceiptLineItem,
  ReceiptPayment,
  BusinessInfo,
  TerminalInfo
} from '@/types/receipt'
import type { Transaction, TransactionItem } from '@/types/transaction'
import { useSettingsStore } from '@/stores/settings'

export interface GenerateReceiptOptions {
  business?: BusinessInfo
  terminal?: TerminalInfo
  cashierName: string
  includeCustomer?: boolean
  customRemarks?: string
}

export interface PrintReceiptOptions extends GenerateReceiptOptions {
  copies?: number
  silent?: boolean
}

class ReceiptService {
  private businessInfoOverride: BusinessInfo | null = null
  private terminalInfoOverride: TerminalInfo | null = null

  /**
   * Get business info from settings store (or override)
   */
  private getSettingsBusinessInfo(): BusinessInfo {
    try {
      return useSettingsStore().businessInfo
    } catch {
      return {
        name: 'My POS Store',
        tradeName: '',
        address: '123 Main Street, City, Province',
        tin: '000-000-000-000',
        branchCode: 'MAIN',
        phoneNumber: '(02) 1234-5678',
        accreditationNumber: '',
        dateAccredited: '',
        ptuDateIssued: ''
      }
    }
  }

  /**
   * Get terminal info from settings store (or override)
   */
  private getSettingsTerminalInfo(): TerminalInfo {
    try {
      return useSettingsStore().terminalInfo
    } catch {
      return {
        terminalId: 'T001',
        machineSerial: 'SN-00000001',
        minNumber: 'MIN-00000001',
        ptuNumber: 'PTU-00000001',
        ptuValidUntil: '2027-12-31'
      }
    }
  }

  /**
   * Configure business info override (takes precedence over settings)
   */
  setBusinessInfo(info: BusinessInfo): void {
    this.businessInfoOverride = info
  }

  /**
   * Configure terminal info override (takes precedence over settings)
   */
  setTerminalInfo(info: TerminalInfo): void {
    this.terminalInfoOverride = info
  }

  /**
   * Get current business info
   */
  getBusinessInfo(): BusinessInfo {
    return this.businessInfoOverride || this.getSettingsBusinessInfo()
  }

  /**
   * Get current terminal info
   */
  getTerminalInfo(): TerminalInfo {
    return this.terminalInfoOverride || this.getSettingsTerminalInfo()
  }

  /**
   * Generate receipt data for a transaction
   */
  async generateReceiptData(
    transactionId: string,
    options: GenerateReceiptOptions
  ): Promise<ReceiptData | null> {
    // Fetch transaction details
    const transaction = await transactionRepository.findById(transactionId)
    if (!transaction) {
      return null
    }

    const items = await transactionItemRepository.findByTransaction(transactionId)
    const payments = await paymentRepository.findByTransaction(transactionId)

    // Convert to receipt format
    const receiptItems = this.convertToReceiptItems(items)
    const receiptPayments = this.convertToReceiptPayments(payments)

    const business = options.business || this.getBusinessInfo()
    const terminal = options.terminal || this.getTerminalInfo()

    // Create receipt data
    const receiptData = createReceiptData(
      {
        orNumber: transaction.or_number,
        createdAt: transaction.created_at,
        subtotal: transaction.subtotal,
        discountTotal: transaction.discount_total || 0,
        discountType: transaction.discount_type,
        discountIdNumber: transaction.discount_id_number,
        discountIdName: transaction.discount_id_name,
        vatableSales: transaction.vatable_sales,
        vatAmount: transaction.vat_amount,
        vatExemptSales: transaction.vat_exempt_sales,
        zeroRatedSales: transaction.zero_rated_sales,
        totalAmount: transaction.total_amount
      },
      receiptItems,
      receiptPayments,
      business,
      terminal,
      options.cashierName
    )

    // Add VAT rate and footer lines from settings
    try {
      const settings = useSettingsStore()
      receiptData.vatRatePercent = settings.vatRatePercent
      receiptData.footerLine1 = settings.receiptSettings.footerLine1
      receiptData.footerLine2 = settings.receiptSettings.footerLine2
    } catch {
      // Settings not available - use defaults
    }

    // Compute item count (total quantity)
    receiptData.itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

    // Add customer info if transaction has customer_id
    if (transaction.customer_id) {
      try {
        const { customerRepository } = await import('@/repositories/customerRepository')
        const customer = await customerRepository.findById(transaction.customer_id)
        if (customer) {
          receiptData.customerName = customer.name
          if (customer.tax_id) {
            receiptData.customerTin = customer.tax_id
          }
          // Build customer address
          const addrParts = [customer.address, customer.city].filter(Boolean)
          if (addrParts.length) {
            receiptData.customerAddress = addrParts.join(', ')
          }
        }
      } catch {
        // Customer lookup is non-critical for receipt generation
      }
    }

    // Add custom remarks if provided
    if (options.customRemarks) {
      receiptData.remarks = options.customRemarks
    }

    return receiptData
  }

  /**
   * Generate receipt as text lines
   */
  async generateReceiptText(
    transactionId: string,
    options: GenerateReceiptOptions
  ): Promise<string[] | null> {
    const data = await this.generateReceiptData(transactionId, options)
    if (!data) return null

    return formatReceipt(data)
  }

  /**
   * Generate receipt as plain text string
   */
  async generateReceiptPlainText(
    transactionId: string,
    options: GenerateReceiptOptions
  ): Promise<string | null> {
    const data = await this.generateReceiptData(transactionId, options)
    if (!data) return null

    return receiptToText(data)
  }

  /**
   * Generate receipt as HTML for printing
   */
  async generateReceiptHTML(
    transactionId: string,
    options: GenerateReceiptOptions
  ): Promise<string | null> {
    const data = await this.generateReceiptData(transactionId, options)
    if (!data) return null

    return receiptToHTML(data)
  }

  /**
   * Generate void receipt
   */
  async generateVoidReceipt(
    transactionId: string,
    voidReason: string,
    supervisorName: string,
    options: GenerateReceiptOptions
  ): Promise<ReceiptData | null> {
    const data = await this.generateReceiptData(transactionId, options)
    if (!data) return null

    data.receiptType = 'void'
    data.originalOrNumber = data.orNumber
    data.voidReason = voidReason
    data.supervisorName = supervisorName

    return data
  }

  /**
   * Generate refund receipt
   */
  async generateRefundReceipt(
    originalTransactionId: string,
    refundItems: ReceiptLineItem[],
    refundPayments: ReceiptPayment[],
    refundReason: string,
    supervisorName: string,
    newOrNumber: string,
    options: GenerateReceiptOptions
  ): Promise<ReceiptData | null> {
    const originalTransaction = await transactionRepository.findById(originalTransactionId)
    if (!originalTransaction) {
      return null
    }

    const business = options.business || this.getBusinessInfo()
    const terminal = options.terminal || this.getTerminalInfo()
    const txDate = new Date()

    // Calculate refund totals
    let subtotal = 0
    let vatableSales = 0
    let vatAmount = 0
    let vatExemptSales = 0
    let zeroRatedSales = 0

    let vatRate = 0.12
    try {
      vatRate = useSettingsStore().vatRate
    } catch { /* use default */ }
    const vatDivisor = 1 + vatRate

    for (const item of refundItems) {
      subtotal += item.lineTotal
      if (item.taxType === 'vatable') {
        vatableSales += item.lineTotal / vatDivisor
        vatAmount += item.lineTotal * (vatRate / vatDivisor)
      } else if (item.taxType === 'exempt') {
        vatExemptSales += item.lineTotal
      } else {
        zeroRatedSales += item.lineTotal
      }
    }

    const data: ReceiptData = {
      receiptType: 'refund',
      orNumber: newOrNumber,
      originalOrNumber: originalTransaction.or_number,
      transactionDate: formatReceiptDate(txDate),
      transactionTime: formatReceiptTime(txDate),
      cashierName: options.cashierName,
      terminalId: terminal.terminalId,
      business,
      terminal,
      items: refundItems,
      subtotal,
      vatBreakdown: {
        vatableSales,
        vatAmount,
        vatExemptSales,
        zeroRatedSales
      },
      totalAmount: subtotal,
      payments: refundPayments,
      refundReason,
      supervisorName
    }

    return data
  }

  /**
   * Print receipt (opens browser print dialog)
   */
  async printReceipt(
    transactionId: string,
    options: PrintReceiptOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Bluetooth thermal printer routing
      const settings = useSettingsStore()
      const rcpt = settings.receiptConfig
      if (rcpt?.connection_type === 'bluetooth' && rcpt?.bluetooth_device) {
        const data = await this.generateReceiptData(transactionId, options)
        if (!data) {
          return { success: false, error: 'Failed to generate receipt' }
        }
        const { printerService } = await import('./printerService')
        const escposOptions = {
          paperWidth: (rcpt.paper_width === '58mm' ? '58mm' : '80mm') as '58mm' | '80mm',
          autoCut: rcpt.auto_cut === 1,
          openCashDrawer: rcpt.open_cash_drawer === 1,
          cashDrawerPin: rcpt.cash_drawer_pin || 2
        }
        return await printerService.printReceipt(data, escposOptions)
      }

      const html = await this.generateReceiptHTML(transactionId, options)
      if (!html) {
        return { success: false, error: 'Failed to generate receipt' }
      }

      // Create print window
      const printWindow = window.open('', '_blank', 'width=350,height=600')
      if (!printWindow) {
        return { success: false, error: 'Popup blocked. Please allow popups for printing.' }
      }

      // Embed the print trigger inside the document so it fires reliably (the
      // parent-side onload handler did not run consistently → receipt never
      // printed). The toolbar lets the user re-print or close manually.
      printWindow.document.write(this.injectReceiptControls(html, !options.silent))
      printWindow.document.close()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error printing receipt'
      }
    }
  }

  /**
   * Convert transaction items to receipt line items
   */
  private convertToReceiptItems(items: TransactionItem[]): ReceiptLineItem[] {
    return items.map(item => ({
      productName: item.product_name,
      variantName: item.variant_name || '',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      discount: item.discount || 0,
      taxType: item.tax_type,
      taxTypeLabel: this.getTaxTypeLabel(item.tax_type)
    }))
  }

  /**
   * Convert payments to receipt payment format
   */
  private convertToReceiptPayments(payments: any[]): ReceiptPayment[] {
    return payments.map(payment => ({
      method: payment.method || payment.payment_method,
      methodLabel: this.getPaymentMethodLabel(payment.method || payment.payment_method),
      amount: payment.amount,
      referenceNumber: payment.reference_number || undefined,
      tendered: payment.tendered || undefined,
      change: payment.change_amount || undefined
    }))
  }

  /**
   * Get tax type display label
   */
  private getTaxTypeLabel(taxType: string): string {
    const labels: Record<string, string> = {
      vatable: 'VATable',
      exempt: 'VAT-Exempt',
      zero_rated: 'Zero-Rated'
    }
    return labels[taxType] || taxType
  }

  /**
   * Get payment method display label
   */
  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      cash: 'Cash',
      card: 'Credit/Debit Card',
      gcash: 'GCash',
      maya: 'Maya',
      other_ewallet: 'E-Wallet',
      credit: 'CHARGE TO ACCOUNT (UTANG)',
      grab_pay: 'GrabPay',
      bank_transfer: 'Bank Transfer',
      check: 'Check',
      points: 'Loyalty Points'
    }
    return labels[method] || method
  }

  /**
   * Inject a Print/Close toolbar (and optional reliable auto-print) into a
   * receipt HTML document shown in a popup window. The toolbar is hidden when
   * printing. Auto-print is embedded in the document itself so it fires
   * reliably across browser/Electron/WebView (the parent-side `onload`
   * approach did not fire consistently).
   */
  private injectReceiptControls(html: string, autoPrint: boolean): string {
    const toolbar = `
      <div class="receipt-toolbar">
        <button type="button" onclick="window.print()">🖨 Print</button>
        <button type="button" onclick="window.close()">✕ Close</button>
      </div>
      <style>
        .receipt-toolbar { position: sticky; top: 0; display: flex; gap: 8px;
          padding: 8px; background: #f4f4f5; border-bottom: 1px solid #ddd; }
        .receipt-toolbar button { flex: 1; padding: 8px 4px; font-size: 13px;
          font-weight: 600; border: 1px solid #bbb; border-radius: 6px;
          background: #fff; cursor: pointer; }
        .receipt-toolbar button:active { background: #e4e4e7; }
        @media print { .receipt-toolbar { display: none !important; } }
      </style>`
    const script = autoPrint
      ? `<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print()}catch(e){}},250)})<\/script>`
      : ''

    let out = html
    out = out.includes('<body>') ? out.replace('<body>', '<body>' + toolbar) : toolbar + out
    out = out.includes('</body>') ? out.replace('</body>', script + '</body>') : out + script
    return out
  }

  /**
   * Preview receipt in a new window (with Print/Close controls)
   */
  async previewReceipt(
    transactionId: string,
    options: GenerateReceiptOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const html = await this.generateReceiptHTML(transactionId, options)
      if (!html) {
        return { success: false, error: 'Failed to generate receipt' }
      }

      const previewWindow = window.open('', '_blank', 'width=350,height=600')
      if (!previewWindow) {
        return { success: false, error: 'Popup blocked. Please allow popups for preview.' }
      }

      previewWindow.document.write(this.injectReceiptControls(html, false))
      previewWindow.document.close()

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error previewing receipt'
      }
    }
  }

  /**
   * Get receipt width for formatting
   */
  getReceiptWidth(): number {
    try {
      return useSettingsStore().receiptWidth
    } catch {
      return RECEIPT_WIDTH
    }
  }

  /**
   * Check OR series status and return warning if needed
   */
  async checkORSeriesStatus(branchId: string, terminalId?: string): Promise<{
    hasActiveSeries: boolean
    warning?: string
    remaining?: number
  }> {
    let series = terminalId
      ? await orSeriesRepository.findActiveByTerminal(terminalId)
      : null

    if (!series) {
      series = await orSeriesRepository.findActiveByBranch(branchId)
    }

    if (!series) {
      return { hasActiveSeries: false }
    }

    const status = await orSeriesRepository.getSeriesStatus(series.id)
    if (!status) {
      return { hasActiveSeries: true }
    }

    let warning: string | undefined
    if (status.isCritical) {
      warning = `CRITICAL: OR series nearly exhausted (${status.remaining} remaining)`
    } else if (status.isLow) {
      warning = `WARNING: OR series is low (${status.remaining} remaining)`
    }

    return {
      hasActiveSeries: true,
      warning,
      remaining: status.remaining
    }
  }
}

export const receiptService = new ReceiptService()
export default receiptService
