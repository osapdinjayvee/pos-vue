/**
 * Sales Report Type Definitions
 * Types for daily sales, VAT, product, and cashier reports
 */

// =====================
// Date Range Filter
// =====================

export interface DateRangeFilter {
  dateFrom: string
  dateTo: string
  branchId?: string
  terminalId?: string
}

export interface SingleDateFilter {
  date: string
  branchId?: string
  terminalId?: string
}

// =====================
// Sales Aggregate Entity
// =====================

export interface SalesAggregate {
  id: string
  date: string
  terminal_id: string
  branch_id: string
  gross_sales: number
  discount_total: number
  net_sales: number
  vatable_sales: number
  vat_amount: number
  vat_exempt_sales: number
  zero_rated_sales: number
  transaction_count: number
  void_count: number
  void_amount: number
  refund_count: number
  refund_amount: number
  cash_sales: number
  card_sales: number
  other_sales: number
  average_ticket: number
  created_at: string
}

// =====================
// Daily Sales Report
// =====================

export interface DailySalesReport {
  date: string
  formattedDate: string
  grossSales: number
  discountTotal: number
  netSales: number
  vatBreakdown: VATBreakdown
  transactionCount: number
  averageTicket: number
  voidCount: number
  voidAmount: number
  refundCount: number
  refundAmount: number
  hourlyBreakdown: HourlyBreakdown[]
  paymentBreakdown: PaymentBreakdown[]
  categoryBreakdown: CategoryBreakdown[]
  syncStatus: 'complete' | 'partial' | 'pending'
  pendingTransactions: number
}

export interface HourlyBreakdown {
  hour: number
  label: string
  sales: number
  transactionCount: number
}

export interface PaymentBreakdown {
  method: string
  amount: number
  count: number
  percentage: number
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  sales: number
  quantity: number
  percentage: number
}

// =====================
// VAT Report
// =====================

export interface VATBreakdown {
  vatableSales: number
  vatAmount: number
  vatExemptSales: number
  zeroRatedSales: number
  totalSales: number
}

export interface VATSummaryReport {
  periodStart: string
  periodEnd: string
  vatableSales: number
  outputVAT: number
  vatExemptSales: number
  zeroRatedSales: number
  scPwdDiscount: number
  totalSales: number
  transactionDetails: VATTransactionDetail[]
}

export interface VATTransactionDetail {
  date: string
  orNumber: string
  vatable: number
  vat: number
  exempt: number
  zeroRated: number
  total: number
}

// =====================
// Product Performance Report
// =====================

export interface ProductPerformanceReport {
  periodStart: string
  periodEnd: string
  products: ProductPerformanceItem[]
  totalProducts: number
  totalQuantitySold: number
  totalRevenue: number
}

export interface ProductPerformanceItem {
  productId: string
  productName: string
  sku: string
  categoryId: string
  categoryName: string
  quantitySold: number
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  rank: number
}

// =====================
// Cashier Performance Report
// =====================

export interface CashierPerformanceReport {
  periodStart: string
  periodEnd: string
  cashiers: CashierPerformanceItem[]
}

export interface CashierPerformanceItem {
  userId: string
  name: string
  transactionCount: number
  totalSales: number
  averageTransaction: number
  voidCount: number
  voidRate: number
  refundCount: number
  refundAmount: number
  discountUsage: number
  cashVariance: number
  shiftsWorked: number
}

// =====================
// Sales Summary Report (Weekly/Monthly)
// =====================

export interface SalesSummaryReport {
  periodStart: string
  periodEnd: string
  periodType: 'week' | 'month' | 'year'
  totalGross: number
  totalNet: number
  totalVAT: number
  totalTransactions: number
  dailyAverage: number
  breakdown: PeriodBreakdownItem[]
  comparison?: PeriodComparison
}

export interface PeriodBreakdownItem {
  period: string
  label: string
  grossSales: number
  netSales: number
  transactionCount: number
  averageTicket: number
}

export interface PeriodComparison {
  previousPeriodStart: string
  previousPeriodEnd: string
  grossSalesChange: number
  grossSalesChangePercent: number
  transactionChange: number
  transactionChangePercent: number
}

// =====================
// Report Metadata
// =====================

export interface ReportMetadata {
  generatedAt: string
  generatedBy: string
  terminalId: string
  branchId: string
  isOffline: boolean
  syncStatus: 'complete' | 'partial' | 'pending'
  pendingTransactions: number
}

// =====================
// Report Export
// =====================

export type ReportFormat = 'pdf' | 'csv'
export type ReportType = 'x-reading' | 'z-reading' | 'daily-sales' | 'vat-summary' | 'product-performance' | 'cashier-performance' | 'sales-summary'

export interface ReportExportRequest {
  reportType: ReportType
  format: ReportFormat
  parameters: DateRangeFilter | SingleDateFilter
  reportData?: unknown
}

// =====================
// Helper Functions
// =====================

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function getHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:00 ${period}`
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return value / total
}

export function getDateRangeLabel(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)

  if (start === end) {
    return startDate.toLocaleDateString('en-PH', { dateStyle: 'long' })
  }

  return `${startDate.toLocaleDateString('en-PH', { dateStyle: 'medium' })} - ${endDate.toLocaleDateString('en-PH', { dateStyle: 'medium' })}`
}
