import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/pos',
      name: 'pos',
      component: () => import('@/views/POSView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue')
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/views/OrdersView.vue')
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('@/views/ProductsView.vue')
        },
        {
          path: 'products/new',
          name: 'product-create',
          component: () => import('@/views/ProductFormView.vue')
        },
        {
          path: 'products/:id',
          name: 'product-detail',
          component: () => import('@/views/ProductDetailView.vue')
        },
        {
          path: 'products/:id/edit',
          name: 'product-edit',
          component: () => import('@/views/ProductFormView.vue')
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/views/CategoriesView.vue')
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('@/views/InventoryView.vue')
        },
        {
          path: 'adjustments',
          name: 'adjustments',
          component: () => import('@/views/AdjustmentsView.vue')
        },
        {
          path: 'suppliers',
          name: 'suppliers',
          component: () => import('@/views/SuppliersView.vue')
        },
        {
          path: 'transfers',
          name: 'transfers',
          component: () => import('@/views/TransfersView.vue')
        },
        {
          path: 'customers',
          name: 'customers',
          component: () => import('@/views/CustomersView.vue')
        },
        {
          path: 'customers/:id',
          name: 'customer-detail',
          component: () => import('@/views/CustomerDetailView.vue')
        },
        {
          path: 'customer-insights',
          name: 'customer-insights',
          component: () => import('@/views/CustomerInsightsView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'tiers',
          name: 'tiers',
          component: () => import('@/views/TierManagementView.vue'),
          meta: { requiresPermission: 'settings.view' }
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('@/views/UsersView.vue'),
          meta: { requiresPermission: 'users.view' }
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/RolesView.vue'),
          meta: { requiresPermission: 'users.edit' }
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/ReportsView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'reports/x-reading',
          name: 'x-reading',
          component: () => import('@/views/XReadingView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'reports/z-reading',
          name: 'z-reading',
          component: () => import('@/views/ZReadingView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'reports/daily-sales',
          name: 'daily-sales',
          component: () => import('@/views/DailySalesView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'reports/sales-summary',
          name: 'sales-summary',
          component: () => import('@/views/SalesSummaryView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'sync-queue',
          name: 'sync-queue',
          component: () => import('@/views/SyncQueueView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'conflicts',
          name: 'conflicts',
          component: () => import('@/views/ConflictsView.vue'),
          meta: { requiresPermission: 'users.edit' }
        },
        {
          path: 'branches',
          name: 'branches',
          component: () => import('@/views/BranchDashboardView.vue'),
          meta: { requiresPermission: 'users.edit' }
        },
        {
          path: 'analytics/products',
          name: 'product-analytics',
          component: () => import('@/views/ProductAnalyticsView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'analytics/cashiers',
          name: 'cashier-performance',
          component: () => import('@/views/CashierPerformanceView.vue'),
          meta: { requiresAuth: true, requiresPermission: 'reports.view' }
        },
        {
          path: 'analytics/time',
          name: 'time-analysis',
          component: () => import('@/views/TimeAnalysisView.vue'),
          meta: { requiresAuth: true, requiresPermission: 'reports.view' }
        },
        {
          path: 'analytics/inventory',
          name: 'inventory-analytics',
          component: () => import('@/views/InventoryAnalyticsView.vue'),
          meta: { requiresAuth: true, requiresPermission: 'reports.view' }
        },
        {
          path: 'analytics/custom-reports',
          name: 'custom-reports',
          component: () => import('@/views/CustomReportsView.vue'),
          meta: { requiresAuth: true, requiresPermission: 'reports.view' }
        },
        {
          path: 'cash-variance',
          name: 'cash-variance',
          component: () => import('@/views/CashVarianceView.vue'),
          meta: { requiresAuth: true, requiresPermission: 'reports.view' }
        },
        {
          path: 'sync-health',
          name: 'sync-health',
          component: () => import('@/views/SyncHealthView.vue'),
          meta: { requiresPermission: 'users.edit' }
        },
        {
          path: 'eis-submissions',
          name: 'eis-submissions',
          component: () => import('@/views/EISSubmissionsView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'eis-reports',
          name: 'eis-reports',
          component: () => import('@/views/EISReportsView.vue'),
          meta: { requiresPermission: 'reports.view' }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue')
        }
      ]
    }
  ]
})

// Navigation guard for authentication
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // Initialize auth state if needed
  if (!authStore.isLoggedIn) {
    authStore.initialize()
  }

  // Check if route requires authentication
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth !== false)

  if (requiresAuth && !authStore.isLoggedIn) {
    // Redirect to login
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // Check if route requires specific permission
  const requiredPermission = to.meta.requiresPermission as string | undefined

  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    // Redirect to dashboard if no permission
    next({ name: 'dashboard' })
    return
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (to.name === 'login' && authStore.isLoggedIn) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
