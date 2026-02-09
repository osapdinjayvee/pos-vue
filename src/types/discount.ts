// Discount-related TypeScript type definitions

// Discount types
export type DiscountType = 'percentage' | 'fixed_amount' | 'senior_citizen' | 'pwd'

// Applicable items scope
export type ApplicableItems = 'all' | 'category' | 'specific_products'

// Discount entity (database record)
export interface Discount {
  id: string
  name: string
  code: string | null
  type: DiscountType
  value: number
  min_purchase: number
  max_discount: number | null
  applicable_items: ApplicableItems
  category_ids: string | null   // JSON array
  product_ids: string | null    // JSON array
  valid_from: string | null
  valid_until: string | null
  is_active: number
  requires_id: number
  created_at: string
  updated_at: string
}

// Discount input for creating/updating
export interface DiscountInput {
  name: string
  code?: string
  type: DiscountType
  value: number
  min_purchase?: number
  max_discount?: number
  applicable_items?: ApplicableItems
  category_ids?: string[]
  product_ids?: string[]
  valid_from?: string
  valid_until?: string
  is_active?: boolean
  requires_id?: boolean
}

// Display-friendly discount
export interface DisplayDiscount {
  id: string
  name: string
  code: string
  type: DiscountType
  typeLabel: string
  value: number
  valueDisplay: string    // "20%" or "PHP 100"
  minPurchase: number
  maxDiscount: number | null
  applicableItems: ApplicableItems
  categoryIds: string[]
  productIds: string[]
  validFrom: string | null
  validUntil: string | null
  isActive: boolean
  requiresId: boolean
  isValid: boolean        // Currently within validity period
}

// Discount application result
export interface DiscountApplication {
  discountId: string
  discountName: string
  discountType: DiscountType
  originalAmount: number
  discountAmount: number
  finalAmount: number
  requiresId: boolean
  idNumber?: string
  idName?: string
}

// Senior/PWD ID capture
export interface DiscountIdCapture {
  idNumber: string
  idName: string
  idType: 'senior_citizen' | 'pwd'
}

// Discount validation result
export interface DiscountValidation {
  isValid: boolean
  reason?: string
  applicableAmount?: number
  discountAmount?: number
}

// Discount type labels
export const DiscountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed Amount',
  senior_citizen: 'Senior Citizen',
  pwd: 'PWD'
}

// Helper to convert DB discount to display format
export function toDisplayDiscount(discount: Discount): DisplayDiscount {
  const now = new Date()
  const validFrom = discount.valid_from ? new Date(discount.valid_from) : null
  const validUntil = discount.valid_until ? new Date(discount.valid_until) : null

  let isValid = discount.is_active === 1
  if (validFrom && now < validFrom) isValid = false
  if (validUntil && now > validUntil) isValid = false

  // Format value display
  let valueDisplay = ''
  if (discount.type === 'percentage' || discount.type === 'senior_citizen' || discount.type === 'pwd') {
    valueDisplay = `${discount.value}%`
  } else {
    valueDisplay = `PHP ${discount.value.toFixed(2)}`
  }

  return {
    id: discount.id,
    name: discount.name,
    code: discount.code || '',
    type: discount.type,
    typeLabel: DiscountTypeLabels[discount.type],
    value: discount.value,
    valueDisplay,
    minPurchase: discount.min_purchase,
    maxDiscount: discount.max_discount,
    applicableItems: discount.applicable_items,
    categoryIds: discount.category_ids ? JSON.parse(discount.category_ids) : [],
    productIds: discount.product_ids ? JSON.parse(discount.product_ids) : [],
    validFrom: discount.valid_from,
    validUntil: discount.valid_until,
    isActive: discount.is_active === 1,
    requiresId: discount.requires_id === 1,
    isValid
  }
}

// Calculate discount amount
export function calculateDiscountAmount(
  discount: Discount | DisplayDiscount,
  subtotal: number,
  applicableAmount?: number
): number {
  const base = applicableAmount ?? subtotal
  const value = discount.value

  let discountAmount = 0

  // Check minimum purchase
  const minPurchase = 'min_purchase' in discount ? discount.min_purchase : discount.minPurchase
  if (subtotal < minPurchase) {
    return 0
  }

  // Calculate based on type
  const type = discount.type
  if (type === 'percentage' || type === 'senior_citizen' || type === 'pwd') {
    discountAmount = base * (value / 100)
  } else {
    discountAmount = value
  }

  // Apply max discount cap
  const maxDiscount = 'max_discount' in discount ? discount.max_discount : discount.maxDiscount
  if (maxDiscount && discountAmount > maxDiscount) {
    discountAmount = maxDiscount
  }

  // Don't exceed the applicable amount
  if (discountAmount > base) {
    discountAmount = base
  }

  return Math.round(discountAmount * 100) / 100
}

