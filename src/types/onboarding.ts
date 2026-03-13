/**
 * Onboarding Types
 * Types for registration, license verification, terms acceptance, and setup wizard
 */

// Onboarding step identifiers (enforced order)
export type OnboardingStep =
  | 'welcome'
  | 'server'
  | 'license'
  | 'business'
  | 'admin'
  | 'cashier'
  | 'terms'
  | 'privacy'
  | 'completion'

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'server',
  'license',
  'business',
  'admin',
  'cashier',
  'terms',
  'privacy',
  'completion'
]

// Maps to onboarding_progress table (single-row, id='default')
export interface OnboardingProgress {
  id: string
  current_step: OnboardingStep
  is_completed: number // 0 or 1 (SQLite boolean)
  license_key: string | null
  license_type: string | null
  license_verified_at: string | null
  activated_at: string | null
  server_url: string | null
  device_uid: string | null
  device_registered_at: string | null
  heartbeat_status: string | null
  heartbeat_last_at: string | null
  license_expiry_date: string | null
  created_at: string
  updated_at: string
}

// Maps to terms_documents table
export interface TermsDocument {
  id: string
  version: string
  title: string
  content_html: string
  published_at: string
  fetched_at: string
}

// Maps to terms_acceptances table
export interface TermsAcceptance {
  id: string
  terms_id: string
  terms_version: string
  user_id: string
  accepted_at: string
  synced_at: string | null
  sync_status: 'pending' | 'synced' | 'failed'
}

// API response: license verification
export interface LicenseVerifyResponse {
  valid: boolean
  license_type: string
  business_name?: string
  expiry_date?: string
  max_terminals?: number | null
  active_device_count?: number
  error?: string
}

// API response: device registration
export interface DeviceRegisterResponse {
  success: boolean
  device_id?: number
  registered_at?: string
  error?: string
  max_terminals?: number
  active_count?: number
}

// API response: license heartbeat
export interface HeartbeatResponse {
  status: 'active' | 'expired' | 'revoked'
  expiry_date?: string | null
  plan?: string | null
}

// API response: legal document from server (/legal/terms-and-conditions, /legal/privacy-policy)
export interface LegalDocumentResponse {
  title: string
  type: string
  version: string
  content: string
  file_url: string | null
  effective_date: string
}

// Payload for activation completion POST
export interface ActivationCompletePayload {
  license_key: string
  terminal_id: string
  business_name: string
  tin: string
  branch_code: string
  admin_username: string
  activated_at: string
}

// Admin creation input
export interface AdminSetupInput {
  username: string
  pin: string
  firstName: string
  lastName: string
  email?: string
}

// Cashier creation input
export interface CashierSetupInput {
  username: string
  pin: string
  firstName: string
  lastName: string
}
