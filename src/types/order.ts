// Order, Customer, and Payment related TypeScript type definitions

// =====================
// Enums and Types
// =====================

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'completed' | 'cancelled' | 'refunded' | 'void'
export type OrderType = 'sale' | 'return' | 'exchange' | 'layaway'
export type CustomerType = 'retail' | 'wholesale' | 'vip'
export type PaymentMethodCode = 'cash' | 'card' | 'gcash' | 'maya' | 'bank_transfer' | 'credit' | 'points' | 'other'
export type PaymentMethodType = 'cash' | 'card' | 'ewallet' | 'bank' | 'credit' | 'other'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'void'
export type DiscountType = 'percentage' | 'fixed' | 'buy_x_get_y'
export type DiscountApplicableTo = 'all' | 'category' | 'product' | 'customer_type'

// =====================
// Customer Entity
// =====================

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string
  tax_id: string | null
  customer_type: CustomerType
  credit_limit: number
  current_balance: number
  loyalty_points: number
  tier_id: string | null
  lifetime_spend: number
  notes: string | null
  is_active: number
  created_at: string
  updated_at: string
  synced_at: string | null
}

export interface CustomerInput {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  tax_id?: string
  customer_type?: CustomerType
  credit_limit?: number
  notes?: string
  is_active?: boolean
}

export interface DisplayCustomer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  postalCode: string
  country: string
  taxId: string
  customerType: CustomerType
  customerTypeLabel: string
  creditLimit: number
  currentBalance: number
  loyaltyPoints: number
  tierId: string | null
  lifetimeSpend: number
  notes: string
  isActive: boolean
  totalOrders: number
  totalSpent: number
  createdAt: string
  updatedAt: string
}

// =====================
// Order Entity
// =====================

export interface Order {
  id: string
  order_number: string
  customer_id: string | null
  status: OrderStatus
  order_type: OrderType
  subtotal: number
  discount_amount: number
  discount_type: 'percentage' | 'fixed' | 'coupon' | null
  discount_reason: string | null
  tax_amount: number
  total: number
  amount_paid: number
  change_amount: number
  notes: string | null
  user_id: string
  terminal_id: string
  branch_id: string
  shift_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  synced_at: string | null
  // Joined fields
  customer_name?: string
}

export interface OrderInput {
  order_number: string
  customer_id?: string
  status?: OrderStatus
  order_type?: OrderType
  subtotal: number
  discount_amount?: number
  discount_type?: 'percentage' | 'fixed' | 'coupon'
  discount_reason?: string
  tax_amount?: number
  total: number
  amount_paid?: number
  change_amount?: number
  notes?: string
  user_id: string
  terminal_id: string
  branch_id: string
  shift_id?: string
}

export interface DisplayOrder {
  id: string
  orderNumber: string
  customerId: string | null
  customerName: string
  status: OrderStatus
  statusLabel: string
  orderType: OrderType
  orderTypeLabel: string
  subtotal: number
  discountAmount: number
  discountType: string | null
  discountReason: string
  taxAmount: number
  total: number
  amountPaid: number
  changeAmount: number
  notes: string
  userId: string
  terminalId: string
  branchId: string
  shiftId: string | null
  itemCount: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

// =====================
// Order Item Entity
// =====================

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string | null
  batch_id: string | null
  quantity: number
  unit_price: number
  cost_price: number
  discount_amount: number
  tax_amount: number
  total: number
  notes: string | null
  created_at: string
  // Joined fields
  product_name?: string
  variant_name?: string
  sku?: string
}

export interface OrderItemInput {
  order_id: string
  product_id: string
  variant_id?: string
  batch_id?: string
  quantity: number
  unit_price: number
  cost_price?: number
  discount_amount?: number
  tax_amount?: number
  total: number
  notes?: string
}

export interface DisplayOrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  variantId: string | null
  variantName: string
  batchId: string | null
  sku: string
  quantity: number
  unitPrice: number
  costPrice: number
  discountAmount: number
  taxAmount: number
  total: number
  notes: string
  createdAt: string
}

// =====================
// Payment Entity
// =====================

export interface Payment {
  id: string
  order_id: string
  payment_method: PaymentMethodCode
  amount: number
  reference_number: string | null
  card_type: string | null
  card_last_four: string | null
  approval_code: string | null
  status: PaymentStatus
  notes: string | null
  processed_at: string
  created_at: string
  synced_at: string | null
}

