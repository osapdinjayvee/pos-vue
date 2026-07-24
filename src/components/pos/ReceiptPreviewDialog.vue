<script setup lang="ts">
/**
 * In-app receipt preview.
 *
 * Replaces the old popup window, which was a dead end on Android: Capacitor's
 * WebView runs with setSupportMultipleWindows(false), so window.open replaced
 * the app with the receipt and window.close() did nothing — the user had to
 * force-quit. A dialog works identically on tablet, browser, and Electron.
 */
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'

defineProps<{
  visible: boolean
  /** Rendered receipt text, already wrapped to the configured paper width. */
  text: string | null
  /** Shown while the receipt is being generated. */
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  print: []
}>()

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    modal
    header="Receipt Preview"
    :style="{ width: '420px', maxWidth: '95vw' }"
    :breakpoints="{ '640px': '100vw' }"
    :dismissable-mask="true"
  >
    <div class="receipt-preview">
      <div v-if="loading" class="receipt-preview__state">
        <i class="pi pi-spin pi-spinner text-2xl"></i>
        <span>Generating receipt…</span>
      </div>

      <div v-else-if="!text" class="receipt-preview__state">
        <i class="pi pi-exclamation-triangle text-2xl"></i>
        <span>Receipt could not be generated.</span>
      </div>

      <pre v-else class="receipt-preview__paper">{{ text }}</pre>
    </div>

    <template #footer>
      <div class="flex gap-2 w-full">
        <Button
          label="Close"
          icon="pi pi-times"
          severity="secondary"
          outlined
          class="flex-1"
          @click="handleClose"
        />
        <Button
          label="Print"
          icon="pi pi-print"
          class="flex-1"
          :disabled="!text || loading"
          @click="emit('print')"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.receipt-preview {
  max-height: 60vh;
  overflow: auto;
}

.receipt-preview__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  color: var(--p-text-muted-color);
}

/* Lines are pre-wrapped to an exact character width by the formatter, so render
   them verbatim and let the container scroll rather than re-wrapping. */
.receipt-preview__paper {
  margin: 0;
  padding: 1rem;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.35;
  white-space: pre;
  overflow-x: auto;
  background: var(--app-surface-0);
  color: var(--p-text-color);
  border: 1px solid var(--app-surface-200);
  border-radius: 6px;
}
</style>