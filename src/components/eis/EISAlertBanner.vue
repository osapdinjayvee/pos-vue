<script setup lang="ts">
import Message from 'primevue/message'
import Button from 'primevue/button'
import { useEIS } from '@/composables/useEIS'

const { alertActive, alertMessage, dismissAlert } = useEIS()
</script>

<template>
  <Message v-if="alertActive" severity="error" class="eis-alert-banner" :closable="false">
    <div class="alert-content">
      <span>{{ alertMessage }}</span>
      <Button label="Dismiss" severity="danger" text size="small" @click="dismissAlert" />
    </div>
  </Message>
</template>

<style scoped>
.alert-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 1rem;
}
</style>
