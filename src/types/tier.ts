// Membership Tier TypeScript type definitions

// =====================
// Membership Tier Entity
// =====================

export interface MembershipTier {
  id: string
  name: string
  min_spend: number
  discount_rate: number
  points_multiplier: number
  benefits: string | null
  display_order: number
  is_active: number
  created_at?: string
  updated_at?: string
}

export interface MembershipTierInput {
  name: string
  min_spend: number
  discount_rate?: number
  points_multiplier?: number
  benefits?: string[]
  display_order?: number
  is_active?: boolean
}

export interface TierBenefits {
  discountRate: number
  pointsMultiplier: number
  benefits: string[]
}

export interface DisplayMembershipTier {
  id: string
  name: string
  minSpend: number
  discountRate: number
  pointsMultiplier: number
  benefits: string[]
  displayOrder: number
  isActive: boolean
}

// =====================
// Default Tiers
// =====================

export const DEFAULT_TIERS: Omit<MembershipTier, 'created_at' | 'updated_at'>[] = [
  {
    id: 'tier-bronze',
    name: 'Bronze',
    min_spend: 0,
    discount_rate: 0,
    points_multiplier: 1,
    benefits: JSON.stringify(['Basic loyalty points earning']),
    display_order: 1,
    is_active: 1
  },
  {
    id: 'tier-silver',
    name: 'Silver',
    min_spend: 10000,
    discount_rate: 0.03,
    points_multiplier: 1.25,
    benefits: JSON.stringify(['3% member discount', '1.25x points multiplier']),
    display_order: 2,
    is_active: 1
  },
  {
    id: 'tier-gold',
    name: 'Gold',
    min_spend: 50000,
    discount_rate: 0.05,
    points_multiplier: 1.5,
    benefits: JSON.stringify(['5% member discount', '1.5x points multiplier']),
    display_order: 3,
    is_active: 1
  },
  {
    id: 'tier-platinum',
    name: 'Platinum',
    min_spend: 100000,
    discount_rate: 0.10,
    points_multiplier: 2,
    benefits: JSON.stringify(['10% member discount', '2x points multiplier']),
    display_order: 4,
    is_active: 1
  }
]

// =====================
// Helper Functions
// =====================

export function toDisplayMembershipTier(tier: MembershipTier): DisplayMembershipTier {
  return {
    id: tier.id,
    name: tier.name,
    minSpend: tier.min_spend,
    discountRate: tier.discount_rate,
    pointsMultiplier: tier.points_multiplier,
    benefits: tier.benefits ? JSON.parse(tier.benefits) : [],
    displayOrder: tier.display_order,
    isActive: tier.is_active === 1
  }
}

export function parseTierBenefits(tier: MembershipTier): TierBenefits {
  return {
    discountRate: tier.discount_rate,
    pointsMultiplier: tier.points_multiplier,
    benefits: tier.benefits ? JSON.parse(tier.benefits) : []
  }
}
