/**
 * Analytics Type Definitions
 * Types for advanced analytics dashboards — hourly sales, product daily, saved reports, heatmap, etc.
 */

// =====================
// Period Types
// =====================

export type AnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export interface AnalyticsDateRange {
  dateFrom: string
  dateTo: string
  period: AnalyticsPeriod
}

// =====================
// Sales Hourly Aggregate
// =====================

export interface SalesHourlyAggregate {
  id: string
  date: string
  hour: number
  terminal_id: string
  branch_id: string
  sales: number
  transaction_count: number
  created_at: string
}

export type SalesHourlyInput = Omit<SalesHourlyAggregate, 'id' | 'created_at'>

// =====================
// Product Daily Aggregate
// =====================

export interface ProductDailyAggregate {
  id: string
  date: string
  product_id: string
  variant_id: string | null
  category_id: string | null
  branch_id: string
  quantity_sold: number
  revenue: number
  cost: number
  profit: number
  created_at: string
}

export type ProductDailyInput = Omit<ProductDailyAggregate, 'id' | 'created_at'>

// =====================
// Saved Report
// =====================

export interface SavedReport {
  id: string
  name: string
  type: string
  config: string
  created_at: string
  updated_at: string
}

export interface SavedReportInput {
  name: string
  type: string
  config: ReportConfig
}

export interface ReportConfig {
  dimensions: string[]
  measures: string[]
  dateFrom: string
  dateTo: string
  branchId?: string
  filters?: Record<string, string>
}

// =====================
// Heatmap
// =====================

export interface HeatmapCell {
  dayOfWeek: number
  hour: number
  sales: number
  transactionCount: number
  intensity: number
}

export type HeatmapGrid = HeatmapCell[][]

// =====================
// Staffing
// =====================

export interface StaffingRecommendation {
  hour: number
  hourLabel: string
  avgTransactions: number
  suggestedStaff: number
  peakLevel: 'low' | 'medium' | 'high'
}

// =====================
// ABC Analysis
// =====================

export type ABCCategory = 'A' | 'B' | 'C'

export interface ABCClassification {
  productId: string
  productName: string
  categoryName: string
  revenue: number
  cumulativePercent: number
  abcClass: ABCCategory
}

// =====================
// Inventory Analytics
// =====================

export interface InventoryTurnoverItem {
  productId: string
  productName: string
  categoryName: string
  currentStock: number
  quantitySold: number
  costOfGoodsSold: number
  averageInventory: number
  turnoverRate: number
  daysOfSupply: number
}

export interface ReorderSuggestion {
  productId: string
  productName: string
  currentStock: number
  reorderPoint: number
  suggestedQty: number
  supplierName: string | null
  supplierId: string | null
}

export interface InventoryOverview {
  totalValue: number
  avgTurnoverRate: number
  avgDaysOfSupply: number
}

export interface ExpiryItem {
  productId: string
  productName: string
  batchNumber: string
  expiryDate: string
  daysUntilExpiry: number
  quantity: number
  estimatedWasteValue: number
}

// =====================
// Dashboard Metrics
// =====================

export interface TodayMetrics {
  grossSales: number
  netSales: number
  transactionCount: number
  averageTicket: number
  voidCount: number
  refundCount: number
  lastUpdated: string
}

export interface SalesTrendPoint {
  label: string
  sales: number
  transactionCount: number
}

export interface PeriodComparisonData {
  currentGross: number
  previousGross: number
  grossChange: number
  grossChangePercent: number
  currentTransactions: number
  previousTransactions: number
  transactionChange: number
  transactionChangePercent: number
  currentAvgTicket: number
  previousAvgTicket: number
  avgTicketChange: number
  avgTicketChangePercent: number
  periodLabel: string
}

// =====================
// Product Analytics
// =====================

export interface TopProductItem {
  rank: number
  productId: string
  productName: string
  categoryName: string
  unitsSold: number
  revenue: number
  cost: number
  profit: number
  profitMargin: number
}

export interface CategorySalesItem {
  categoryId: string
  categoryName: string
  sales: number
  quantity: number
  percentage: number
}

export interface SlowMoverItem {
  productId: string
  productName: string
  categoryName: string
  unitsSold: number
  revenue: number
  lastSoldDate: string | null
  daysSinceLastSale: number
}

export interface ProductComparisonData {
  productId: string
  productName: string
  unitsSold: number
  revenue: number
  profit: number
  avgPrice: number
  trendData: SalesTrendPoint[]
}

// =====================
// Cashier Analytics
// =====================

export interface CashierMetrics {
  userId: string
  name: string
  transactionCount: number
  totalSales: number
  avgTransaction: number
  itemsPerTransaction: number
  voidCount: number
  voidRate: number
  voidAmount: number
}

export interface CashierVoidDetail {
  transactionId: string
  date: string
  orNumber: string
  items: number
  amount: number
  reason: string
}

// =====================
// Time Analysis
// =====================

export interface DayDrilldown {
  date: string
  hourlyBreakdown: { hour: number; label: string; sales: number; count: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
  paymentBreakdown: { method: string; amount: number; count: number }[]
  totalSales: number
  totalTransactions: number
}

// =====================
// Custom Report
// =====================

export interface ReportColumn {
  field: string
  header: string
  type: 'string' | 'number' | 'currency' | 'percent' | 'date'
  sortable?: boolean
}

export interface ReportResult {
  columns: ReportColumn[]
  data: Record<string, any>[]
  totals?: Record<string, number>
}

export interface ReportDimension {
  value: string
  label: string
  description: string
}

export interface ReportMeasure {
  value: string
  label: string
  description: string
}
