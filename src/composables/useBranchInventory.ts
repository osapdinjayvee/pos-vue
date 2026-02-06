/**
 * useBranchInventory Composable
 * Provides reactive branch inventory data
 */

import { ref, readonly } from 'vue'
import { inventorySyncService } from '@/services/inventorySyncService'
import type { BranchInventory, BranchStockItem, ConsolidatedStock } from '@/types/sync'

export function useBranchInventory() {
  const branchInventories = ref<BranchInventory[]>([])
  const selectedBranchInventory = ref<BranchInventory | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch inventory for a specific branch
   */
  async function fetchBranchStock(branchId: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const inventory = await inventorySyncService.fetchBranchInventory(branchId)
      if (inventory) {
        selectedBranchInventory.value = inventory
        // Update or add to the list
        const idx = branchInventories.value.findIndex((b) => b.branch_id === branchId)
        if (idx >= 0) {
          branchInventories.value[idx] = inventory
        } else {
          branchInventories.value.push(inventory)
        }
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch branch inventory'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch consolidated stock across all branches
   */
  async function getConsolidatedStock(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      branchInventories.value = await inventorySyncService.fetchConsolidatedStock()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch consolidated stock'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Filter stock items by branch
   */
  function filterByBranch(branchId: string): BranchStockItem[] {
    const inventory = branchInventories.value.find((b) => b.branch_id === branchId)
    return inventory?.items || []
  }

  /**
   * Get consolidated view of a single product across branches
   */
  function getProductAcrossBranches(variantId: string): ConsolidatedStock | null {
    const items: Array<{ branch_id: string; branch_name: string; quantity: number }> = []
    let productId = ''
    let productName = ''
    let sku = ''

    for (const branch of branchInventories.value) {
      const item = branch.items.find((i) => i.variant_id === variantId)
      if (item) {
        productId = item.product_id
        productName = item.product_name
        sku = item.sku
        items.push({
          branch_id: branch.branch_id,
          branch_name: branch.branch_name,
          quantity: item.quantity
        })
      }
    }

    if (items.length === 0) return null

    return {
      variant_id: variantId,
      product_id: productId,
      product_name: productName,
      sku,
      total_quantity: items.reduce((sum, i) => sum + i.quantity, 0),
      branches: items
    }
  }

  return {
    branchInventories: readonly(branchInventories),
    selectedBranchInventory: readonly(selectedBranchInventory),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchBranchStock,
    getConsolidatedStock,
    filterByBranch,
    getProductAcrossBranches
  }
}

export default useBranchInventory
