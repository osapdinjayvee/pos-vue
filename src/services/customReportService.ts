/**
 * Custom Report Service (T044)
 * Dynamically builds SQL queries for the custom report builder.
 * Supports configurable dimensions, measures, date ranges, and branch filters.
 */

import db from '@/db/database'
import type {
  ReportConfig,
  ReportResult,
  ReportColumn,
  ReportDimension,
  ReportMeasure
} from '@/types/analytics'

/** Map dimension keys to their SQL column expressions */
const DIMENSION_COLUMN_MAP: Record<string, string> = {
  date: "date(orders.created_at)",
  category: "categories.name",
  product: "products.name",
  branch: "orders.branch_id",
  cashier: "(users.first_name || ' ' || users.last_name)",
  payment_method: "payments.payment_method"
}

/** Map dimension keys to their display alias */
const DIMENSION_ALIAS_MAP: Record<string, string> = {
  date: 'date',
  category: 'category',
  product: 'product',
  branch: 'branch',
  cashier: 'cashier',
  payment_method: 'payment_method'
}

/** Map measure keys to their SQL aggregate expression and column type */
const MEASURE_SQL_MAP: Record<string, { sql: string; type: 'number' | 'currency' | 'percent' }> = {
  quantity: { sql: 'SUM(order_items.quantity)', type: 'number' },
  revenue: { sql: 'SUM(order_items.total)', type: 'currency' },
  profit: { sql: 'SUM(order_items.total - (order_items.cost_price * order_items.quantity))', type: 'currency' },
  transaction_count: { sql: 'COUNT(DISTINCT orders.id)', type: 'number' },
  avg_transaction: { sql: 'AVG(orders.total)', type: 'currency' },
  discount_total: { sql: 'SUM(order_items.discount_amount)', type: 'currency' }
}

/** Map measure keys to their display labels */
const MEASURE_LABEL_MAP: Record<string, string> = {
  quantity: 'Quantity Sold',
  revenue: 'Revenue',
  profit: 'Profit',
  transaction_count: 'Transactions',
  avg_transaction: 'Avg Transaction',
  discount_total: 'Discounts'
}

/** Map dimension keys to their display labels */
const DIMENSION_LABEL_MAP: Record<string, string> = {
  date: 'Date',
  category: 'Category',
  product: 'Product',
  branch: 'Branch',
  cashier: 'Cashier',
  payment_method: 'Payment Method'
}

class CustomReportService {
  /**
   * Returns the list of available dimensions for grouping report data.
   */
  getAvailableDimensions(): ReportDimension[] {
    return [
      { value: 'date', label: 'Date', description: 'Transaction date' },
      { value: 'category', label: 'Category', description: 'Product category' },
      { value: 'product', label: 'Product', description: 'Product name' },
      { value: 'branch', label: 'Branch', description: 'Branch location' },
      { value: 'cashier', label: 'Cashier', description: 'Cashier name' },
      { value: 'payment_method', label: 'Payment Method', description: 'Payment type' }
    ]
  }

  /**
   * Returns the list of available measures for aggregation.
   */
  getAvailableMeasures(): ReportMeasure[] {
    return [
      { value: 'quantity', label: 'Quantity Sold', description: 'Total units sold' },
      { value: 'revenue', label: 'Revenue', description: 'Total sales amount' },
      { value: 'profit', label: 'Profit', description: 'Revenue minus cost' },
      { value: 'transaction_count', label: 'Transactions', description: 'Number of transactions' },
      { value: 'avg_transaction', label: 'Avg Transaction', description: 'Average transaction value' },
      { value: 'discount_total', label: 'Discounts', description: 'Total discount amount' }
    ]
  }

  /**
   * Dynamically constructs and executes a SQL query based on the report configuration.
   * Returns a ReportResult with dynamic columns and row data.
   */
  async buildReport(config: ReportConfig): Promise<ReportResult> {
    const { dimensions, measures, dateFrom, dateTo, branchId } = config

    if (!dimensions.length || !measures.length) {
      return { columns: [], data: [] }
    }

    // --- SELECT clause ---
    const selectParts: string[] = []
    const columns: ReportColumn[] = []

    // Dimension columns
    for (const dim of dimensions) {
      const colExpr = DIMENSION_COLUMN_MAP[dim]
      const alias = DIMENSION_ALIAS_MAP[dim]
      if (colExpr && alias) {
        selectParts.push(`${colExpr} AS ${alias}`)
        columns.push({
          field: alias,
          header: DIMENSION_LABEL_MAP[dim] || dim,
          type: dim === 'date' ? 'date' : 'string',
          sortable: true
        })
      }
    }

    // Measure columns
    for (const measure of measures) {
      const measureDef = MEASURE_SQL_MAP[measure]
      if (measureDef) {
        selectParts.push(`${measureDef.sql} AS ${measure}`)
        columns.push({
          field: measure,
          header: MEASURE_LABEL_MAP[measure] || measure,
          type: measureDef.type,
          sortable: true
        })
      }
    }

    // --- FROM / JOIN ---
    let fromClause = `
      FROM orders
      JOIN order_items ON order_items.order_id = orders.id
      LEFT JOIN products ON order_items.product_id = products.id
      LEFT JOIN categories ON products.category_id = categories.id
      LEFT JOIN users ON orders.user_id = users.id
    `

    // Only join payments table when payment_method dimension is selected
    if (dimensions.includes('payment_method')) {
      fromClause += `\n      LEFT JOIN payments ON payments.order_id = orders.id`
    }

    // --- WHERE clause ---
    const whereParts: string[] = ["orders.status = 'completed'"]
    const params: any[] = []

    if (dateFrom) {
      whereParts.push('date(orders.created_at) >= ?')
      params.push(dateFrom)
    }
    if (dateTo) {
      whereParts.push('date(orders.created_at) <= ?')
      params.push(dateTo)
    }
    if (branchId) {
      whereParts.push('orders.branch_id = ?')
      params.push(branchId)
    }

    // --- GROUP BY ---
    const groupByParts = dimensions.map(dim => DIMENSION_COLUMN_MAP[dim]).filter(Boolean)

    // --- ORDER BY (first measure DESC) ---
    const firstMeasure = measures[0]
    const orderByClause = firstMeasure ? `ORDER BY ${firstMeasure} DESC` : ''

    // --- Build complete SQL ---
    const sql = `
      SELECT ${selectParts.join(', ')}
      ${fromClause}
      WHERE ${whereParts.join(' AND ')}
      GROUP BY ${groupByParts.join(', ')}
      ${orderByClause}
    `

    try {
      const data = await db.query<Record<string, any>>(sql, params)

      // Calculate totals for numeric measures
      const totals: Record<string, number> = {}
      for (const measure of measures) {
        const measureDef = MEASURE_SQL_MAP[measure]
        if (measureDef && measure !== 'avg_transaction') {
          totals[measure] = data.reduce((sum, row) => sum + (Number(row[measure]) || 0), 0)
        } else if (measure === 'avg_transaction' && data.length > 0) {
          const total = data.reduce((sum, row) => sum + (Number(row[measure]) || 0), 0)
          totals[measure] = total / data.length
        }
      }

      return { columns, data, totals }
    } catch (error) {
      console.error('[CustomReportService] Query failed:', error)
      console.error('[CustomReportService] SQL:', sql)
      console.error('[CustomReportService] Params:', params)
      throw error
    }
  }
}

export const customReportService = new CustomReportService()
export default customReportService
