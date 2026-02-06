/**
 * Input Validators for User Management
 * Validation rules for users, roles, and authentication
 */

import type { UserInput, UserUpdateInput, RoleInput, ShiftStartInput, ShiftCloseInput } from '@/types/user'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

/**
 * Validate username format
 * - 3-50 characters
 * - Alphanumeric and underscore only
 * - Must start with a letter
 * - Lowercase only
 */
export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required'
  }

  const trimmed = username.trim().toLowerCase()

  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters'
  }

  if (trimmed.length > 50) {
    return 'Username cannot exceed 50 characters'
  }

  if (!/^[a-z][a-z0-9_]*$/.test(trimmed)) {
    return 'Username must start with a letter and contain only letters, numbers, and underscores'
  }

  return null
}

/**
 * Validate PIN format
 * - 4-6 numeric digits
 */
export function validatePin(pin: string): string | null {
  if (!pin) {
    return 'PIN is required'
  }

  if (!/^\d{4,6}$/.test(pin)) {
    return 'PIN must be 4-6 digits'
  }

  // Check for obvious patterns
  if (/^(.)\1+$/.test(pin)) {
    return 'PIN cannot be all the same digit'
  }

  if (['1234', '12345', '123456', '0000', '00000', '000000'].includes(pin)) {
    return 'PIN is too simple'
  }

  return null
}

/**
 * Validate password format (optional, for admin/supervisor)
 * - Minimum 8 characters
 * - At least one letter and one number
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return null // Password is optional
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }

  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter'
  }

  if (!/\d/.test(password)) {
    return 'Password must contain at least one number'
  }

  return null
}

/**
 * Validate name format (first_name, last_name)
 * - 1-100 characters
 * - Letters, spaces, hyphens, apostrophes only
 */
export function validateName(name: string, fieldName: string = 'Name'): string | null {
  if (!name || !name.trim()) {
    return `${fieldName} is required`
  }

  const trimmed = name.trim()

  if (trimmed.length > 100) {
    return `${fieldName} cannot exceed 100 characters`
  }

  if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`
  }

  return null
}

/**
 * Validate email format (optional)
 */
export function validateEmail(email: string): string | null {
  if (!email || !email.trim()) {
    return null // Email is optional
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return 'Invalid email format'
  }

  if (email.length > 255) {
    return 'Email cannot exceed 255 characters'
  }

  return null
}

/**
 * Validate user input for creation
 */
export function validateUserInput(input: UserInput): ValidationResult {
  const errors: Record<string, string> = {}

  const usernameError = validateUsername(input.username)
  if (usernameError) errors.username = usernameError

  const pinError = validatePin(input.pin)
  if (pinError) errors.pin = pinError

  if (input.password) {
    const passwordError = validatePassword(input.password)
    if (passwordError) errors.password = passwordError
  }

  const firstNameError = validateName(input.first_name, 'First name')
  if (firstNameError) errors.first_name = firstNameError

  const lastNameError = validateName(input.last_name, 'Last name')
  if (lastNameError) errors.last_name = lastNameError

  if (input.email) {
    const emailError = validateEmail(input.email)
    if (emailError) errors.email = emailError
  }

  if (!input.branch_id) {
    errors.branch_id = 'Branch is required'
  }

  if (!input.role_ids || input.role_ids.length === 0) {
    errors.role_ids = 'At least one role is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate user input for update
 */
export function validateUserUpdateInput(input: UserUpdateInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (input.first_name !== undefined) {
    const firstNameError = validateName(input.first_name, 'First name')
    if (firstNameError) errors.first_name = firstNameError
  }

  if (input.last_name !== undefined) {
    const lastNameError = validateName(input.last_name, 'Last name')
    if (lastNameError) errors.last_name = lastNameError
  }

  if (input.email !== undefined) {
    const emailError = validateEmail(input.email)
    if (emailError) errors.email = emailError
  }

  if (input.pin !== undefined) {
    const pinError = validatePin(input.pin)
    if (pinError) errors.pin = pinError
  }

  if (input.password !== undefined) {
    const passwordError = validatePassword(input.password)
    if (passwordError) errors.password = passwordError
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate role input
 */
export function validateRoleInput(input: RoleInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name || !input.name.trim()) {
    errors.name = 'Role name is required'
  } else if (input.name.length > 50) {
    errors.name = 'Role name cannot exceed 50 characters'
  }

  if (!input.code || !input.code.trim()) {
    errors.code = 'Role code is required'
  } else if (!/^[a-z_]+$/.test(input.code)) {
    errors.code = 'Role code must be lowercase letters and underscores only'
  } else if (input.code.length > 50) {
    errors.code = 'Role code cannot exceed 50 characters'
  }

  if (input.description && input.description.length > 255) {
    errors.description = 'Description cannot exceed 255 characters'
  }

  if (!input.permissions || input.permissions.length === 0) {
    errors.permissions = 'At least one permission is required'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate shift start input
 */
export function validateShiftStartInput(input: ShiftStartInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.terminal_id || !input.terminal_id.trim()) {
    errors.terminal_id = 'Terminal ID is required'
  }

  if (input.opening_cash === undefined || input.opening_cash === null) {
    errors.opening_cash = 'Opening cash amount is required'
  } else if (input.opening_cash < 0) {
    errors.opening_cash = 'Opening cash cannot be negative'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate shift close input
 */
export function validateShiftCloseInput(input: ShiftCloseInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (input.closing_cash === undefined || input.closing_cash === null) {
    errors.closing_cash = 'Closing cash amount is required'
  } else if (input.closing_cash < 0) {
    errors.closing_cash = 'Closing cash cannot be negative'
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Normalize username (lowercase, trimmed)
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

/**
 * Normalize name (trimmed, proper case)
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
