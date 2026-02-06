// Supplier Store - Pinia store for supplier management
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supplierRepository } from '@/repositories/supplierRepository'
import type { Supplier, SupplierInput } from '@/types/inventory'

export const useSupplierStore = defineStore('supplier', () => {
  // State
  const suppliers = ref<Supplier[]>([])
  const currentSupplier = ref<Supplier | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeSuppliers = computed(() =>
    suppliers.value.filter(s => s.is_active === 1)
  )

  const supplierOptions = computed(() =>
    activeSuppliers.value.map(s => ({
      label: s.name,
      value: s.id
    }))
  )

  const getSupplierById = computed(() => (id: string) =>
    suppliers.value.find(s => s.id === id)
  )

  const supplierCount = computed(() => suppliers.value.length)

  const activeSupplierCount = computed(() => activeSuppliers.value.length)

  // Actions
  async function fetchAll() {
    isLoading.value = true
    error.value = null
    try {
      suppliers.value = await supplierRepository.getAll()
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch suppliers'
      console.error('Error fetching suppliers:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchActive() {
    isLoading.value = true
    error.value = null
    try {
      suppliers.value = await supplierRepository.findActive()
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch active suppliers'
      console.error('Error fetching suppliers:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchById(id: string): Promise<Supplier | null> {
    isLoading.value = true
    error.value = null
    try {
      currentSupplier.value = await supplierRepository.findById(id)
      return currentSupplier.value
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch supplier'
      console.error('Error fetching supplier:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function search(query: string): Promise<Supplier[]> {
    isLoading.value = true
    error.value = null
    try {
      if (!query.trim()) {
        suppliers.value = await supplierRepository.getAll()
      } else {
        suppliers.value = await supplierRepository.search(query)
      }
      return suppliers.value
    } catch (e: any) {
      error.value = e.message || 'Failed to search suppliers'
      console.error('Error searching suppliers:', e)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function create(data: SupplierInput): Promise<Supplier | null> {
    isLoading.value = true
    error.value = null
    try {
      // Validate name uniqueness
      if (await supplierRepository.nameExists(data.name)) {
        error.value = 'A supplier with this name already exists'
        return null
      }

      const supplier = await supplierRepository.createSupplier(data)
      suppliers.value.push(supplier)
      return supplier
    } catch (e: any) {
      error.value = e.message || 'Failed to create supplier'
      console.error('Error creating supplier:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function update(id: string, data: Partial<SupplierInput>): Promise<Supplier | null> {
    isLoading.value = true
    error.value = null
    try {
      // Validate name uniqueness if changed
      if (data.name && await supplierRepository.nameExists(data.name, id)) {
        error.value = 'A supplier with this name already exists'
        return null
      }

      const updated = await supplierRepository.updateSupplier(id, data)
      if (updated) {
        const index = suppliers.value.findIndex(s => s.id === id)
        if (index !== -1) {
          suppliers.value[index] = updated
        }
        if (currentSupplier.value?.id === id) {
          currentSupplier.value = updated
        }
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update supplier'
      console.error('Error updating supplier:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const success = await supplierRepository.delete(id)
      if (success) {
        suppliers.value = suppliers.value.filter(s => s.id !== id)
        if (currentSupplier.value?.id === id) {
          currentSupplier.value = null
        }
      }
      return success
    } catch (e: any) {
      error.value = e.message || 'Failed to delete supplier'
      console.error('Error deleting supplier:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function deactivate(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const success = await supplierRepository.deactivate(id)
      if (success) {
        const supplier = suppliers.value.find(s => s.id === id)
        if (supplier) {
          supplier.is_active = 0
        }
      }
      return success
    } catch (e: any) {
      error.value = e.message || 'Failed to deactivate supplier'
      console.error('Error deactivating supplier:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function activate(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const success = await supplierRepository.activate(id)
      if (success) {
        const supplier = suppliers.value.find(s => s.id === id)
        if (supplier) {
          supplier.is_active = 1
        }
      }
      return success
    } catch (e: any) {
      error.value = e.message || 'Failed to activate supplier'
      console.error('Error activating supplier:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function getProductsBySupplier(supplierId: string): Promise<any[]> {
    try {
      return await supplierRepository.getProductsBySupplier(supplierId)
    } catch (e: any) {
      console.error('Error getting products by supplier:', e)
      return []
    }
  }

  function clearError() {
    error.value = null
  }

  function clearCurrentSupplier() {
    currentSupplier.value = null
  }

  return {
    // State
    suppliers,
    currentSupplier,
    isLoading,
    error,
    // Getters
    activeSuppliers,
    supplierOptions,
    getSupplierById,
    supplierCount,
    activeSupplierCount,
    // Actions
    fetchAll,
    fetchActive,
    fetchById,
    search,
    create,
    update,
    remove,
    deactivate,
    activate,
    getProductsBySupplier,
    clearError,
    clearCurrentSupplier
  }
})
