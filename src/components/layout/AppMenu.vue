<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PanelMenu from 'primevue/panelmenu'
import { usePermissions } from '@/composables/usePermissions'

const props = defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const { can, canAny, PERMISSIONS } = usePermissions()

// Top-level items (always visible, no group wrapper)
const topItems = [
  { label: 'Dashboard', icon: 'pi pi-home', route: '/' },
  { label: 'POS Terminal', icon: 'pi pi-calculator', route: '/pos', permission: PERMISSIONS.SALES_CREATE }
]

const filteredTopItems = computed(() =>
  topItems.filter(item => !item.permission || can(item.permission))
)

// Raw grouped menu definitions
interface MenuChild {
  label: string
  icon: string
  route: string
  permission?: string | string[]
}

interface MenuGroup {
  key: string
  label: string
  icon: string
  items: MenuChild[]
}

const rawGroups: MenuGroup[] = [
  {
    key: 'sales',
    label: 'Sales',
    icon: 'pi pi-shopping-cart',
    items: [
      { label: 'Orders', icon: 'pi pi-list', route: '/orders', permission: PERMISSIONS.SALES_CREATE }
    ]
  },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: 'pi pi-box',
    items: [
      { label: 'Products', icon: 'pi pi-box', route: '/products', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Categories', icon: 'pi pi-tags', route: '/categories', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Suppliers', icon: 'pi pi-truck', route: '/suppliers', permission: PERMISSIONS.INVENTORY_VIEW }
    ]
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: 'pi pi-warehouse',
    items: [
      { label: 'Stock Levels', icon: 'pi pi-warehouse', route: '/inventory', permission: PERMISSIONS.INVENTORY_VIEW },
      { label: 'Adjustments', icon: 'pi pi-sliders-h', route: '/adjustments', permission: PERMISSIONS.INVENTORY_ADJUST },
      { label: 'Transfers', icon: 'pi pi-arrow-right-arrow-left', route: '/transfers', permission: PERMISSIONS.INVENTORY_ADJUST }
    ]
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: 'pi pi-users',
    items: [
      { label: 'Customer List', icon: 'pi pi-users', route: '/customers', permission: PERMISSIONS.SALES_CREATE },
      { label: 'Insights', icon: 'pi pi-chart-line', route: '/customer-insights', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Loyalty Tiers', icon: 'pi pi-star', route: '/tiers', permission: PERMISSIONS.SETTINGS_VIEW }
    ]
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    icon: 'pi pi-chart-bar',
    items: [
      { label: 'Sales Reports', icon: 'pi pi-file', route: '/reports', permission: [PERMISSIONS.REPORTS_XREADING, PERMISSIONS.REPORTS_SALES] },
      { label: 'Cash Variance', icon: 'pi pi-money-bill', route: '/cash-variance', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Product Analytics', icon: 'pi pi-chart-bar', route: '/analytics/products', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Time Analysis', icon: 'pi pi-clock', route: '/analytics/time', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Cashier Performance', icon: 'pi pi-id-card', route: '/analytics/cashiers', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Inventory Analytics', icon: 'pi pi-chart-pie', route: '/analytics/inventory', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'Custom Reports', icon: 'pi pi-file-export', route: '/analytics/custom-reports', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'EIS Submissions', icon: 'pi pi-cloud-upload', route: '/eis-submissions', permission: PERMISSIONS.REPORTS_SALES },
      { label: 'EIS Reports', icon: 'pi pi-file-check', route: '/eis-reports', permission: PERMISSIONS.REPORTS_SALES }
    ]
  },
  {
    key: 'admin',
    label: 'Administration',
    icon: 'pi pi-cog',
    items: [
      { label: 'Users', icon: 'pi pi-user', route: '/users', permission: PERMISSIONS.USERS_VIEW },
      { label: 'Roles', icon: 'pi pi-shield', route: '/roles', permission: PERMISSIONS.USERS_EDIT },
      { label: 'Branches', icon: 'pi pi-building', route: '/branches', permission: PERMISSIONS.USERS_EDIT },
      { label: 'Sync Queue', icon: 'pi pi-cloud-upload', route: '/sync-queue', permission: [PERMISSIONS.REPORTS_XREADING, PERMISSIONS.REPORTS_SALES] },
      { label: 'Sync Health', icon: 'pi pi-heart', route: '/sync-health', permission: PERMISSIONS.USERS_EDIT },
      { label: 'Settings', icon: 'pi pi-cog', route: '/settings', permission: PERMISSIONS.SETTINGS_VIEW }
    ]
  }
]

