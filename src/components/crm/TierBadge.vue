<template>
  <Tag
    :value="displayValue"
    :severity="severity"
    rounded
    :class="sizeClass"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Tag from 'primevue/tag'
import type { MembershipTier } from '@/types/tier'

interface Props {
  tier: MembershipTier | null
  size?: 'small' | 'normal'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal'
})

const displayValue = computed(() => {
  return props.tier?.name ?? 'No Tier'
})

const severity = computed(() => {
  if (!props.tier) {
    return 'secondary'
  }

  const tierName = props.tier.name.toLowerCase()

  if (tierName === 'bronze') {
    return 'secondary'
  } else if (tierName === 'silver') {
    return 'info'
  } else if (tierName === 'gold') {
    return 'warn'
  } else if (tierName === 'platinum') {
    return 'success'
  }

  return 'secondary'
})

const sizeClass = computed(() => {
  return props.size === 'small' ? 'text-sm' : ''
})
</script>
