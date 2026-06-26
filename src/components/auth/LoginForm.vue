<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import PinPad from './PinPad.vue'

const props = defineProps<{
  loading?: boolean
  terminalId?: string
}>()

const emit = defineEmits<{
  submit: [credentials: { username: string; pin: string; terminalId: string }]
  forgot: [username: string]
}>()

const username = ref('')
const pin = ref('')
const step = ref<'username' | 'pin'>('username')

const usernameInputRef = ref<any>(null)
const pinPadRef = ref<InstanceType<typeof PinPad> | null>(null)

const canSubmit = computed(() => {
  return username.value.trim().length >= 3 && pin.value.length >= 4
})

function handleUsernameSubmit() {
  if (username.value.trim().length < 3) return
  step.value = 'pin'
  // Focus pin pad after transition
  setTimeout(() => {
    pinPadRef.value?.focus()
  }, 100)
}

function handlePinSubmit() {
  if (!canSubmit.value) return

  emit('submit', {
    username: username.value.trim().toLowerCase(),
    pin: pin.value,
    terminalId: props.terminalId || 'POS-001'
  })
}

function handleBack() {
  step.value = 'username'
  pin.value = ''
  // Focus username input after transition
  setTimeout(() => {
    usernameInputRef.value?.$el?.focus()
  }, 100)
}

function handleUsernameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    handleUsernameSubmit()
  }
}

onMounted(() => {
  usernameInputRef.value?.$el?.focus()
})
</script>

<template>
  <div class="login-form">
    <!-- Username Step -->
    <div v-if="step === 'username'" class="step-content">
      <div class="login-header">
        <i class="pi pi-user header-icon"></i>
        <h2 class="login-title">Sign in</h2>
        <p class="login-subtitle">Enter your username</p>
      </div>

      <div class="input-group">
        <label for="username">Username</label>
        <InputText
          id="username"
          ref="usernameInputRef"
          v-model="username"
          placeholder="Enter username"
          :disabled="loading"
          class="username-input"
          @keydown="handleUsernameKeydown"
        />
      </div>

      <Button
        label="Continue"
        icon="pi pi-arrow-right"
        iconPos="right"
        class="continue-button"
        :disabled="loading || username.trim().length < 3"
        @click="handleUsernameSubmit"
      />

      <p class="terminal-info">
        Terminal: {{ terminalId || 'POS-001' }}
      </p>
    </div>

    <!-- PIN Step -->
    <div v-else class="step-content">
      <div class="user-display">
        <span class="user-label">Signing in as</span>
        <span class="user-name">{{ username }}</span>
        <Button
          label="Change"
          text
          size="small"
          :disabled="loading"
          @click="handleBack"
        />
      </div>

      <PinPad
        ref="pinPadRef"
        v-model="pin"
        :max-length="6"
        :disabled="loading"
        @submit="handlePinSubmit"
      />

      <Button
        v-if="loading"
        label="Signing in..."
        icon="pi pi-spin pi-spinner"
        class="submit-button"
        :loading="true"
        disabled
      />
    </div>

    <Button
      label="Forgot PIN?"
      text
      size="small"
      class="forgot-link"
      :disabled="loading"
      @click="emit('forgot', username.trim().toLowerCase())"
    />
  </div>
</template>

<style scoped>
.login-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  padding: 2rem;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.5rem;
  text-align: center;
}

.header-icon {
  font-size: 3rem;
  color: var(--p-primary-color);
  margin-bottom: 1rem;
}

.login-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.login-subtitle {
  margin: 0;
  font-size: 1rem;
  color: var(--p-text-muted-color);
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 1.5rem;
}

.input-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.username-input {
  width: 100%;
  height: 48px;
  font-size: 1.125rem;
}

.continue-button {
  width: 100%;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
}

.terminal-info {
  margin: 0;
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.user-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1rem;
}

.user-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.user-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--p-primary-color);
}

.submit-button {
  width: 100%;
  max-width: 216px;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
}

.forgot-link {
  margin-top: 1rem;
}
</style>
