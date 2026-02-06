import { ref, readonly } from 'vue'
import db from '@/db/database'

const isInitialized = ref(false)
const isInitializing = ref(false)
const initError = ref<string | null>(null)

export function useDatabase() {
  async function initialize() {
    if (isInitialized.value || isInitializing.value) return

    isInitializing.value = true
    initError.value = null

    try {
      await db.initialize()
      isInitialized.value = true
      console.log('Database ready')
    } catch (error: any) {
      initError.value = error.message || 'Failed to initialize database'
      console.error('Database initialization error:', error)
      throw error
    } finally {
      isInitializing.value = false
    }
  }

  async function close() {
    await db.close()
    isInitialized.value = false
  }

  return {
    isInitialized: readonly(isInitialized),
    isInitializing: readonly(isInitializing),
    initError: readonly(initError),
    initialize,
    close
  }
}
