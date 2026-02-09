// Product Service - handles product and variant operations with offline support
import productRepository from '@/repositories/productRepository'
import { variantRepository } from '@/repositories/variantRepository'
import { supplierRepository } from '@/repositories/supplierRepository'
import { stockMovementRepository } from '@/repositories/stockMovementRepository'
import { inventoryService } from './inventoryService'
import { useSettingsStore } from '@/stores/settings'
import type { Product } from '@/repositories/productRepository'
import type {
  ProductVariant,
  ProductVariantInput,
  Supplier,
  DisplayVariant
} from '@/types/inventory'
import { toDisplayVariant } from '@/types/inventory'
import { validateBarcode } from '@/utils/barcode'

export interface ProductWithVariants extends Product {
  variants: ProductVariant[]
  totalStock: number
}

export interface ProductCreateInput {
  name: string
  description?: string
  sku: string
  barcode?: string
  category_id: string
  price: number
  cost?: number
  low_stock_threshold?: number
  status?: string
  tax_type?: string
  image?: string
  supplier_id?: string
  has_variants?: boolean
  track_batches?: boolean
  expiration_date?: string | null
  // Initial variant data
  initialStock?: number
}

export interface ProductUpdateInput {
  name?: string
  description?: string
  sku?: string
  barcode?: string
  category_id?: string
  price?: number
  cost?: number
  low_stock_threshold?: number
  status?: string
  tax_type?: string
  image?: string
  supplier_id?: string
  has_variants?: boolean
  track_batches?: boolean
  expiration_date?: string | null
}

interface OperationResult<T> {
  success: boolean
  data?: T
  error?: string
}

// Offline sync queue (stored in memory, could be persisted to localStorage)
interface QueuedOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'product' | 'variant'
  data: any
  timestamp: string
}

class ProductService {
  private syncQueue: QueuedOperation[] = []
  private defaultUserId = 'system'
  private defaultTerminalId = 'WEB'
  private defaultBranchId = 'main'

  private getDefaultLowStockThreshold(): number {
    try {
      return useSettingsStore().lowStockThreshold
    } catch {
      return 10
    }
  }