// Validate discount applicability
export function validateDiscount(
  discount: Discount | DisplayDiscount,
  subtotal: number,
  itemCategoryIds?: string[],
  itemProductIds?: string[]
): DiscountValidation {
  // Check if active
  const isActive = 'is_active' in discount ? discount.is_active === 1 : discount.isActive
  if (!isActive) {
    return { isValid: false, reason: 'Discount is not active' }
  }

  // Check validity period
  const now = new Date()
  const validFrom = 'valid_from' in discount ? discount.valid_from : discount.validFrom
  const validUntil = 'valid_until' in discount ? discount.valid_until : discount.validUntil

  if (validFrom && new Date(validFrom) > now) {
    return { isValid: false, reason: 'Discount is not yet valid' }
  }
  if (validUntil && new Date(validUntil) < now) {
    return { isValid: false, reason: 'Discount has expired' }
  }

  // Check minimum purchase
  const minPurchase = 'min_purchase' in discount ? discount.min_purchase : discount.minPurchase
  if (subtotal < minPurchase) {
    return {
      isValid: false,
      reason: `Minimum purchase of PHP ${minPurchase.toFixed(2)} required`
    }
  }

  // Check applicable items
  const applicableItems = 'applicable_items' in discount
    ? discount.applicable_items
    : discount.applicableItems

  if (applicableItems === 'category' && itemCategoryIds) {
    const categoryIds = 'category_ids' in discount
      ? (discount.category_ids ? JSON.parse(discount.category_ids) : [])
      : discount.categoryIds

    const hasApplicable = itemCategoryIds.some(id => categoryIds.includes(id))
    if (!hasApplicable) {
      return { isValid: false, reason: 'No items in cart qualify for this discount' }
    }
  }

  if (applicableItems === 'specific_products' && itemProductIds) {
    const productIds = 'product_ids' in discount
      ? (discount.product_ids ? JSON.parse(discount.product_ids) : [])
      : discount.productIds

    const hasApplicable = itemProductIds.some(id => productIds.includes(id))
    if (!hasApplicable) {
      return { isValid: false, reason: 'No items in cart qualify for this discount' }
    }
  }

  const discountAmount = calculateDiscountAmount(discount, subtotal)

  return {
    isValid: true,
    applicableAmount: subtotal,
    discountAmount
  }
}

// Check if discount requires ID
export function requiresIdCapture(discount: Discount | DisplayDiscount): boolean {
  const requiresId = 'requires_id' in discount ? discount.requires_id === 1 : discount.requiresId
  const type = discount.type
  return requiresId || type === 'senior_citizen' || type === 'pwd'
}

// ============================================================
// Promotional Discount Types (Discount Management Feature)
// ============================================================

export type PromoDiscountType = 'percentage' | 'fixed_amount'

// Extended discount entity with schedule fields
export interface PromoDiscount {
  id: string
  name: string
  code: string | null
  type: PromoDiscountType
  value: number
  auto_apply: number            // 0 or 1
  is_active: number
  start_date: string | null
  end_date: string | null
  start_time: string | null     // HH:MM
  end_time: string | null       // HH:MM
  weekdays: string | null       // JSON array [0,1,2...6] (0=Sun)
  min_purchase: number
  max_discount: number | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface PromoDiscountInput {
  name: string
  code?: string
  type: PromoDiscountType
  value: number
  auto_apply?: boolean
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  start_time?: string | null
  end_time?: string | null
  weekdays?: number[] | null   // [0-6]
  min_purchase?: number
  max_discount?: number | null
  productIds?: string[]
  categoryIds?: string[]
}

export interface DiscountScope {
  id: string
  discount_id: string
  product_id: string | null
  category_id: string | null
  created_at: string
}

// Eligibility result for POS
export interface EligibleDiscount {
  discount: PromoDiscount
  computedAmount: number      // Actual amount off for this line item
  isAutoApply: boolean
}
