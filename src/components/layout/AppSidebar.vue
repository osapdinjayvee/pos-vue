<script setup lang="ts">
import AppMenu from './AppMenu.vue'
import { useLayout } from '@/composables/useLayout'

const { isCollapsed, isMobileMenuOpen } = useLayout()
</script>

<template>
  <aside
    class="layout-sidebar"
    :class="{
      collapsed: isCollapsed,
      'mobile-open': isMobileMenuOpen
    }"
  >
    <div class="sidebar-header">
      <router-link to="/" class="sidebar-logo">
        <i class="pi pi-shopping-bag"></i>
        <span>POS System</span>
      </router-link>
    </div>
    <AppMenu :collapsed="isCollapsed" />
  </aside>
</template>
