/**
 * Product Analytics Service
 * High-level product analytics — top products, category sales, slow movers, comparisons.
 * Wraps productDailyRepository for business-level queries.
 */

import { productDailyRepository } from '@/repositories/productDailyRepository'
import { analyticsAggregationService } from '@/services/analyticsAggregationService'
import type {
  TopProductItem,
  CategorySalesItem,
  SlowMoverItem,
  ProductComparisonData,
  SalesTrendPoint
} from '@/types/analytics'

class ProductAnalyticsService {
  /**
   * Get top-selling products ranked by revenue or quantity
   */
  async getTopProducts(
    dateFrom: string,
    dateTo: string,
    limit: number = 20,
    branchId?: string,
    sortBy: 'revenue' | 'quantity' = 'revenue'
  ): Promise<TopProductItem[]> {
    await analyticsAggregationService.ensureAggregated(dateFrom, dateTo)
    const rows = await productDailyRepository.getTopProducts(dateFrom, dateTo, limit, branchId, sortBy)

    return rows.map((row, index) => {
      const revenue = row.revenue || 0
      const cost = row.cost || 0
      const profit = row.profit || 0

      return {
        rank: index + 1,
        productId: row.product_id,
        productName: row.product_name || 'Unknown Product',
        categoryName: row.category_name || 'Uncategorized',
        unitsSold: row.quantity_sold || 0,
        revenue,
        cost,
        profit,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      }
    })
  }

  /**
   * Get sales breakdown by category with percentage shares
   */
  async getCategorySales(
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<CategorySalesItem[]> {
    await analyticsAggregationService.ensureAggregated(dateFrom, dateTo)
    const rows = await productDailyRepository.getCategorySales(dateFrom, dateTo, branchId)

    const totalRevenue = rows.reduce((sum, row) => sum + (row.total_revenue || 0), 0)

    return rows.map(row => ({
      categoryId: row.category_id || 'none',
      categoryName: row.category_name || 'Uncategorized',
      sales: row.total_revenue || 0,
      quantity: row.total_quantity || 0,
      percentage: totalRevenue > 0 ? ((row.total_revenue || 0) / totalRevenue) * 100 : 0
    }))
  }

  /**
   * Get slow-moving products below velocity threshold
   */
  async getSlowMovers(
    dateFrom: string,
    dateTo: string,
    velocityThreshold: number = 5,
    branchId?: string
  ): Promise<SlowMoverItem[]> {
    await analyticsAggregationService.ensureAggregated(dateFrom, dateTo)
    const rows = await productDailyRepository.getSlowMovers(dateFrom, dateTo, velocityThreshold, branchId)

    const today = new Date()

    return rows.map(row => {
      let daysSinceLastSale = 0
      if (row.last_sold_date) {
        const lastDate = new Date(row.last_sold_date)
        daysSinceLastSale = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      } else {
        // Never sold — use a large number
        daysSinceLastSale = 999
      }

      return {
        productId: row.product_id,
        productName: row.product_name || 'Unknown Product',
        categoryName: row.category_name || 'Uncategorized',
        unitsSold: row.quantity_sold || 0,
        revenue: row.revenue || 0,
        lastSoldDate: row.last_sold_date || null,
        daysSinceLastSale
      }
    })
  }

  /**
   * Compare multiple products side-by-side with trend data
   */
  async compareProducts(
    productIds: string[],
    dateFrom: string,
    dateTo: string,
    branchId?: string
  ): Promise<ProductComparisonData[]> {
    const results: ProductComparisonData[] = []

    for (const productId of productIds) {
      const dailyRows = await productDailyRepository.getForProduct(productId, dateFrom, dateTo, branchId)

      // Aggregate totals
      let totalQuantity = 0
      let totalRevenue = 0
      let totalProfit = 0

      const trendData: SalesTrendPoint[] = dailyRows.map(row => {
        totalQuantity += row.quantity_sold || 0
        totalRevenue += row.revenue || 0
        totalProfit += row.profit || 0

        return {
          label: new Date(row.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
          sales: row.revenue || 0,
          transactionCount: row.quantity_sold || 0
        }
      })

      const avgPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0

      // Derive product name from first daily row or use a placeholder
      const productName = dailyRows.length > 0
        ? (dailyRows[0] as any).product_name || `Product ${productId.slice(0, 8)}`
        : `Product ${productId.slice(0, 8)}`

      results.push({
        productId,
        productName,
        unitsSold: totalQuantity,
        revenue: totalRevenue,
        profit: totalProfit,
        avgPrice,
        trendData
      })
    }

    return results
  }
}

export const productAnalyticsService = new ProductAnalyticsService()
export default productAnalyticsService
