<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissions } from '@/composables/usePermissions'

const props = defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const { can, canAny, PERMISSIONS } = usePermissions()

interface MenuItem {
  label: string
  icon: string
  route: string
  color: string
  permission?: string | string[]
}

interface MenuSection {
  label?: string
  items: MenuItem[]
}

const sections: MenuSection[] = [
  {
    items: [
      { label: 'Dashboard', icon: 'pi pi-home', color: '#3b82f6', route: '/' },
      { label: 'POS Terminal', icon: 'pi pi-calculator', color: '#10b981', route: '/pos', permission: PERMISSIONS.SALES_CREATE }
    ]
  },
  {
    label: 'Sales',
    items: [
      { label: 'Transactions', icon: 'pi pi-receipt', color: '#6366f1', route: '/orders', permission: PERMISSIONS.SALES_CREATE },
      { label: 'Discounts', icon: 'pi pi-percentage', color: '#f59e0b', route: '/discounts', permission: PERMISSIONS.SALES_DISCOUNT }
    ]
  },
  {
    label: 'Catalog',
    items: [
      { label: 'Products', icon: 'pi pi-box', color: '#8b5cf6', route: '/products', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Categories', icon: 'pi pi-tags', color: '#ec4899', route: '/categories', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Suppliers', icon: 'pi pi-truck', color: '#14b8a6', route: '/suppliers', permission: PERMISSIONS.INVENTORY_VIEW }
    ]
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Stock Levels', icon: 'pi pi-warehouse', color: '#f97316', route: '/inventory', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Movements', icon: 'pi pi-history', color: '#64748b', route: '/stock-movements', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Adjustments', icon: 'pi pi-sliders-h', color: '#0ea5e9', route: '/adjustments', permission: PERMISSIONS.INVENTORY_ADJUST },
      { label: 'Transfers', icon: 'pi pi-arrow-right-arrow-left', color: '#a855f7', route: '/transfers', permission: PERMISSIONS.INVENTORY_ADJUST }
    ]
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customer List', icon: 'pi pi-users', color: '#3b82f6', route: '/customers', permission: PERMISSIONS.SALES_CREATE },
      { label: 'Insights', icon: 'pi pi-chart-line', color: '#10b981', route: '/customer-insights', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Loyalty Tiers', icon: 'pi pi-star', color: '#f59e0b', route: '/tiers', permission: PERMISSIONS.SETTINGS_VIEW }
    ]
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales Reports', icon: 'pi pi-file', color: '#6366f1', route: '/reports', permission: [PERMISSIONS.REPORTS_XREADING, PERMISSIONS.REPORTS_SALES] },
      { label: 'Cash Variance', icon: 'pi pi-money-bill', color: '#10b981', route: '/cash-variance', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Product Analytics', icon: 'pi pi-chart-bar', color: '#f97316', route: '/analytics/products', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Time Analysis', icon: 'pi pi-clock', color: '#0ea5e9', route: '/analytics/time', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Cashier Performance', icon: 'pi pi-id-card', color: '#8b5cf6', route: '/analytics/cashiers', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Inventory Analytics', icon: 'pi pi-chart-pie', color: '#ec4899', route: '/analytics/inventory', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Custom Reports', icon: 'pi pi-file-export', color: '#14b8a6', route: '/analytics/custom-reports', permission: PERMISSIONS.REPORTS_SALES }
    ]
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users', icon: 'pi pi-user', color: '#64748b', route: '/users', permission: PERMISSIONS.USERS_VIEW },
      { label: 'Roles', icon: 'pi pi-shield', color: '#ef4444', route: '/roles', permission: PERMISSIONS.USERS_EDIT },
      { label: 'Branches', icon: 'pi pi-building', color: '#a855f7', route: '/branches', permission: PERMISSIONS.USERS_EDIT },
      { label: 'Settings', icon: 'pi pi-cog', color: '#64748b', route: '/settings', permission: PERMISSIONS.SETTINGS_VIEW }
    ]
  }
]

function filterItem(item: MenuItem): boolean {
  if (!item.permission) return true
  if (Array.isArray(item.permission)) return canAny(item.permission)
  return can(item.permission)
}

const filteredSections = computed(() =>
  sections
    .map(section => ({
      ...section,
      items: section.items.filter(filterItem)
    }))
    .filter(section => section.items.length > 0)
)

function isRouteActive(itemRoute: string): boolean {
  if (itemRoute === '/') return route.path === '/'
  return route.path === itemRoute || route.path.startsWith(itemRoute + '/')
}

// Collapsed mode: pick first item per section
const collapsedItems = computed(() =>
  filteredSections.value.flatMap(section => section.items)
)
</script>

<template>
  <nav class="sidebar-nav" :class="{ 'sidebar-nav--collapsed': collapsed }">
    <!-- Expanded mode -->
    <template v-if="!collapsed">
      <div
        v-for="(section, idx) in filteredSections"
        :key="idx"
        class="nav-section"
      >
        <div v-if="section.label" class="nav-section__label">{{ section.label }}</div>
        <router-link
          v-for="item in section.items"
          :key="item.route"
          :to="item.route"
          class="nav-link"
          :class="{ 'nav-link--active': isRouteActive(item.route) }"
        >
          <span class="nav-link__icon-badge" :style="{ background: item.color }">
            <i :class="item.icon" />
          </span>
          <span class="nav-link__text">{{ item.label }}</span>
        </router-link>
      </div>
    </template>

    <!-- Collapsed mode: icon-only -->
    <template v-else>
      <router-link
        v-for="item in collapsedItems"
        :key="item.route"
        :to="item.route"
        class="nav-link nav-link--icon-only"
        :class="{ 'nav-link--active': isRouteActive(item.route) }"
        v-tooltip.right="item.label"
      >
        <span class="nav-link__icon-badge" :style="{ background: item.color }">
          <i :class="item.icon" />
        </span>
      </router-link>
    </template>
  </nav>
</template>

<style scoped>
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  overflow-y: scroll;
  overflow-x: hidden;
  flex: 1;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.sidebar-nav:hover {
  scrollbar-color: var(--app-surface-300) transparent;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

.sidebar-nav:hover::-webkit-scrollbar-thumb {
  background: var(--app-surface-300);
}

/* ── Section ── */
.nav-section {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.nav-section + .nav-section {
  margin-top: 0.75rem;
}

.nav-section__label {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--p-text-muted-color);
  padding: 0.375rem 0.75rem 0.375rem;
  user-select: none;
}

/* ── Link ── */
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 10px;
  text-decoration: none;
  color: var(--p-text-color);
  font-size: var(--text-base);
  font-weight: 400;
  transition: background 0.15s ease;
  cursor: pointer;
}

.nav-link:hover {
  background: var(--app-surface-100);
}

.nav-link--active {
  background: color-mix(in srgb, var(--p-primary-color) 10%, transparent);
  color: var(--p-primary-color);
  font-weight: 500;
}

.nav-link--active:hover {
  background: color-mix(in srgb, var(--p-primary-color) 14%, transparent);
}

/* iOS-style icon badge */
.nav-link__icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  flex-shrink: 0;
  color: #fff;
  font-size: 0.875rem;
}

.nav-link__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* ── Collapsed mode ── */
.sidebar-nav--collapsed {
  padding: 0.5rem;
  align-items: center;
  gap: 2px;
}

.nav-link--icon-only {
  justify-content: center;
  padding: 0.5rem;
}

.nav-link--icon-only .nav-link__icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 1rem;
}
</style>
