<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useDatabase } from '@/composables/useDatabase'
import { useSync } from '@/composables/useSync'
import ProgressSpinner from 'primevue/progressspinner'
import Toast from 'primevue/toast'

const {  isInitializing, initError, initialize } = useDatabase()
const { initializeSync, destroySync } = useSync()
const showApp = ref(false)

onMounted(async () => {
  try {
    await initialize()
    showApp.value = true
    // Start sync system after database is ready
    initializeSync()
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
})

onUnmounted(() => {
  destroySync()
})
</script>

<template>
  <!-- Global Toast for messages that persist across route changes -->
  <Toast />

  <div v-if="isInitializing" class="app-loading">
    <ProgressSpinner />
    <p>Initializing database...</p>
  </div>

  <div v-else-if="initError" class="app-error">
    <i class="pi pi-exclamation-triangle"></i>
    <h2>Database Error</h2>
    <p>{{ initError }}</p>
    <button @click="initialize">Retry</button>
  </div>

  <RouterView v-else-if="showApp" />
</template>

<style>
body {
  font-family: 'Inter', sans-serif;
  margin: 0;
  padding: 0;
}

.app-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  color: var(--p-text-color, #333);
}

.app-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
}

.app-error i {
  font-size: 4rem;
  color: #f59e0b;
}

.app-error h2 {
  margin: 0;
  color: #333;
}

.app-error p {
  color: #666;
  margin: 0;
}

.app-error button {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.app-error button:hover {
  background: #2563eb;
}
</style>
