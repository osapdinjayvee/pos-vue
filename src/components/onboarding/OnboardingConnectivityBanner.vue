<script setup lang="ts">
import { computed } from 'vue'
import Message from 'primevue/message'
import { connectivityService } from '@/services/connectivityService'

const props = withDefaults(defineProps<{
  message?: string
}>(), {
  message: 'Internet connection required for this step'
})

const isOffline = computed(() => !connectivityService.isOnline.value)
</script>

<template>
  <Message v-if="isOffline" severity="warn" icon="pi pi-wifi" :closable="false">
    {{ props.message }}
  </Message>
</template>