  /**
   * Create a new product with default variant
   */
  async createProduct(input: ProductCreateInput): Promise<OperationResult<Product>> {
    try {
      // Validate SKU uniqueness
      if (await productRepository.skuExists(input.sku)) {
        return { success: false, error: 'A product with this SKU already exists' }
      }

      // Validate barcode uniqueness and format
      if (input.barcode) {
        if (await productRepository.barcodeExists(input.barcode)) {
          return { success: false, error: 'A product with this barcode already exists' }
        }

        const barcodeValidation = validateBarcode(input.barcode)
        if (!barcodeValidation.valid) {
          return { success: false, error: barcodeValidation.error }
        }
      }

      // Create the product
      const product = await productRepository.create({
        name: input.name,
        description: input.description || '',
        sku: input.sku,
        barcode: input.barcode || '',
        category_id: input.category_id,
        price: input.price,
        cost: input.cost || 0,
        low_stock_threshold: input.low_stock_threshold || this.getDefaultLowStockThreshold(),
        status: (input.status as any) || 'active',
        tax_type: (input.tax_type as any) || 'vatable',
        image: input.image || '',
        stock: 0, // Stock will be tracked via movements
        sold: 0,
        revenue: 0,
        expiration_date: input.expiration_date ?? undefined
      })

      // Create default variant
      const variant = await variantRepository.createVariant({
        product_id: product.id,
        name: 'Default',
        sku: input.sku,
        barcode: input.barcode
      })

      // Add initial stock if provided
      if (input.initialStock && input.initialStock > 0) {
        await inventoryService.receiveStock(variant.id, input.initialStock, {
          reason: 'Initial stock',
          userId: this.defaultUserId,
          terminalId: this.defaultTerminalId,
          branchId: this.defaultBranchId
        })
      }

      return { success: true, data: product }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, input: ProductUpdateInput): Promise<OperationResult<Product>> {
    try {
      const existing = await productRepository.findById(id)
      if (!existing) {
        return { success: false, error: 'Product not found' }
      }

      // Validate SKU uniqueness if changed
      if (input.sku && input.sku !== existing.sku) {
        if (await productRepository.skuExists(input.sku, id)) {
          return { success: false, error: 'A product with this SKU already exists' }
        }
      }

      // Validate barcode uniqueness if changed
      if (input.barcode && input.barcode !== existing.barcode) {
        if (await productRepository.barcodeExists(input.barcode, id)) {
          return { success: false, error: 'A product with this barcode already exists' }
        }

        const barcodeValidation = validateBarcode(input.barcode)
        if (!barcodeValidation.valid) {
          return { success: false, error: barcodeValidation.error }
        }
      }

      const updated = await productRepository.update(id, input as any)
      if (!updated) {
        return { success: false, error: 'Failed to update product' }
      }

      // Update default variant SKU/barcode if they changed
      if (input.sku || input.barcode) {
        const defaultVariant = await variantRepository.getDefaultVariant(id)
        if (defaultVariant) {
          await variantRepository.updateVariant(defaultVariant.id, {
            sku: input.sku || defaultVariant.sku || undefined,
            barcode: input.barcode || defaultVariant.barcode || undefined
          })
        }
      }

      return { success: true, data: updated }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a product (archive)
   */
  async deleteProduct(id: string): Promise<OperationResult<boolean>> {
    try {
      // Check if product has sales history
      const variants = await variantRepository.findByProductId(id)
      for (const variant of variants) {
        const movements = await stockMovementRepository.findByVariantId(variant.id, { limit: 1 })
        if (movements.length > 0) {
          // Archive instead of delete
          await productRepository.update(id, { status: 'inactive' } as any)
          return { success: true, data: true }
        }
      }

      // No history, safe to delete
      const success = await productRepository.delete(id)
      return { success, data: success }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get product with all variants and stock info
   */
  async getProductWithVariants(id: string): Promise<ProductWithVariants | null> {
    const product = await productRepository.findById(id)
    if (!product) return null

    const variants = await variantRepository.findByProductId(id)
    let totalStock = 0

    for (const variant of variants) {
      const stock = await inventoryService.getStock(variant.id)
      totalStock += stock
    }

    return {
      ...product,
      variants,
      totalStock
    }
  }

  /**
   * Get variants for a product with stock info
   */
  async getProductVariants(productId: string): Promise<DisplayVariant[]> {
    const variants = await variantRepository.findByProductId(productId)
    const displayVariants: DisplayVariant[] = []

    for (const variant of variants) {
      const stock = await inventoryService.getStock(variant.id)
      displayVariants.push(toDisplayVariant(variant, stock))
    }

    return displayVariants
  }

  /**
   * Add a variant to a product
   */
  async addVariant(productId: string, input: Omit<ProductVariantInput, 'product_id'>): Promise<OperationResult<ProductVariant>> {
    try {
      const product = await productRepository.findById(productId)
      if (!product) {
        return { success: false, error: 'Product not found' }
      }

      // Validate SKU uniqueness
      if (input.sku) {
        if (await variantRepository.skuExists(input.sku)) {
          return { success: false, error: 'A variant with this SKU already exists' }
        }
      }

      // Validate barcode uniqueness
      if (input.barcode) {
        if (await variantRepository.barcodeExists(input.barcode)) {
          return { success: false, error: 'A variant with this barcode already exists' }
        }

        const barcodeValidation = validateBarcode(input.barcode)
        if (!barcodeValidation.valid) {
          return { success: false, error: barcodeValidation.error }
        }
      }

      const variant = await variantRepository.createVariant({
        ...input,
        product_id: productId
      })

      // Mark product as having variants
      await productRepository.update(productId, { has_variants: 1 } as any)

      return { success: true, data: variant }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Update a variant
   */
  async updateVariant(variantId: string, input: Partial<ProductVariantInput>): Promise<OperationResult<ProductVariant>> {
    try {
      const existing = await variantRepository.findById(variantId)
      if (!existing) {
        return { success: false, error: 'Variant not found' }
      }

      // Validate SKU uniqueness if changed
      if (input.sku && input.sku !== existing.sku) {
        if (await variantRepository.skuExists(input.sku, variantId)) {
          return { success: false, error: 'A variant with this SKU already exists' }
        }
      }

      // Validate barcode uniqueness if changed
      if (input.barcode && input.barcode !== existing.barcode) {
        if (await variantRepository.barcodeExists(input.barcode, variantId)) {
          return { success: false, error: 'A variant with this barcode already exists' }
        }

        const barcodeValidation = validateBarcode(input.barcode)
        if (!barcodeValidation.valid) {
          return { success: false, error: barcodeValidation.error }
        }
      }

      const updated = await variantRepository.updateVariant(variantId, input)
      if (!updated) {
        return { success: false, error: 'Failed to update variant' }
      }

      return { success: true, data: updated }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Delete a variant
   */
  async deleteVariant(variantId: string): Promise<OperationResult<boolean>> {
    try {
      const variant = await variantRepository.findById(variantId)
      if (!variant) {
        return { success: false, error: 'Variant not found' }
      }

      // Check if variant has movement history
      const movements = await stockMovementRepository.findByVariantId(variantId, { limit: 1 })
      if (movements.length > 0) {
        // Archive instead of delete
        await variantRepository.deactivate(variantId)
        return { success: true, data: true }
      }

      // No history, safe to delete
      const success = await variantRepository.delete(variantId)
      return { success, data: success }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Find product/variant by barcode
   */
  async findByBarcode(barcode: string): Promise<{ product: Product; variant: ProductVariant } | null> {
    // First check variants
    const variant = await variantRepository.findByBarcode(barcode)
    if (variant) {
      const product = await productRepository.findById(variant.product_id)
      if (product) {
        return { product, variant }
      }
    }

    // Then check products (legacy support)
    const product = await productRepository.findByBarcode(barcode)
    if (product) {
      const defaultVariant = await variantRepository.getDefaultVariant(product.id)
      if (defaultVariant) {
        return { product, variant: defaultVariant }
      }
    }

    return null
  }

  /**
   * Search products
   */
  async searchProducts(query: string): Promise<Product[]> {
    return productRepository.search(query)
  }

  /**
   * Get products by supplier
   */
  async getProductsBySupplier(supplierId: string): Promise<Product[]> {
    return supplierRepository.getProductsBySupplier(supplierId)
  }

  /**
   * Queue operation for offline sync
   */
  private queueOperation(operation: Omit<QueuedOperation, 'id' | 'timestamp'>): void {
    this.syncQueue.push({
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    })
    this.persistSyncQueue()
  }

  /**
   * Persist sync queue to localStorage
   */
  private persistSyncQueue(): void {
    try {
      localStorage.setItem('product_sync_queue', JSON.stringify(this.syncQueue))
    } catch {
      // Ignore localStorage errors
    }
  }

  /**
   * Load sync queue from localStorage
   */
  loadSyncQueue(): void {
    try {
      const saved = localStorage.getItem('product_sync_queue')
      if (saved) {
        this.syncQueue = JSON.parse(saved)
      }
    } catch {
      this.syncQueue = []
    }
  }

  /**
   * Get pending sync operations
   */
  getPendingSyncCount(): number {
    return this.syncQueue.length
  }

  /**
   * Clear sync queue (after successful sync)
   */
  clearSyncQueue(): void {
    this.syncQueue = []
    this.persistSyncQueue()
  }

  /**
   * Set default context
   */
  setDefaultContext(userId: string, terminalId: string, branchId: string): void {
    this.defaultUserId = userId
    this.defaultTerminalId = terminalId
    this.defaultBranchId = branchId
    inventoryService.setDefaultContext(userId, terminalId, branchId)
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<any[]> {
    return inventoryService.getLowStockProducts()
  }

  /**
   * Get products with stock below threshold
   */
  async getProductsNeedingReorder(): Promise<any[]> {
    // Get all active alerts for low stock
    const alerts = await inventoryService.getActiveAlerts()
    return alerts.filter(a => a.alertType === 'low_stock' || a.alertType === 'out_of_stock')
  }
}

export const productService = new ProductService()
export default productService
