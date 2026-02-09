import { ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import type {
  BusinessConfig, BusinessConfigInput,
  TaxConfig, TaxConfigInput,
  ReceiptConfig, ReceiptConfigInput,
  PaymentConfig, PaymentConfigInput,
  SystemConfig, SystemConfigInput
} from '@/types/settings'

const loading = ref(false)

export function useSettings() {
  const businessConfig = ref<BusinessConfig | null>(null)
  const taxConfig = ref<TaxConfig | null>(null)
  const receiptConfig = ref<ReceiptConfig | null>(null)
  const paymentConfig = ref<PaymentConfig | null>(null)
  const systemConfig = ref<SystemConfig | null>(null)

  async function loadAll() {
    loading.value = true
    try {
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
    } finally {
      loading.value = false
    }
  }

  async function saveBusiness(data: BusinessConfigInput) {
    loading.value = true
    try {
      const { businessConfigRepository } = await import('@/repositories/businessConfigRepository')
      businessConfig.value = await businessConfigRepository.updateConfig(data)
      await useSettingsStore().reload('business')
    } finally {
      loading.value = false
    }
  }

  async function saveTax(data: TaxConfigInput) {
    loading.value = true
    try {
      const { taxConfigRepository } = await import('@/repositories/taxConfigRepository')
      taxConfig.value = await taxConfigRepository.updateConfig(data)
      await useSettingsStore().reload('tax')
    } finally {
      loading.value = false
    }
  }

  async function saveReceipt(data: ReceiptConfigInput) {
    loading.value = true
    try {
      const { receiptConfigRepository } = await import('@/repositories/receiptConfigRepository')
      receiptConfig.value = await receiptConfigRepository.updateConfig(data)
      await useSettingsStore().reload('receipt')
    } finally {
      loading.value = false
    }
  }

  async function savePayment(data: PaymentConfigInput) {
    loading.value = true
    try {
      const { paymentConfigRepository } = await import('@/repositories/paymentConfigRepository')
      paymentConfig.value = await paymentConfigRepository.updateConfig(data)
      await useSettingsStore().reload('payment')
    } finally {
      loading.value = false
    }
  }

  async function saveSystem(data: SystemConfigInput) {
    loading.value = true
    try {
      const { systemConfigRepository } = await import('@/repositories/systemConfigRepository')
      systemConfig.value = await systemConfigRepository.updateConfig(data)
      await useSettingsStore().reload('system')
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    businessConfig,
    taxConfig,
    receiptConfig,
    paymentConfig,
    systemConfig,
    loadAll,
    saveBusiness,
    saveTax,
    saveReceipt,
    savePayment,
    saveSystem
  }
}
