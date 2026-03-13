/**
 * Permission Checker Utility
 * Provides permission checking functions for role-based access control
 */

import { PERMISSIONS, type PermissionCode, type PermissionCategory } from '@/types/user'

/**
 * Check if a user has a specific permission
 * Supports wildcard matching (e.g., 'sales.*' matches 'sales.void')
 */
export function hasPermission(userPermissions: string[], permission: string): boolean {
  // Superadmin check
  if (userPermissions.includes('*')) {
    return true
  }

  // Direct match
  if (userPermissions.includes(permission)) {
    return true
  }

  // Wildcard match (e.g., 'sales.*' matches 'sales.void')
  const [category] = permission.split('.')
  return userPermissions.includes(`${category}.*`)
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(userPermissions, p))
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[], permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(userPermissions, p))
}

/**
 * Get all permissions a user has, expanding wildcards
 */
export function expandPermissions(userPermissions: string[]): string[] {
  const expanded = new Set<string>()

  for (const perm of userPermissions) {
    if (perm === '*') {
      // Add all permissions
      Object.values(PERMISSIONS).forEach((p) => expanded.add(p))
    } else if (perm.endsWith('.*')) {
      // Add all permissions in category
      const category = perm.replace('.*', '')
      Object.values(PERMISSIONS)
        .filter((p) => p.startsWith(`${category}.`))
        .forEach((p) => expanded.add(p))
    } else {
      expanded.add(perm)
    }
  }

  return Array.from(expanded)
}

/**
 * Group permissions by category
 */
export function groupPermissionsByCategory(
  permissions: string[]
): Record<PermissionCategory, string[]> {
  const grouped: Record<PermissionCategory, string[]> = {
    sales: [],
    inventory: [],
    reports: [],
    users: [],
    settings: []
  }

  for (const perm of permissions) {
    const [category] = perm.split('.') as [PermissionCategory]
    if (category in grouped) {
      grouped[category].push(perm)
    }
  }

  return grouped
}

/**
 * Permission requirements for menu items
 */
export const MENU_PERMISSIONS: Record<string, string | string[]> = {
  '/': [], // Dashboard - accessible to all authenticated users
  '/pos': PERMISSIONS.SALES_CREATE,
  '/orders': PERMISSIONS.SALES_CREATE,
  '/products': PERMISSIONS.INVENTORY_VIEW,
  '/categories': PERMISSIONS.INVENTORY_VIEW,
  '/inventory': PERMISSIONS.INVENTORY_VIEW,
  '/adjustments': PERMISSIONS.INVENTORY_ADJUST,
  '/suppliers': PERMISSIONS.INVENTORY_VIEW,
  '/transfers': PERMISSIONS.INVENTORY_ADJUST,
  '/customers': PERMISSIONS.SALES_CREATE,
  '/reports': [PERMISSIONS.REPORTS_XREADING, PERMISSIONS.REPORTS_SALES],
  '/settings': PERMISSIONS.SETTINGS_VIEW,
  '/users': PERMISSIONS.USERS_VIEW,
  '/roles': PERMISSIONS.USERS_EDIT
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(userPermissions: string[], route: string): boolean {
  const required = MENU_PERMISSIONS[route]

  if (!required || (Array.isArray(required) && required.length === 0)) {
    return true // No permission required
  }

  if (Array.isArray(required)) {
    return hasAnyPermission(userPermissions, required)
  }

  return hasPermission(userPermissions, required)
}

/**
 * Filter menu items based on user permissions
 */
export function filterMenuByPermissions<T extends { to?: string; items?: T[] }>(
  items: T[],
  userPermissions: string[]
): T[] {
  return items.filter((item) => {
    // Check if item has a route
    if (item.to) {
      if (!canAccessRoute(userPermissions, item.to)) {
        return false
      }
    }

    // If item has children, filter them recursively
    if (item.items && item.items.length > 0) {
      const filteredItems = filterMenuByPermissions(item.items, userPermissions)
      // Only include parent if it has visible children
      if (filteredItems.length === 0) {
        return false
      }
      // Replace items with filtered items
      ;(item as T & { items: T[] }).items = filteredItems
    }

    return true
  })
}

/**
 * Permissions that require supervisor approval
 */
export const SUPERVISOR_REQUIRED_PERMISSIONS = [
  PERMISSIONS.SALES_VOID,
  PERMISSIONS.SALES_REFUND,
  PERMISSIONS.INVENTORY_ADJUST
] as const

/**
 * Check if an action requires supervisor approval
 */
export function requiresSupervisorApproval(
  permission: string,
  userPermissions: string[]
): boolean {
  // If user has the permission directly, no supervisor needed
  if (hasPermission(userPermissions, permission)) {
    return false
  }

  // Check if this is a supervisor-required permission
  return (SUPERVISOR_REQUIRED_PERMISSIONS as readonly string[]).includes(permission)
}
