import type { StatsData, Order, DisplayProduct, ChartData } from '@/types'

export const statsData: StatsData[] = [
  {
    label: 'Total Revenue',
    value: '$54,239',
    icon: 'pi pi-dollar',
    trend: 12.5,
    trendLabel: 'vs last month',
    color: 'green'
  },
  {
    label: 'Total Orders',
    value: '1,432',
    icon: 'pi pi-shopping-cart',
    trend: 8.2,
    trendLabel: 'vs last month',
    color: 'blue'
  },
  {
    label: 'Avg Order Value',
    value: '$37.89',
    icon: 'pi pi-chart-line',
    trend: -2.4,
    trendLabel: 'vs last month',
    color: 'orange'
  },
  {
    label: 'New Customers',
    value: '287',
    icon: 'pi pi-users',
    trend: 18.7,
    trendLabel: 'vs last month',
    color: 'purple'
  }
]

export const recentOrders: Order[] = [
  { id: 'ORD-001', customer: 'John Smith', date: '2024-01-15 14:32', amount: 125.50, status: 'completed', paymentMethod: 'Credit Card' },
  { id: 'ORD-002', customer: 'Sarah Johnson', date: '2024-01-15 13:45', amount: 89.99, status: 'completed', paymentMethod: 'Cash' },
  { id: 'ORD-003', customer: 'Mike Brown', date: '2024-01-15 12:20', amount: 234.00, status: 'pending', paymentMethod: 'Credit Card' },
  { id: 'ORD-004', customer: 'Emily Davis', date: '2024-01-15 11:55', amount: 67.25, status: 'completed', paymentMethod: 'Debit Card' },
  { id: 'ORD-005', customer: 'Chris Wilson', date: '2024-01-15 10:30', amount: 156.75, status: 'cancelled', paymentMethod: 'Cash' },
  { id: 'ORD-006', customer: 'Lisa Anderson', date: '2024-01-15 09:15', amount: 445.00, status: 'completed', paymentMethod: 'Credit Card' },
  { id: 'ORD-007', customer: 'David Taylor', date: '2024-01-14 16:45', amount: 78.50, status: 'completed', paymentMethod: 'Mobile Pay' },
  { id: 'ORD-008', customer: 'Amanda White', date: '2024-01-14 15:20', amount: 199.99, status: 'pending', paymentMethod: 'Credit Card' }
]

