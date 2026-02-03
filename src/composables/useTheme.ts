import { ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'

const isDark = useLocalStorage('pos-dark-mode', false)

export function useTheme() {
  const applyTheme = () => {
    if (isDark.value) {
      document.documentElement.classList.add('app-dark')
    } else {
      document.documentElement.classList.remove('app-dark')
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
  }

  const initTheme = () => {
    applyTheme()
  }

  watch(isDark, applyTheme, { immediate: true })

  return {
    isDark,
    toggleTheme,
    initTheme
  }
}
