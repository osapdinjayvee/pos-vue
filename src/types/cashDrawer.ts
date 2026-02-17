// Cash Drawer Management Types

export type DrawerStatus = 'open' | 'closed'
export type OperationType = 'open' | 'close' | 'drop' | 'paid_in' | 'no_sale'

// Philippine currency denominations
export const PHP_DENOMINATIONS = [
  // Bills
  { value: 1000, label: '₱1,000', type: 'bill' as const },
  { value: 500, label: '₱500', type: 'bill' as const },
  { value: 200, label: '₱200', type: 'bill' as const },
  { value: 100, label: '₱100', type: 'bill' as const },
  { value: 50, label: '₱50', type: 'bill' as const },
  { value: 20, label: '₱20', type: 'bill' as const },
  // Coins
  { value: 10, label: '₱10', type: 'coin' as const },
  { value: 5, label: '₱5', type: 'coin' as const },
  { value: 1, label: '₱1', type: 'coin' as const },
  { value: 0.25, label: '25¢', type: 'coin' as const },
] as const

export type DenominationType = 'bill' | 'coin'

export interface Denomination {
  value: number
  label: string
  type: DenominationType
}

// Database entities
export interface DrawerSession {
  id: string
  shift_id: string
  user_id: string
  terminal_id: string
  opening_amount: number
  expected_amount: number | null
  closing_amount: number | null
  variance: number | null
  variance_reason: string | null
  status: DrawerStatus
  opened_at: string
  closed_at: string | null
  synced_at: string | null
}

export interface DrawerSessionInput {
  shift_id: string
  user_id: string
  terminal_id: string
  opening_amount: number
}

export interface DrawerOperation {
  id: string
  session_id: string
  type: OperationType
  amount: number | null
  reason: string | null
  authorized_by: string | null
  created_at: string
}

export interface DrawerOperationInput {
  session_id: string
  type: OperationType
  amount?: number
  reason?: string
  authorized_by?: string
}

export interface DenominationCount {
  id: string
  operation_id: string
  denomination: number
  quantity: number
  subtotal: number
}

export interface DenominationCountInput {
  denomination: number
  quantity: number
  subtotal: number
}

export interface VarianceConfig {
  threshold: number
  requireReason: boolean
  alertSupervisor: boolean
}

export const DEFAULT_VARIANCE_CONFIG: VarianceConfig = {
  threshold: 100,
  requireReason: true,
  alertSupervisor: true,
}

// Display types
export interface DisplayDenominationCount {
  denomination: number
  label: string
  type: DenominationType
  quantity: number
  subtotal: number
}

export interface DisplayDrawerSession {
  id: string
  shiftId: string
  userId: string
  terminalId: string
  openingAmount: number
  expectedAmount: number | null
  closingAmount: number | null
  variance: number | null
  varianceReason: string | null
  status: DrawerStatus
  openedAt: string
  closedAt: string | null
}

export interface DrawerOperationDisplay {
  id: string
  type: OperationType
  amount: number | null
  reason: string | null
  authorizedBy: string | null
  createdAt: string
}

export interface RefundDetail {
  orNumber: string
  amount: number
  createdAt: string
}

export interface ExpectedCashBreakdown {
  openingAmount: number
  cashSales: number
  cashRefunds: number
  refundDetails: RefundDetail[]
  totalDrops: number
  totalPaidIns: number
  expectedCash: number
}
