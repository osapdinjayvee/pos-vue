// useProducts composable - Product management utilities
import { ref, computed } from 'vue'
import { useProductStore } from '@/stores/product'
import { productService } from '@/services/productService'
import { inventoryService } from '@/services/inventoryService'
import type { Product } from '@/repositories/productRepository'
import type { DisplayVariant } from '@/types/inventory'

export function useProducts() {
  const store = useProductStore()

  const isLoading = computed(() => store.isLoading)
  const error = computed(() => store.error)
  const products = computed(() => store.products)
  const totalCount = computed(() => store.totalCount)

  // Fetch all products
  async function fetchProducts(options?: { limit?: number; offset?: number }) {
    await store.fetchAll(options)
  }

  // Search products
  async function searchProducts(query: string) {
    return store.search(query)
  }

  // Get product by ID
  async function getProduct(id: string) {
    return store.fetchById(id)
  }

  // Get product with variants and stock
  async function getProductWithVariants(id: string) {
    return productService.getProductWithVariants(id)
  }

  // Get variants for a product
  async function getProductVariants(productId: string): Promise<DisplayVariant[]> {
    return productService.getProductVariants(productId)
  }

  // Create a new product
  async function createProduct(data: Parameters<typeof productService.createProduct>[0]) {
    const result = await productService.createProduct(data)
    if (result.success) {
      await fetchProducts() // Refresh list
    }
    return result
  }

  // Update a product
  async function updateProduct(id: string, data: Parameters<typeof productService.updateProduct>[1]) {
    const result = await productService.updateProduct(id, data)
    if (result.success) {
      await fetchProducts() // Refresh list
    }
    return result
  }

  // Delete a product
  async function deleteProduct(id: string) {
    const result = await productService.deleteProduct(id)
    if (result.success) {
      await fetchProducts() // Refresh list
    }
    return result
  }

  // Find product by barcode
  async function findByBarcode(barcode: string) {
    return productService.findByBarcode(barcode)
  }

  // Get stock for a variant
  async function getVariantStock(variantId: string) {
    return inventoryService.getStock(variantId)
  }

  // Get low stock products
  async function getLowStockProducts() {
    return productService.getLowStockProducts()
  }

  // Get products needing reorder
  async function getProductsNeedingReorder() {
    return productService.getProductsNeedingReorder()
  }

  // Bulk delete products
  async function bulkDeleteProducts(ids: string[]) {
    return store.bulkDelete(ids)
  }

  // Bulk update status
  async function bulkUpdateStatus(ids: string[], status: 'active' | 'inactive' | 'out-of-stock') {
    return store.bulkUpdateStatus(ids, status)
  }

  return {
    // State
    isLoading,
    error,
    products,
    totalCount,

    // Actions
    fetchProducts,
    searchProducts,
    getProduct,
    getProductWithVariants,
    getProductVariants,
    createProduct,
    updateProduct,
    deleteProduct,
    findByBarcode,
    getVariantStock,
    getLowStockProducts,
    getProductsNeedingReorder,
    bulkDeleteProducts,
    bulkUpdateStatus
  }
}

export default useProducts
