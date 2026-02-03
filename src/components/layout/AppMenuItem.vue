<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { MenuItem } from '@/types'

const props = defineProps<{
  item: MenuItem
  collapsed?: boolean
}>()

const route = useRoute()

const isActive = computed(() => {
  return props.item.to === route.path
})
</script>

<template>
  <li v-if="item.separator" class="menu-separator"></li>
  <li v-else class="menu-item">
    <router-link
      v-if="item.to"
      :to="item.to"
      class="menu-link"
      :class="{ active: isActive }"
      :title="collapsed ? item.label : undefined"
    >
      <i v-if="item.icon" :class="item.icon"></i>
      <span>{{ item.label }}</span>
    </router-link>
  </li>
</template>
