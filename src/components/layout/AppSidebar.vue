<script setup lang="ts">
import AppMenu from './AppMenu.vue'
import { useLayout } from '@/composables/useLayout'
import logoImg from '@/assets/img/logo.png'

const { isCollapsed, isMobileMenuOpen } = useLayout()
const appName = import.meta.env.VITE_APP_NAME || 'Zoomin POS'
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
        <img :src="logoImg" alt="Logo" class="sidebar-logo-img" />
        <span>{{ appName }}</span>
      </router-link>
    </div>
    <AppMenu :collapsed="isCollapsed" />
  </aside>
</template>

<style scoped>
.sidebar-logo-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}
</style>
