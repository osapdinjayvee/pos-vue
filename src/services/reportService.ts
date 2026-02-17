/**
 * Report Service
 * Calculates X-Reading and Z-Reading values from transaction data
 * Handles report generation logic and BIR compliance
 */

import db from '@/db/database'
import { toLocalDateStr } from '@/utils/dateHelpers'
import { zCounterRepository } from '@/repositories/zCounterRepository'
import { xCounterRepository } from '@/repositories/xCounterRepository'
import { zReadingRepository } from '@/repositories/zReadingRepository'
import { xReadingRepository } from '@/repositories/xReadingRepository'
import { salesAggregateRepository } from '@/repositories/salesAggregateRepository'
import type { XReadingCalculation } from '@/types/xReading'
import type { ZReadingCalculation, ZReadingGenerationResult, DisplayZReading } from '@/types/zReading'
import type { DisplayXReading } from '@/types/xReading'
import { toDisplayXReading } from '@/types/xReading'
import { toDisplayZReading } from '@/types/zReading'

class ReportService {
  /**
   * Calculate X-Reading data for a shift
   */
  async calculateXReading(
    terminalId: string,
    shiftId: string
  ): Promise<XReadingCalculation> {
    // Get all completed transactions for this shift
    // Filter by shift_id only — it uniquely identifies the shift regardless of terminal_id stored
    const salesData = await db.getOne<{
      gross_sales: number
      discount_total: number
      net_sales: number
      transaction_count: number
    }>(
      `SELECT
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_total), 0) as discount_total,
        COALESCE(SUM(total_amount), 0) as net_sales,
        COUNT(*) as transaction_count
       FROM transactions
       WHERE shift_id = ?
         AND status IN ('completed')`,
      [shiftId]
    )

    // Get VAT breakdown from transaction-level VAT columns
    const vatData = await db.getOne<{
      vatable_sales: number
      vat_amount: number
      vat_exempt_sales: number
      zero_rated_sales: number
    }>(
      `SELECT
        COALESCE(SUM(vatable_sales), 0) as vatable_sales,
        COALESCE(SUM(vat_amount), 0) as vat_amount,
        COALESCE(SUM(vat_exempt_sales), 0) as vat_exempt_sales,
        COALESCE(SUM(zero_rated_sales), 0) as zero_rated_sales
       FROM transactions
       WHERE shift_id = ?
         AND status IN ('completed')`,
      [shiftId]
    )

    // Get void information
    const voidData = await db.getOne<{
      void_count: number
      void_amount: number
    }>(
      `SELECT
        COUNT(*) as void_count,
        COALESCE(SUM(total_amount), 0) as void_amount
       FROM transactions
       WHERE shift_id = ?
         AND status = 'voided'`,
      [shiftId]
    )

    // Get OR number range for this shift
    const orRange = await db.getOne<{
      beginning_or: string
      ending_or: string
    }>(
      `SELECT
        MIN(or_number) as beginning_or,
        MAX(or_number) as ending_or
       FROM transactions
       WHERE shift_id = ?
         AND status IN ('completed', 'voided')`,
      [shiftId]
    )

    return {
      grossSales: salesData?.gross_sales || 0,
      discountTotal: salesData?.discount_total || 0,
      netSales: salesData?.net_sales || 0,
      vatableSales: vatData?.vatable_sales || 0,
      vatAmount: vatData?.vat_amount || 0,
      vatExemptSales: vatData?.vat_exempt_sales || 0,
      zeroRatedSales: vatData?.zero_rated_sales || 0,
      transactionCount: salesData?.transaction_count || 0,
      voidCount: voidData?.void_count || 0,
      voidAmount: voidData?.void_amount || 0,
      beginningOR: orRange?.beginning_or || '',
      endingOR: orRange?.ending_or || ''
    }
  }

  /**
   * Generate an X-Reading for a shift
   */
  async generateXReading(
    terminalId: string,
    shiftId: string,
    cashierId: string,
    branchId: string
  ): Promise<DisplayXReading> {
    const calculation = await this.calculateXReading(terminalId, shiftId)
    const xCounter = await xCounterRepository.incrementCounter(terminalId)

    const xReading = await xReadingRepository.create(
      { terminal_id: terminalId, shift_id: shiftId, cashier_id: cashierId },
      calculation,
      xCounter,
      branchId
    )

    // Get cashier name
    const user = await db.getOne<{ first_name: string; last_name: string }>(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [cashierId]
    )
    const cashierName = user ? `${user.first_name} ${user.last_name}` : ''

    return toDisplayXReading(xReading, cashierName)
  }

