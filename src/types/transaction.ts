// Transaction-related TypeScript type definitions

// Transaction status
export type TransactionStatus = 'completed' | 'voided'

// Tax types (aligned with product tax types)
export type TaxType = 'vatable' | 'exempt' | 'zero_rated'

// Transaction entity (database record)
export interface Transaction {
  id: string
  or_number: string
  shift_id: string | null
  user_id: string
  terminal_id: string
  branch_id: string
  customer_id: string | null
  subtotal: number
  discount_total: number
  vatable_sales: number
  vat_amount: number
  vat_exempt_sales: number
  zero_rated_sales: number
  total_amount: number
  discount_type: string | null
  discount_id_number: string | null
  discount_id_name: string | null
  status: TransactionStatus
  notes: string | null
  created_at: string
  updated_at: string
  synced_at: string | null
}

// Transaction input for creating new transactions
export interface TransactionInput {
  or_number: string
  shift_id?: string
  user_id: string
  terminal_id: string
  branch_id: string
  customer_id?: string
  subtotal: number
  discount_total?: number
  vatable_sales: number
  vat_amount: number
  vat_exempt_sales?: number
  zero_rated_sales?: number
  total_amount: number
  discount_type?: string
  discount_id_number?: string
  discount_id_name?: string
  status?: TransactionStatus
  notes?: string
}

// Transaction item entity (database record)
export interface TransactionItem {
  id: string
  transaction_id: string
  product_id: string
  variant_id: string | null
  product_name: string
  variant_name: string | null
  sku: string | null
  barcode: string | null
  quantity: number
  unit_price: number
  discount: number
  line_total: number
  tax_type: TaxType
  vatable_sales: number
  vat_amount: number
  vat_exempt_sales: number
  zero_rated_sales: number
  created_at: string
}

// Transaction item input
export interface TransactionItemInput {
  transaction_id: string
  product_id: string
  variant_id?: string | null
  product_name: string
  variant_name?: string | null
  sku?: string | null
  barcode?: string | null
  quantity: number
  unit_price: number
  discount?: number
  line_total: number
  tax_type: TaxType
  vatable_sales?: number
  vat_amount?: number
  vat_exempt_sales?: number
  zero_rated_sales?: number
}

// Display-friendly transaction with items and payments
export interface DisplayTransaction {
  id: string
  orNumber: string
  shiftId: string | null
  userId: string
  terminalId: string
  branchId: string
  customerId: string | null
  subtotal: number
  discountTotal: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  totalAmount: number
  discountType: string | null
  discountIdNumber: string | null
  discountIdName: string | null
  status: TransactionStatus
  notes: string | null
  createdAt: string
  items: DisplayTransactionItem[]
  payments: DisplayPayment[]
}

// Display-friendly transaction item
export interface DisplayTransactionItem {
  id: string
  transactionId: string
  variantId: string | null
  productName: string
  variantName: string | null
  sku: string
  barcode: string
  quantity: number
  unitPrice: number
  lineDiscount: number
  lineTotal: number
  taxType: TaxType
  taxTypeLabel: string
  vatableSales: number
  vatAmount: number
}

// Display payment (imported from payment types)
export interface DisplayPayment {
  id: string
  transactionId: string
  method: string
  methodLabel: string
  amount: number
  tendered: number | null
  changeAmount: number | null
  referenceNumber: string | null
  cardLastFour: string | null
  cardType: string | null
}

// VAT breakdown for display
export interface VATBreakdown {
  vatableSales: number      // Net sales subject to VAT (excl. VAT)
  vatAmount: number         // 12% VAT
  vatExemptSales: number    // VAT-exempt sales
  zeroRatedSales: number    // Zero-rated sales
  totalSales: number        // Total including VAT
}

// Cart item for POS interface
export interface CartItem {
  id: string                // Temporary cart item ID
  productId: string
  variantId?: string
  productName: string
  variantName?: string
  sku?: string
  barcode?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  taxType: TaxType
  discount?: number         // Line item discount
}

// Cart totals
export interface CartTotals {
  itemCount: number
  subtotal: number
  discountTotal: number
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  grandTotal: number
}

// Tax type labels
export const TaxTypeLabels: Record<TaxType, string> = {
  vatable: 'VATable',
  exempt: 'VAT Exempt',
  zero_rated: 'Zero-Rated'
}

// Helper to convert DB transaction to display format
export function toDisplayTransaction(
  tx: Transaction,
  items: DisplayTransactionItem[] = [],
  payments: DisplayPayment[] = []
): DisplayTransaction {
  return {
    id: tx.id,
    orNumber: tx.or_number,
    shiftId: tx.shift_id,
    userId: tx.user_id,
    terminalId: tx.terminal_id,
    branchId: tx.branch_id,
    customerId: tx.customer_id,
    subtotal: tx.subtotal,
    discountTotal: tx.discount_total,
    vatableSales: tx.vatable_sales,
    vatAmount: tx.vat_amount,
    vatExemptSales: tx.vat_exempt_sales,
    zeroRatedSales: tx.zero_rated_sales,
    totalAmount: tx.total_amount,
    discountType: tx.discount_type,
    discountIdNumber: tx.discount_id_number,
    discountIdName: tx.discount_id_name,
    status: tx.status,
    notes: tx.notes,
    createdAt: tx.created_at,
    items,
    payments
  }
}

// Helper to convert DB transaction item to display format
export function toDisplayTransactionItem(item: TransactionItem): DisplayTransactionItem {
  return {
    id: item.id,
    transactionId: item.transaction_id,
    variantId: item.variant_id,
    productName: item.product_name,
    variantName: item.variant_name,
    sku: item.sku || '',
    barcode: item.barcode || '',
    quantity: item.quantity,
    unitPrice: item.unit_price,
    lineDiscount: item.discount,
    lineTotal: item.line_total,
    taxType: item.tax_type,
    taxTypeLabel: TaxTypeLabels[item.tax_type],
    vatableSales: item.vatable_sales,
    vatAmount: item.vat_amount
  }
}
