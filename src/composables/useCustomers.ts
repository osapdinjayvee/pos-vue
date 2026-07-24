import { computed, ref } from 'vue'
import { useCustomerStore } from '@/stores/customer'
import { customerRepository } from '@/repositories/customerRepository'
import { customerService, type CustomerProfile } from '@/services/customerService'
import type { Customer, CustomerInput } from '@/types/order'
import type { QueryOptions } from '@/repositories/baseRepository'

export function useCustomers() {
  const store = useCustomerStore()

  const isLoading = computed(() => store.isLoading)
  const error = computed(() => store.error)
  const customers = computed(() => store.customers)
  const currentCustomer = computed(() => store.currentCustomer)
  const totalCount = computed(() => store.totalCount)
  const activeCustomers = computed(() => store.activeCustomers)

  // Customer detail state
  const customerDetail = ref<CustomerProfile | null>(null)
  const detailLoading = ref(false)

  async function fetchCustomers(options?: QueryOptions) {
    await store.fetchAll(options)
  }

  async function searchCustomers(query: string) {
    return store.search(query)
  }

  async function getCustomer(id: string) {
    return store.fetchById(id)
  }

  async function createCustomer(data: CustomerInput) {
    return store.create(data)
  }

  async function updateCustomer(id: string, data: Partial<CustomerInput>) {
    return store.update(id, data)
  }

  async function archiveCustomer(id: string) {
    return store.archive(id)
  }

  async function reactivateCustomer(id: string) {
    return store.reactivate(id)
  }

  async function fetchCustomerDetail(id: string) {
    detailLoading.value = true
    try {
      const profile = await customerService.getCustomerProfile(id)
      customerDetail.value = profile
      return profile
    } finally {
      detailLoading.value = false
    }
  }

  async function fetchCustomerHistory(customerId: string, options?: QueryOptions) {
    const result = await customerRepository.getCustomerWithHistory(customerId, {
      limit: options?.limit,
      offset: options?.offset
    })
    return result?.orders || []
  }

  // Insights methods
  const insightsLoading = ref(false)
  const topCustomers = ref<any[]>([])
  const inactiveCustomers = ref<any[]>([])
  const typeDistribution = ref<{ type: string; count: number }[]>([])
  const tierDistribution = ref<{ tier_id: string | null; tier_name: string; count: number }[]>([])

  async function fetchTopCustomers(limit = 10, dateRange?: { start: string; end: string }) {
    const result = await customerRepository.getTopBySpend(limit, dateRange)
    topCustomers.value = result
    return result
  }

  async function fetchInactiveCustomers(days = 30) {
    const result = await customerRepository.getInactive(days)
    inactiveCustomers.value = result
    return result
  }

  async function fetchDistribution() {
    const [types, tiers] = await Promise.all([
      customerRepository.getTypeDistribution(),
      customerRepository.getTierDistribution()
    ])
    typeDistribution.value = types
    tierDistribution.value = tiers
    return { types, tiers }
  }

  async function fetchNewCustomerCount(dateRange: { start: string; end: string }) {
    return customerRepository.getNewCustomers(dateRange)
  }

  async function fetchActiveCount() {
    return customerRepository.getActiveCount()
  }

  async function fetchAveragePoints() {
    return customerRepository.getAveragePoints()
  }

  return {
    // State
    isLoading,
    error,
    customers,
    currentCustomer,
    totalCount,
    activeCustomers,
    customerDetail,
    detailLoading,

    // Actions
    fetchCustomers,
    searchCustomers,
    getCustomer,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    reactivateCustomer,
    fetchCustomerDetail,
    fetchCustomerHistory,

    // Insights
    insightsLoading,
    topCustomers,
    inactiveCustomers,
    typeDistribution,
    tierDistribution,
    fetchTopCustomers,
    fetchInactiveCustomers,
    fetchDistribution,
    fetchNewCustomerCount,
    fetchActiveCount,
    fetchAveragePoints
  }
}

export default useCustomers
