<script setup lang="ts">
import { computed } from 'vue'
import { licenseHeartbeatService } from '@/services/licenseHeartbeatService'

const status = computed(() => licenseHeartbeatService.licenseStatus.value)

const showBanner = computed(() => status.value === 'expired' || status.value === 'revoked')

const bannerClass = computed(() => {
  if (status.value === 'revoked') return 'bg-red-600 text-white'
  return 'bg-yellow-500 text-yellow-950'
})

const bannerIcon = computed(() => {
  if (status.value === 'revoked') return 'pi pi-ban'
  return 'pi pi-exclamation-triangle'
})

const bannerMessage = computed(() => {
  if (status.value === 'revoked') return 'License has been revoked. Please contact your administrator.'
  return 'License has expired. Please renew to continue receiving updates.'
})
</script>

<template>
  <div v-if="showBanner" :class="[bannerClass, 'px-4 py-2 flex items-center gap-2 text-sm font-medium']">
    <i :class="bannerIcon"></i>
    <span>{{ bannerMessage }}</span>
  </div>
</template>
