// Settings configuration type definitions
// Each interface maps to a single-row config table (id='default')

// =====================
// Business Config
// =====================

export interface BusinessConfig {
  id: string
  business_name: string
  trade_name: string
  tin: string
  branch_code: string
  address: string
  city: string
  province: string
  zip_code: string
  phone: string
  email: string
  website: string
  ptu_number: string
  ptu_valid_from: string
  ptu_valid_until: string
  machine_serial: string
  min_number: string
  accreditation_number: string
  date_accredited: string
  logo_url?: string
  show_store_name?: number
  show_logo?: number
  show_address?: number
  show_tin?: number
  show_terminal?: number
  show_time?: number
  time_format?: string
  date_format?: string
  slideshow_interval?: number
  created_at?: string
  updated_at?: string
}

export interface BusinessConfigInput {
  business_name?: string
  trade_name?: string
  tin?: string
  branch_code?: string
  address?: string
  city?: string
  province?: string
  zip_code?: string
  phone?: string
  email?: string
  website?: string
  ptu_number?: string
  ptu_valid_from?: string
  ptu_valid_until?: string
  machine_serial?: string
  min_number?: string
  accreditation_number?: string
  date_accredited?: string
  logo_url?: string
  show_store_name?: number
  show_logo?: number
  show_address?: number
  show_tin?: number
  show_terminal?: number
  show_time?: number
  time_format?: string
  date_format?: string
  slideshow_interval?: number
}

// =====================
// Slideshow Image
// =====================

export interface SlideshowImage {
  id: string
  image_data: string
  sort_order: number
  created_at: string
}

// =====================
// Tax Config
// =====================

export interface TaxConfig {
  id: string
  vat_rate: number
  default_tax_type: string
  senior_citizen_discount: number
  pwd_discount: number
  show_vat_breakdown: number
  include_vat_in_price: number
  created_at?: string
  updated_at?: string
}

export interface TaxConfigInput {
  vat_rate?: number
  default_tax_type?: string
  senior_citizen_discount?: number
  pwd_discount?: number
  show_vat_breakdown?: boolean
  include_vat_in_price?: boolean
}

// =====================
// Receipt Config
// =====================

export interface ReceiptConfig {
  id: string
  header_line1: string
  header_line2: string
  header_line3: string
  footer_line1: string
  footer_line2: string
  show_logo: number
  paper_width: string
  font_size: string
  print_duplicate: number
  printer_name: string
  connection_type: string
  ip_address: string
  port: number
  usb_device: string
  bluetooth_device: string
  serial_port: string
  baud_rate: number
  auto_cut: number
  open_cash_drawer: number
  cash_drawer_pin: number
  created_at?: string
  updated_at?: string
}

export interface ReceiptConfigInput {
  header_line1?: string
  header_line2?: string
  header_line3?: string
  footer_line1?: string
  footer_line2?: string
  show_logo?: boolean
  paper_width?: string
  font_size?: string
  print_duplicate?: boolean
  printer_name?: string
  connection_type?: string
  ip_address?: string
  port?: number
  usb_device?: string
  bluetooth_device?: string
  serial_port?: string
  baud_rate?: number
  auto_cut?: boolean
  open_cash_drawer?: boolean
  cash_drawer_pin?: number
}

// =====================
// Payment Config
// =====================

export interface PaymentConfig {
  id: string
  cash_enabled: number
  card_enabled: number
  gcash_enabled: number
  maya_enabled: number
  grab_pay_enabled: number
  bank_transfer_enabled: number
  check_enabled: number
  credit_enabled: number
  created_at?: string
  updated_at?: string
}

export interface PaymentConfigInput {
  cash_enabled?: boolean
  card_enabled?: boolean
  gcash_enabled?: boolean
  maya_enabled?: boolean
  grab_pay_enabled?: boolean
  bank_transfer_enabled?: boolean
  check_enabled?: boolean
  credit_enabled?: boolean
}

// =====================
// System Config
// =====================

export interface SystemConfig {
  id: string
  offline_mode_enabled: number
  auto_sync_enabled: number
  sync_interval: number
  data_retention_years: number
  low_stock_threshold: number
  enable_notifications: number
  enable_sound_alerts: number
  auto_backup_enabled: number
  backup_frequency: string
  backup_time: string
  cloud_backup_enabled: number
  local_backup_enabled: number
  local_backup_path: string
  keep_backup_days: number
  encrypt_backup: number
  sync_strategy: string
  conflict_resolution: string
  sync_products: number
  sync_orders: number
  sync_customers: number
  sync_inventory: number
  created_at?: string
  updated_at?: string
}

export interface SystemConfigInput {
  offline_mode_enabled?: boolean
  auto_sync_enabled?: boolean
  sync_interval?: number
  data_retention_years?: number
  low_stock_threshold?: number
  enable_notifications?: boolean
  enable_sound_alerts?: boolean
  auto_backup_enabled?: boolean
  backup_frequency?: string
  backup_time?: string
  cloud_backup_enabled?: boolean
  local_backup_enabled?: boolean
  local_backup_path?: string
  keep_backup_days?: number
  encrypt_backup?: boolean
  sync_strategy?: string
  conflict_resolution?: string
  sync_products?: boolean
  sync_orders?: boolean
  sync_customers?: boolean
  sync_inventory?: boolean
}