export interface PaymentInput {
  order_id: string
  payment_method: PaymentMethodCode
  amount: number
  reference_number?: string
  card_type?: string
  card_last_four?: string
  approval_code?: string
  status?: PaymentStatus
  notes?: string
  processed_at: string
}

export interface DisplayPayment {
  id: string
  orderId: string
  paymentMethod: PaymentMethodCode
  paymentMethodLabel: string
  amount: number
  referenceNumber: string
  cardType: string
  cardLastFour: string
  approvalCode: string
  status: PaymentStatus
  statusLabel: string
  notes: string
  processedAt: string
  createdAt: string
}

// =====================
// Payment Method Configuration
// =====================

export interface PaymentMethod {
  id: string
  name: string
  code: PaymentMethodCode
  type: PaymentMethodType
  is_active: number
  requires_reference: number
  icon: string | null
  display_order: number
  settings: string | null
  created_at: string
  updated_at: string
}

export interface DisplayPaymentMethod {
  id: string
  name: string
  code: PaymentMethodCode
  type: PaymentMethodType
  isActive: boolean
  requiresReference: boolean
  icon: string
  displayOrder: number
  settings: Record<string, any>
}

// =====================
// Discount Entity
// =====================

export interface Discount {
  id: string
  name: string
  code: string | null
  type: DiscountType
  value: number
  min_purchase: number
  max_discount: number | null
  start_date: string | null
  end_date: string | null
  usage_limit: number | null
  usage_count: number
  applicable_to: DiscountApplicableTo
  applicable_ids: string | null
  is_active: number
  created_at: string
  updated_at: string
}

export interface DiscountInput {
  name: string
  code?: string
  type: DiscountType
  value: number
  min_purchase?: number
  max_discount?: number
  start_date?: string
  end_date?: string
  usage_limit?: number
  applicable_to?: DiscountApplicableTo
  applicable_ids?: string[]
  is_active?: boolean
}

export interface DisplayDiscount {
  id: string
  name: string
  code: string
  type: DiscountType
  typeLabel: string
  value: number
  formattedValue: string
  minPurchase: number
  maxDiscount: number | null
  startDate: string | null
  endDate: string | null
  usageLimit: number | null
  usageCount: number
  applicableTo: DiscountApplicableTo
  applicableIds: string[]
  isActive: boolean
  isExpired: boolean
  isValid: boolean
  createdAt: string
  updatedAt: string
}

// =====================
// Labels
// =====================

export const OrderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  void: 'Void'
}

export const OrderTypeLabels: Record<OrderType, string> = {
  sale: 'Sale',
  return: 'Return',
  exchange: 'Exchange',
  layaway: 'Layaway'
}

export const CustomerTypeLabels: Record<CustomerType, string> = {
  retail: 'Retail',
  wholesale: 'Wholesale',
  vip: 'VIP'
}

export const PaymentMethodLabels: Record<PaymentMethodCode, string> = {
  cash: 'Cash',
  card: 'Credit/Debit Card',
  gcash: 'GCash',
  maya: 'Maya',
  bank_transfer: 'Bank Transfer',
  credit: 'Store Credit',
  points: 'Loyalty Points',
  other: 'Other'
}

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  failed: 'Failed',
  refunded: 'Refunded',
  void: 'Void'
}

export const DiscountTypeLabels: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed: 'Fixed Amount',
  buy_x_get_y: 'Buy X Get Y'
}

// =====================
// Helper Functions
// =====================

export function toDisplayCustomer(
  customer: Customer,
  totalOrders: number = 0,
  totalSpent: number = 0
): DisplayCustomer {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || '',
    city: customer.city || '',
    postalCode: customer.postal_code || '',
    country: customer.country,
    taxId: customer.tax_id || '',
    customerType: customer.customer_type,
    customerTypeLabel: CustomerTypeLabels[customer.customer_type],
    creditLimit: customer.credit_limit,
    currentBalance: customer.current_balance,
    loyaltyPoints: customer.loyalty_points,
    tierId: customer.tier_id || null,
    lifetimeSpend: customer.lifetime_spend || 0,
    notes: customer.notes || '',
    isActive: customer.is_active === 1,
    totalOrders,
    totalSpent,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at
  }
}