  /**
   * Calculate Z-Reading data for end of day
   */
  async calculateZReading(terminalId: string): Promise<ZReadingCalculation> {
    const today = toLocalDateStr()
    const startOfDay = `${today}T00:00:00`
    const endOfDay = `${today}T23:59:59`

    // Get all completed transactions for today (range-based for sql.js compatibility)
    const salesData = await db.getOne<{
      gross_sales: number
      discount_total: number
      net_sales: number
      transaction_count: number
    }>(
      `SELECT
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_total), 0) as discount_total,
        COALESCE(SUM(total_amount), 0) as net_sales,
        COUNT(*) as transaction_count
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status IN ('completed')`,
      [startOfDay, endOfDay]
    )

    // Get VAT breakdown from transaction-level columns
    const vatData = await db.getOne<{
      vatable_sales: number
      vat_amount: number
      vat_exempt_sales: number
      zero_rated_sales: number
    }>(
      `SELECT
        COALESCE(SUM(vatable_sales), 0) as vatable_sales,
        COALESCE(SUM(vat_amount), 0) as vat_amount,
        COALESCE(SUM(vat_exempt_sales), 0) as vat_exempt_sales,
        COALESCE(SUM(zero_rated_sales), 0) as zero_rated_sales
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status IN ('completed')`,
      [startOfDay, endOfDay]
    )

    // Get void information
    const voidData = await db.getOne<{
      void_count: number
      void_amount: number
    }>(
      `SELECT
        COUNT(*) as void_count,
        COALESCE(SUM(total_amount), 0) as void_amount
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status = 'voided'`,
      [startOfDay, endOfDay]
    )

    // Refund not applicable in transactions table (no 'refunded' status)
    const refundData = { refund_count: 0, refund_amount: 0 }

    // Get SC/PWD discount counts
    const discountCounts = await db.getOne<{
      sc_count: number
      pwd_count: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN discount_type = 'senior_citizen' THEN 1 ELSE 0 END), 0) as sc_count,
        COALESCE(SUM(CASE WHEN discount_type = 'pwd' THEN 1 ELSE 0 END), 0) as pwd_count
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status IN ('completed')`,
      [startOfDay, endOfDay]
    )

    // Get OR number range
    const orRange = await db.getOne<{
      beginning_or: string
      ending_or: string
    }>(
      `SELECT
        MIN(or_number) as beginning_or,
        MAX(or_number) as ending_or
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status IN ('completed', 'voided')`,
      [startOfDay, endOfDay]
    )

    // Get beginning balance from previous Z-Reading
    const lastZReading = await zReadingRepository.getLatest(terminalId)
    const beginningBalance = lastZReading
      ? lastZReading.gross_sales - lastZReading.discount_total
      : 0

    return {
      grossSales: salesData?.gross_sales || 0,
      discountTotal: salesData?.discount_total || 0,
      netSales: salesData?.net_sales || 0,
      vatableSales: vatData?.vatable_sales || 0,
      vatAmount: vatData?.vat_amount || 0,
      vatExemptSales: vatData?.vat_exempt_sales || 0,
      zeroRatedSales: vatData?.zero_rated_sales || 0,
      voidCount: voidData?.void_count || 0,
      voidAmount: voidData?.void_amount || 0,
      refundCount: refundData?.refund_count || 0,
      refundAmount: refundData?.refund_amount || 0,
      transactionCount: salesData?.transaction_count || 0,
      scDiscountCount: discountCounts?.sc_count || 0,
      pwdDiscountCount: discountCounts?.pwd_count || 0,
      beginningOR: orRange?.beginning_or || '',
      endingOR: orRange?.ending_or || '',
      beginningBalance
    }
  }

  /**
   * Generate a Z-Reading for end of day
   */
  async generateZReading(
    terminalId: string,
    supervisorId: string,
    branchId: string,
    forceDuplicate: boolean = false
  ): Promise<ZReadingGenerationResult> {
    // Check if Z-Reading already generated today
    const alreadyGenerated = await zCounterRepository.wasGeneratedToday(terminalId)
    if (alreadyGenerated && !forceDuplicate) {
      return {
        success: false,
        error: 'Z-Reading has already been generated for today',
        isDuplicate: true
      }
    }

    try {
      const calculation = await this.calculateZReading(terminalId)

      // Increment Z-counter (NEVER resets)
      const zCounter = await zCounterRepository.incrementCounter(terminalId)

      // Create Z-Reading record
      const zReading = await zReadingRepository.create(
        { terminal_id: terminalId, supervisor_id: supervisorId },
        calculation,
        zCounter,
        branchId
      )

      // Reset X-counter after Z-Reading
      await xCounterRepository.resetCounter(terminalId)

      // Update sales aggregate for the day
      await this.updateDailySalesAggregate(terminalId, branchId)

      // Get supervisor name
      const user = await db.getOne<{ first_name: string; last_name: string }>(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [supervisorId]
      )
      const generatedByName = user ? `${user.first_name} ${user.last_name}` : ''

      return {
        success: true,
        zReading: toDisplayZReading(zReading, generatedByName)
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate Z-Reading'
      }
    }
  }

  /**
   * Update daily sales aggregate from transaction data
   */
  async updateDailySalesAggregate(terminalId: string, branchId: string): Promise<void> {
    const today = toLocalDateStr()
    const startOfDay = `${today}T00:00:00`
    const endOfDay = `${today}T23:59:59`

    // Get sales data (no terminal_id filter — single-terminal offline POS)
    const salesData = await db.getOne<{
      gross_sales: number
      discount_total: number
      net_sales: number
      transaction_count: number
    }>(
      `SELECT
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_total), 0) as discount_total,
        COALESCE(SUM(total_amount), 0) as net_sales,
        COUNT(*) as transaction_count
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status = 'completed'`,
      [startOfDay, endOfDay]
    )

    // Get VAT breakdown from transaction-level columns
    const vatData = await db.getOne<{
      vatable_sales: number
      vat_amount: number
      vat_exempt_sales: number
      zero_rated_sales: number
    }>(
      `SELECT
        COALESCE(SUM(vatable_sales), 0) as vatable_sales,
        COALESCE(SUM(vat_amount), 0) as vat_amount,
        COALESCE(SUM(vat_exempt_sales), 0) as vat_exempt_sales,
        COALESCE(SUM(zero_rated_sales), 0) as zero_rated_sales
       FROM transactions
       WHERE created_at >= ? AND created_at <= ?
         AND status = 'completed'`,
      [startOfDay, endOfDay]
    )

    // Get void data
    const voidData = await db.getOne<{ void_count: number; void_amount: number }>(
      `SELECT COUNT(*) as void_count, COALESCE(SUM(total_amount), 0) as void_amount
       FROM transactions WHERE created_at >= ? AND created_at <= ? AND status = 'voided'`,
      [startOfDay, endOfDay]
    )

    // Refund not applicable in transactions table
    const refundData = { refund_count: 0, refund_amount: 0 }

    // Get payment method breakdown
    const paymentData = await db.getOne<{
      cash_sales: number
      card_sales: number
      other_sales: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN tp.payment_method = 'cash' THEN tp.amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN tp.payment_method = 'card' THEN tp.amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN tp.payment_method NOT IN ('cash', 'card') THEN tp.amount ELSE 0 END), 0) as other_sales
       FROM transaction_payments tp
       JOIN transactions t ON tp.transaction_id = t.id
       WHERE t.created_at >= ? AND t.created_at <= ?
         AND t.status = 'completed'`,
      [startOfDay, endOfDay]
    )

    const transactionCount = salesData?.transaction_count || 0
    const netSales = salesData?.net_sales || 0

    await salesAggregateRepository.upsert({
      date: today,
      terminal_id: terminalId,
      branch_id: branchId,
      gross_sales: salesData?.gross_sales || 0,
      discount_total: salesData?.discount_total || 0,
      net_sales: netSales,
      vatable_sales: vatData?.vatable_sales || 0,
      vat_amount: vatData?.vat_amount || 0,
      vat_exempt_sales: vatData?.vat_exempt_sales || 0,
      zero_rated_sales: vatData?.zero_rated_sales || 0,
      transaction_count: transactionCount,
      void_count: voidData?.void_count || 0,
      void_amount: voidData?.void_amount || 0,
      refund_count: refundData?.refund_count || 0,
      refund_amount: refundData?.refund_amount || 0,
      cash_sales: paymentData?.cash_sales || 0,
      card_sales: paymentData?.card_sales || 0,
      other_sales: paymentData?.other_sales || 0,
      average_ticket: transactionCount > 0 ? netSales / transactionCount : 0
    })
  }

  /**
   * Get X-Reading history for a terminal
   */
  async getXReadingHistory(terminalId: string): Promise<DisplayXReading[]> {
    const readings = await xReadingRepository.findAll({ terminalId })
    const result: DisplayXReading[] = []

    for (const reading of readings) {
      const user = await db.getOne<{ first_name: string; last_name: string }>(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [reading.cashier_id]
      )
      const cashierName = user ? `${user.first_name} ${user.last_name}` : ''
      result.push(toDisplayXReading(reading, cashierName))
    }

    return result
  }

  /**
   * Get Z-Reading history for a terminal
   */
  async getZReadingHistory(terminalId: string): Promise<DisplayZReading[]> {
    const readings = await zReadingRepository.findAll({ terminalId })
    const result: DisplayZReading[] = []

    for (const reading of readings) {
      const user = await db.getOne<{ first_name: string; last_name: string }>(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [reading.generated_by]
      )
      const generatedByName = user ? `${user.first_name} ${user.last_name}` : ''
      result.push(toDisplayZReading(reading, generatedByName))
    }

    return result
  }
}

export const reportService = new ReportService()
export default reportService
