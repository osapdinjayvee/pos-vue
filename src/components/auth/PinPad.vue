<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'

const props = defineProps<{
  modelValue: string
  maxLength?: number
  disabled?: boolean
  showValue?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

const maxLen = computed(() => props.maxLength || 6)
const maskedValue = computed(() => '•'.repeat(props.modelValue.length))
const displayValue = computed(() =>
  props.showValue ? props.modelValue : maskedValue.value
)

function handleDigit(digit: string) {
  if (props.disabled) return
  if (props.modelValue.length >= maxLen.value) return

  emit('update:modelValue', props.modelValue + digit)
}

function handleBackspace() {
  if (props.disabled) return
  if (props.modelValue.length === 0) return

  emit('update:modelValue', props.modelValue.slice(0, -1))
}

function handleClear() {
  if (props.disabled) return
  emit('update:modelValue', '')
}

function handleSubmit() {
  if (props.disabled) return
  if (props.modelValue.length === 0) return

  emit('submit')
}

// Handle keyboard input
function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return

  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault()
    handleDigit(event.key)
  } else if (event.key === 'Backspace') {
    event.preventDefault()
    handleBackspace()
  } else if (event.key === 'Enter') {
    event.preventDefault()
    handleSubmit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    handleClear()
  }
}

// Expose focus method
const containerRef = ref<HTMLDivElement | null>(null)

function focus() {
  containerRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div
    ref="containerRef"
    class="pin-pad"
    tabindex="0"
    @keydown="handleKeydown"
  >
    <!-- PIN Display -->
    <div class="pin-display">
      <div class="pin-dots">
        <span
          v-for="i in maxLen"
          :key="i"
          :class="['pin-dot', { filled: i <= modelValue.length }]"
        />
      </div>
      <div v-if="showValue" class="pin-value">{{ displayValue }}</div>
    </div>

    <!-- Number Pad -->
    <div class="number-pad">
      <div class="pad-row">
        <Button
          label="1"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('1')"
        />
        <Button
          label="2"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('2')"
        />
        <Button
          label="3"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('3')"
        />
      </div>
      <div class="pad-row">
        <Button
          label="4"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('4')"
        />
        <Button
          label="5"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('5')"
        />
        <Button
          label="6"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('6')"
        />
      </div>
      <div class="pad-row">
        <Button
          label="7"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('7')"
        />
        <Button
          label="8"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('8')"
        />
        <Button
          label="9"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('9')"
        />
      </div>
      <div class="pad-row">
        <Button
          icon="pi pi-times"
          class="pad-button clear-button"
                    severity="secondary"
          :disabled="disabled || modelValue.length === 0"
          @click="handleClear"
        />
        <Button
          label="0"
          class="pad-button"
                    :disabled="disabled"
          @click="handleDigit('0')"
        />
        <Button
          icon="pi pi-delete-left"
          class="pad-button backspace-button"
                    severity="secondary"
          :disabled="disabled || modelValue.length === 0"
          @click="handleBackspace"
        />
      </div>
    </div>

    <!-- Submit Button -->
    <Button
      label="Enter"
      icon="pi pi-sign-in"
      class="submit-button"
      :disabled="disabled || modelValue.length === 0"
      @click="handleSubmit"
    />
  </div>
</template>

<style scoped>
.pin-pad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  outline: none;
}

.pin-pad:focus {
  outline: none;
}

.pin-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.pin-dots {
  display: flex;
  gap: 0.75rem;
}

.pin-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--app-surface-200);
  transition: all 0.15s ease;
}

.pin-dot.filled {
  background: var(--p-primary-color);
}

.pin-value {
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.5rem;
  color: var(--p-text-color);
}

.number-pad {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pad-row {
  display: flex;
  gap: 1.25rem;
}

.pad-button {
  width: 64px;
  height: 64px;
  font-size: 1.5rem;
  font-weight: 600;
  border-radius: 12px;
  border: none !important;
  box-shadow: none !important;
  background: var(--app-surface-100) !important;
  color: var(--p-text-color) !important;
}

.pad-button:hover:not(:disabled) {
  background: var(--app-surface-200) !important;
}

.pad-button:active:not(:disabled) {
  background: var(--app-surface-300) !important;
}

.pad-button:deep(.p-button-label) {
  font-size: 1.5rem;
  font-weight: 600;
}

.clear-button,
.backspace-button {
  font-size: 1.25rem;
}

.submit-button {
  width: 100%;
  max-width: 208px;
  height: 48px;
  font-size: 1rem;
  font-weight: 600;
}

/* Larger screens */
@media (min-width: 1400px) {
  .pad-button {
    width: 72px;
    height: 72px;
    font-size: 1.75rem;
    border-radius: 14px;
  }

  .number-pad {
    gap: 0.625rem;
  }

  .pad-row {
    gap: 0.625rem;
  }

  .submit-button {
    max-width: 238px;
    height: 52px;
  }

  .pin-dots {
    gap: 1rem;
  }

  .pin-dot {
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 480px) {
  .pad-button {
    width: 56px;
    height: 56px;
    font-size: 1.25rem;
  }

  .number-pad {
    gap: 0.375rem;
  }

  .pad-row {
    gap: 0.375rem;
  }

  .submit-button {
    max-width: 184px;
    height: 44px;
  }

  .pin-dots {
    gap: 0.5rem;
  }

  .pin-dot {
    width: 14px;
    height: 14px;
  }
}
</style>
