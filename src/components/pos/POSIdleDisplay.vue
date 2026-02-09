<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export interface SlideshowImageProp {
  id: string
  image_data: string
}

const props = withDefaults(defineProps<{
  storeName: string
  address: string
  tin: string
  accreditationNo: string
  terminalId: string
  logoUrl?: string
  tagline?: string
  slideshowImages?: SlideshowImageProp[]
  showStoreName?: boolean
  showLogo?: boolean
  showAddress?: boolean
  showTin?: boolean
  showTerminal?: boolean
  showTime?: boolean
  timeFormat?: string
  dateFormat?: string
  slideshowInterval?: number
  infoDisplayDuration?: number
}>(), {
  showStoreName: true,
  showLogo: true,
  showAddress: true,
  showTin: true,
  showTerminal: true,
  showTime: true,
  timeFormat: '12h',
  dateFormat: 'long',
  slideshowInterval: 5,
  slideshowImages: () => [],
  infoDisplayDuration: 20
})

// Display mode: 'info' shows store details, 'slideshow' shows full-width images
const displayMode = ref<'info' | 'slideshow'>('info')
let infoTimer: number | null = null

// Clock
const currentTime = ref(formatTime())
const currentDate = ref(formatDate())
let clockInterval: number | null = null

function formatTime(): string {
  const hour12 = props.timeFormat === '12h'
  return new Date().toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12
  })
}

function formatDate(): string {
  const now = new Date()
  switch (props.dateFormat) {
    case 'short':
      return now.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    case 'numeric':
      return now.toLocaleDateString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit' })
    default:
      return now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }
}

// Slideshow
const currentSlideIndex = ref(0)
let slideshowTimer: number | null = null

const hasSlideshow = computed(() => props.slideshowImages.length > 0)
const currentSlideUrl = computed(() => {
  if (!hasSlideshow.value) return ''
  return props.slideshowImages[currentSlideIndex.value]?.image_data ?? ''
})

function startSlideshow() {
  stopSlideshow()
  if (props.slideshowImages.length <= 1) return
  slideshowTimer = window.setInterval(() => {
    currentSlideIndex.value = (currentSlideIndex.value + 1) % props.slideshowImages.length
  }, props.slideshowInterval * 1000)
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer)
    slideshowTimer = null
  }
}

function startInfoTimer() {
  clearInfoTimer()
  if (!hasSlideshow.value) return
  infoTimer = window.setTimeout(() => {
    displayMode.value = 'slideshow'
    startSlideshow()
  }, props.infoDisplayDuration * 1000)
}

function clearInfoTimer() {
  if (infoTimer) {
    clearTimeout(infoTimer)
    infoTimer = null
  }
}

// When slideshow images change, reset to info mode and restart cycle
watch(() => props.slideshowImages.length, (len) => {
  currentSlideIndex.value = 0
  stopSlideshow()
  displayMode.value = 'info'
  if (len > 0) {
    startInfoTimer()
  } else {
    clearInfoTimer()
  }
})

watch(() => props.slideshowInterval, () => {
  if (displayMode.value === 'slideshow') {
    startSlideshow()
  }
})

onMounted(() => {
  clockInterval = window.setInterval(() => {
    currentTime.value = formatTime()
    currentDate.value = formatDate()
  }, 1000)

  if (hasSlideshow.value) {
    startInfoTimer()
  }
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  clearInfoTimer()
  stopSlideshow()
})
</script>

<template>
  <div class="idle-display">
    <!-- Info Mode: Store details -->
    <div v-if="displayMode === 'info'" class="idle-content">
      <div v-if="showLogo" class="idle-avatar-wrap">
        <img v-if="logoUrl" :src="logoUrl" :alt="storeName" class="idle-logo-img" />
        <div v-else class="idle-avatar-letter">
          {{ storeName.charAt(0).toUpperCase() }}
        </div>
      </div>

      <h1 v-if="showStoreName" class="idle-store-name">{{ storeName }}</h1>
      <p v-if="showAddress && address" class="idle-address">{{ address }}</p>
      <p v-if="tagline" class="idle-tagline">{{ tagline }}</p>

      <div class="idle-badges" v-if="showTin || showTerminal">
        <span v-if="showTin && tin" class="idle-badge">
          <i class="pi pi-id-card"></i> TIN: {{ tin }}
        </span>
        <span v-if="showTin && accreditationNo" class="idle-badge">
          <i class="pi pi-verified"></i> {{ accreditationNo }}
        </span>
        <span v-if="showTerminal && terminalId" class="idle-badge">
          <i class="pi pi-desktop"></i> Terminal {{ terminalId }}
        </span>
      </div>

      <div v-if="showTime" class="idle-clock-section">
        <div class="idle-time">{{ currentTime }}</div>
        <div class="idle-date">{{ currentDate }}</div>
      </div>
    </div>

    <!-- Slideshow Mode: Full-width image via CSS background -->
    <div
      v-if="displayMode === 'slideshow'"
      class="idle-slideshow"
      :style="{ backgroundImage: currentSlideUrl ? `url(${currentSlideUrl})` : 'none' }"
    ></div>
  </div>
</template>

<style scoped>
.idle-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  position: relative;
  overflow: hidden;
}

/* Info content */
.idle-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  animation: idle-fade-in 0.5s ease both;
}

@keyframes idle-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Avatar */
.idle-avatar-wrap {
  margin-bottom: 0;
}

.idle-avatar-letter {
  width: 18rem;
  height: 18rem;
  background: var(--p-primary-color);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  border-radius: 2rem;
}

.idle-logo-img {
  width: 18rem;
  height: 18rem;
  object-fit: contain;
}

/* Store name */
.idle-store-name {
  margin: -0.5rem 0 0.25rem;
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

/* Slideshow (full-width mode) */
.idle-slideshow {
  position: absolute;
  inset: 0;
  background-color: #000;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: background-image 0.6s ease;
  animation: idle-fade-in 0.8s ease both;
}
</style>
