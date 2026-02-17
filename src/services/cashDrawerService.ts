/**
 * Cash Drawer Service
 * Business logic for cash drawer operations
 */

import db from '@/db/database'
import { drawerSessionRepository } from '@/repositories/drawerSessionRepository'
import { drawerOperationRepository } from '@/repositories/drawerOperationRepository'
import type {
  DrawerSession,
  DrawerOperation,
  DenominationCount,
  DenominationCountInput,
  ExpectedCashBreakdown
} from '@/types/cashDrawer'

class CashDrawerService {
  /**
   * Open a drawer session with denomination-based opening count
   */
  async openDrawer(
    shiftId: string,
    userId: string,
    terminalId: string,
    denominations: DenominationCountInput[]
  ): Promise<{ session: DrawerSession; operation: DrawerOperation; denominations: DenominationCount[] }> {
    // Check if session already exists for this shift
    const existing = await drawerSessionRepository.findByShiftId(shiftId)
    if (existing) {
      throw new Error('Drawer session already exists for this shift')
    }

    // Calculate opening amount from denominations
    const openingAmount = denominations.reduce((sum, d) => sum + d.subtotal, 0)

    // Create session
    const session = await drawerSessionRepository.create({
      shift_id: shiftId,
      user_id: userId,
      terminal_id: terminalId,
      opening_amount: openingAmount
    })

    // Create open operation with denominations
    const { operation, denominations: savedDenominations } = await drawerOperationRepository.createWithDenominations(
      {
        session_id: session.id,
        type: 'open',
        amount: openingAmount
      },
      denominations
    )

    // Enqueue for sync (non-blocking)
    this.enqueueSyncItem('drawer_session', session.id)

    return { session, operation, denominations: savedDenominations }
  }

