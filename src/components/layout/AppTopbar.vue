<script setup lang="ts">
import Button from 'primevue/button'
import { useLayout } from '@/composables/useLayout'
import { useTheme } from '@/composables/useTheme'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const { toggleSidebar, toggleMobileMenu } = useLayout()
const { isDark, toggleTheme } = useTheme()
const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/orders': 'Orders',
    '/products': 'Products',
    '/customers': 'Customers',
    '/reports': 'Reports',
    '/settings': 'Settings'
  }
  return titles[route.path] || 'Dashboard'
})
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
      <span class="topbar-title">{{ pageTitle }}</span>
    </div>
    <div class="topbar-right">
      <Button
        :icon="isDark ? 'pi pi-sun' : 'pi pi-moon'"
        text
        rounded
        @click="toggleTheme"
        v-tooltip.bottom="isDark ? 'Light Mode' : 'Dark Mode'"
      />
      <Button
        icon="pi pi-bell"
        text
        rounded
        badge="3"
        badgeSeverity="danger"
      />
      <Button
        icon="pi pi-user"
        text
        rounded
      />
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

@media (max-width: 768px) {
  .hidden-mobile {
    display: none;
  }

  .hidden-desktop {
    display: inline-flex;
  }
}
</style>
