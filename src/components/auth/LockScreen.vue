<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import PinPad from './PinPad.vue'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  unlocked: []
  logout: []
}>()

const { currentUser, fullName, unlock, forceLogout } = useAuth()

const pin = ref('')
const error = ref<string | null>(null)
const isLoading = ref(false)
const pinPadRef = ref<InstanceType<typeof PinPad> | null>(null)

const initials = computed(() => {
  if (!currentUser.value) return '?'
  const first = currentUser.value.firstName?.[0] || ''
  const last = currentUser.value.lastName?.[0] || ''
  return (first + last).toUpperCase()
})

async function handleUnlock() {
  if (pin.value.length < 4) return

  isLoading.value = true
  error.value = null

  try {
    const success = await unlock(pin.value)

    if (success) {
      emit('unlocked')
    } else {
      error.value = 'Invalid PIN'
      pin.value = ''
    }
  } catch (err) {
    error.value = 'Failed to unlock'
    pin.value = ''
  } finally {
    isLoading.value = false
  }
}

function handleLogout() {
  emit('logout')
}

onMounted(() => {
  pinPadRef.value?.focus()
})
</script>

<template>
  <div class="lock-screen">
    <div class="lock-content">
      <!-- User Avatar -->
      <div class="user-avatar">
        <span class="avatar-initials">{{ initials }}</span>
      </div>

      <!-- User Info -->
      <div class="user-info">
        <h2 class="user-name">{{ fullName }}</h2>
        <p class="lock-message">Screen Locked</p>
      </div>

      <!-- Error Message -->
      <Message v-if="error" severity="error" :closable="false" class="error-message">
        {{ error }}
      </Message>

      <!-- PIN Pad -->
      <div class="unlock-section">
        <p class="unlock-prompt">Enter PIN to unlock</p>
        <PinPad
          ref="pinPadRef"
          v-model="pin"
          :max-length="6"
          :disabled="isLoading"
          @submit="handleUnlock"
        />
      </div>

      <!-- Logout Option -->
      <div class="logout-section">
        <Button
          label="Sign out"
          text
          severity="secondary"
          @click="handleLogout"
          :disabled="isLoading"
        />
      </div>
    </div>

    <!-- Lock Icon Background -->
    <div class="lock-background">
      <i class="pi pi-lock"></i>
    </div>
  </div>
</template>

<style scoped>
.lock-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--p-surface-ground);
  z-index: 9999;
}

.lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  max-width: 400px;
  width: 100%;
  position: relative;
  z-index: 1;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--p-primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.avatar-initials {
  font-size: 2rem;
  font-weight: 600;
  color: white;
}

.user-info {
  text-align: center;
  margin-bottom: 1.5rem;
}

.user-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.lock-message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.error-message {
  width: 100%;
  margin-bottom: 1rem;
}

.unlock-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.unlock-prompt {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.logout-section {
  margin-top: 2rem;
}

.lock-background {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0.03;
}

.lock-background i {
  font-size: 30rem;
  color: var(--p-text-color);
}
</style>
