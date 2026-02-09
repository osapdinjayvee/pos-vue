<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Breadcrumb from 'primevue/breadcrumb'
import Menu from 'primevue/menu'
import Tag from 'primevue/tag'
import SyncStatus from '@/components/sync/SyncStatus.vue'
import { useLayout } from '@/composables/useLayout'
import { useTheme } from '@/composables/useTheme'
import { useAuth } from '@/composables/useAuth'
import { useShift } from '@/composables/useShift'

const { toggleSidebar, toggleMobileMenu } = useLayout()
const { isDark, toggleTheme } = useTheme()
const { currentUser, fullName, primaryRole, logout, lock } = useAuth()
const { hasOpenShift, currentShift, shiftDuration } = useShift()

const route = useRoute()
const router = useRouter()

const userMenuRef = ref()
const shiftMenuRef = ref()

const breadcrumbItems = computed(() => {
  const path = route.path

  // Handle product sub-routes
  if (path === '/products/new') {
    return [
      { label: 'Products', route: '/products' },
      { label: 'Create' }
    ]
  }
  if (path.match(/^\/products\/[^/]+\/edit$/)) {
    return [
      { label: 'Products', route: '/products' },
      { label: 'Edit' }
    ]
  }
  if (path.match(/^\/products\/[^/]+$/)) {
    return [
      { label: 'Products', route: '/products' },
      { label: 'Details' }
    ]
  }

  // Handle customer sub-routes
  if (path.match(/^\/customers\/[^/]+$/)) {
    return [
      { label: 'Customers', route: '/customers' },
      { label: 'Details' }
    ]
  }

  // Handle discount sub-routes
  if (path === '/discounts/new') {
    return [
      { label: 'Discounts', route: '/discounts' },
      { label: 'New Discount' }
    ]
  }
  if (path.match(/^\/discounts\/[^/]+\/edit$/)) {
    return [
      { label: 'Discounts', route: '/discounts' },
      { label: 'Edit' }
    ]
  }

  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/orders': 'Transactions',
    '/products': 'Products',
    '/categories': 'Categories',
    '/inventory': 'Inventory',
    '/adjustments': 'Stock Adjustments',
    '/suppliers': 'Suppliers',
    '/transfers': 'Stock Transfers',
    '/customers': 'Customers',
    '/users': 'Users',
    '/roles': 'Roles',
    '/reports': 'Reports',
    '/settings': 'Settings',
    '/pos': 'POS Terminal',
    '/sync-queue': 'Sync Queue',
    '/conflicts': 'Sync Conflicts',
    '/branches': 'Branches',
    '/customer-insights': 'Customer Insights',
    '/tiers': 'Membership Tiers',
    '/analytics/products': 'Product Analytics',
    '/analytics/cashiers': 'Cashier Performance',
    '/analytics/time': 'Time Analysis',
    '/analytics/inventory': 'Inventory Analytics',
    '/analytics/custom-reports': 'Custom Reports',
    '/cash-variance': 'Cash Variance Report',
    '/sync-health': 'Sync Health',
    '/eis-submissions': 'EIS Submissions',
    '/eis-reports': 'EIS Reports',
    '/discounts': 'Discounts'
  }

  return [{ label: titles[path] || 'Dashboard' }]
})

const userMenuItems = computed(() => [
  {
    label: fullName.value || 'User',
    items: [
      {
        label: primaryRole.value,
        icon: 'pi pi-shield',
        disabled: true
      },
      { separator: true },
      {
        label: 'Lock Screen',
        icon: 'pi pi-lock',
        command: () => handleLock()
      },
      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        command: () => handleLogout()
      }
    ]
  }
])