export const products: DisplayProduct[] = [
  {
    id: 'PROD-001',
    name: 'Wireless Earbuds Pro',
    description: 'High-quality wireless earbuds with active noise cancellation and 24-hour battery life.',
    image: '',
    price: 49.99,
    cost: 25.00,
    sku: 'WEP-001',
    barcode: '1234567890123',
    category: 'Electronics',
    stock: 150,
    status: 'active',
    sold: 245,
    revenue: 12225,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15'
  },
  {
    id: 'PROD-002',
    name: 'Organic Coffee Blend',
    description: 'Premium organic coffee beans sourced from sustainable farms.',
    image: '',
    price: 15.00,
    cost: 7.50,
    sku: 'OCB-002',
    barcode: '1234567890124',
    category: 'Beverages',
    stock: 89,
    status: 'active',
    sold: 189,
    revenue: 2835,
    createdAt: '2024-01-02',
    updatedAt: '2024-01-14',
    expirationDate: '2025-06-15'
  },
  {
    id: 'PROD-003',
    name: 'Premium Leather Wallet',
    description: 'Handcrafted genuine leather wallet with RFID protection.',
    image: '',
    price: 50.00,
    cost: 20.00,
    sku: 'PLW-003',
    barcode: '1234567890125',
    category: 'Accessories',
    stock: 75,
    status: 'active',
    sold: 156,
    revenue: 7800,
    createdAt: '2024-01-03',
    updatedAt: '2024-01-13'
  },
  {
    id: 'PROD-004',
    name: 'Smart Watch Series 5',
    description: 'Advanced smartwatch with health monitoring and GPS tracking.',
    image: '',
    price: 299.99,
    cost: 150.00,
    sku: 'SWS-004',
    barcode: '1234567890126',
    category: 'Electronics',
    stock: 45,
    status: 'active',
    sold: 134,
    revenue: 40200,
    createdAt: '2024-01-04',
    updatedAt: '2024-01-12'
  },
  {
    id: 'PROD-005',
    name: 'Artisan Chocolate Box',
    description: 'Luxury assorted chocolates made with Belgian cocoa.',
    image: '',
    price: 30.00,
    cost: 12.00,
    sku: 'ACB-005',
    barcode: '1234567890127',
    category: 'Food',
    stock: 120,
    status: 'active',
    sold: 128,
    revenue: 3840,
    createdAt: '2024-01-05',
    updatedAt: '2024-01-11',
    expirationDate: '2026-02-10'
  },
  {
    id: 'PROD-006',
    name: 'Yoga Mat Premium',
    description: 'Extra thick eco-friendly yoga mat with carrying strap.',
    image: '',
    price: 35.00,
    cost: 15.00,
    sku: 'YMP-006',
    barcode: '1234567890128',
    category: 'Sports',
    stock: 200,
    status: 'active',
    sold: 98,
    revenue: 3430,
    createdAt: '2024-01-06',
    updatedAt: '2024-01-10'
  },
  {
    id: 'PROD-007',
    name: 'Ceramic Plant Pot Set',
    description: 'Set of 3 minimalist ceramic pots for indoor plants.',
    image: '',
    price: 45.00,
    cost: 18.00,
    sku: 'CPP-007',
    barcode: '1234567890129',
    category: 'Home',
    stock: 65,
    status: 'active',
    sold: 87,
    revenue: 3915,
    createdAt: '2024-01-07',
    updatedAt: '2024-01-09'
  },
  {
    id: 'PROD-008',
    name: 'Vitamin C Serum',
    description: 'Anti-aging serum with 20% Vitamin C and hyaluronic acid.',
    image: '',
    price: 28.00,
    cost: 10.00,
    sku: 'VCS-008',
    barcode: '1234567890130',
    category: 'Beauty',
    stock: 180,
    status: 'active',
    sold: 210,
    revenue: 5880,
    createdAt: '2024-01-08',
    updatedAt: '2024-01-15',
    expirationDate: '2026-02-08'
  },
  {
    id: 'PROD-009',
    name: 'Bluetooth Speaker Mini',
    description: 'Portable waterproof speaker with 10-hour battery.',
    image: '',
    price: 39.99,
    cost: 18.00,
    sku: 'BSM-009',
    barcode: '1234567890131',
    category: 'Electronics',
    stock: 0,
    status: 'out-of-stock',
    sold: 320,
    revenue: 12796,
    createdAt: '2024-01-09',
    updatedAt: '2024-01-15'
  },
  {
    id: 'PROD-010',
    name: 'Cotton T-Shirt Basic',
    description: '100% organic cotton unisex t-shirt in multiple colors.',
    image: '',
    price: 25.00,
    cost: 8.00,
    sku: 'CTB-010',
    barcode: '1234567890132',
    category: 'Clothing',
    stock: 500,
    status: 'active',
    sold: 450,
    revenue: 11250,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-14'
  },
  {
    id: 'PROD-011',
    name: 'Green Tea Collection',
    description: 'Assorted premium green tea bags from Japan.',
    image: '',
    price: 18.00,
    cost: 6.00,
    sku: 'GTC-011',
    barcode: '1234567890133',
    category: 'Beverages',
    stock: 95,
    status: 'active',
    sold: 156,
    revenue: 2808,
    createdAt: '2024-01-11',
    updatedAt: '2024-01-13',
    expirationDate: '2026-12-01'
  },
  {
    id: 'PROD-012',
    name: 'Running Shoes Pro',
    description: 'Lightweight running shoes with advanced cushioning.',
    image: '',
    price: 120.00,
    cost: 55.00,
    sku: 'RSP-012',
    barcode: '1234567890134',
    category: 'Sports',
    stock: 35,
    status: 'active',
    sold: 78,
    revenue: 9360,
    createdAt: '2024-01-12',
    updatedAt: '2024-01-15'
  },
  {
    id: 'PROD-013',
    name: 'Scented Candle Set',
    description: 'Set of 4 soy wax candles with natural fragrances.',
    image: '',
    price: 32.00,
    cost: 12.00,
    sku: 'SCS-013',
    barcode: '1234567890135',
    category: 'Home',
    stock: 140,
    status: 'active',
    sold: 165,
    revenue: 5280,
    createdAt: '2024-01-13',
    updatedAt: '2024-01-15'
  },
  {
    id: 'PROD-014',
    name: 'Face Moisturizer',
    description: 'Daily hydrating moisturizer for all skin types.',
    image: '',
    price: 22.00,
    cost: 8.00,
    sku: 'FM-014',
    barcode: '1234567890136',
    category: 'Beauty',
    stock: 0,
    status: 'out-of-stock',
    sold: 290,
    revenue: 6380,
    createdAt: '2024-01-14',
    updatedAt: '2024-01-15'
  },
  {
    id: 'PROD-015',
    name: 'Denim Jacket Classic',
    description: 'Vintage style denim jacket with modern fit.',
    image: '',
    price: 85.00,
    cost: 35.00,
    sku: 'DJC-015',
    barcode: '1234567890137',
    category: 'Clothing',
    stock: 60,
    status: 'inactive',
    sold: 45,
    revenue: 3825,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 'PROD-016',
    name: 'Protein Bar Pack',
    description: 'Box of 12 high-protein snack bars, assorted flavors.',
    image: '',
    price: 24.00,
    cost: 10.00,
    sku: 'PBP-016',
    barcode: '1234567890138',
    category: 'Food',
    stock: 220,
    status: 'active',
    sold: 180,
    revenue: 4320,
    createdAt: '2024-01-15',
    updatedAt: '2024-01-15',
    expirationDate: '2026-02-15'
  }
]

// For dashboard backward compatibility
export const topProducts = products.slice(0, 5)

export const revenueChartData: ChartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  datasets: [
    {
      label: 'Revenue',
      data: [28000, 32000, 35000, 42000, 38000, 45000, 52000, 48000, 54000, 58000, 52000, 54239],
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.4,
      fill: true
    }
  ]
}

export const salesChartData: ChartData = {
  labels: ['Electronics', 'Clothing', 'Food', 'Beverages', 'Accessories', 'Home'],
  datasets: [
    {
      label: 'Sales',
      data: [15420, 12350, 8900, 7650, 6200, 4800],
      backgroundColor: [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899'
      ]
    }
  ]
}

export const paymentChartData: ChartData = {
  labels: ['Credit Card', 'Cash', 'Debit Card', 'Mobile Pay'],
  datasets: [
    {
      data: [45, 25, 20, 10],
      backgroundColor: [
        '#3b82f6',
        '#10b981',
        '#f59e0b',
        '#8b5cf6'
      ]
    }
  ]
}
