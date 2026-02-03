<script setup lang="ts">
import type { MenuItem } from '@/types'
import AppMenuItem from './AppMenuItem.vue'

defineProps<{
  collapsed?: boolean
}>()

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'pi pi-home',
    to: '/'
  },
  {
    label: 'Orders',
    icon: 'pi pi-shopping-cart',
    to: '/orders'
  },
  {
    label: 'Products',
    icon: 'pi pi-box',
    to: '/products'
  },
  {
    label: 'Customers',
    icon: 'pi pi-users',
    to: '/customers'
  },
  { separator: true, label: '' },
  {
    label: 'Reports',
    icon: 'pi pi-chart-bar',
    to: '/reports'
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    to: '/settings'
  }
]
</script>

<template>
  <nav class="sidebar-menu">
    <ul class="menu-list">
      <AppMenuItem
        v-for="(item, index) in menuItems"
        :key="index"
        :item="item"
        :collapsed="collapsed"
      />
    </ul>
  </nav>
</template>
