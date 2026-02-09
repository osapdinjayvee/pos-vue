// Discount Management Store - Pinia store for admin discount CRUD
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { discountManagementService } from '@/services/discountManagementService'
import type { PromoDiscount, PromoDiscountInput, DiscountScope } from '@/types/discount'

export const useDiscountManagementStore = defineStore('discountManagement', () => {
  // State
  const discounts = ref<PromoDiscount[]>([])
  const currentDiscount = ref<PromoDiscount | null>(null)
  const currentScopes = ref<DiscountScope[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeDiscounts = computed(() =>
    discounts.value.filter(d => d.is_active === 1)
  )

  const autoApplyDiscounts = computed(() =>
    discounts.value.filter(d => d.auto_apply === 1 && d.is_active === 1)
  )

  // Actions
  async function fetchAll(filters?: { search?: string; isActive?: boolean; autoApply?: boolean }) {
    isLoading.value = true
    error.value = null
    try {
      discounts.value = await discountManagementService.list(filters)
    } catch (e: any) {
      error.value = e.message || 'Failed to load discounts'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchById(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const result = await discountManagementService.getById(id)
      if (result) {
        currentDiscount.value = result.discount
        currentScopes.value = result.scopes
      } else {
        currentDiscount.value = null
        currentScopes.value = []
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to load discount'
    } finally {
      isLoading.value = false
    }
  }

  async function create(input: PromoDiscountInput): Promise<PromoDiscount | null> {
    isLoading.value = true
    error.value = null
    try {
      const created = await discountManagementService.create(input)
      discounts.value.unshift(created)
      return created
    } catch (e: any) {
      error.value = e.message || 'Failed to create discount'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function update(id: string, input: PromoDiscountInput): Promise<PromoDiscount | null> {
    isLoading.value = true
    error.value = null
    try {
      const updated = await discountManagementService.update(id, input)
      if (updated) {
        const idx = discounts.value.findIndex(d => d.id === id)
        if (idx >= 0) discounts.value[idx] = updated
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update discount'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await discountManagementService.softDelete(id)
      discounts.value = discounts.value.filter(d => d.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete discount'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function toggleActive(id: string): Promise<PromoDiscount | null> {
    error.value = null
    try {
      const updated = await discountManagementService.toggleActive(id)
      if (updated) {
        const idx = discounts.value.findIndex(d => d.id === id)
        if (idx >= 0) discounts.value[idx] = updated
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to toggle discount status'
      return null
    }
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
    fetchAll,
    fetchById,
    create,
    update,
    remove,
    toggleActive
  }
})