// Permission-filtered PanelMenu model
const menuModel = computed(() => {
  return rawGroups
    .map(group => ({
      key: group.key,
      label: group.label,
      icon: group.icon,
      items: group.items
        .filter(item => {
          if (!item.permission) return true
          if (Array.isArray(item.permission)) return canAny(item.permission)
          return can(item.permission)
        })
        .map(item => ({
          label: item.label,
          icon: item.icon,
          route: item.route
        }))
    }))
    .filter(group => group.items.length > 0)
})

// Expanded keys for PanelMenu controlled mode
const expandedKeys = ref<Record<string, boolean>>({})

function isRouteActive(itemRoute: string): boolean {
  if (itemRoute === '/') return route.path === '/'
  return route.path === itemRoute || route.path.startsWith(itemRoute + '/')
}

function groupHasActiveRoute(group: { items: { route?: string }[] }): boolean {
  return group.items.some(item => item.route ? isRouteActive(item.route) : false)
}

// Auto-expand group containing the active route
function expandActiveGroup() {
  const activeGroup = menuModel.value.find(group => groupHasActiveRoute(group))
  if (activeGroup) {
    expandedKeys.value = { ...expandedKeys.value, [activeGroup.key]: true }
  }
}

watch(() => route.path, expandActiveGroup)
onMounted(expandActiveGroup)
</script>

<template>
  <nav class="sidebar-menu" :class="{ 'sidebar-menu--collapsed': collapsed }">
    <!-- Top-level items (Dashboard, POS) -->
    <div class="nav-section nav-section--top">
      <router-link
        v-for="item in filteredTopItems"
        :key="item.route"
        :to="item.route"
        class="nav-item"
        :class="{ 'nav-item--active': isRouteActive(item.route) }"
        v-tooltip.right="collapsed ? item.label : undefined"
      >
        <i :class="item.icon" class="nav-item__icon"></i>
        <span v-if="!collapsed" class="nav-item__label">{{ item.label }}</span>
      </router-link>
    </div>

    <div v-if="!collapsed" class="nav-divider"></div>

    <!-- Grouped items via PanelMenu (expanded mode) -->
    <div v-show="!collapsed" class="nav-section nav-section--groups">
      <PanelMenu v-model:expandedKeys="expandedKeys" :model="menuModel" multiple class="sidebar-panelmenu">
        <template #item="{ item }">
          <!-- Group header (no route) -->
          <a v-if="!item.route" v-ripple class="nav-group-header">
            <i :class="item.icon" class="nav-group-header__icon"></i>
            <span class="nav-group-header__label">{{ item.label }}</span>
            <i
              class="pi pi-chevron-right nav-group-header__chevron"
              :class="{ 'nav-group-header__chevron--open': expandedKeys[item.key] }"
            ></i>
          </a>
          <!-- Child link (has route) -->
          <router-link
            v-else
            v-slot="{ href, navigate }"
            :to="item.route"
            custom
          >
            <a
              v-ripple
              :href="href"
              class="nav-item nav-item--child"
              :class="{ 'nav-item--active': isRouteActive(item.route) }"
              @click="navigate"
            >
              <i :class="item.icon" class="nav-item__icon"></i>
              <span class="nav-item__label">{{ item.label }}</span>
            </a>
          </router-link>
        </template>
      </PanelMenu>
    </div>

    <!-- Collapsed mode: icon-only for groups -->
    <div v-show="collapsed" class="nav-section nav-section--collapsed-groups">
      <div v-if="collapsed" class="nav-divider"></div>
      <router-link
        v-for="group in menuModel"
        :key="group.key"
        :to="group.items[0]?.route || '/'"
        class="nav-item"
        :class="{ 'nav-item--active': groupHasActiveRoute(group) }"
        v-tooltip.right="group.label"
      >
        <i :class="group.icon" class="nav-item__icon"></i>
      </router-link>
    </div>
  </nav>
</template>

<style scoped>
/* ===== Nav Section Layout ===== */
.nav-section--top {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0.75rem;
}

.nav-section--groups {
  padding: 0 0.5rem;
}

.nav-section--collapsed-groups {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 0.75rem;
}

.nav-divider {
  height: 1px;
  background: var(--p-surface-200);
  margin: 0.5rem 1.25rem;
}

