/**
 * Branch Dashboard Service
 * Fetches branch summary and comparison data from the cloud API
 */

import { httpClient } from '@/services/httpClient'
import type { Branch, BranchSummary, BranchComparison } from '@/types/sync'

/**
 * Fetch all branches
 */
async function fetchBranches(): Promise<Branch[]> {
  try {
    const response = await httpClient.get<Branch[]>('/branches')
    return response.data
  } catch (e) {
    console.error('[BranchDashboard] Failed to fetch branches:', e)
    return []
  }
}

/**
 * Fetch dashboard summaries for all branches
 */
async function fetchBranchSummaries(): Promise<BranchSummary[]> {
  try {
    const response = await httpClient.get<BranchSummary[]>('/branches/dashboard')
    return response.data
  } catch (e) {
    console.error('[BranchDashboard] Failed to fetch summaries:', e)
    return []
  }
}

/**
 * Fetch branch comparison data for a period
 */
async function fetchBranchComparison(
  periodStart: string,
  periodEnd: string,
  branchIds?: string[]
): Promise<BranchComparison | null> {
  try {
    const params: Record<string, string> = {
      period_start: periodStart,
      period_end: periodEnd
    }
    if (branchIds && branchIds.length > 0) {
      params.branch_ids = branchIds.join(',')
    }

    const response = await httpClient.get<BranchComparison>(
      '/branches/comparison',
      { params }
    )
    return response.data
  } catch (e) {
    console.error('[BranchDashboard] Failed to fetch comparison:', e)
    return null
  }
}

export const branchDashboardService = {
  fetchBranches,
  fetchBranchSummaries,
  fetchBranchComparison
}

export default branchDashboardService
