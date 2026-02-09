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
  slideshowImages: () => []
})

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

watch(() => props.slideshowImages.length, () => {
  currentSlideIndex.value = 0
  startSlideshow()
})

watch(() => props.slideshowInterval, () => {
  startSlideshow()
})

onMounted(() => {
  clockInterval = window.setInterval(() => {
    currentTime.value = formatTime()
    currentDate.value = formatDate()
  }, 1000)

  if (hasSlideshow.value) {
    startSlideshow()
  }
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  stopSlideshow()
})
</script>

<template>
  <div class="idle-display" :class="{ 'idle-with-slideshow': hasSlideshow }">
    <!-- Slideshow background -->
    <div v-if="hasSlideshow" class="idle-slideshow">
      <TransitionGroup name="slide-fade">
        <img
          v-for="(img, idx) in slideshowImages"
          v-show="idx === currentSlideIndex"
          :key="img.id"
          :src="img.image_data"
          alt="Slideshow"
          class="idle-slideshow-img"
        />
      </TransitionGroup>
      <!-- Overlay for readability -->
      <div class="idle-slideshow-overlay"></div>
    </div>

    <!-- Content (overlaid on slideshow or standalone) -->
    <div class="idle-content" :class="{ 'idle-content-over-slideshow': hasSlideshow }">
      <!-- Store avatar -->
      <div v-if="showLogo" class="idle-avatar-wrap">
        <img v-if="logoUrl" :src="logoUrl" :alt="storeName" class="idle-logo-img" />
        <div v-else class="idle-avatar-letter">
          {{ storeName.charAt(0).toUpperCase() }}
        </div>
      </div>

      <!-- Business name -->
      <h1 v-if="showStoreName" class="idle-store-name" :class="{ 'text-white': hasSlideshow }">{{ storeName }}</h1>

      <!-- Address -->
      <p v-if="showAddress && address" class="idle-address" :class="{ 'text-white/70': hasSlideshow }">{{ address }}</p>

      <!-- Tagline -->
      <p v-if="tagline" class="idle-tagline" :class="{ 'text-white/80': hasSlideshow }">{{ tagline }}</p>

      <!-- Badges -->
      <div class="idle-badges" v-if="showTin || showTerminal">
        <span v-if="showTin && tin" class="idle-badge" :class="{ 'idle-badge-dark': hasSlideshow }">
          <i class="pi pi-id-card"></i> TIN: {{ tin }}
        </span>
        <span v-if="showTin && accreditationNo" class="idle-badge" :class="{ 'idle-badge-dark': hasSlideshow }">
          <i class="pi pi-verified"></i> {{ accreditationNo }}
        </span>
        <span v-if="showTerminal && terminalId" class="idle-badge" :class="{ 'idle-badge-dark': hasSlideshow }">
          <i class="pi pi-desktop"></i> Terminal {{ terminalId }}
        </span>
      </div>

      <!-- Date & Time -->
      <div v-if="showTime" class="idle-clock-section" :class="{ 'idle-clock-dark': hasSlideshow }">
        <div class="idle-time" :class="{ 'text-white': hasSlideshow }">{{ currentTime }}</div>
        <div class="idle-date" :class="{ 'text-white/60': hasSlideshow }">{{ currentDate }}</div>
      </div>
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
  position: relative;
  overflow: hidden;
}

.idle-with-slideshow {
  padding: 0;
}

@keyframes idle-fade-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Slideshow */
.idle-slideshow {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.idle-slideshow-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.idle-slideshow-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.55));
  z-index: 1;
}

/* Slide transition */
.slide-fade-enter-active {
  transition: opacity 0.8s ease;
}
.slide-fade-leave-active {
  transition: opacity 0.8s ease;
}
.slide-fade-enter-from {
  opacity: 0;
}
.slide-fade-leave-to {
  opacity: 0;
}

/* Content layer */
.idle-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.idle-content-over-slideshow {
  padding: 2rem;
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

.idle-with-slideshow .idle-logo-img {
  width: 10rem;
  height: 10rem;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
}

.idle-with-slideshow .idle-avatar-letter {
  width: 10rem;
  height: 10rem;
  font-size: 5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
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

.idle-badge-dark {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

.idle-badge-dark i {
  color: rgba(255, 255, 255, 0.6);
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

.idle-clock-dark {
  border-top-color: rgba(255, 255, 255, 0.2);
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

/* Tailwind-like utility classes for slideshow overlay text */
.text-white {
  color: white !important;
}
</style>
