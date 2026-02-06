/**
 * Report Service
 * Calculates X-Reading and Z-Reading values from transaction data
 * Handles report generation logic and BIR compliance
 */

import db from '@/db/database'
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
    // Get all completed orders for this shift
    const salesData = await db.getOne<{
      gross_sales: number
      discount_total: number
      net_sales: number
      transaction_count: number
    }>(
      `SELECT
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_amount), 0) as discount_total,
        COALESCE(SUM(total), 0) as net_sales,
        COUNT(*) as transaction_count
       FROM orders
       WHERE terminal_id = ? AND shift_id = ?
         AND status IN ('completed')`,
      [terminalId, shiftId]
    )

    // Get VAT breakdown
    const vatData = await db.getOne<{
      vatable_sales: number
      vat_amount: number
      vat_exempt_sales: number
      zero_rated_sales: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) / 1.12 as vatable_sales,
        COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) - (COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) / 1.12) as vat_amount,
        COALESCE(SUM(CASE WHEN p.tax_type = 'vat_exempt' THEN oi.total ELSE 0 END), 0) as vat_exempt_sales,
        COALESCE(SUM(CASE WHEN p.tax_type = 'zero_rated' THEN oi.total ELSE 0 END), 0) as zero_rated_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.terminal_id = ? AND o.shift_id = ?
         AND o.status IN ('completed')`,
      [terminalId, shiftId]
    )

    // Get void information
    const voidData = await db.getOne<{
      void_count: number
      void_amount: number
    }>(
      `SELECT
        COUNT(*) as void_count,
        COALESCE(SUM(total), 0) as void_amount
       FROM orders
       WHERE terminal_id = ? AND shift_id = ?
         AND status = 'void'`,
      [terminalId, shiftId]
    )

    // Get OR number range for this shift
    const orRange = await db.getOne<{
      beginning_or: string
      ending_or: string
    }>(
      `SELECT
        MIN(order_number) as beginning_or,
        MAX(order_number) as ending_or
       FROM orders
       WHERE terminal_id = ? AND shift_id = ?
         AND status IN ('completed', 'void', 'refunded')`,
      [terminalId, shiftId]
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
    const today = new Date().toISOString().split('T')[0]

    // Get all completed orders for today
    const salesData = await db.getOne<{
      gross_sales: number
      discount_total: number
      net_sales: number
      transaction_count: number
    }>(
      `SELECT
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_amount), 0) as discount_total,
        COALESCE(SUM(total), 0) as net_sales,
        COUNT(*) as transaction_count
       FROM orders
       WHERE terminal_id = ? AND date(created_at) = ?
         AND status IN ('completed')`,
      [terminalId, today]
    )

    // Get VAT breakdown
    const vatData = await db.getOne<{
      vatable_sales: number
      vat_amount: number
      vat_exempt_sales: number
      zero_rated_sales: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) / 1.12 as vatable_sales,
        COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) - (COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) / 1.12) as vat_amount,
        COALESCE(SUM(CASE WHEN p.tax_type = 'vat_exempt' THEN oi.total ELSE 0 END), 0) as vat_exempt_sales,
        COALESCE(SUM(CASE WHEN p.tax_type = 'zero_rated' THEN oi.total ELSE 0 END), 0) as zero_rated_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.terminal_id = ? AND date(o.created_at) = ?
         AND o.status IN ('completed')`,
      [terminalId, today]
    )

    // Get void information
    const voidData = await db.getOne<{
      void_count: number
      void_amount: number
    }>(
      `SELECT
        COUNT(*) as void_count,
        COALESCE(SUM(total), 0) as void_amount
       FROM orders
       WHERE terminal_id = ? AND date(created_at) = ?
         AND status = 'void'`,
      [terminalId, today]
    )

    // Get refund information
    const refundData = await db.getOne<{
      refund_count: number
      refund_amount: number
    }>(
      `SELECT
        COUNT(*) as refund_count,
        COALESCE(SUM(total), 0) as refund_amount
       FROM orders
       WHERE terminal_id = ? AND date(created_at) = ?
         AND status = 'refunded'`,
      [terminalId, today]
    )

    // Get SC/PWD discount counts
    const discountCounts = await db.getOne<{
      sc_count: number
      pwd_count: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN discount_reason = 'senior_citizen' THEN 1 ELSE 0 END), 0) as sc_count,
        COALESCE(SUM(CASE WHEN discount_reason = 'pwd' THEN 1 ELSE 0 END), 0) as pwd_count
       FROM orders
       WHERE terminal_id = ? AND date(created_at) = ?
         AND status IN ('completed')`,
      [terminalId, today]
    )

    // Get OR number range
    const orRange = await db.getOne<{
      beginning_or: string
      ending_or: string
    }>(
      `SELECT
        MIN(order_number) as beginning_or,
        MAX(order_number) as ending_or
       FROM orders
       WHERE terminal_id = ? AND date(created_at) = ?
         AND status IN ('completed', 'void', 'refunded')`,
      [terminalId, today]
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
    const today = new Date().toISOString().split('T')[0]

    // Get sales data
    const salesData = await db.getOne<{
      gross_sales: number
      discount_total: number
      net_sales: number
      transaction_count: number
    }>(
      `SELECT
        COALESCE(SUM(subtotal), 0) as gross_sales,
        COALESCE(SUM(discount_amount), 0) as discount_total,
        COALESCE(SUM(total), 0) as net_sales,
        COUNT(*) as transaction_count
       FROM orders
       WHERE terminal_id = ? AND date(created_at) = ?
         AND status = 'completed'`,
      [terminalId, today]
    )

    // Get VAT breakdown
    const vatData = await db.getOne<{
      vatable_sales: number
      vat_amount: number
      vat_exempt_sales: number
      zero_rated_sales: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) / 1.12 as vatable_sales,
        COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) - (COALESCE(SUM(CASE WHEN p.tax_type = 'vatable' THEN oi.total ELSE 0 END), 0) / 1.12) as vat_amount,
        COALESCE(SUM(CASE WHEN p.tax_type = 'vat_exempt' THEN oi.total ELSE 0 END), 0) as vat_exempt_sales,
        COALESCE(SUM(CASE WHEN p.tax_type = 'zero_rated' THEN oi.total ELSE 0 END), 0) as zero_rated_sales
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.terminal_id = ? AND date(o.created_at) = ?
         AND o.status = 'completed'`,
      [terminalId, today]
    )

    // Get void/refund data
    const voidData = await db.getOne<{ void_count: number; void_amount: number }>(
      `SELECT COUNT(*) as void_count, COALESCE(SUM(total), 0) as void_amount
       FROM orders WHERE terminal_id = ? AND date(created_at) = ? AND status = 'void'`,
      [terminalId, today]
    )

    const refundData = await db.getOne<{ refund_count: number; refund_amount: number }>(
      `SELECT COUNT(*) as refund_count, COALESCE(SUM(total), 0) as refund_amount
       FROM orders WHERE terminal_id = ? AND date(created_at) = ? AND status = 'refunded'`,
      [terminalId, today]
    )

    // Get payment method breakdown
    const paymentData = await db.getOne<{
      cash_sales: number
      card_sales: number
      other_sales: number
    }>(
      `SELECT
        COALESCE(SUM(CASE WHEN p.payment_method = 'cash' THEN p.amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN p.payment_method = 'card' THEN p.amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN p.payment_method NOT IN ('cash', 'card') THEN p.amount ELSE 0 END), 0) as other_sales
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE o.terminal_id = ? AND date(o.created_at) = ?
         AND o.status = 'completed' AND p.status = 'completed'`,
      [terminalId, today]
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