const shiftMenuItems = computed(() => {
  if (!hasOpenShift.value) {
    return [
      {
        label: 'No Active Shift',
        items: [
          {
            label: 'Start Shift',
            icon: 'pi pi-play',
            command: () => emit('start-shift')
          }
        ]
      }
    ]
  }

  return [
    {
      label: `Shift: ${shiftDuration.value}`,
      items: [
        {
          label: `Terminal: ${currentShift.value?.terminalId}`,
          icon: 'pi pi-desktop',
          disabled: true
        },
        {
          label: `Opening: ₱${currentShift.value?.openingCash.toFixed(2)}`,
          icon: 'pi pi-wallet',
          disabled: true
        },
        { separator: true },
        {
          label: 'Close Shift',
          icon: 'pi pi-stop',
          command: () => emit('close-shift')
        }
      ]
    }
  ]
})

const emit = defineEmits<{
  'start-shift': []
  'close-shift': []
}>()

function toggleUserMenu(event: Event) {
  userMenuRef.value?.toggle(event)
}

function toggleShiftMenu(event: Event) {
  shiftMenuRef.value?.toggle(event)
}

async function handleLogout() {
  const result = await logout()
  if (!result.success && result.error) {
    console.error('Logout failed:', result.error)
  }
}

function handleLock() {
  lock()
}
</script>

<template>
  <header class="layout-topbar">
    <div class="topbar-left">
      <Button
        icon="pi pi-bars"
        text
        rounded
        @click="toggleSidebar"
        class="hidden-mobile"
      />
      <Button
        icon="pi pi-bars"
        text
        rounded
        @click="toggleMobileMenu"
        class="hidden-desktop"
      />
      <Breadcrumb :model="breadcrumbItems" class="topbar-breadcrumb">
        <template #separator>
          <span class="breadcrumb-separator">/</span>
        </template>
      </Breadcrumb>
    </div>

    <div class="topbar-right">
      <!-- Shift Indicator -->
      <div class="shift-indicator" @click="toggleShiftMenu">
        <Tag
          v-if="hasOpenShift"
          severity="success"
          class="shift-tag"
        >
          <i class="pi pi-clock"></i>
          <span>{{ shiftDuration }}</span>
        </Tag>
        <Tag
          v-else
          severity="warn"
          class="shift-tag"
        >
          <i class="pi pi-exclamation-triangle"></i>
          <span>No Shift</span>
        </Tag>
      </div>
      <Menu ref="shiftMenuRef" :model="shiftMenuItems" popup />

      <!-- Sync Status -->
      <SyncStatus />

      <!-- Theme Toggle -->
      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        @click="toggleTheme"
        v-tooltip.bottom="isDark ? 'Light Mode' : 'Dark Mode'"
      />

      <!-- Notifications -->
      <Button
        icon="pi pi-bell"
        text
        rounded
        badge="3"
        badgeSeverity="danger"
      />

      <!-- User Menu -->
      <Button
        icon="pi pi-user"
        text
        rounded
        @click="toggleUserMenu"
        v-tooltip.bottom="fullName"
      />
      <Menu ref="userMenuRef" :model="userMenuItems" popup />
    </div>
  </header>
</template>

<style scoped>
.hidden-mobile {
  display: inline-flex;
}

.hidden-desktop {
  display: none;
}

.topbar-breadcrumb {
  background: transparent;
  border: none;
  padding: 0;
}

.topbar-breadcrumb :deep(.p-breadcrumb-list) {
  gap: 0.5rem;
}

.topbar-breadcrumb :deep(.p-breadcrumb-item-link) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.topbar-breadcrumb :deep(.p-breadcrumb-item:last-child .p-breadcrumb-item-link) {
  color: var(--p-text-muted-color);
}

.breadcrumb-separator {
  color: var(--p-text-muted-color);
  font-weight: 400;
  margin: 0 0.25rem;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.shift-indicator {
  cursor: pointer;
}

.shift-tag {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.shift-tag i {
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .hidden-mobile {
    display: none;
  }

  .hidden-desktop {
    display: inline-flex;
  }

  .shift-tag span {
    display: none;
  }

  .shift-tag {
    padding: 0.375rem;
  }
}
</style>
