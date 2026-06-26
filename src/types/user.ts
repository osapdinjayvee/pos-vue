/**
 * User Management Type Definitions
 * Types for users, roles, permissions, shifts, and authentication
 */

// =====================
// Enums and Types
// =====================

export type ShiftStatus = 'open' | 'closed' | 'force_closed'
export type AuthEventType = 'login_success' | 'login_failure' | 'logout' | 'lock' | 'unlock'
export type PermissionCategory = 'sales' | 'inventory' | 'reports' | 'users' | 'settings'

// =====================
// User Entity
// =====================

export interface User {
  id: string
  username: string
  pin_hash: string
  password_hash: string | null
  first_name: string
  last_name: string
  email: string | null
  branch_id: string
  is_active: number
  last_login_at: string | null
  created_at: string
  updated_at: string
  synced_at: string | null
  // Security questions for PIN recovery (Forgot PIN) — nullable
  security_question_1?: string | null
  security_answer_1_hash?: string | null
  security_question_2?: string | null
  security_answer_2_hash?: string | null
}

/**
 * Security-question setup payload (answers are plaintext here; hashed before storage)
 */
export interface SecurityQuestionsInput {
  question1: string
  answer1: string
  question2: string
  answer2: string
}

/**
 * Preset security questions offered during admin setup / user editing.
 */
export const SECURITY_QUESTIONS: string[] = [
  'What was the name of your first pet?',
  "What is your mother's maiden name?",
  'What city were you born in?',
  'What was the name of your elementary school?',
  'What is your favorite food?',
  'What was the make of your first vehicle?',
  'What is your favorite movie?',
  'What was your childhood nickname?'
]

export interface UserInput {
  username: string
  pin: string
  password?: string
  first_name: string
  last_name: string
  email?: string
  branch_id: string
  role_ids: string[]
  securityQuestions?: SecurityQuestionsInput
}

export interface UserUpdateInput {
  first_name?: string
  last_name?: string
  email?: string
  pin?: string
  password?: string
  role_ids?: string[]
  securityQuestions?: SecurityQuestionsInput
}

export interface DisplayUser {
  id: string
  username: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  branchId: string
  isActive: boolean
  lastLoginAt: string | null
  roles: DisplayRole[]
  permissions: string[]
  createdAt: string
  updatedAt: string
}

// =====================
// Role Entity
// =====================

export interface Role {
  id: string
  name: string
  code: string
  description: string | null
  is_default: number
  is_active: number
  permissions: string // JSON array
  created_at: string
  updated_at: string
}

export interface RoleInput {
  name: string
  code: string
  description?: string
  permissions: string[]
  is_default?: boolean
}

export interface DisplayRole {
  id: string
  name: string
  code: string
  description: string
  isDefault: boolean
  isActive: boolean
  permissions: string[]
  createdAt: string
  updatedAt: string
}

// =====================
// Permission Entity
// =====================

export interface Permission {
  id: string
  code: string
  name: string
  description: string | null
  category: PermissionCategory
  created_at: string
}

export interface DisplayPermission {
  id: string
  code: string
  name: string
  description: string
  category: PermissionCategory
}

// Permission codes as constants
export const PERMISSIONS = {
  // Sales
  SALES_CREATE: 'sales.create',
  SALES_VOID: 'sales.void',
  SALES_REFUND: 'sales.refund',
  SALES_DISCOUNT: 'sales.discount',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',

  // Reports
  REPORTS_XREADING: 'reports.xreading',
  REPORTS_ZREADING: 'reports.zreading',
  REPORTS_SALES: 'reports.sales',

  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DEACTIVATE: 'users.deactivate',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit'
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// =====================
// UserRole Junction
// =====================

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by: string | null
}

// =====================
// Shift Entity
// =====================

export interface Shift {
  id: string
  user_id: string
  terminal_id: string
  branch_id: string
  started_at: string
  ended_at: string | null
  opening_cash: number
  closing_cash: number | null
  expected_cash: number | null
  variance: number | null
  variance_reason: string | null
  status: ShiftStatus
  closed_by: string | null
  created_at: string
  updated_at: string
  synced_at: string | null
  // Joined fields
  user_name?: string
}

export interface ShiftStartInput {
  terminal_id: string
  opening_cash: number
}

export interface ShiftCloseInput {
  closing_cash: number
  variance_reason?: string
}

export interface DisplayShift {
  id: string
  userId: string
  userName: string
  terminalId: string
  branchId: string
  startedAt: string
  endedAt: string | null
  openingCash: number
  closingCash: number | null
  expectedCash: number | null
  variance: number | null
  varianceReason: string
  status: ShiftStatus
  statusLabel: string
  closedBy: string | null
  duration: string
  createdAt: string
  updatedAt: string
}

// =====================
// AuthLog Entity
// =====================

export interface AuthLog {
  id: string
  user_id: string | null
  username: string
  event_type: AuthEventType
  terminal_id: string
  ip_address: string | null
  user_agent: string | null
  failure_reason: string | null
  created_at: string
  synced_at: string | null
}

export interface AuthLogInput {
  user_id?: string
  username: string
  event_type: AuthEventType
  terminal_id: string
  ip_address?: string
  user_agent?: string
  failure_reason?: string
}

// =====================
// Cached Credentials (Offline Auth)
// =====================

export interface CachedCredentials {
  version: number
  branchId: string
  lastSync: string
  users: CachedUser[]
}

