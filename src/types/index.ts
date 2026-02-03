export interface MenuItem {
  label: string
  icon?: string
  to?: string
  items?: MenuItem[]
  separator?: boolean
}

export interface StatsData {
  label: string
  value: string
  icon: string
  trend: number
  trendLabel: string
  color: string
}

export interface Order {
  id: string
  customer: string
  date: string
  amount: number
  status: 'completed' | 'pending' | 'cancelled'
  paymentMethod: string
}

export interface Product {
  id: string
  name: string
  description: string
  image: string
  price: number
  cost: number
  sku: string
  barcode: string
  category: string
  stock: number
  status: ProductStatus
  sold: number
  revenue: number
  createdAt: string
  updatedAt: string
}

export type ProductStatus = 'active' | 'inactive' | 'out-of-stock'

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

export const categories = [
  'Electronics',
  'Clothing',
  'Food',
  'Beverages',
  'Accessories',
  'Home',
  'Beauty',
  'Sports'
] as const

export type Category = typeof categories[number]
