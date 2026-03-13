import { ref, computed, onMounted, onUnmounted } from 'vue'

const isCollapsed = ref(true)
const isMobileMenuOpen = ref(false)
const isTablet = ref(false)
const isMobile = ref(false)

// Breakpoints
const TABLET_BREAKPOINT = 1024
const MOBILE_BREAKPOINT = 768

function checkScreenSize() {
  const width = window.innerWidth
  isMobile.value = width < MOBILE_BREAKPOINT
  isTablet.value = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT

  // Auto-collapse sidebar on tablet
  if (isTablet.value && !isCollapsed.value) {
    isCollapsed.value = true
  }
}

export function useLayout() {
  const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value
  }

  const toggleMobileMenu = () => {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  }

  const closeMobileMenu = () => {
    isMobileMenuOpen.value = false
  }

  const sidebarWidth = computed(() => {
    return isCollapsed.value ? '70px' : '280px'
  })

  // Initialize screen size check
  const initLayoutListeners = () => {
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
  }

  const destroyLayoutListeners = () => {
    window.removeEventListener('resize', checkScreenSize)
  }

  return {
    isCollapsed,
    isMobileMenuOpen,
    isTablet,
    isMobile,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    sidebarWidth,
    initLayoutListeners,
    destroyLayoutListeners
  }
}
