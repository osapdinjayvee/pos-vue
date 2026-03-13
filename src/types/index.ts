// Re-export from repositories for consistency
export type {
  Product,
  ProductInput,
  ProductFilters,
  ProductStatus,
  TaxType
} from '@/repositories/productRepository'

export type {
  Category,
  CategoryInput
} from '@/repositories/categoryRepository'

export type {
  ProductVariant,
  ProductVariantInput,
  DisplayVariant
} from '@/types/inventory'

// Legacy display format for components (camelCase)
export interface DisplayProduct {
  id: string
  name: string
  description: string
  image: string
  price: number
  cost: number
  sku: string
  barcode: string
  category: string
  category_id?: string
  stock: number
  low_stock_threshold?: number
  status: 'active' | 'inactive' | 'out-of-stock' | 'archived'
  tax_type?: string
  sold: number
  revenue: number
  createdAt: string
  updatedAt: string
  expirationDate?: string | null
  // Wholesale pricing
  wholesalePrice?: number | null
  wholesaleMinQty?: number
  autoApplyWholesale?: boolean
}

// Legacy exports for backward compatibility with existing components
export interface MenuItem {
  label: string
  icon?: string
  to?: string
  items?: MenuItem[]
  separator?: boolean
  permission?: string | string[] // Required permission(s) to view this menu item
}

export interface StatsData {
  label: string
  value: string
  icon: string
  trend: number
  trendLabel: string
  color: string
  subtitle?: string
}

export interface Order {
  id: string
  customer: string
  date: string
  amount: number
  status: 'completed' | 'pending' | 'cancelled'
  paymentMethod: string
}

export interface ChartData {
  labels: string[]
  datasets: {
    label?: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    tension?: number
    fill?: boolean
  }[]
}

// Helper to convert DB product to legacy format (for components using old format)
export function toDisplayProduct(product: import('@/repositories/productRepository').Product): DisplayProduct {
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    image: product.image || '',
    price: product.price,
    cost: product.cost,
    sku: product.sku,
    barcode: product.barcode || '',
    category: product.category_name || '',
    category_id: product.category_id,
    stock: product.stock,
    low_stock_threshold: product.low_stock_threshold,
    status: product.status,
    tax_type: product.tax_type,
    sold: product.sold,
    revenue: product.revenue,
    createdAt: product.created_at || '',
    updatedAt: product.updated_at || '',
    expirationDate: product.expiration_date,
    wholesalePrice: product.wholesale_price,
    wholesaleMinQty: product.wholesale_min_qty,
    autoApplyWholesale: product.auto_apply_wholesale === 1
  }
}

// Helper to convert display product to DB format
export function toDbProduct(product: any): import('@/repositories/productRepository').ProductInput {
  return {
    name: product.name,
    description: product.description,
    image: product.image,
    price: product.price,
    cost: product.cost,
    sku: product.sku,
    barcode: product.barcode,
    category_id: product.category_id || product.category,
    stock: product.stock,
    status: product.status,
    expiration_date: product.expirationDate || product.expiration_date,
    wholesale_price: product.wholesalePrice || product.wholesale_price,
    wholesale_min_qty: product.wholesaleMinQty || product.wholesale_min_qty,
    auto_apply_wholesale: product.autoApplyWholesale || product.auto_apply_wholesale
  }
}
