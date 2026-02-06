/**
 * Reports Composable
 * Provides reactive report generation and data access for components
 */

import { ref, computed } from 'vue'
import { useReportStore } from '@/stores/report'
import { storeToRefs } from 'pinia'
import { salesAggregateRepository } from '@/repositories/salesAggregateRepository'
import { formatCurrency, formatDateMedium, formatZCounter, formatXCounter } from '@/utils/reportFormatter'
import { toCSV, downloadCSV } from '@/utils/reportFormatter'
import type { DisplayXReading } from '@/types/xReading'
import type { DisplayZReading } from '@/types/zReading'

export function useReports() {
  const store = useReportStore()
  const {
    xReadings,
    zReadings,
    currentXReading,
    currentZReading,
    salesAggregates,
    isLoading,
    isGenerating,
    error,
    latestXReading,
    latestZReading
  } = storeToRefs(store)

  // Terminal/Branch context (default values for single-terminal setup)
  const terminalId = ref('POS-001')
  const branchId = ref('branch-main')

  // Dashboard summary
  const todaySummary = ref<{
    grossSales: number
    netSales: number
    transactionCount: number
    averageTicket: number
  } | null>(null)

  /**
   * Generate X-Reading
   */
  async function generateXReading(shiftId: string, cashierId: string) {
    return await store.generateXReading(
      terminalId.value,
      shiftId,
      cashierId,
      branchId.value
    )
  }

  /**
   * Generate Z-Reading
   */
  async function generateZReading(supervisorId: string, forceDuplicate: boolean = false) {
    return await store.generateZReading(
      terminalId.value,
      supervisorId,
      branchId.value,
      forceDuplicate
    )
  }

  /**
   * Load X-Reading history
   */
  async function loadXReadings() {
    await store.fetchXReadings(terminalId.value)
  }

  /**
   * Load Z-Reading history
   */
  async function loadZReadings() {
    await store.fetchZReadings(terminalId.value)
  }

  /**
   * Load sales aggregates for a period
   */
  async function loadSalesAggregates(dateFrom: string, dateTo: string) {
    await store.fetchSalesAggregates(branchId.value, dateFrom, dateTo)
  }

  /**
   * Load today's summary
   */
  async function loadTodaySummary() {
    const today = new Date().toISOString().split('T')[0]
    const summary = await salesAggregateRepository.getSummary(
      branchId.value, today, today
    )
    todaySummary.value = {
      grossSales: summary.totalGross,
      netSales: summary.totalNet,
      transactionCount: summary.totalTransactions,
      averageTicket: summary.totalTransactions > 0
        ? summary.totalNet / summary.totalTransactions
        : 0
    }
  }

  /**
   * Check if Z-Reading was already generated today
   */
  async function isZReadingGeneratedToday(): Promise<boolean> {
    return await store.checkZReadingGenerated(terminalId.value)
  }

  /**
   * Export X-Readings to CSV
   */
  function exportXReadingsCSV() {
    const data = xReadings.value
    const csv = toCSV(data as unknown as Record<string, unknown>[], [
      { key: 'xCounter', header: 'X-Counter' },
      { key: 'formattedDate', header: 'Date' },
      { key: 'formattedTime', header: 'Time' },
      { key: 'cashierName', header: 'Cashier' },
      { key: 'grossSales', header: 'Gross Sales', formatter: (v) => String(v) },
      { key: 'discountTotal', header: 'Discounts', formatter: (v) => String(v) },
      { key: 'netSales', header: 'Net Sales', formatter: (v) => String(v) },
      { key: 'vatableSales', header: 'VATable Sales', formatter: (v) => String(v) },
      { key: 'vatAmount', header: 'VAT Amount', formatter: (v) => String(v) },
      { key: 'transactionCount', header: 'Transactions' },
      { key: 'voidCount', header: 'Voids' },
      { key: 'voidAmount', header: 'Void Amount', formatter: (v) => String(v) },
      { key: 'beginningOR', header: 'Beginning OR' },
      { key: 'endingOR', header: 'Ending OR' }
    ])

    downloadCSV(csv, `x-readings-${terminalId.value}-${new Date().toISOString().split('T')[0]}`)
  }

  /**
   * Export Z-Readings to CSV
   */
  function exportZReadingsCSV() {
    const data = zReadings.value
    const csv = toCSV(data as unknown as Record<string, unknown>[], [
      { key: 'zCounter', header: 'Z-Counter' },
      { key: 'formattedDate', header: 'Date' },
      { key: 'grossSales', header: 'Gross Sales', formatter: (v) => String(v) },
      { key: 'discountTotal', header: 'Discounts', formatter: (v) => String(v) },
      { key: 'netSales', header: 'Net Sales', formatter: (v) => String(v) },
      { key: 'vatableSales', header: 'VATable Sales', formatter: (v) => String(v) },
      { key: 'vatAmount', header: 'VAT Amount', formatter: (v) => String(v) },
      { key: 'vatExemptSales', header: 'VAT-Exempt Sales', formatter: (v) => String(v) },
      { key: 'zeroRatedSales', header: 'Zero-Rated Sales', formatter: (v) => String(v) },
      { key: 'transactionCount', header: 'Transactions' },
      { key: 'voidCount', header: 'Voids' },
      { key: 'voidAmount', header: 'Void Amount', formatter: (v) => String(v) },
      { key: 'refundCount', header: 'Refunds' },
      { key: 'refundAmount', header: 'Refund Amount', formatter: (v) => String(v) },
      { key: 'beginningOR', header: 'Beginning OR' },
      { key: 'endingOR', header: 'Ending OR' },
      { key: 'generatedByName', header: 'Generated By' }
    ])

    downloadCSV(csv, `z-readings-${terminalId.value}-${new Date().toISOString().split('T')[0]}`)
  }

  /**
   * Print current report
   */
  function printReport() {
    window.print()
  }

  return {
    // State
    xReadings,
    zReadings,
    currentXReading,
    currentZReading,
    salesAggregates,
    isLoading,
    isGenerating,
    error,
    todaySummary,
    terminalId,
    branchId,

    // Getters
    latestXReading,
    latestZReading,

    // Actions
    generateXReading,
    generateZReading,
    loadXReadings,
    loadZReadings,
    loadSalesAggregates,
    loadTodaySummary,
    isZReadingGeneratedToday,
    exportXReadingsCSV,
    exportZReadingsCSV,
    printReport
  }
}