/* ===== Nav Items (top-level + child links) ===== */
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.875rem;
  border-radius: 8px;
  text-decoration: none;
  color: var(--p-text-color);
  font-size: 0.875rem;
  font-weight: 450;
  transition: background 0.15s ease, color 0.15s ease;
  cursor: pointer;
  position: relative;
}

.nav-item:hover {
  background: var(--p-surface-100);
}

.nav-item--active {
  color: var(--p-primary-color);
  background: color-mix(in srgb, var(--p-primary-color) 8%, transparent);
}

.nav-item--active:hover {
  background: color-mix(in srgb, var(--p-primary-color) 12%, transparent);
}

.nav-item__icon {
  font-size: 1.125rem;
  width: 1.375rem;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-item--active .nav-item__icon {
  color: var(--p-primary-color);
  opacity: 1;
}

.nav-item__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* Child items get slight left indent */
.nav-item--child {
  padding-left: 2.25rem;
  font-weight: 400;
}

/* ===== Group Header ===== */
.nav-group-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.875rem;
  cursor: pointer;
  text-decoration: none;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.nav-group-header:hover {
  background: var(--p-surface-100);
}

.nav-group-header__icon {
  font-size: 0.875rem;
  width: 1.375rem;
  text-align: center;
  flex-shrink: 0;
  color: var(--p-text-muted-color);
}

.nav-group-header__label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--p-text-muted-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.nav-group-header__chevron {
  font-size: 0.625rem;
  color: var(--p-text-muted-color);
  margin-left: auto;
  transition: transform 0.2s ease;
  opacity: 0.6;
}

.nav-group-header__chevron--open {
  transform: rotate(90deg);
}

.nav-group-header:hover .nav-group-header__chevron {
  opacity: 1;
}

/* ===== Collapsed Mode ===== */
.sidebar-menu--collapsed .nav-section--top,
.sidebar-menu--collapsed .nav-section--collapsed-groups {
  padding: 0 0.5rem;
}

.sidebar-menu--collapsed .nav-item {
  justify-content: center;
  padding: 0.7rem;
  gap: 0;
}

.sidebar-menu--collapsed .nav-item__icon {
  font-size: 1.25rem;
  width: auto;
}

.sidebar-menu--collapsed .nav-divider {
  margin: 0.5rem 0.75rem;
}

/* ===== PanelMenu Reset (strip PrimeVue defaults) ===== */
.sidebar-panelmenu :deep(.p-panelmenu-panel) {
  border: none;
  margin-bottom: 0;
}

.sidebar-panelmenu :deep(.p-panelmenu-header) {
  border: none;
  background: transparent;
  outline: none;
}

.sidebar-panelmenu :deep(.p-panelmenu-header-content) {
  border: none !important;
  background: transparent !important;
  padding: 0;
  border-radius: 6px;
  transition: none;
}

.sidebar-panelmenu :deep(.p-panelmenu-header-link) {
  padding: 0 !important;
  gap: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
}

/* Hide PanelMenu's built-in chevron (we render our own) */
.sidebar-panelmenu :deep(.p-panelmenu-submenu-icon) {
  display: none;
}

/* Content and submenu list */
.sidebar-panelmenu :deep(.p-panelmenu-content-container) {
  border: none;
}

.sidebar-panelmenu :deep(.p-panelmenu-content) {
  border: none !important;
  background: transparent !important;
  padding: 2px 0 0.25rem !important;
}

.sidebar-panelmenu :deep(.p-panelmenu-root-list) {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.sidebar-panelmenu :deep(.p-panelmenu-submenu) {
  padding: 0 !important;
  list-style: none;
}

.sidebar-panelmenu :deep(.p-panelmenu-item) {
  margin: 0;
}

.sidebar-panelmenu :deep(.p-panelmenu-item-content) {
  border: none !important;
  background: transparent !important;
  padding: 0;
  border-radius: 8px;
  transition: none;
}

.sidebar-panelmenu :deep(.p-panelmenu-item-link) {
  padding: 0 !important;
}

/* Focus ring override - keep subtle */
.sidebar-panelmenu :deep(.p-panelmenu-header:focus-visible) {
  outline: none;
}

.sidebar-panelmenu :deep(.p-panelmenu-item-content:focus-visible) {
  outline: none;
}

.sidebar-panelmenu :deep(.p-focus > .p-panelmenu-item-content) {
  background: transparent !important;
  box-shadow: none !important;
}

.sidebar-panelmenu :deep(.p-focus > .p-panelmenu-header-content) {
  background: transparent !important;
  box-shadow: none !important;
}
</style>
