import db from '@/db/database'

export interface PriceHistory {
  id: string
  product_id: string
  old_price: number | null
  new_price: number
  old_cost: number | null
  new_cost: number | null
  change_type: 'price' | 'cost' | 'both'
  reason: string | null
  user_id: string | null
  created_at: string
}

export interface PriceHistoryInput {
  product_id: string
  old_price?: number | null
  new_price: number
  old_cost?: number | null
  new_cost?: number | null
  change_type: 'price' | 'cost' | 'both'
  reason?: string
  user_id?: string
}

export interface DisplayPriceHistory {
  id: string
  productId: string
  oldPrice: number | null
  newPrice: number
  oldCost: number | null
  newCost: number | null
  changeType: 'price' | 'cost' | 'both'
  priceChange: number
  costChange: number
  reason: string | null
  createdAt: string
}

class PriceHistoryRepository {
  async create(data: PriceHistoryInput): Promise<PriceHistory> {
    const id = db.generateId('ph')
    const now = db.getCurrentTimestamp()

    await db.execute(
      `INSERT INTO price_history
       (id, product_id, old_price, new_price, old_cost, new_cost, change_type, reason, user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.product_id,
        data.old_price ?? null,
        data.new_price,
        data.old_cost ?? null,
        data.new_cost ?? null,
        data.change_type,
        data.reason || null,
        data.user_id || null,
        now
      ]
    )

    return this.findById(id) as Promise<PriceHistory>
  }

  async findById(id: string): Promise<PriceHistory | null> {
    return db.getOne<PriceHistory>(
      'SELECT * FROM price_history WHERE id = ?',
      [id]
    )
  }

  async findByProductId(productId: string, limit: number = 50): Promise<PriceHistory[]> {
    return db.query<PriceHistory>(
      `SELECT * FROM price_history
       WHERE product_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [productId, limit]
    )
  }

  async getDisplayHistory(productId: string, limit: number = 50): Promise<DisplayPriceHistory[]> {
    const records = await this.findByProductId(productId, limit)

    return records.map(r => ({
      id: r.id,
      productId: r.product_id,
      oldPrice: r.old_price,
      newPrice: r.new_price,
      oldCost: r.old_cost,
      newCost: r.new_cost,
      changeType: r.change_type,
      priceChange: r.new_price - (r.old_price || 0),
      costChange: (r.new_cost || 0) - (r.old_cost || 0),
      reason: r.reason,
      createdAt: r.created_at
    }))
  }

  async recordPriceChange(
    productId: string,
    oldPrice: number | null,
    newPrice: number,
    reason?: string
  ): Promise<PriceHistory> {
    return this.create({
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      change_type: 'price',
      reason
    })
  }

  async recordCostChange(
    productId: string,
    oldCost: number | null,
    newCost: number,
    reason?: string
  ): Promise<PriceHistory> {
    return this.create({
      product_id: productId,
      old_cost: oldCost,
      new_cost: newCost,
      new_price: 0, // Will be updated
      change_type: 'cost',
      reason
    })
  }

  async recordPriceAndCostChange(
    productId: string,
    oldPrice: number | null,
    newPrice: number,
    oldCost: number | null,
    newCost: number | null,
    reason?: string
  ): Promise<PriceHistory> {
    return this.create({
      product_id: productId,
      old_price: oldPrice,
      new_price: newPrice,
      old_cost: oldCost,
      new_cost: newCost,
      change_type: 'both',
      reason
    })
  }

  async deleteByProductId(productId: string): Promise<number> {
    const result = await db.execute(
      'DELETE FROM price_history WHERE product_id = ?',
      [productId]
    )
    return result.changes
  }
}

export const priceHistoryRepository = new PriceHistoryRepository()
export default priceHistoryRepository
