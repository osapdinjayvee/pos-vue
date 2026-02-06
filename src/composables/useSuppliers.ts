// useSuppliers composable - Supplier management utilities
import { ref, computed } from 'vue'
import { supplierRepository } from '@/repositories/supplierRepository'
import type { Supplier, SupplierInput } from '@/types/inventory'
import type { Product } from '@/repositories/productRepository'

export interface ReorderItem {
  productId: string
  productName: string
  sku: string
  currentStock: number
  lowStockThreshold: number
  reorderQuantity: number
  supplierId: string | null
  supplierName: string | null
}

export interface SupplierReorderReport {
  supplier: Supplier | null
  supplierName: string
  items: ReorderItem[]
  totalItems: number
}

export function useSuppliers() {
  const suppliers = ref<Supplier[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeSuppliers = computed(() =>
    suppliers.value.filter(s => s.is_active === 1)
  )

  const supplierOptions = computed(() =>
    activeSuppliers.value.map(s => ({
      label: s.name,
      value: s.id
    }))
  )

  const supplierCount = computed(() => suppliers.value.length)

  // Fetch all suppliers
  async function fetchSuppliers() {
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

  // Fetch active suppliers only
  async function fetchActiveSuppliers() {
    isLoading.value = true
    error.value = null
    try {
      suppliers.value = await supplierRepository.findActive()
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch suppliers'
      console.error('Error fetching suppliers:', e)
    } finally {
      isLoading.value = false
    }
  }

  // Search suppliers
  async function searchSuppliers(query: string) {
    isLoading.value = true
    error.value = null
    try {
      if (!query.trim()) {
        suppliers.value = await supplierRepository.getAll()
      } else {
        suppliers.value = await supplierRepository.search(query)
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to search suppliers'
      console.error('Error searching suppliers:', e)
    } finally {
      isLoading.value = false
    }
  }

  // Create supplier
  async function createSupplier(data: SupplierInput): Promise<Supplier | null> {
    isLoading.value = true
    error.value = null
    try {
      // Check for duplicate name
      if (await supplierRepository.nameExists(data.name)) {
        error.value = 'A supplier with this name already exists'
        return null
      }

      const supplier = await supplierRepository.createSupplier(data)
      await fetchSuppliers() // Refresh list
      return supplier
    } catch (e: any) {
      error.value = e.message || 'Failed to create supplier'
      console.error('Error creating supplier:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // Update supplier
  async function updateSupplier(id: string, data: Partial<SupplierInput>): Promise<Supplier | null> {
    isLoading.value = true
    error.value = null
    try {
      // Check for duplicate name if changed
      if (data.name && await supplierRepository.nameExists(data.name, id)) {
        error.value = 'A supplier with this name already exists'
        return null
      }

      const updated = await supplierRepository.updateSupplier(id, data)
      if (updated) {
        await fetchSuppliers() // Refresh list
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

  // Delete supplier
  async function deleteSupplier(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const success = await supplierRepository.delete(id)
      if (success) {
        await fetchSuppliers() // Refresh list
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

  // Get supplier by ID
  async function getSupplier(id: string): Promise<Supplier | null> {
    try {
      return await supplierRepository.findById(id)
    } catch (e: any) {
      console.error('Error getting supplier:', e)
      return null
    }
  }

  // Get supplier by name
  async function getSupplierByName(name: string): Promise<Supplier | null> {
    try {
      return await supplierRepository.findByName(name)
    } catch (e: any) {
      console.error('Error getting supplier by name:', e)
      return null
    }
  }

  // Get products by supplier
  async function getProductsBySupplier(supplierId: string): Promise<any[]> {
    try {
      return await supplierRepository.getProductsBySupplier(supplierId)
    } catch (e: any) {
      console.error('Error getting products by supplier:', e)
      return []
    }
  }

  // Generate reorder report grouped by supplier
  async function generateReorderReport(): Promise<SupplierReorderReport[]> {
    try {
      // Import product repository dynamically to avoid circular dependencies
      const { default: productRepository } = await import('@/repositories/productRepository')

      // Get all low stock products
      const lowStockProducts = await productRepository.findLowStock()

      // Group by supplier
      const supplierMap = new Map<string | null, ReorderItem[]>()

      for (const product of lowStockProducts) {
        const supplierId = product.supplier_id || null
        const reorderQuantity = Math.max(
          (product.low_stock_threshold * 2) - product.stock,
          product.low_stock_threshold
        )

        const item: ReorderItem = {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          currentStock: product.stock,
          lowStockThreshold: product.low_stock_threshold,
          reorderQuantity,
          supplierId,
          supplierName: null
        }

        if (!supplierMap.has(supplierId)) {
          supplierMap.set(supplierId, [])
        }
        supplierMap.get(supplierId)!.push(item)
      }

      // Build report with supplier details
      const reports: SupplierReorderReport[] = []

      for (const [supplierId, items] of supplierMap) {
        let supplier: Supplier | null = null
        let supplierName = 'No Supplier Assigned'

        if (supplierId) {
          supplier = await supplierRepository.findById(supplierId)
          supplierName = supplier?.name || 'Unknown Supplier'
        }

        // Update supplier name in items
        items.forEach(item => {
          item.supplierName = supplierName
        })

        reports.push({
          supplier,
          supplierName,
          items,
          totalItems: items.length
        })
      }

      // Sort: items without supplier first, then alphabetically by supplier name
      reports.sort((a, b) => {
        if (!a.supplier && b.supplier) return -1
        if (a.supplier && !b.supplier) return 1
        return a.supplierName.localeCompare(b.supplierName)
      })

      return reports
    } catch (e: any) {
      console.error('Error generating reorder report:', e)
      return []
    }
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  return {
    // State
    suppliers,
    isLoading,
    error,

    // Computed
    activeSuppliers,
    supplierOptions,
    supplierCount,

    // Actions
    fetchSuppliers,
    fetchActiveSuppliers,
    searchSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplier,
    getSupplierByName,
    getProductsBySupplier,
    generateReorderReport,
    clearError
  }
}

export default useSuppliers
