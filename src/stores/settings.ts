// Settings Store - Single source of truth for all persisted configuration
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  BusinessConfig,
  TaxConfig,
  ReceiptConfig,
  PaymentConfig,
  SystemConfig
} from '@/types/settings'

export type SettingsGroup = 'business' | 'tax' | 'receipt' | 'payment' | 'system'

export const useSettingsStore = defineStore('settings', () => {
  // Raw config state (loaded from DB)
  const businessConfig = ref<BusinessConfig | null>(null)
  const taxConfig = ref<TaxConfig | null>(null)
  const receiptConfig = ref<ReceiptConfig | null>(null)
  const paymentConfig = ref<PaymentConfig | null>(null)
  const systemConfig = ref<SystemConfig | null>(null)
  const initialized = ref(false)

  // =====================
  // Tax Getters
  // =====================
  const vatRate = computed(() => (taxConfig.value?.vat_rate ?? 12) / 100)
  const vatRatePercent = computed(() => taxConfig.value?.vat_rate ?? 12)
  const seniorDiscount = computed(() => (taxConfig.value?.senior_citizen_discount ?? 20) / 100)
  const seniorDiscountPercent = computed(() => taxConfig.value?.senior_citizen_discount ?? 20)
  const pwdDiscount = computed(() => (taxConfig.value?.pwd_discount ?? 20) / 100)
  const pwdDiscountPercent = computed(() => taxConfig.value?.pwd_discount ?? 20)
  const showVatBreakdown = computed(() => (taxConfig.value?.show_vat_breakdown ?? 1) === 1)
  const includeVatInPrice = computed(() => (taxConfig.value?.include_vat_in_price ?? 1) === 1)

  // =====================
  // Business Info Getter
  // =====================
  const businessInfo = computed(() => ({
    name: businessConfig.value?.business_name || 'My POS Store',
    address: buildAddress(),
    tin: businessConfig.value?.tin || '000-000-000-000',
    branchCode: businessConfig.value?.branch_code || 'MAIN',
    phoneNumber: businessConfig.value?.phone || '',
    accreditationNumber: businessConfig.value?.accreditation_number || '',
    logoUrl: businessConfig.value?.logo_url || ''
  }))

  const terminalInfo = computed(() => ({
    terminalId: 'T001',
    machineSerial: businessConfig.value?.machine_serial || 'SN-00000001',
    minNumber: businessConfig.value?.min_number || 'MIN-00000001',
    ptuNumber: businessConfig.value?.ptu_number || 'PTU-00000001',
    ptuValidUntil: businessConfig.value?.ptu_valid_until || '2027-12-31'
  }))

  function buildAddress(): string {
    if (!businessConfig.value) return '123 Main Street, City, Province'
    const parts = [
      businessConfig.value.address,
      businessConfig.value.city,
      businessConfig.value.province,
      businessConfig.value.zip_code
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '123 Main Street, City, Province'
  }

  // =====================
  // Receipt Settings Getter
  // =====================
  const receiptSettings = computed(() => ({
    headerLine1: receiptConfig.value?.header_line1 || '',
    headerLine2: receiptConfig.value?.header_line2 || '',
    headerLine3: receiptConfig.value?.header_line3 || '',
    footerLine1: receiptConfig.value?.footer_line1 || 'Thank you for your purchase!',
    footerLine2: receiptConfig.value?.footer_line2 || '',
    paperWidth: receiptConfig.value?.paper_width || '80mm',
    fontSize: receiptConfig.value?.font_size || '12px',
    printDuplicate: (receiptConfig.value?.print_duplicate ?? 0) === 1
  }))

  const receiptWidth = computed(() => {
    const pw = receiptSettings.value.paperWidth
    return pw === '58mm' ? 32 : 42
  })

  // =====================
  // Payment Methods Getter
  // =====================
  const paymentMethods = computed(() => ({
    cash: (paymentConfig.value?.cash_enabled ?? 1) === 1,
    card: (paymentConfig.value?.card_enabled ?? 1) === 1,
    gcash: (paymentConfig.value?.gcash_enabled ?? 1) === 1,
    maya: (paymentConfig.value?.maya_enabled ?? 1) === 1,
    grabPay: (paymentConfig.value?.grab_pay_enabled ?? 0) === 1,
    bankTransfer: (paymentConfig.value?.bank_transfer_enabled ?? 0) === 1,
    check: (paymentConfig.value?.check_enabled ?? 0) === 1
  }))

  // =====================
  // System Settings Getter
  // =====================
  const lowStockThreshold = computed(() => systemConfig.value?.low_stock_threshold ?? 10)

  // =====================
  // Actions
  // =====================
  async function initialize() {
    const [
      { businessConfigRepository },
      { taxConfigRepository },
      { receiptConfigRepository },
      { paymentConfigRepository },
      { systemConfigRepository }
    ] = await Promise.all([
      import('@/repositories/businessConfigRepository'),
      import('@/repositories/taxConfigRepository'),
      import('@/repositories/receiptConfigRepository'),
      import('@/repositories/paymentConfigRepository'),
      import('@/repositories/systemConfigRepository')
    ])

    const [biz, tax, receipt, payment, system] = await Promise.all([
      businessConfigRepository.getConfig(),
      taxConfigRepository.getConfig(),
      receiptConfigRepository.getConfig(),
      paymentConfigRepository.getConfig(),
      systemConfigRepository.getConfig()
    ])

    businessConfig.value = biz
    taxConfig.value = tax
    receiptConfig.value = receipt
    paymentConfig.value = payment
    systemConfig.value = system
    initialized.value = true
  }

  async function reload(group: SettingsGroup) {
    switch (group) {
      case 'business': {
        const { businessConfigRepository } = await import('@/repositories/businessConfigRepository')
        businessConfig.value = await businessConfigRepository.getConfig()
        break
      }
      case 'tax': {
        const { taxConfigRepository } = await import('@/repositories/taxConfigRepository')
        taxConfig.value = await taxConfigRepository.getConfig()
        break
      }
      case 'receipt': {
        const { receiptConfigRepository } = await import('@/repositories/receiptConfigRepository')
        receiptConfig.value = await receiptConfigRepository.getConfig()
        break
      }
      case 'payment': {
        const { paymentConfigRepository } = await import('@/repositories/paymentConfigRepository')
        paymentConfig.value = await paymentConfigRepository.getConfig()
        break
      }
      case 'system': {
        const { systemConfigRepository } = await import('@/repositories/systemConfigRepository')
        systemConfig.value = await systemConfigRepository.getConfig()
        break
      }
    }
  }

  return {
    // Raw state (for SettingsView binding)
    businessConfig,
    taxConfig,
    receiptConfig,
    paymentConfig,
    systemConfig,
    initialized,

    // Tax getters
    vatRate,
    vatRatePercent,
    seniorDiscount,
    seniorDiscountPercent,
    pwdDiscount,
    pwdDiscountPercent,
    showVatBreakdown,
    includeVatInPrice,

    // Business/terminal getters
    businessInfo,
    terminalInfo,

    // Receipt getters
    receiptSettings,
    receiptWidth,

    // Payment getters
    paymentMethods,

    // System getters
    lowStockThreshold,

    // Actions
    initialize,
    reload
  }
})
