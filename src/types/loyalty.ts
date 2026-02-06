// Loyalty Program TypeScript type definitions

// =====================
// Enums and Types
// =====================

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'expire' | 'adjustment'

export const LoyaltyTransactionTypeLabels: Record<LoyaltyTransactionType, string> = {
  earn: 'Earned',
  redeem: 'Redeemed',
  expire: 'Expired',
  adjustment: 'Adjustment'
}

// =====================
// Loyalty Transaction Entity
// =====================

export interface LoyaltyTransaction {
  id: string
  customer_id: string
  type: LoyaltyTransactionType
  points: number
  balance_after: number
  transaction_id: string | null
  reason: string | null
  created_at: string
  synced_at: string | null
}

export interface LoyaltyTransactionInput {
  customer_id: string
  type: LoyaltyTransactionType
  points: number
  balance_after: number
  transaction_id?: string
  reason?: string
}

export interface DisplayLoyaltyTransaction {
  id: string
  customerId: string
  type: LoyaltyTransactionType
  typeLabel: string
  points: number
  balanceAfter: number
  transactionId: string | null
  reason: string
  createdAt: string
}

// =====================
// Loyalty Config Entity
// =====================

export interface LoyaltyConfig {
  id: string
  earn_rate: number
  redeem_rate: number
  expiry_days: number
  min_redemption: number
  is_active: number
  created_at?: string
  updated_at?: string
}

export interface LoyaltyConfigInput {
  earn_rate: number
  redeem_rate: number
  expiry_days?: number
  min_redemption?: number
  is_active?: boolean
}

export const DEFAULT_LOYALTY_CONFIG: Omit<LoyaltyConfig, 'id' | 'created_at' | 'updated_at'> = {
  earn_rate: 0.01,       // 1 point per PHP 100
  redeem_rate: 0.10,     // 10 points = PHP 1
  expiry_days: 365,      // 1 year
  min_redemption: 100,   // 100 points minimum
  is_active: 1
}

// =====================
// Helper Functions
// =====================

export function toDisplayLoyaltyTransaction(lt: LoyaltyTransaction): DisplayLoyaltyTransaction {
  return {
    id: lt.id,
    customerId: lt.customer_id,
    type: lt.type,
    typeLabel: LoyaltyTransactionTypeLabels[lt.type],
    points: lt.points,
    balanceAfter: lt.balance_after,
    transactionId: lt.transaction_id,
    reason: lt.reason || '',
    createdAt: lt.created_at
  }
}
