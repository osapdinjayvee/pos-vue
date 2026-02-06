// EIS (Electronic Invoicing System) TypeScript type definitions

// EIS submission status
export type EISSubmissionStatus = 'pending' | 'submitted' | 'failed' | 'rejected'

// EIS batch status
export type EISBatchStatus = 'processing' | 'completed' | 'partial'

// EIS environment
export type EISEnvironment = 'test' | 'production'

// EIS error classification
export type EISErrorType = 'temporary' | 'validation' | 'rejected' | 'duplicate'

// EIS configuration entity (database record)
export interface EISConfig {
  id: string
  tin: string
  branch_code: string
  api_key: string
  api_secret: string
  environment: EISEnvironment
  endpoint_url: string | null
  is_enabled: number // SQLite boolean
  batch_size: number
  submission_interval_mins: number
  max_retries: number
  api_version: string
  created_at: string
  updated_at: string
}

// EIS configuration input
export interface EISConfigInput {
  tin: string
  branch_code: string
  api_key: string
  api_secret: string
  environment?: EISEnvironment
  endpoint_url?: string | null
  is_enabled?: number
  batch_size?: number
  submission_interval_mins?: number
  max_retries?: number
  api_version?: string
}

// EIS submission entity (database record)
export interface EISSubmission {
  id: string
  transaction_id: string
  or_number: string
  payload: string // JSON string
  status: EISSubmissionStatus
  bir_reference: string | null
  batch_id: string | null
  attempts: number
  last_attempt: string | null
  last_error: string | null
  submitted_at: string | null
  created_at: string
}

// EIS submission input
export interface EISSubmissionInput {
  transaction_id: string
  or_number: string
  payload: string
  status?: EISSubmissionStatus
  bir_reference?: string | null
  batch_id?: string | null
  attempts?: number
  last_attempt?: string | null
  last_error?: string | null
  submitted_at?: string | null
}

// EIS batch entity (database record)
export interface EISBatch {
  id: string
  item_count: number
  success_count: number
  failed_count: number
  status: EISBatchStatus
  submitted_at: string
  completed_at: string | null
}

// EIS payload per BIR specification
export interface EISPayload {
  tin: string
  branch_code: string
  or_number: string
  or_date: string
  gross_sales: number
  vat_amount: number
  vatable_sales: number
  vat_exempt_sales: number
  zero_rated_sales: number
  net_sales: number
  discount_amount: number
  items: EISLineItem[]
  machine_id: string
  ptu_number: string
  payment_method: string
  transaction_type: 'sale' | 'void' | 'refund'
}

// EIS line item
export interface EISLineItem {
  description: string
  quantity: number
  unit_price: number
  amount: number
  vat_amount: number
  tax_type: string
}

// EIS submission result from BIR API
export interface EISSubmissionResult {
  success: boolean
  bir_reference?: string
  error?: string
  errorType?: EISErrorType
}

// EIS batch submission response
export interface EISBatchResponse {
  batch_id: string
  results: Array<{
    or_number: string
    success: boolean
    bir_reference?: string
    error?: string
    errorType?: EISErrorType
  }>
}

// EIS connection test result
export interface EISConnectionTestResult {
  success: boolean
  message: string
  latencyMs: number
}

// EIS status counts
export interface EISStatusCounts {
  pending: number
  submitted: number
  failed: number
  rejected: number
}

// EIS summary report
export interface EISSummaryReport {
  totalSubmissions: number
  submittedCount: number
  failedCount: number
  rejectedCount: number
  pendingCount: number
  totalGrossSales: number
  totalVatAmount: number
  totalNetSales: number
  totalDiscounts: number
}

// EIS Z-Reading comparison
export interface EISZReadingComparison {
  eisGross: number
  zReadingGross: number
  difference: number
  matchPercentage: number
  discrepancies: Array<{
    date: string
    eisAmount: number
    zReadingAmount: number
    difference: number
  }>
}

// EIS daily breakdown
export interface EISDailyBreakdown {
  date: string
  submittedCount: number
  grossSales: number
  vatAmount: number
  netSales: number
  failedCount: number
}

// BIR EIS endpoint URLs
export const EIS_ENDPOINTS = {
  test: 'https://eis-sandbox.bir.gov.ph/api/v1',
  production: 'https://eis.bir.gov.ph/api/v1'
} as const
