import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { customerRepository } from '@/repositories/customerRepository'
import { customerService } from '@/services/customerService'
import type { Customer, CustomerInput, CustomerType } from '@/types/order'
import type { QueryOptions } from '@/repositories/baseRepository'

export interface CustomerFilters {
  type?: CustomerType
  isActive?: boolean
  search?: string
}

export const useCustomerStore = defineStore('customer', () => {
  // State
  const customers = ref<Customer[]>([])
  const currentCustomer = ref<Customer | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const searchQuery = ref('')
  const filters = ref<CustomerFilters>({})

  // Getters
  const activeCustomers = computed(() =>
    customers.value.filter(c => c.is_active === 1)
  )

  const getCustomerById = computed(() => (id: string) =>
    customers.value.find(c => c.id === id)
  )

  // Actions
  async function fetchAll(options?: QueryOptions) {
    isLoading.value = true
    error.value = null
    try {
      if (filters.value.type) {
        customers.value = await customerRepository.findByType(filters.value.type, options)
      } else if (filters.value.isActive === true) {
        customers.value = await customerRepository.findAllActive(options)
      } else {
        customers.value = await customerRepository.findAll(options)
      }
      totalCount.value = await customerRepository.count()
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch customers'
      console.error('Error fetching customers:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function search(query: string): Promise<Customer[]> {
    searchQuery.value = query
    isLoading.value = true
    error.value = null
    try {
      if (!query.trim()) {
        customers.value = await customerRepository.findAll({ orderBy: 'name', orderDir: 'ASC' })
      } else {
        customers.value = await customerRepository.search(query)
      }
      return customers.value
    } catch (e: any) {
      error.value = e.message || 'Failed to search customers'
      console.error('Error searching customers:', e)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchById(id: string): Promise<Customer | null> {
    isLoading.value = true
    error.value = null
    try {
      currentCustomer.value = await customerRepository.findById(id)
      return currentCustomer.value
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch customer'
      console.error('Error fetching customer:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function create(data: CustomerInput): Promise<Customer | null> {
    isLoading.value = true
    error.value = null
    try {
      const customer = await customerRepository.create({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || 'PH',
        tax_id: data.tax_id || null,
        customer_type: data.customer_type || 'retail',
        credit_limit: data.credit_limit || 0,
        current_balance: 0,
        loyalty_points: 0,
        notes: data.notes || null,
        is_active: 1,
        synced_at: null,
        tier_id: 'tier-bronze',
        lifetime_spend: 0
      } as any)

      await fetchAll()
      return customer
    } catch (e: any) {
      error.value = e.message || 'Failed to create customer'
      console.error('Error creating customer:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function update(id: string, data: Partial<CustomerInput>): Promise<Customer | null> {
    isLoading.value = true
    error.value = null
    try {
      const updateData: Record<string, any> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.email !== undefined) updateData.email = data.email || null
      if (data.phone !== undefined) updateData.phone = data.phone || null
      if (data.address !== undefined) updateData.address = data.address || null
      if (data.city !== undefined) updateData.city = data.city || null
      if (data.postal_code !== undefined) updateData.postal_code = data.postal_code || null
      if (data.country !== undefined) updateData.country = data.country
      if (data.tax_id !== undefined) updateData.tax_id = data.tax_id || null
      if (data.customer_type !== undefined) updateData.customer_type = data.customer_type
      if (data.credit_limit !== undefined) updateData.credit_limit = data.credit_limit
      if (data.notes !== undefined) updateData.notes = data.notes || null
      if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0

      const updated = await customerRepository.update(id, updateData as Partial<Customer>)
      if (updated) {
        const index = customers.value.findIndex(c => c.id === id)
        if (index !== -1) {
          customers.value[index] = updated
        }
        if (currentCustomer.value?.id === id) {
          currentCustomer.value = updated
        }
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update customer'
      console.error('Error updating customer:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Archive a customer (soft-deactivate). Throws with a user-facing message
   * when blocked by an outstanding balance, so the view can surface it.
   */
  async function archive(id: string): Promise<Customer> {
    isLoading.value = true
    error.value = null
    try {
      const updated = await customerService.archiveCustomer(id)
      applyCustomerUpdate(updated)
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to archive customer'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Reactivate an archived customer.
   */
  async function reactivate(id: string): Promise<Customer> {
    isLoading.value = true
    error.value = null
    try {
      const updated = await customerService.reactivateCustomer(id)
      applyCustomerUpdate(updated)
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to reactivate customer'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /** Replace a customer in the loaded list (and current selection) in place. */
  function applyCustomerUpdate(updated: Customer): void {
    const idx = customers.value.findIndex(c => c.id === updated.id)
    if (idx >= 0) customers.value[idx] = updated
    if (currentCustomer.value?.id === updated.id) {
      currentCustomer.value = updated
    }
  }

  function setFilters(newFilters: CustomerFilters) {
    filters.value = newFilters
  }

  function clearFilters() {
    filters.value = {}
    searchQuery.value = ''
  }

  function clearError() {
    error.value = null
  }

  function clearCurrentCustomer() {
    currentCustomer.value = null
  }

  return {
    // State
    customers,
    currentCustomer,
    isLoading,
    error,
    totalCount,
    searchQuery,
    filters,
    // Getters
    activeCustomers,
    getCustomerById,
    // Actions
    fetchAll,
    search,
    fetchById,
    create,
    update,
    archive,
    reactivate,
    setFilters,
    clearFilters,
    clearError,
    clearCurrentCustomer
  }
})
