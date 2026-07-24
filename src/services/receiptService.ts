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
import { Capacitor } from '@capacitor/core'

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

/**
 * Decide whether a receipt should go to the Bluetooth thermal printer.
 *
 * A saved device is sufficient on native: Bluetooth is the only transport the
 * mobile build implements (there is no USB/network/serial code path), and
 * configs written before the connection type was persisted correctly still
 * carry the 'usb' default. Requiring connection_type to match would leave those
 * installs silently unable to print while the Settings test print — which
 * bypasses this config entirely — kept working.
 */
export function shouldUseBluetooth(
  config: { connection_type?: string; bluetooth_device?: string } | null | undefined,
  isNative: boolean
): boolean {
  if (!config?.bluetooth_device) return false
  return config.connection_type === 'bluetooth' || isNative
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
   * Print a receipt.
   *
   * Routing:
   *  - Bluetooth thermal printer, when one is configured (the only path that
   *    works on the Android tablet build).
   *  - Otherwise, on web/Electron, an off-screen iframe + window.print().
   *
   * We deliberately never call window.open() here. Capacitor's Android WebView
   * runs with setSupportMultipleWindows(false), so window.open loads the
   * receipt *in place of the app* — no back button, and window.close() is a
   * no-op, which is exactly the "have to kill the app" bug QA reported.
   */
  async printReceipt(
    transactionId: string,
    options: PrintReceiptOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Bluetooth thermal printer routing — see shouldUseBluetooth().
      const settings = useSettingsStore()
      const rcpt = settings.receiptConfig

      if (rcpt && shouldUseBluetooth(rcpt, Capacitor.isNativePlatform())) {
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

      // No printer configured. On native there is no system print dialog to
      // fall back to, so say so plainly instead of failing silently.
      if (Capacitor.isNativePlatform()) {
        return {
          success: false,
          error: 'No printer connected. Go to Settings > Printer & Receipt to connect a Bluetooth printer.'
        }
      }

      const html = await this.generateReceiptHTML(transactionId, options)
      if (!html) {
        return { success: false, error: 'Failed to generate receipt' }
      }

      return await this.printHtmlViaIframe(html)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error printing receipt'
      }
    }
  }

  /**
   * Render HTML into an off-screen iframe and invoke the browser print dialog.
   * Works in Electron and browsers without opening (or being blocked as) a popup.
   */
  private printHtmlViaIframe(html: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      let settled = false
      const finish = (result: { success: boolean; error?: string }) => {
        if (settled) return
        settled = true
        resolve(result)
      }

      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow
          if (!win) {
            finish({ success: false, error: 'Failed to prepare print document' })
            return
          }
          win.focus()
          win.print()
          finish({ success: true })
        } catch (error) {
          finish({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to open print dialog'
          })
        } finally {
          // Keep the iframe alive briefly — removing it while the print dialog
          // is still reading the document cancels the job in some engines.
          setTimeout(() => {
            if (iframe.parentNode) document.body.removeChild(iframe)
          }, 1000)
        }
      }

      document.body.appendChild(iframe)

      const doc = iframe.contentWindow?.document
      if (!doc) {
        if (iframe.parentNode) document.body.removeChild(iframe)
        finish({ success: false, error: 'Failed to prepare print document' })
        return
      }
      doc.open()
      doc.write(html)
      doc.close()
    })
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
   * Build the receipt preview.
   *
   * Returns the rendered receipt text rather than opening a window — the caller
   * shows it in an in-app dialog (ReceiptPreviewDialog). The old popup-window
   * approach was unusable on Android: the WebView replaced the app with the
   * receipt and offered no way back.
   *
   * Formatted at the configured paper width so the preview matches what the
   * thermal printer will actually produce.
   */
  async previewReceipt(
    transactionId: string,
    options: GenerateReceiptOptions
  ): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const data = await this.generateReceiptData(transactionId, options)
      if (!data) {
        return { success: false, error: 'Failed to generate receipt' }
      }

      return { success: true, text: receiptToText(data, this.getReceiptWidth()) }
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
