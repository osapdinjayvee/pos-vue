import db from '@/db/database'
import type { CreditLedgerEntry } from '@/types/credit'

class CreditLedgerRepository {
  /**
   * Record a charge (utang) entry
   */
  async recordCharge(
    customerId: string,
    amount: number,
    transactionId: string,
    processedBy: string
  ): Promise<CreditLedgerEntry> {
    // Get current balance to compute running_balance
    const customer = await db.getOne<{ current_balance: number }>(
      'SELECT current_balance FROM customers WHERE id = ?',
      [customerId]
    )
    const runningBalance = (customer?.current_balance ?? 0) + amount

    const id = db.generateId('cled')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO credit_ledger (id, customer_id, type, amount, running_balance, transaction_id, processed_by, created_at)
       VALUES (?, ?, 'charge', ?, ?, ?, ?, ?)`,
      [id, customerId, amount, runningBalance, transactionId, processedBy, now]
    )

    return (await db.getOne<CreditLedgerEntry>(
      'SELECT * FROM credit_ledger WHERE id = ?',
      [id]
    ))!
  }

  /**
   * Record a payment (bayad utang) entry
   */
  async recordPayment(
    customerId: string,
    amount: number,
    paymentMethod: string,
    processedBy: string,
    opts?: { referenceNumber?: string; notes?: string }
  ): Promise<CreditLedgerEntry> {
    const customer = await db.getOne<{ current_balance: number }>(
      'SELECT current_balance FROM customers WHERE id = ?',
      [customerId]
    )
    const runningBalance = (customer?.current_balance ?? 0) - amount

    const id = db.generateId('cled')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO credit_ledger (id, customer_id, type, amount, running_balance, payment_method, reference_number, notes, processed_by, created_at)
       VALUES (?, ?, 'payment', ?, ?, ?, ?, ?, ?, ?)`,
      [id, customerId, amount, runningBalance, paymentMethod, opts?.referenceNumber ?? null, opts?.notes ?? null, processedBy, now]
    )

    return (await db.getOne<CreditLedgerEntry>(
      'SELECT * FROM credit_ledger WHERE id = ?',
      [id]
    ))!
  }

  /**
   * Get ledger history for a customer (newest first)
   */
  async findByCustomer(customerId: string, opts?: { limit?: number; offset?: number }): Promise<CreditLedgerEntry[]> {
    let sql = 'SELECT * FROM credit_ledger WHERE customer_id = ? ORDER BY created_at DESC'
    const params: any[] = [customerId]

    if (opts?.limit) {
      sql += ` LIMIT ${opts.limit}`
      if (opts?.offset) {
        sql += ` OFFSET ${opts.offset}`
      }
    }

    return await db.query<CreditLedgerEntry>(sql, params)
  }

  /**
   * Find charge entry by transaction_id (for void reversal)
   */
  async findChargeByTransaction(transactionId: string): Promise<CreditLedgerEntry | null> {
    return await db.getOne<CreditLedgerEntry>(
      "SELECT * FROM credit_ledger WHERE transaction_id = ? AND type = 'charge'",
      [transactionId]
    )
  }

  /**
   * Get customers with outstanding balance
   */
  async getOutstandingCustomers(): Promise<any[]> {
    return await db.query(
      `SELECT c.*, c.current_balance as outstanding
       FROM customers c
       WHERE c.current_balance > 0 AND c.is_active = 1
       ORDER BY c.current_balance DESC`
    )
  }
}

export const creditLedgerRepository = new CreditLedgerRepository()
