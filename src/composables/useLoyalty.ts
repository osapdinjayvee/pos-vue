import { ref, computed } from 'vue'
import { loyaltyService } from '@/services/loyaltyService'
import { loyaltyConfigRepository } from '@/repositories/loyaltyConfigRepository'
import type { LoyaltyConfig, LoyaltyTransaction } from '@/types/loyalty'

export function useLoyalty() {
  const config = ref<LoyaltyConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isActive = computed(() => config.value?.is_active === 1)
  const earnRate = computed(() => config.value?.earn_rate || 0)
  const redeemRate = computed(() => config.value?.redeem_rate || 0)
  const minRedemption = computed(() => config.value?.min_redemption || 100)

  async function loadConfig() {
    isLoading.value = true
    error.value = null
    try {
      config.value = await loyaltyConfigRepository.getConfig()
    } catch (e: any) {
      error.value = e.message || 'Failed to load loyalty config'
      console.error('Error loading loyalty config:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function earnPoints(customerId: string, transactionId: string, amount: number) {
    isLoading.value = true
    error.value = null
    try {
      return await loyaltyService.earnPoints(customerId, transactionId, amount)
    } catch (e: any) {
      error.value = e.message || 'Failed to earn points'
      console.error('Error earning points:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function redeemPoints(customerId: string, points: number, transactionId?: string) {
    isLoading.value = true
    error.value = null
    try {
      return await loyaltyService.redeemPoints(customerId, points, transactionId)
    } catch (e: any) {
      error.value = e.message || 'Failed to redeem points'
      console.error('Error redeeming points:', e)
      return { success: false, phpValue: 0, error: e.message }
    } finally {
      isLoading.value = false
    }
  }

  async function adjustPoints(customerId: string, points: number, reason: string, transactionId?: string) {
    isLoading.value = true
    error.value = null
    try {
      return await loyaltyService.adjustPoints(customerId, points, reason, transactionId)
    } catch (e: any) {
      error.value = e.message || 'Failed to adjust points'
      console.error('Error adjusting points:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function getPointsHistory(customerId: string, limit?: number) {
    isLoading.value = true
    error.value = null
    try {
      return await loyaltyService.getCustomerPointsHistory(customerId, limit)
    } catch (e: any) {
      error.value = e.message || 'Failed to load points history'
      console.error('Error loading points history:', e)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function validateRedemption(customerId: string, points: number) {
    return await loyaltyService.validateRedemption(customerId, points)
  }

  function calculateEarning(amount: number) {
    if (!config.value) return 0
    return loyaltyService.calculateEarning(amount, config.value.earn_rate)
  }

  function calculateRedemptionValue(points: number) {
    if (!config.value) return 0
    return loyaltyService.calculateRedemptionValue(points, config.value.redeem_rate)
  }

  return {
    // State
    config,
    isLoading,
    error,
    isActive,
    earnRate,
    redeemRate,
    minRedemption,

    // Actions
    loadConfig,
    earnPoints,
    redeemPoints,
    adjustPoints,
    getPointsHistory,
    validateRedemption,
    calculateEarning,
    calculateRedemptionValue
  }
}

export default useLoyalty
