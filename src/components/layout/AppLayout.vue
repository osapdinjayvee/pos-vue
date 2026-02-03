<script setup lang="ts">
import { onMounted } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppTopbar from './AppTopbar.vue'
import { useLayout } from '@/composables/useLayout'
import { useTheme } from '@/composables/useTheme'

const { isCollapsed, isMobileMenuOpen, closeMobileMenu } = useLayout()
const { initTheme } = useTheme()

onMounted(() => {
  initTheme()
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
      <AppTopbar />
      <main class="layout-content">
        <router-view />
      </main>
    </div>
  </div>
</template>