export function toDisplayOrder(
  order: Order,
  itemCount: number = 0
): DisplayOrder {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerName: order.customer_name || 'Walk-in Customer',
    status: order.status,
    statusLabel: OrderStatusLabels[order.status],
    orderType: order.order_type,
    orderTypeLabel: OrderTypeLabels[order.order_type],
    subtotal: order.subtotal,
    discountAmount: order.discount_amount,
    discountType: order.discount_type,
    discountReason: order.discount_reason || '',
    taxAmount: order.tax_amount,
    total: order.total,
    amountPaid: order.amount_paid,
    changeAmount: order.change_amount,
    notes: order.notes || '',
    userId: order.user_id,
    terminalId: order.terminal_id,
    branchId: order.branch_id,
    shiftId: order.shift_id,
    itemCount,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    completedAt: order.completed_at
  }
}

export function toDisplayOrderItem(item: OrderItem): DisplayOrderItem {
  return {
    id: item.id,
    orderId: item.order_id,
    productId: item.product_id,
    productName: item.product_name || '',
    variantId: item.variant_id,
    variantName: item.variant_name || '',
    batchId: item.batch_id,
    sku: item.sku || '',
    quantity: item.quantity,
    unitPrice: item.unit_price,
    costPrice: item.cost_price,
    discountAmount: item.discount_amount,
    taxAmount: item.tax_amount,
    total: item.total,
    notes: item.notes || '',
    createdAt: item.created_at
  }
}

export function toDisplayPayment(payment: Payment): DisplayPayment {
  return {
    id: payment.id,
    orderId: payment.order_id,
    paymentMethod: payment.payment_method,
    paymentMethodLabel: PaymentMethodLabels[payment.payment_method],
    amount: payment.amount,
    referenceNumber: payment.reference_number || '',
    cardType: payment.card_type || '',
    cardLastFour: payment.card_last_four || '',
    approvalCode: payment.approval_code || '',
    status: payment.status,
    statusLabel: PaymentStatusLabels[payment.status],
    notes: payment.notes || '',
    processedAt: payment.processed_at,
    createdAt: payment.created_at
  }
}

export function toDisplayPaymentMethod(method: PaymentMethod): DisplayPaymentMethod {
  return {
    id: method.id,
    name: method.name,
    code: method.code,
    type: method.type,
    isActive: method.is_active === 1,
    requiresReference: method.requires_reference === 1,
    icon: method.icon || '',
    displayOrder: method.display_order,
    settings: method.settings ? JSON.parse(method.settings) : {}
  }
}

export function toDisplayDiscount(discount: Discount): DisplayDiscount {
  const now = new Date()
  const endDate = discount.end_date ? new Date(discount.end_date) : null
  const startDate = discount.start_date ? new Date(discount.start_date) : null

  const isExpired = endDate ? now > endDate : false
  const isStarted = startDate ? now >= startDate : true
  const isWithinUsageLimit = discount.usage_limit
    ? discount.usage_count < discount.usage_limit
    : true
  const isValid = discount.is_active === 1 && !isExpired && isStarted && isWithinUsageLimit

  let formattedValue = ''
  if (discount.type === 'percentage') {
    formattedValue = `${discount.value}%`
  } else if (discount.type === 'fixed') {
    formattedValue = `₱${discount.value.toFixed(2)}`
  } else {
    formattedValue = `${discount.value}`
  }

  return {
    id: discount.id,
    name: discount.name,
    code: discount.code || '',
    type: discount.type,
    typeLabel: DiscountTypeLabels[discount.type],
    value: discount.value,
    formattedValue,
    minPurchase: discount.min_purchase,
    maxDiscount: discount.max_discount,
    startDate: discount.start_date,
    endDate: discount.end_date,
    usageLimit: discount.usage_limit,
    usageCount: discount.usage_count,
    applicableTo: discount.applicable_to,
    applicableIds: discount.applicable_ids ? JSON.parse(discount.applicable_ids) : [],
    isActive: discount.is_active === 1,
    isExpired,
    isValid,
    createdAt: discount.created_at,
    updatedAt: discount.updated_at
  }
}

// =====================
// Cart/Checkout Types
// =====================

export interface CartItem {
  productId: string
  variantId: string | null
  batchId: string | null
  name: string
  sku: string
  quantity: number
  unitPrice: number
  costPrice: number
  discountAmount: number
  taxAmount: number
  total: number
  notes: string
}

export interface CheckoutData {
  customerId: string | null
  items: CartItem[]
  subtotal: number
  discountAmount: number
  discountType: 'percentage' | 'fixed' | 'coupon' | null
  discountReason: string
  taxAmount: number
  total: number
  payments: Array<{
    method: PaymentMethodCode
    amount: number
    referenceNumber?: string
  }>
  notes: string
}
