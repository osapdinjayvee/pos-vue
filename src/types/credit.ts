// Credit/Utang type definitions

export interface CreditLedgerEntry {
  id: string
  customer_id: string
  type: 'charge' | 'payment'
  amount: number
  running_balance: number
  transaction_id: string | null
  reference_number: string | null
  payment_method: string | null
  notes: string | null
  processed_by: string
  created_at: string
}

export interface CreditPaymentInput {
  customerId: string
  amount: number
  paymentMethod: string
  referenceNumber?: string
  notes?: string
}

export interface CreditValidation {
  allowed: boolean
  availableCredit: number
  creditLimit: number
  currentBalance: number
  reason?: string
}