  /**
   * Calculate expected cash in drawer
   * Formula: opening + cash sales - cash refunds - drops + paid-ins
   */
  async getExpectedCash(sessionId: string): Promise<ExpectedCashBreakdown> {
    const session = await drawerSessionRepository.findById(sessionId)
    if (!session) {
      throw new Error('Drawer session not found')
    }

    // Get cash sales for this shift (completed transactions with cash payments, excluding returns)
    const cashSalesResult = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(tp.amount), 0) as total
       FROM transaction_payments tp
       INNER JOIN transactions t ON t.id = tp.transaction_id
       WHERE t.shift_id = ? AND t.status = 'completed' AND tp.payment_method = 'cash'
         AND t.total_amount >= 0`,
      [session.shift_id]
    )
    const cashSales = cashSalesResult?.total || 0

    // Get cash refunds for this shift
    // Return transactions have negative total_amount and no payment records,
    // so we sum the absolute value of their total_amount as cash given back
    const cashRefundsResult = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(t.total_amount)), 0) as total
       FROM transactions t
       WHERE t.shift_id = ? AND t.status = 'completed' AND t.total_amount < 0`,
      [session.shift_id]
    )
    const cashRefunds = cashRefundsResult?.total || 0

    // Get individual return transaction details
    const refundDetails = await db.query<{ or_number: string; total_amount: number; created_at: string }>(
      `SELECT or_number, total_amount, created_at
       FROM transactions
       WHERE shift_id = ? AND status = 'completed' AND total_amount < 0
       ORDER BY created_at ASC`,
      [session.shift_id]
    )

    // Get total drops
    const totalDrops = await drawerOperationRepository.getDropsTotal(sessionId)

    // Get total paid-ins
    const totalPaidIns = await drawerOperationRepository.getPaidInsTotal(sessionId)

    const expectedCash = session.opening_amount + cashSales - cashRefunds - totalDrops + totalPaidIns

    return {
      openingAmount: session.opening_amount,
      cashSales,
      cashRefunds,
      refundDetails: refundDetails.map(r => ({
        orNumber: r.or_number,
        amount: Math.abs(r.total_amount),
        createdAt: r.created_at
      })),
      totalDrops,
      totalPaidIns,
      expectedCash
    }
  }

  /**
   * Close drawer session with closing denomination count
   */
  async closeDrawer(
    sessionId: string,
    denominations: DenominationCountInput[]
  ): Promise<{ session: DrawerSession; variance: number; breakdown: ExpectedCashBreakdown }> {
    const session = await drawerSessionRepository.findById(sessionId)
    if (!session) {
      throw new Error('Drawer session not found')
    }
    if (session.status === 'closed') {
      throw new Error('Drawer session is already closed')
    }

    // Calculate closing amount from denominations
    const closingAmount = denominations.reduce((sum, d) => sum + d.subtotal, 0)

    // Calculate expected cash
    const breakdown = await this.getExpectedCash(sessionId)
    const variance = closingAmount - breakdown.expectedCash

    // Create close operation with denominations
    await drawerOperationRepository.createWithDenominations(
      {
        session_id: sessionId,
        type: 'close',
        amount: closingAmount
      },
      denominations
    )

    // Close the session
    const closedSession = await drawerSessionRepository.close(
      sessionId,
      closingAmount,
      breakdown.expectedCash,
      variance,
      null
    )

    // Enqueue for sync (non-blocking)
    this.enqueueSyncItem('drawer_session', sessionId)

    return {
      session: closedSession!,
      variance,
      breakdown
    }
  }

  /**
   * Close drawer with variance reason (when variance exceeds threshold)
   */
  async closeDrawerWithReason(
    sessionId: string,
    denominations: DenominationCountInput[],
    varianceReason: string
  ): Promise<{ session: DrawerSession; variance: number; breakdown: ExpectedCashBreakdown }> {
    const result = await this.closeDrawer(sessionId, denominations)

    // Update with reason
    if (varianceReason) {
      await drawerSessionRepository.update(result.session.id, {
        variance_reason: varianceReason
      } as Partial<DrawerSession>)
      result.session.variance_reason = varianceReason
    }

    return result
  }

  /**
   * Record a cash drop (removing cash from drawer)
   */
  async recordDrop(
    sessionId: string,
    amount: number,
    reason: string,
    supervisorId: string
  ): Promise<DrawerOperation> {
    const session = await drawerSessionRepository.findById(sessionId)
    if (!session) throw new Error('Drawer session not found')
    if (session.status !== 'open') throw new Error('Drawer session is not open')
    if (amount <= 0) throw new Error('Drop amount must be greater than 0')

    const operation = await drawerOperationRepository.create({
      session_id: sessionId,
      type: 'drop',
      amount,
      reason,
      authorized_by: supervisorId
    })

    return operation
  }

  /**
   * Record a cash paid-in (adding cash to drawer)
   */
  async recordPaidIn(
    sessionId: string,
    amount: number,
    reason: string,
    supervisorId: string
  ): Promise<DrawerOperation> {
    const session = await drawerSessionRepository.findById(sessionId)
    if (!session) throw new Error('Drawer session not found')
    if (session.status !== 'open') throw new Error('Drawer session is not open')
    if (amount <= 0) throw new Error('Paid-in amount must be greater than 0')

    const operation = await drawerOperationRepository.create({
      session_id: sessionId,
      type: 'paid_in',
      amount,
      reason,
      authorized_by: supervisorId
    })

    return operation
  }

  /**
   * Record a no-sale drawer open (audit trail)
   */
  async recordNoSale(
    sessionId: string,
    supervisorId: string
  ): Promise<DrawerOperation> {
    const session = await drawerSessionRepository.findById(sessionId)
    if (!session) throw new Error('Drawer session not found')
    if (session.status !== 'open') throw new Error('Drawer session is not open')

    const operation = await drawerOperationRepository.create({
      session_id: sessionId,
      type: 'no_sale',
      reason: 'No sale - drawer opened',
      authorized_by: supervisorId
    })

    return operation
  }

  /**
   * Get all operations for a session
   */
  async getSessionOperations(sessionId: string): Promise<DrawerOperation[]> {
    return await drawerOperationRepository.findBySessionId(sessionId)
  }

  /**
   * Get session by shift ID
   */
  async getSessionByShift(shiftId: string): Promise<DrawerSession | null> {
    return await drawerSessionRepository.findByShiftId(shiftId)
  }

  /**
   * Get denomination details for an operation
   */
  async getOperationDenominations(operationId: string): Promise<DenominationCount[]> {
    return await drawerOperationRepository.getDenominationsByOperationId(operationId)
  }

  /**
   * Enqueue item for sync (non-blocking)
   */
  private enqueueSyncItem(entityType: string, entityId: string): void {
    import('@/services/syncService').then(({ default: syncService }) => {
      syncService.enqueueItem({
        entity_type: entityType,
        entity_id: entityId,
        operation: 'upsert',
        payload: JSON.stringify({ id: entityId })
      }).catch((e: Error) =>
        console.error('[CashDrawerService] Sync enqueue failed:', e)
      )
    }).catch(() => { /* sync module not available yet */ })
  }
}

export const cashDrawerService = new CashDrawerService()
export default cashDrawerService
