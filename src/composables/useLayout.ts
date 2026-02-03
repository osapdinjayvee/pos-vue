import { ref, computed } from 'vue'

const isCollapsed = ref(false)
const isMobileMenuOpen = ref(false)

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

  return {
    isCollapsed,
    isMobileMenuOpen,
    toggleSidebar,
    toggleMobileMenu,
    closeMobileMenu,
    sidebarWidth
  }
}
