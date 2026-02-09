<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  storeName: string
  address: string
  tin: string
  accreditationNo: string
  terminalId: string
  logoUrl?: string
  tagline?: string
}>()

const currentTime = ref(formatTime())
const currentDate = ref(formatDate())
let clockInterval: number | null = null

function formatTime(): string {
  return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(() => {
  clockInterval = window.setInterval(() => {
    currentTime.value = formatTime()
    currentDate.value = formatDate()
  }, 1000)
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
})
</script>

<template>
  <div class="idle-display">
    <!-- Store avatar -->
    <div class="idle-avatar-wrap">
      <img v-if="logoUrl" :src="logoUrl" :alt="storeName" class="idle-logo-img" />
      <div v-else class="idle-avatar-letter">
        {{ storeName.charAt(0).toUpperCase() }}
      </div>
    </div>

    <!-- Business name -->
    <h1 class="idle-store-name">{{ storeName }}</h1>

    <!-- Address -->
    <p v-if="address" class="idle-address">{{ address }}</p>

    <!-- Tagline -->
    <p v-if="tagline" class="idle-tagline">{{ tagline }}</p>

    <!-- Badges -->
    <div class="idle-badges">
      <span v-if="tin" class="idle-badge">
        <i class="pi pi-id-card"></i> TIN: {{ tin }}
      </span>
      <span v-if="accreditationNo" class="idle-badge">
        <i class="pi pi-verified"></i> {{ accreditationNo }}
      </span>
      <span v-if="terminalId" class="idle-badge">
        <i class="pi pi-desktop"></i> Terminal {{ terminalId }}
      </span>
    </div>

    <!-- Date & Time -->
    <div class="idle-clock-section">
      <div class="idle-time">{{ currentTime }}</div>
      <div class="idle-date">{{ currentDate }}</div>
    </div>
  </div>
</template>

<style scoped>
.idle-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  text-align: center;
  animation: idle-fade-in 0.5s ease both;
}

@keyframes idle-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Avatar */
.idle-avatar-wrap {
  margin-bottom: 1.25rem;
}

.idle-avatar-letter {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  background: var(--p-primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.idle-logo-img {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--p-primary-100);
}

/* Store name */
.idle-store-name {
  margin: 0 0 0.25rem;
  font-size: 1.75rem;
  font-weight: 800;
  color: #18181b;
  letter-spacing: -0.01em;
}

/* Address */
.idle-address {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  color: #71717a;
  max-width: 320px;
  line-height: 1.4;
}

/* Tagline */
.idle-tagline {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--p-primary-500);
  font-style: italic;
  max-width: 300px;
}

/* Badges */
.idle-badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

.idle-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.75rem;
  background: #f4f4f5;
  border-radius: 9999px;
  font-size: 0.75rem;
  color: #52525b;
  font-weight: 500;
}

.idle-badge i {
  font-size: 0.625rem;
  color: #a1a1aa;
}

/* Clock */
.idle-clock-section {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e4e4e7;
  min-width: 200px;
}

.idle-time {
  font-size: 2rem;
  font-weight: 700;
  color: #18181b;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.idle-date {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: #a1a1aa;
}
</style>
