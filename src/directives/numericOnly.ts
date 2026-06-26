import type { Directive } from 'vue'

/**
 * v-numeric-only
 *
 * Restricts an input (or a PrimeVue InputText wrapping one) to digits only.
 * - Blocks non-digit keystrokes (keeps Backspace, arrows, Tab, copy/paste shortcuts).
 * - Sanitises the value on input/paste, which is the reliable path on Android
 *   WebView soft keyboards where keydown does not always fire per character.
 * - Leading zeros are preserved (e.g. 09171234567) since the field stays a string.
 */

const CONTROL_KEYS = new Set([
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
])

function resolveInput(el: HTMLElement): HTMLInputElement | null {
  if (el instanceof HTMLInputElement) return el
  return el.querySelector('input')
}

function onKeydown(e: KeyboardEvent) {
  // Allow shortcuts (Ctrl/Cmd + A/C/V/X, etc.) and control keys through.
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if (CONTROL_KEYS.has(e.key)) return
  // Printable single characters must be digits.
  if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
    e.preventDefault()
  }
}

function onInput(e: Event) {
  const input = e.target as HTMLInputElement
  const cleaned = input.value.replace(/\D/g, '')
  if (cleaned !== input.value) {
    const pos = input.selectionStart ?? cleaned.length
    input.value = cleaned
    // Keep the caret from jumping to the end after sanitising.
    const newPos = Math.max(0, pos - 1)
    input.setSelectionRange?.(newPos, newPos)
    // Notify v-model of the corrected value.
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

interface NumericEl extends HTMLElement {
  __numericInput?: HTMLInputElement
}

export const vNumericOnly: Directive<NumericEl> = {
  mounted(el) {
    const input = resolveInput(el)
    if (!input) return
    input.setAttribute('inputmode', 'numeric')
    input.addEventListener('keydown', onKeydown)
    input.addEventListener('input', onInput)
    el.__numericInput = input
  },
  unmounted(el) {
    const input = el.__numericInput
    if (!input) return
    input.removeEventListener('keydown', onKeydown)
    input.removeEventListener('input', onInput)
  },
}