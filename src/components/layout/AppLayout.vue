<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import LicenseWarningBanner from './LicenseWarningBanner.vue'
import OpeningCount from '@/components/cash-drawer/OpeningCount.vue'
import ClosingCount from '@/components/cash-drawer/ClosingCount.vue'
import { useLayout } from '@/composables/useLayout'
import { useTheme } from '@/composables/useTheme'
import { useShift } from '@/composables/useShift'
import { useCashDrawer } from '@/composables/useCashDrawer'
import { useAuthStore } from '@/stores/auth'

const { isCollapsed, isMobileMenuOpen, closeMobileMenu, initLayoutListeners, destroyLayoutListeners } = useLayout()
const { initTheme } = useTheme()
const { currentShift, hasOpenShift, startShift: startShiftAction, closeShift: closeShiftAction } = useShift()
const { loadSession, hasOpenSession } = useCashDrawer()
const authStore = useAuthStore()
const toast = useToast()

const showOpeningCount = ref(false)
const showClosingCount = ref(false)

async function handleStartShift() {
  // First start the shift record with 0 opening cash (will be updated from denomination count)
  const result = await startShiftAction(0)
  if (!result.success) {
    toast.add({ severity: 'error', summary: 'Shift Error', detail: result.error || 'Failed to start shift', life: 5000 })
    return
  }
  // Show opening count dialog to create drawer session
  showOpeningCount.value = true
}

async function handleDrawerOpened(total: number) {
  showOpeningCount.value = false
  toast.add({ severity: 'success', summary: 'Drawer Opened', detail: `Opening count: ₱${total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, life: 3000 })
}

function handleCloseShift() {
  showClosingCount.value = true
}

async function handleDrawerClosed(data: { variance: number }) {
  showClosingCount.value = false

  // Close the shift itself with closing cash from the drawer session
  if (currentShift.value) {
    await closeShiftAction(0)
  }

  toast.add({ severity: 'success', summary: 'Shift Closed', detail: 'Drawer reconciled and shift closed successfully', life: 3000 })
}

onMounted(async () => {
  initTheme()
  initLayoutListeners()

  // If shift is open, load drawer session
  if (hasOpenShift.value && currentShift.value) {
    await loadSession(currentShift.value.id)
  }
})

onUnmounted(() => {
  destroyLayoutListeners()
})
</script>

<template>
  <div class="layout-wrapper">
    <AppSidebar />
    <div
      class="mobile-overlay"
      :class="{ active: isMobileMenuOpen }"
      @click="closeMobileMenu"
    ></div>
    <div class="layout-main" :class="{ 'sidebar-collapsed': isCollapsed }">
      <LicenseWarningBanner />
      <AppTopbar
        @start-shift="handleStartShift"
        @close-shift="handleCloseShift"
      />
      <main class="layout-content">
        <router-view />
      </main>
    </div>

    <Toast />

    <!-- Cash Drawer Dialogs -->
    <OpeningCount
      v-if="showOpeningCount && currentShift"
      v-model:visible="showOpeningCount"
      :shiftId="currentShift.id"
      :userId="authStore.currentUser?.id || ''"
      :terminalId="currentShift.terminalId || ''"
      @drawer-opened="handleDrawerOpened"
    />
    <ClosingCount
      v-if="showClosingCount"
      v-model:visible="showClosingCount"
      @drawer-closed="handleDrawerClosed"
    />
  </div>
</template>
