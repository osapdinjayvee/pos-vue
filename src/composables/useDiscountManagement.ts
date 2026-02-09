// useDiscountManagement Composable - Wraps store + service for discount management
import { storeToRefs } from 'pinia'
import { useDiscountManagementStore } from '@/stores/discountManagement'
import { discountManagementService } from '@/services/discountManagementService'
import type { PromoDiscountInput, EligibleDiscount } from '@/types/discount'

export function useDiscountManagement() {
  const store = useDiscountManagementStore()
  const { discounts, currentDiscount, currentScopes, isLoading, error, activeDiscounts, autoApplyDiscounts } = storeToRefs(store)

  async function fetchDiscounts(filters?: { search?: string; isActive?: boolean; autoApply?: boolean }) {
    await store.fetchAll(filters)
  }

  async function fetchDiscount(id: string) {
    await store.fetchById(id)
  }

  async function saveDiscount(input: PromoDiscountInput, id?: string) {
    if (id) {
      return await store.update(id, input)
    }
    return await store.create(input)
  }

  async function deleteDiscount(id: string) {
    return await store.remove(id)
  }

  async function toggleActive(id: string) {
    return await store.toggleActive(id)
  }

  async function getEligibleDiscounts(
    productId: string,
    categoryId: string | null,
    lineSubtotal: number
  ): Promise<EligibleDiscount[]> {
    return await discountManagementService.getEligibleDiscounts(productId, categoryId, lineSubtotal)
  }

  return {
    // State
    discounts,
    currentDiscount,
    currentScopes,
    isLoading,
    error,

    // Getters
    activeDiscounts,
    autoApplyDiscounts,

    // Actions
    fetchDiscounts,
    fetchDiscount,
    saveDiscount,
    deleteDiscount,
    toggleActive,
    getEligibleDiscounts
  }
}
