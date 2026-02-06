/**
 * usePermissions Composable
 * Provides reactive permission checking for Vue components
 */

import { computed, type ComputedRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  expandPermissions,
  canAccessRoute,
  requiresSupervisorApproval,
  MENU_PERMISSIONS
} from '@/utils/permissions'
import { PERMISSIONS, type PermissionCode } from '@/types/user'

export interface UsePermissionsReturn {
  // Reactive permission list
  permissions: ComputedRef<string[]>
  expandedPermissions: ComputedRef<string[]>

  // Permission checks
  can: (permission: string) => boolean
  canAny: (permissions: string[]) => boolean
  canAll: (permissions: string[]) => boolean
  canAccess: (route: string) => boolean
  needsSupervisor: (permission: string) => boolean

  // Convenience computed properties for common checks
  canCreateSale: ComputedRef<boolean>
  canVoidTransaction: ComputedRef<boolean>
  canProcessRefund: ComputedRef<boolean>
  canApplyDiscount: ComputedRef<boolean>
  canViewInventory: ComputedRef<boolean>
  canAdjustInventory: ComputedRef<boolean>
  canViewReports: ComputedRef<boolean>
  canViewUsers: ComputedRef<boolean>
  canManageUsers: ComputedRef<boolean>
  canViewSettings: ComputedRef<boolean>
  canEditSettings: ComputedRef<boolean>
  isAdmin: ComputedRef<boolean>
  isSupervisor: ComputedRef<boolean>

  // Permission constants for easy access
  PERMISSIONS: typeof PERMISSIONS
}

export function usePermissions(): UsePermissionsReturn {
  const authStore = useAuthStore()

  // Reactive permission list
  const permissions = computed(() => authStore.permissions || [])

  // Expanded permissions (wildcards resolved)
  const expandedPermissions = computed(() => expandPermissions(permissions.value))

  // Permission check functions
  function can(permission: string): boolean {
    return hasPermission(permissions.value, permission)
  }

  function canAny(perms: string[]): boolean {
    return hasAnyPermission(permissions.value, perms)
  }

  function canAll(perms: string[]): boolean {
    return hasAllPermissions(permissions.value, perms)
  }

  function canAccess(route: string): boolean {
    return canAccessRoute(permissions.value, route)
  }

  function needsSupervisor(permission: string): boolean {
    return requiresSupervisorApproval(permission, permissions.value)
  }

  // Convenience computed properties
  const canCreateSale = computed(() => can(PERMISSIONS.SALES_CREATE))
  const canVoidTransaction = computed(() => can(PERMISSIONS.SALES_VOID))
  const canProcessRefund = computed(() => can(PERMISSIONS.SALES_REFUND))
  const canApplyDiscount = computed(() => can(PERMISSIONS.SALES_DISCOUNT))
  const canViewInventory = computed(() => can(PERMISSIONS.INVENTORY_VIEW))
  const canAdjustInventory = computed(() => can(PERMISSIONS.INVENTORY_ADJUST))
  const canViewReports = computed(() => canAny([PERMISSIONS.REPORTS_XREADING, PERMISSIONS.REPORTS_SALES]))
  const canViewUsers = computed(() => can(PERMISSIONS.USERS_VIEW))
  const canManageUsers = computed(() => canAny([PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_EDIT]))
  const canViewSettings = computed(() => can(PERMISSIONS.SETTINGS_VIEW))
  const canEditSettings = computed(() => can(PERMISSIONS.SETTINGS_EDIT))

  // Role-based checks
  const isAdmin = computed(() => permissions.value.includes('*'))
  const isSupervisor = computed(
    () =>
      permissions.value.includes('sales.*') ||
      can(PERMISSIONS.SALES_VOID) ||
      can(PERMISSIONS.SALES_REFUND)
  )

  return {
    // Reactive permission list
    permissions,
    expandedPermissions,

    // Permission checks
    can,
    canAny,
    canAll,
    canAccess,
    needsSupervisor,

    // Convenience computed properties
    canCreateSale,
    canVoidTransaction,
    canProcessRefund,
    canApplyDiscount,
    canViewInventory,
    canAdjustInventory,
    canViewReports,
    canViewUsers,
    canManageUsers,
    canViewSettings,
    canEditSettings,
    isAdmin,
    isSupervisor,

    // Permission constants
    PERMISSIONS
  }
}

export default usePermissions