export interface CachedUser {
  id: string
  username: string
  pinHash: string
  firstName: string
  lastName: string
  roles: string[]
  permissions: string[]
  cachedAt: string
  expiresAt: string
}

// =====================
// Auth Response
// =====================

export interface AuthResponse {
  user: DisplayUser
  token: string
  expiresAt: string
  permissions: string[]
}

export interface LoginCredentials {
  username: string
  pin: string
  terminalId: string
}

// =====================
// Labels
// =====================

export const ShiftStatusLabels: Record<ShiftStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  force_closed: 'Force Closed'
}

export const AuthEventTypeLabels: Record<AuthEventType, string> = {
  login_success: 'Login Success',
  login_failure: 'Login Failed',
  logout: 'Logout',
  lock: 'Screen Locked',
  unlock: 'Screen Unlocked'
}

export const PermissionCategoryLabels: Record<PermissionCategory, string> = {
  sales: 'Sales',
  inventory: 'Inventory',
  reports: 'Reports',
  users: 'Users',
  settings: 'Settings'
}

// =====================
// Helper Functions
// =====================

export function toDisplayUser(
  user: User,
  roles: DisplayRole[] = [],
  permissions: string[] = []
): DisplayUser {
  return {
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: `${user.first_name} ${user.last_name}`,
    email: user.email || '',
    branchId: user.branch_id,
    isActive: user.is_active === 1,
    lastLoginAt: user.last_login_at,
    roles,
    permissions,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }
}

export function toDisplayRole(role: Role): DisplayRole {
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description || '',
    isDefault: role.is_default === 1,
    isActive: role.is_active === 1,
    permissions: JSON.parse(role.permissions),
    createdAt: role.created_at,
    updatedAt: role.updated_at
  }
}

export function toDisplayPermission(permission: Permission): DisplayPermission {
  return {
    id: permission.id,
    code: permission.code,
    name: permission.name,
    description: permission.description || '',
    category: permission.category
  }
}

export function toDisplayShift(shift: Shift): DisplayShift {
  const startedAt = new Date(shift.started_at)
  const endedAt = shift.ended_at ? new Date(shift.ended_at) : new Date()
  const durationMs = endedAt.getTime() - startedAt.getTime()
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  return {
    id: shift.id,
    userId: shift.user_id,
    userName: shift.user_name || '',
    terminalId: shift.terminal_id,
    branchId: shift.branch_id,
    startedAt: shift.started_at,
    endedAt: shift.ended_at,
    openingCash: shift.opening_cash,
    closingCash: shift.closing_cash,
    expectedCash: shift.expected_cash,
    variance: shift.variance,
    varianceReason: shift.variance_reason || '',
    status: shift.status,
    statusLabel: ShiftStatusLabels[shift.status],
    closedBy: shift.closed_by,
    duration: `${hours}h ${minutes}m`,
    createdAt: shift.created_at,
    updatedAt: shift.updated_at
  }
}

// =====================
// Default Role Definitions
// =====================

export const DEFAULT_ROLES: RoleInput[] = [
  {
    name: 'Cashier',
    code: 'cashier',
    description: 'Standard cashier with sales access',
    permissions: [PERMISSIONS.SALES_CREATE, PERMISSIONS.SALES_DISCOUNT, PERMISSIONS.REPORTS_XREADING],
    is_default: true
  },
  {
    name: 'Supervisor',
    code: 'supervisor',
    description: 'Supervisor with void/refund and reporting access',
    permissions: [
      'sales.*',
      PERMISSIONS.INVENTORY_VIEW,
      'reports.*',
      PERMISSIONS.USERS_VIEW
    ],
    is_default: true
  },
  {
    name: 'Administrator',
    code: 'admin',
    description: 'Full system access',
    permissions: ['*'],
    is_default: true
  }
]

// =====================
// Default Permissions
// =====================

export const DEFAULT_PERMISSIONS: Array<{
  code: string
  name: string
  description: string
  category: PermissionCategory
}> = [
  // Sales
  { code: 'sales.create', name: 'Create Sale', description: 'Process sales transactions', category: 'sales' },
  { code: 'sales.void', name: 'Void Transaction', description: 'Void transactions', category: 'sales' },
  { code: 'sales.refund', name: 'Process Refund', description: 'Process refunds', category: 'sales' },
  { code: 'sales.discount', name: 'Apply Discount', description: 'Apply discounts', category: 'sales' },

  // Inventory
  { code: 'inventory.view', name: 'View Inventory', description: 'View inventory', category: 'inventory' },
  { code: 'inventory.adjust', name: 'Adjust Stock', description: 'Adjust stock levels', category: 'inventory' },

  // Reports
  { code: 'reports.xreading', name: 'X-Reading', description: 'Generate X-Reading', category: 'reports' },
  { code: 'reports.zreading', name: 'Z-Reading', description: 'Generate Z-Reading', category: 'reports' },
  { code: 'reports.sales', name: 'Sales Reports', description: 'View sales reports', category: 'reports' },

  // Users
  { code: 'users.view', name: 'View Users', description: 'View user list', category: 'users' },
  { code: 'users.create', name: 'Create Users', description: 'Create users', category: 'users' },
  { code: 'users.edit', name: 'Edit Users', description: 'Edit users', category: 'users' },
  { code: 'users.deactivate', name: 'Deactivate Users', description: 'Deactivate users', category: 'users' },

  // Settings
  { code: 'settings.view', name: 'View Settings', description: 'View settings', category: 'settings' },
  { code: 'settings.edit', name: 'Edit Settings', description: 'Modify settings', category: 'settings' }
]
