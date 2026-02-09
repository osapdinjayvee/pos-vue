import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import productRepository from '@/repositories/productRepository'
import variantRepository from '@/repositories/variantRepository'
import { useSettingsStore } from '@/stores/settings'
import type {
  Product,
  ProductInput,
  ProductFilters,
  ProductStatus,
  QueryOptions
} from '@/repositories/productRepository'
import type { ProductVariant } from '@/types'

export const useProductStore = defineStore('product', () => {
  // State
  const products = ref<Product[]>([])
  const currentProduct = ref<Product | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)

  // Filters state
  const filters = ref<ProductFilters>({})
  const searchQuery = ref('')

  // Getters
  const activeProducts = computed(() =>
    products.value.filter(p => p.status === 'active')
  )

  const lowStockProducts = computed(() =>
    products.value.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold)
  )

  const outOfStockProducts = computed(() =>
    products.value.filter(p => p.stock === 0 || p.status === 'out-of-stock')
  )

  const getProductById = computed(() => (id: string) =>
    products.value.find(p => p.id === id)
  )

  // Actions
  async function fetchAll(options?: QueryOptions) {
    isLoading.value = true
    error.value = null
    try {
      products.value = await productRepository.findAllWithCategory(options)
      totalCount.value = await productRepository.count()
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch products'
      console.error('Error fetching products:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchWithFilters(productFilters?: ProductFilters, options?: QueryOptions) {
    isLoading.value = true
    error.value = null
    try {
      const appliedFilters = productFilters || filters.value
      if (searchQuery.value) {
        appliedFilters.search = searchQuery.value
      }
      products.value = await productRepository.findWithFilters(appliedFilters, options)
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch products'
      console.error('Error fetching products:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchById(id: string): Promise<Product | null> {
    isLoading.value = true
    error.value = null
    try {
      currentProduct.value = await productRepository.findByIdWithCategory(id)
      return currentProduct.value
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch product'
      console.error('Error fetching product:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function search(query: string): Promise<Product[]> {
    searchQuery.value = query
    isLoading.value = true
    error.value = null
    try {
      if (!query.trim()) {
        products.value = await productRepository.findAllWithCategory()
      } else {
        products.value = await productRepository.search(query)
      }
      return products.value
    } catch (e: any) {
      error.value = e.message || 'Failed to search products'
      console.error('Error searching products:', e)
      return []
    } finally {
      isLoading.value = false
    }
  }

  async function findProductByBarcode(barcode: string): Promise<Product | null> {
    try {
      return await productRepository.findByBarcode(barcode)
    } catch (e: any) {
      console.error('Error finding product by barcode:', e)
      return null
    }
  }

  async function create(data: ProductInput): Promise<Product | null> {
    isLoading.value = true
    error.value = null
    try {
      // Validate SKU uniqueness
      if (await productRepository.skuExists(data.sku)) {
        error.value = 'A product with this SKU already exists'
        return null
      }

      // Validate barcode uniqueness
      if (data.barcode && await productRepository.barcodeExists(data.barcode)) {
        error.value = 'A product with this barcode already exists'
        return null
      }

      const initialStock = data.stock || 0

      const product = await productRepository.create({
        name: data.name,
        description: data.description || '',
        image: data.image || '',
        price: data.price,
        cost: data.cost || 0,
        sku: data.sku,
        barcode: data.barcode || '',
        category_id: data.category_id || '',
        supplier_id: data.supplier_id || null,
        stock: initialStock,
        low_stock_threshold: data.low_stock_threshold || (() => { try { return useSettingsStore().lowStockThreshold } catch { return 10 } })(),
        status: data.status || 'active',
        tax_type: data.tax_type || 'vatable',
        sold: 0,
        revenue: 0,
        expiration_date: data.expiration_date || null,
        wholesale_price: data.wholesale_price || null,
        wholesale_min_qty: data.wholesale_min_qty || 1,
        auto_apply_wholesale: data.auto_apply_wholesale ? 1 : 0,
        has_variants: data.has_variants ? 1 : 0,
        track_batches: data.track_batches ? 1 : 0
      })

      if (product) {
        // Create default variant for the product
        const variant = await variantRepository.createVariant({
          product_id: product.id,
          name: 'Default',
          sku: product.sku,
          barcode: product.barcode || undefined,
          is_active: true,
          display_order: 0
        })

        // Record initial price history
        const { priceHistoryRepository } = await import('@/repositories/priceHistoryRepository')
        await priceHistoryRepository.create({
          product_id: product.id,
          old_price: 0,
          new_price: product.price,
          old_cost: 0,
          new_cost: product.cost,
          change_type: 'price',
          reason: 'Initial product creation'
        })

        // Record initial stock movement if stock > 0
        if (variant && initialStock > 0) {
          const { inventoryService } = await import('@/services/inventoryService')
          await inventoryService.receiveStock(variant.id, initialStock, {
            reason: 'Initial stock on product creation',
            unitCost: product.cost
          })
        }
      }

      // Refresh products list
      await fetchAll()

      return product
    } catch (e: any) {
      error.value = e.message || 'Failed to create product'
      console.error('Error creating product:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function update(id: string, data: Partial<ProductInput>): Promise<Product | null> {
    isLoading.value = true
    error.value = null
    try {
      // Validate SKU uniqueness if changed
      if (data.sku && await productRepository.skuExists(data.sku, id)) {
        error.value = 'A product with this SKU already exists'
        return null
      }

      // Validate barcode uniqueness if changed
      if (data.barcode && await productRepository.barcodeExists(data.barcode, id)) {
        error.value = 'A product with this barcode already exists'
        return null
      }

      // Get current product to check for price/cost changes
      const current = await productRepository.findById(id)

      const updated = await productRepository.update(id, data as Partial<Product>)
      if (updated) {
        // Track price/cost changes
        if (current) {
          const priceChanged = data.price !== undefined && data.price !== current.price
          const costChanged = data.cost !== undefined && data.cost !== current.cost

          if (priceChanged || costChanged) {
            const { priceHistoryRepository } = await import('@/repositories/priceHistoryRepository')

            if (priceChanged && costChanged) {
              await priceHistoryRepository.recordPriceAndCostChange(
                id,
                current.price,
                data.price!,
                current.cost,
                data.cost!,
                'Price update'
              )
            } else if (priceChanged) {
              await priceHistoryRepository.recordPriceChange(
                id,
                current.price,
                data.price!,
                'Price update'
              )
            } else if (costChanged) {
              await priceHistoryRepository.create({
                product_id: id,
                old_cost: current.cost,
                new_cost: data.cost!,
                new_price: current.price,
                change_type: 'cost',
                reason: 'Cost update'
              })
            }
          }
        }

        const index = products.value.findIndex(p => p.id === id)
        if (index !== -1) {
          products.value[index] = updated
        }
        if (currentProduct.value?.id === id) {
          currentProduct.value = updated
        }
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update product'
      console.error('Error updating product:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const success = await productRepository.delete(id)
      if (success) {
        products.value = products.value.filter(p => p.id !== id)
        if (currentProduct.value?.id === id) {
          currentProduct.value = null
        }
      }
      return success
    } catch (e: any) {
      error.value = e.message || 'Failed to delete product'
      console.error('Error deleting product:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function bulkDelete(ids: string[]): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await productRepository.bulkDelete(ids)
      products.value = products.value.filter(p => !ids.includes(p.id))
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete products'
      console.error('Error deleting products:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function bulkUpdateStatus(ids: string[], status: ProductStatus): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await productRepository.bulkUpdateStatus(ids, status)
      products.value = products.value.map(p => {
        if (ids.includes(p.id)) {
          return { ...p, status }
        }
        return p
      })
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to update products'
      console.error('Error updating products:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function updateStock(id: string, quantity: number): Promise<Product | null> {
    try {
      const updated = await productRepository.updateStock(id, quantity)
      if (updated) {
        const index = products.value.findIndex(p => p.id === id)
        if (index !== -1) {
          products.value[index] = updated
        }
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update stock'
      console.error('Error updating stock:', e)
      return null
    }
  }

  async function recordSale(id: string, quantity: number, amount: number): Promise<Product | null> {
    try {
      return await productRepository.recordSale(id, quantity, amount)
    } catch (e: any) {
      console.error('Error recording sale:', e)
      return null
    }
  }

  function setFilters(newFilters: ProductFilters) {
    filters.value = newFilters
  }

  function clearFilters() {
    filters.value = {}
    searchQuery.value = ''
  }

  function clearError() {
    error.value = null
  }

  function clearCurrentProduct() {
    currentProduct.value = null
  }

  // Alias for fetchAll for consistency
  async function loadProducts(): Promise<void> {
    await fetchAll()
  }

  // Search products (returns array)
  async function searchProducts(query: string): Promise<Product[]> {
    return await search(query)
  }

  // Find product or variant by barcode (for POS)
  async function findByBarcode(barcode: string): Promise<{ product: Product; variant?: ProductVariant } | null> {
    try {
      // First check product barcodes
      const product = await productRepository.findByBarcode(barcode)
      if (product) {
        return { product }
      }

      // Check variant barcodes
      const variant = await variantRepository.findByBarcode(barcode)
      if (variant) {
        const variantProduct = await productRepository.findById(variant.product_id)
        if (variantProduct) {
          return { product: variantProduct, variant }
        }
      }

      return null
    } catch (e: any) {
      console.error('Error finding by barcode:', e)
      return null
    }
  }

  return {
    // State
    products,
    currentProduct,
    isLoading,
    error,
    totalCount,
    filters,
    searchQuery,
    // Getters
    activeProducts,
    lowStockProducts,
    outOfStockProducts,
    getProductById,
    // Actions
    fetchAll,
    fetchWithFilters,
    fetchById,
    search,
    loadProducts,
    searchProducts,
    findByBarcode,
    create,
    update,
    remove,
    bulkDelete,
    bulkUpdateStatus,
    updateStock,
    recordSale,
    setFilters,
    clearFilters,
    clearError,
    clearCurrentProduct
  }
})
