/**
 * Drawer Operation Repository
 * Data access for cash drawer operations and denomination counts
 */

import db from '@/db/database'
import type {
  DrawerOperation,
  DrawerOperationInput,
  DenominationCount,
  DenominationCountInput
} from '@/types/cashDrawer'

class DrawerOperationRepository {
  private tableName = 'drawer_operations'
  private denomTableName = 'denomination_counts'
  private idPrefix = 'dop'
  private denomIdPrefix = 'denom'

  async create(input: DrawerOperationInput): Promise<DrawerOperation> {
    const id = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO ${this.tableName} (id, session_id, type, amount, reason, authorized_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, input.session_id, input.type, input.amount ?? null, input.reason ?? null, input.authorized_by ?? null, now]
    )

    return (await this.findById(id))!
  }

  async findById(id: string): Promise<DrawerOperation | null> {
    return await db.getOne<DrawerOperation>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    )
  }

  async findBySessionId(sessionId: string): Promise<DrawerOperation[]> {
    return await db.query<DrawerOperation>(
      `SELECT * FROM ${this.tableName} WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    )
  }

  async findByType(sessionId: string, type: string): Promise<DrawerOperation[]> {
    return await db.query<DrawerOperation>(
      `SELECT * FROM ${this.tableName} WHERE session_id = ? AND type = ? ORDER BY created_at ASC`,
      [sessionId, type]
    )
  }

  async createWithDenominations(
    input: DrawerOperationInput,
    denominations: DenominationCountInput[]
  ): Promise<{ operation: DrawerOperation; denominations: DenominationCount[] }> {
    const operationId = db.generateId(this.idPrefix)
    const now = db.getCurrentTimestamp()

    // Create operation
    await db.execute(
      `INSERT INTO ${this.tableName} (id, session_id, type, amount, reason, authorized_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [operationId, input.session_id, input.type, input.amount ?? null, input.reason ?? null, input.authorized_by ?? null, now]
    )

    // Create denomination counts
    const denomResults: DenominationCount[] = []
    for (const denom of denominations) {
      if (denom.quantity > 0) {
        const denomId = db.generateId(this.denomIdPrefix)
        await db.execute(
          `INSERT INTO ${this.denomTableName} (id, operation_id, denomination, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [denomId, operationId, denom.denomination, denom.quantity, denom.subtotal]
        )
        denomResults.push({
          id: denomId,
          operation_id: operationId,
          denomination: denom.denomination,
          quantity: denom.quantity,
          subtotal: denom.subtotal
        })
      }
    }

    const operation = (await this.findById(operationId))!
    return { operation, denominations: denomResults }
  }

  async getDenominationsByOperationId(operationId: string): Promise<DenominationCount[]> {
    return await db.query<DenominationCount>(
      `SELECT * FROM ${this.denomTableName} WHERE operation_id = ? ORDER BY denomination DESC`,
      [operationId]
    )
  }

  async getDropsTotal(sessionId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM ${this.tableName}
       WHERE session_id = ? AND type = 'drop'`,
      [sessionId]
    )
    return result?.total || 0
  }

  async getPaidInsTotal(sessionId: string): Promise<number> {
    const result = await db.getOne<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM ${this.tableName}
       WHERE session_id = ? AND type = 'paid_in'`,
      [sessionId]
    )
    return result?.total || 0
  }
}

export const drawerOperationRepository = new DrawerOperationRepository()
export default drawerOperationRepository
