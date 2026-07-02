<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import InputText from 'primevue/inputtext'
import InputMask from 'primevue/inputmask'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import DatePicker from 'primevue/datepicker'
import ConfirmDialog from 'primevue/confirmdialog'
import EISConfigForm from '@/components/eis/EISConfigForm.vue'
import { useEIS } from '@/composables/useEIS'
import { usePrinter } from '@/composables/usePrinter'
import { useSettingsStore } from '@/stores/settings'
import { useSettings } from '@/composables/useSettings'
import { testConnection } from '@/services/eisConnectionTestService'
import type { EISConfig } from '@/types/eis'
import { toLocalDateStr } from '@/utils/dateHelpers'
import { db } from '@/db/database'
import { useConfirm } from 'primevue/useconfirm'

const toast = useToast()
const confirm = useConfirm()
const settingsStore = useSettingsStore()
const activeTab = ref('business')

// Settings composable
const {
  loading: settingsLoading,
  businessConfig,
  taxConfig,
  receiptConfig,
  paymentConfig,
  systemConfig,
  loadAll: loadAllSettings,
  saveBusiness,
  saveTax,
  saveReceipt,
  savePayment,
  saveSystem
} = useSettings()

// Printer / Bluetooth
const {
  isNative: printerIsNative,
  isBluetoothEnabled,
  isConnected: btConnected,
  connectedDevice: btConnectedDevice,
  pairedDevices,
  discoveredDevices,
  isScanning: btScanning,
  isConnecting: btConnecting,
  isPrinting: btPrinting,
  error: btError,
  checkBluetooth,
  loadPairedDevices,
  scanDevices,
  connect: btConnect,
  disconnect: btDisconnect,
  testPrint: btTestPrint,
  refreshConnectionStatus
} = usePrinter()

// EIS Configuration
const { config: eisConfigRef, loadDashboard: loadEISConfig, saveConfig: saveEISConfig } = useEIS()
const eisConfig = ref<EISConfig | null>(null)
const eisTesting = ref(false)

async function loadEISData() {
  try {
    await loadEISConfig()
    eisConfig.value = eisConfigRef.value
  } catch (e) {
    console.error('Failed to load EIS config:', e)
  }
}

async function handleEISSave(configData: Record<string, unknown>) {
  try {
    await saveEISConfig(configData)
    eisConfig.value = eisConfigRef.value
    toast.add({ severity: 'success', summary: 'Saved', detail: 'EIS configuration saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save EIS configuration.', life: 3000 })
  }
}

async function handleEISTest() {
  eisTesting.value = true
  try {
    const result = await testConnection(eisConfig.value || {})
    toast.add({
      severity: result.success ? 'success' : 'error',
      summary: result.success ? 'Connected' : 'Failed',
      detail: result.message,
      life: 4000
    })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Connection test failed.', life: 3000 })
  } finally {
    eisTesting.value = false
  }
}

// POS Display Settings
const displaySettings = ref({
  showStoreName: true,
  showLogo: true,
  showAddress: true,
  showTin: true,
  showTerminal: true,
  showTime: true,
  timeFormat: '12h',
  dateFormat: 'long',
  slideshowInterval: 5
})

import type { SlideshowImage } from '@/types/settings'
const slideshowImages = ref<SlideshowImage[]>([])
const slideshowUploading = ref(false)
const slideshowFileInput = ref<HTMLInputElement | null>(null)

const timeFormatOptions = [
  { label: '12-hour (2:30 PM)', value: '12h' },
  { label: '24-hour (14:30)', value: '24h' }
]

const dateFormatOptions = [
  { label: 'Long (Monday, February 9, 2026)', value: 'long' },
  { label: 'Short (Feb 9, 2026)', value: 'short' },
  { label: 'Numeric (02/09/2026)', value: 'numeric' }
]

async function handleSlideshowUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  slideshowUploading.value = true
  try {
    const { slideshowRepository } = await import('@/repositories/slideshowRepository')

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      if (file.size > 2 * 1024 * 1024) {
        toast.add({ severity: 'warn', summary: 'File Too Large', detail: `${file.name} exceeds 2MB limit.`, life: 3000 })
        continue
      }
      const dataUrl = await readFileAsDataURL(file)
      const img = await slideshowRepository.add(dataUrl)
      slideshowImages.value.push(img)
    }

    toast.add({ severity: 'success', summary: 'Uploaded', detail: `${files.length} image(s) uploaded.`, life: 3000 })
    await settingsStore.reloadSlideshow()
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload images.', life: 3000 })
  } finally {
    slideshowUploading.value = false
    if (slideshowFileInput.value) slideshowFileInput.value.value = ''
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function removeSlideshowImage(id: string) {
  try {
    const { slideshowRepository } = await import('@/repositories/slideshowRepository')
    await slideshowRepository.remove(id)
    slideshowImages.value = slideshowImages.value.filter(img => img.id !== id)
    await settingsStore.reloadSlideshow()
    toast.add({ severity: 'info', summary: 'Removed', detail: 'Image removed.', life: 2000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove image.', life: 3000 })
  }
}

async function loadSlideshowImages() {
  try {
    const { slideshowRepository } = await import('@/repositories/slideshowRepository')
    slideshowImages.value = await slideshowRepository.getAll()
  } catch {
    // Non-blocking
  }
}

// Business Information
const businessInfo = ref({
  businessName: '',
  tradeName: '',
  tin: '',
  branchCode: '0001',
  address: '',
  city: '',
  province: '',
  zipCode: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: ''
})

const logoFileInput = ref<HTMLInputElement | null>(null)

function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    toast.add({ severity: 'error', summary: 'Invalid File', detail: 'Please select an image file (PNG, JPG, SVG).', life: 3000 })
    return
  }

  if (file.size > 500 * 1024) {
    toast.add({ severity: 'warn', summary: 'File Too Large', detail: 'Logo should be under 500KB for best performance.', life: 3000 })
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    businessInfo.value.logoUrl = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function removeLogo() {
  businessInfo.value.logoUrl = ''
  if (logoFileInput.value) logoFileInput.value.value = ''
}

// BIR Compliance
const birCompliance = ref({
  ptuNumber: '',
  ptuValidFrom: null as Date | null,
  ptuValidUntil: null as Date | null,
  machineSerial: '',
  minNumber: '',
  accreditationNumber: '',
  dateAccredited: null as Date | null
})

// OR Series
const orSeries = ref([
  { id: 1, prefix: 'OR', startNumber: 1, endNumber: 50000, currentNumber: 1234, status: 'active' },
  { id: 2, prefix: 'SI', startNumber: 1, endNumber: 50000, currentNumber: 567, status: 'active' }
])

const newOrSeries = ref({
  prefix: '',
  startNumber: 1,
  endNumber: 50000
})

// Tax Settings
const taxSettings = ref({
  vatRate: 12,
  defaultTaxType: 'vatable',
  seniorCitizenDiscount: 20,
  pwdDiscount: 20,
  showVatBreakdown: true,
  includeVatInPrice: true
})

const taxTypes = [
  { label: 'VATable', value: 'vatable' },
  { label: 'VAT-Exempt', value: 'vat_exempt' },
  { label: 'Zero-Rated', value: 'zero_rated' }
]

// Receipt Settings
const receiptSettings = ref({
  headerLine1: '',
  headerLine2: '',
  headerLine3: '',
  footerLine1: 'Thank you for your purchase!',
  footerLine2: 'Please come again.',
  showLogo: true,
  paperWidth: '80mm',
  fontSize: 'normal',
  printDuplicate: false
})

const paperWidthOptions = [
  { label: '58mm', value: '58mm' },
  { label: '80mm', value: '80mm' }
]

const fontSizeOptions = [
  { label: 'Small', value: 'small' },
  { label: 'Normal', value: 'normal' },
  { label: 'Large', value: 'large' }
]

// Printer Settings
const printerSettings = ref({
  connectionType: 'usb',
  printerName: '',
  ipAddress: '192.168.1.100',
  port: 9100,
  usbDevice: '',
  bluetoothDevice: '',
  serialPort: 'COM1',
  baudRate: 9600,
  isConnected: false,
  autoCut: true,
  openCashDrawer: true,
  cashDrawerPin: 2
})

const connectionTypes = [
  { label: 'USB', value: 'usb', icon: 'pi pi-desktop' },
  { label: 'Network (IP)', value: 'network', icon: 'pi pi-wifi' },
  { label: 'Bluetooth', value: 'bluetooth', icon: 'pi pi-bluetooth' },
  { label: 'Serial (COM)', value: 'serial', icon: 'pi pi-server' }
]

const baudRateOptions = [
  { label: '9600', value: 9600 },
  { label: '19200', value: 19200 },
  { label: '38400', value: 38400 },
  { label: '57600', value: 57600 },
  { label: '115200', value: 115200 }
]

const serialPortOptions = [
  { label: 'COM1', value: 'COM1' },
  { label: 'COM2', value: 'COM2' },
  { label: 'COM3', value: 'COM3' },
  { label: 'COM4', value: 'COM4' }
]

const cashDrawerPinOptions = [
  { label: 'Pin 2', value: 2 },
  { label: 'Pin 5', value: 5 }
]

const getEscPosOptions = () => ({
  paperWidth: (receiptSettings.value.paperWidth === '58mm' ? '58mm' : '80mm') as '58mm' | '80mm',
  autoCut: printerSettings.value.autoCut,
  openCashDrawer: false,
  cashDrawerPin: printerSettings.value.cashDrawerPin
})

const testPrinterConnection = async () => {
  if (!printerIsNative.value) {
    toast.add({ severity: 'warn', summary: 'Not Available', detail: 'Bluetooth printing is only available on the mobile app.', life: 3000 })
    return
  }
  if (!printerSettings.value.bluetoothDevice) {
    toast.add({ severity: 'warn', summary: 'No Device', detail: 'Please select a Bluetooth device first.', life: 3000 })
    return
  }
  await checkBluetooth()
  await loadPairedDevices()
  const device = pairedDevices.value.find(d => d.address === printerSettings.value.bluetoothDevice)
  if (device) {
    const ok = await btConnect(device)
    printerSettings.value.isConnected = ok
    if (ok) {
      toast.add({ severity: 'success', summary: 'Connected', detail: `Connected to ${device.name}`, life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: 'Failed', detail: btError.value || 'Could not connect to printer.', life: 3000 })
    }
  } else {
    toast.add({ severity: 'warn', summary: 'Not Found', detail: 'Saved device not found in paired devices.', life: 3000 })
  }
}

const printTestReceipt = async () => {
  if (!printerIsNative.value) {
    toast.add({ severity: 'warn', summary: 'Not Available', detail: 'Bluetooth printing is only available on the mobile app.', life: 3000 })
    return
  }
  const ok = await btTestPrint(getEscPosOptions())
  if (ok) {
    toast.add({ severity: 'success', summary: 'Printed', detail: 'Test page sent to printer.', life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'Print Failed', detail: btError.value || 'Failed to print test page.', life: 3000 })
  }
}

const openCashDrawerTest = async () => {
  if (!printerIsNative.value) {
    toast.add({ severity: 'warn', summary: 'Not Available', detail: 'Cash drawer control is only available on the mobile app.', life: 3000 })
    return
  }
  const { printerService } = await import('@/services/printerService')
  const { escposService } = await import('@/services/escposService')
  const result = await printerService.printRaw(escposService.openCashDrawer(printerSettings.value.cashDrawerPin))
  if (result.success) {
    toast.add({ severity: 'success', summary: 'Opened', detail: 'Cash drawer command sent.', life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'Failed', detail: result.error || 'Could not open cash drawer.', life: 3000 })
  }
}

const handleBluetoothScan = async () => {
  await checkBluetooth()
  if (!isBluetoothEnabled.value) {
    toast.add({ severity: 'warn', summary: 'Bluetooth Off', detail: 'Please enable Bluetooth on your device.', life: 3000 })
    return
  }
  await loadPairedDevices()
  await scanDevices()
}

const handleBluetoothConnect = async (device: { name: string; address: string; id: string }) => {
  const ok = await btConnect(device)
  if (ok) {
    printerSettings.value.bluetoothDevice = device.address
    printerSettings.value.printerName = device.name
    printerSettings.value.isConnected = true
    toast.add({ severity: 'success', summary: 'Connected', detail: `Connected to ${device.name}`, life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'Failed', detail: btError.value || 'Could not connect.', life: 3000 })
  }
}

const handleBluetoothDisconnect = async () => {
  await btDisconnect()
  printerSettings.value.isConnected = false
  toast.add({ severity: 'info', summary: 'Disconnected', detail: 'Printer disconnected.', life: 3000 })
}

// Payment Methods
const paymentMethods = ref({
  cashEnabled: true,
  cardEnabled: true,
  gcashEnabled: true,
  mayaEnabled: true,
  grabPayEnabled: false,
  bankTransferEnabled: false,
  checkEnabled: false,
  creditEnabled: false
})

// System Settings
const systemSettings = ref({
  offlineModeEnabled: true,
  autoSyncEnabled: true,
  syncInterval: 5,
  dataRetentionYears: 10,
  lowStockThreshold: 10,
  enableNotifications: true,
  enableSoundAlerts: true
})

const syncIntervalOptions = [
  { label: 'Every 1 minute', value: 1 },
  { label: 'Every 5 minutes', value: 5 },
  { label: 'Every 15 minutes', value: 15 },
  { label: 'Every 30 minutes', value: 30 },
  { label: 'Every hour', value: 60 }
]

// Backup Settings
const backupSettings = ref({
  autoBackupEnabled: true,
  backupFrequency: 'daily',
  backupTime: new Date(2024, 0, 1, 2, 0), // 02:00 AM
  cloudBackupEnabled: true,
  localBackupEnabled: true,
  localBackupPath: '',
  keepBackupDays: 30,
  lastBackup: '2024-01-15 02:00:00',
  lastBackupSize: '125 MB',
  encryptBackup: true
})

const backupFrequencyOptions = [
  { label: 'Every Hour', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' }
]

// Sync Settings
const syncSettings = ref({
  syncStrategy: 'realtime',
  conflictResolution: 'server_wins',
  syncProducts: true,
  syncOrders: true,
  syncCustomers: true,
  syncInventory: true,
  syncReports: false,
  lastSync: '2024-01-15 14:30:00',
  pendingChanges: 0,
  syncStatus: 'synced'
})

const syncStrategyOptions = [
  { label: 'Real-time Sync', value: 'realtime', description: 'Sync immediately when changes occur' },
  { label: 'Scheduled Sync', value: 'scheduled', description: 'Sync at specified intervals' },
  { label: 'Manual Sync', value: 'manual', description: 'Only sync when manually triggered' }
]

const conflictResolutionOptions = [
  { label: 'Server Wins', value: 'server_wins', description: 'Server data takes priority in conflicts' },
  { label: 'Client Wins', value: 'client_wins', description: 'Local data takes priority in conflicts' },
  { label: 'Latest Wins', value: 'latest_wins', description: 'Most recent change takes priority' },
  { label: 'Ask User', value: 'ask_user', description: 'Prompt user to resolve conflicts' }
]

const isBackingUp = ref(false)
const isRestoring = ref(false)

const triggerBackup = async () => {
  isBackingUp.value = true
  try {
    const data = await db.exportDatabase()
    if (!data) {
      toast.add({ severity: 'error', summary: 'Backup Failed', detail: 'Could not export database', life: 3000 })
      return
    }

    const date = toLocalDateStr(new Date()).replace(/-/g, '')
    const filename = `pos-backup-${date}.db`
    const blob = new Blob([data], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.add({ severity: 'success', summary: 'Backup Complete', detail: `Saved as ${filename}`, life: 3000 })
  } catch (err: any) {
    toast.add({ severity: 'error', summary: 'Backup Failed', detail: err.message || 'Unknown error', life: 5000 })
  } finally {
    isBackingUp.value = false
  }
}

const triggerSync = () => {
  console.log('Triggering manual sync...')
}

const restoreBackup = () => {
  confirm.require({
    message: 'Restoring a backup will replace ALL current data. This cannot be undone. Are you sure?',
    header: 'Restore Backup',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Restore',
    rejectLabel: 'Cancel',
    accept: () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.db,.sqlite,.backup'
      input.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        isRestoring.value = true
        try {
          const buffer = await file.arrayBuffer()
          const data = new Uint8Array(buffer)
          await db.importDatabase(data)
          toast.add({ severity: 'success', summary: 'Restore Complete', detail: 'Database restored successfully. Reloading...', life: 3000 })
          // Reload to reinitialize everything with restored data
          setTimeout(() => window.location.reload(), 1500)
        } catch (err: any) {
          toast.add({ severity: 'error', summary: 'Restore Failed', detail: err.message || 'Invalid backup file', life: 5000 })
        } finally {
          isRestoring.value = false
        }
      }
      input.click()
    }
  })
}

// Users & Roles (summary)
const usersSummary = ref({
  totalUsers: 5,
  activeUsers: 4,
  roles: ['Admin', 'Supervisor', 'Cashier']
})

// Branches (summary)
const branchesSummary = ref({
  totalBranches: 3,
  currentBranch: 'Main Branch - Makati',
  multiBranchEnabled: true
})

// Loyalty Settings
const loyaltySettings = ref({
  earn_rate: 0.01,
  redeem_rate: 0.10,
  expiry_days: 365,
  min_redemption: 100,
  is_active: true
})

const loyaltyLoading = ref(false)

const loadLoyaltyConfig = async () => {
  loyaltyLoading.value = true
  try {
    const { loyaltyConfigRepository } = await import('@/repositories/loyaltyConfigRepository')
    const config = await loyaltyConfigRepository.getConfig()
    if (config) {
      loyaltySettings.value = {
        earn_rate: config.earn_rate,
        redeem_rate: config.redeem_rate,
        expiry_days: config.expiry_days,
        min_redemption: config.min_redemption,
        is_active: config.is_active === 1
      }
    }
  } catch (e) {
    console.error('Failed to load loyalty config:', e)
  } finally {
    loyaltyLoading.value = false
  }
}

const saveLoyaltyConfig = async () => {
  loyaltyLoading.value = true
  try {
    const { loyaltyConfigRepository } = await import('@/repositories/loyaltyConfigRepository')
    await loyaltyConfigRepository.updateConfig({
      earn_rate: loyaltySettings.value.earn_rate,
      redeem_rate: loyaltySettings.value.redeem_rate,
      expiry_days: loyaltySettings.value.expiry_days,
      min_redemption: loyaltySettings.value.min_redemption,
      is_active: loyaltySettings.value.is_active
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Loyalty settings saved.', life: 3000 })
  } catch (e) {
    console.error('Failed to save loyalty config:', e)
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save loyalty settings.', life: 3000 })
  } finally {
    loyaltyLoading.value = false
  }
}

// Hydrate UI refs from DB config objects
function hydrateFromDB() {
  const biz = businessConfig.value
  if (biz) {
    businessInfo.value = {
      businessName: biz.business_name,
      tradeName: biz.trade_name,
      tin: biz.tin,
      branchCode: biz.branch_code,
      address: biz.address,
      city: biz.city,
      province: biz.province,
      zipCode: biz.zip_code,
      phone: biz.phone,
      email: biz.email,
      website: biz.website,
      logoUrl: biz.logo_url || ''
    }
    birCompliance.value = {
      ptuNumber: biz.ptu_number,
      ptuValidFrom: biz.ptu_valid_from ? new Date(biz.ptu_valid_from) : null,
      ptuValidUntil: biz.ptu_valid_until ? new Date(biz.ptu_valid_until) : null,
      machineSerial: biz.machine_serial,
      minNumber: biz.min_number,
      accreditationNumber: biz.accreditation_number,
      dateAccredited: biz.date_accredited ? new Date(biz.date_accredited) : null
    }
    displaySettings.value = {
      showStoreName: (biz.show_store_name ?? 1) === 1,
      showLogo: (biz.show_logo ?? 1) === 1,
      showAddress: (biz.show_address ?? 1) === 1,
      showTin: (biz.show_tin ?? 1) === 1,
      showTerminal: (biz.show_terminal ?? 1) === 1,
      showTime: (biz.show_time ?? 1) === 1,
      timeFormat: biz.time_format || '12h',
      dateFormat: biz.date_format || 'long',
      slideshowInterval: biz.slideshow_interval ?? 5
    }
  }

  const tax = taxConfig.value
  if (tax) {
    taxSettings.value = {
      vatRate: tax.vat_rate,
      defaultTaxType: tax.default_tax_type,
      seniorCitizenDiscount: tax.senior_citizen_discount,
      pwdDiscount: tax.pwd_discount,
      showVatBreakdown: tax.show_vat_breakdown === 1,
      includeVatInPrice: tax.include_vat_in_price === 1
    }
  }

  const rcpt = receiptConfig.value
  if (rcpt) {
    receiptSettings.value = {
      headerLine1: rcpt.header_line1,
      headerLine2: rcpt.header_line2,
      headerLine3: rcpt.header_line3,
      footerLine1: rcpt.footer_line1,
      footerLine2: rcpt.footer_line2,
      showLogo: rcpt.show_logo === 1,
      paperWidth: rcpt.paper_width,
      fontSize: rcpt.font_size,
      printDuplicate: rcpt.print_duplicate === 1
    }
    printerSettings.value = {
      connectionType: rcpt.connection_type,
      printerName: rcpt.printer_name,
      ipAddress: rcpt.ip_address,
      port: rcpt.port,
      usbDevice: rcpt.usb_device,
      bluetoothDevice: rcpt.bluetooth_device,
      serialPort: rcpt.serial_port,
      baudRate: rcpt.baud_rate,
      isConnected: false,
      autoCut: rcpt.auto_cut === 1,
      openCashDrawer: rcpt.open_cash_drawer === 1,
      cashDrawerPin: rcpt.cash_drawer_pin
    }
  }

  const pay = paymentConfig.value
  if (pay) {
    paymentMethods.value = {
      cashEnabled: pay.cash_enabled === 1,
      cardEnabled: pay.card_enabled === 1,
      gcashEnabled: pay.gcash_enabled === 1,
      mayaEnabled: pay.maya_enabled === 1,
      grabPayEnabled: pay.grab_pay_enabled === 1,
      bankTransferEnabled: pay.bank_transfer_enabled === 1,
      checkEnabled: pay.check_enabled === 1,
      creditEnabled: pay.credit_enabled === 1
    }
  }

  const sys = systemConfig.value
  if (sys) {
    systemSettings.value = {
      offlineModeEnabled: sys.offline_mode_enabled === 1,
      autoSyncEnabled: sys.auto_sync_enabled === 1,
      syncInterval: sys.sync_interval,
      dataRetentionYears: sys.data_retention_years,
      lowStockThreshold: sys.low_stock_threshold,
      enableNotifications: sys.enable_notifications === 1,
      enableSoundAlerts: sys.enable_sound_alerts === 1
    }
    backupSettings.value = {
      ...backupSettings.value,
      autoBackupEnabled: sys.auto_backup_enabled === 1,
      backupFrequency: sys.backup_frequency,
      backupTime: parseBackupTime(sys.backup_time),
      cloudBackupEnabled: sys.cloud_backup_enabled === 1,
      localBackupEnabled: sys.local_backup_enabled === 1,
      localBackupPath: sys.local_backup_path,
      keepBackupDays: sys.keep_backup_days,
      encryptBackup: sys.encrypt_backup === 1
    }
    syncSettings.value = {
      ...syncSettings.value,
      syncStrategy: sys.sync_strategy,
      conflictResolution: sys.conflict_resolution,
      syncProducts: sys.sync_products === 1,
      syncOrders: sys.sync_orders === 1,
      syncCustomers: sys.sync_customers === 1,
      syncInventory: sys.sync_inventory === 1
    }
  }
}

function parseBackupTime(timeStr: string): Date {
  const [hours, minutes] = (timeStr || '02:00').split(':').map(Number)
  const d = new Date(2024, 0, 1, hours || 2, minutes || 0)
  return d
}

function formatBackupTime(date: Date | null): string {
  if (!date) return '02:00'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatDateForDB(date: Date | null): string {
  if (!date) return ''
  return toLocalDateStr(date)
}

// Per-tab save handlers
const saveBusinessSettings = async () => {
  try {
    await saveBusiness({
      business_name: businessInfo.value.businessName,
      trade_name: businessInfo.value.tradeName,
      tin: businessInfo.value.tin,
      branch_code: businessInfo.value.branchCode,
      address: businessInfo.value.address,
      city: businessInfo.value.city,
      province: businessInfo.value.province,
      zip_code: businessInfo.value.zipCode,
      phone: businessInfo.value.phone,
      email: businessInfo.value.email,
      website: businessInfo.value.website,
      logo_url: businessInfo.value.logoUrl,
      ptu_number: birCompliance.value.ptuNumber,
      ptu_valid_from: formatDateForDB(birCompliance.value.ptuValidFrom),
      ptu_valid_until: formatDateForDB(birCompliance.value.ptuValidUntil),
      machine_serial: birCompliance.value.machineSerial,
      min_number: birCompliance.value.minNumber,
      accreditation_number: birCompliance.value.accreditationNumber,
      date_accredited: formatDateForDB(birCompliance.value.dateAccredited),
      show_store_name: displaySettings.value.showStoreName ? 1 : 0,
      show_logo: displaySettings.value.showLogo ? 1 : 0,
      show_address: displaySettings.value.showAddress ? 1 : 0,
      show_tin: displaySettings.value.showTin ? 1 : 0,
      show_terminal: displaySettings.value.showTerminal ? 1 : 0,
      show_time: displaySettings.value.showTime ? 1 : 0,
      time_format: displaySettings.value.timeFormat,
      date_format: displaySettings.value.dateFormat,
      slideshow_interval: displaySettings.value.slideshowInterval
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Business settings saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save business settings.', life: 3000 })
  }
}

const saveTaxSettings = async () => {
  try {
    await saveTax({
      vat_rate: taxSettings.value.vatRate,
      default_tax_type: taxSettings.value.defaultTaxType,
      senior_citizen_discount: taxSettings.value.seniorCitizenDiscount,
      pwd_discount: taxSettings.value.pwdDiscount,
      show_vat_breakdown: taxSettings.value.showVatBreakdown,
      include_vat_in_price: taxSettings.value.includeVatInPrice
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Tax settings saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save tax settings.', life: 3000 })
  }
}

const saveReceiptSettings = async () => {
  try {
    await saveReceipt({
      header_line1: receiptSettings.value.headerLine1,
      header_line2: receiptSettings.value.headerLine2,
      header_line3: receiptSettings.value.headerLine3,
      footer_line1: receiptSettings.value.footerLine1,
      footer_line2: receiptSettings.value.footerLine2,
      show_logo: receiptSettings.value.showLogo,
      paper_width: receiptSettings.value.paperWidth,
      font_size: receiptSettings.value.fontSize,
      print_duplicate: receiptSettings.value.printDuplicate,
      printer_name: printerSettings.value.printerName,
      connection_type: printerSettings.value.connectionType,
      ip_address: printerSettings.value.ipAddress,
      port: printerSettings.value.port,
      usb_device: printerSettings.value.usbDevice,
      bluetooth_device: printerSettings.value.bluetoothDevice,
      serial_port: printerSettings.value.serialPort,
      baud_rate: printerSettings.value.baudRate,
      auto_cut: printerSettings.value.autoCut,
      open_cash_drawer: printerSettings.value.openCashDrawer,
      cash_drawer_pin: printerSettings.value.cashDrawerPin
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Receipt & printer settings saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save receipt settings.', life: 3000 })
  }
}

const savePaymentSettings = async () => {
  try {
    await savePayment({
      cash_enabled: paymentMethods.value.cashEnabled,
      card_enabled: paymentMethods.value.cardEnabled,
      gcash_enabled: paymentMethods.value.gcashEnabled,
      maya_enabled: paymentMethods.value.mayaEnabled,
      grab_pay_enabled: paymentMethods.value.grabPayEnabled,
      bank_transfer_enabled: paymentMethods.value.bankTransferEnabled,
      check_enabled: paymentMethods.value.checkEnabled,
      credit_enabled: paymentMethods.value.creditEnabled
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'Payment settings saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save payment settings.', life: 3000 })
  }
}

const saveSystemSettings = async () => {
  try {
    await saveSystem({
      offline_mode_enabled: systemSettings.value.offlineModeEnabled,
      auto_sync_enabled: systemSettings.value.autoSyncEnabled,
      sync_interval: systemSettings.value.syncInterval,
      data_retention_years: systemSettings.value.dataRetentionYears,
      low_stock_threshold: systemSettings.value.lowStockThreshold,
      enable_notifications: systemSettings.value.enableNotifications,
      enable_sound_alerts: systemSettings.value.enableSoundAlerts,
      auto_backup_enabled: backupSettings.value.autoBackupEnabled,
      backup_frequency: backupSettings.value.backupFrequency,
      backup_time: formatBackupTime(backupSettings.value.backupTime),
      cloud_backup_enabled: backupSettings.value.cloudBackupEnabled,
      local_backup_enabled: backupSettings.value.localBackupEnabled,
      local_backup_path: backupSettings.value.localBackupPath,
      keep_backup_days: backupSettings.value.keepBackupDays,
      encrypt_backup: backupSettings.value.encryptBackup,
      sync_strategy: syncSettings.value.syncStrategy,
      conflict_resolution: syncSettings.value.conflictResolution,
      sync_products: syncSettings.value.syncProducts,
      sync_orders: syncSettings.value.syncOrders,
      sync_customers: syncSettings.value.syncCustomers,
      sync_inventory: syncSettings.value.syncInventory
    })
    toast.add({ severity: 'success', summary: 'Saved', detail: 'System settings saved.', life: 3000 })
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save system settings.', life: 3000 })
  }
}

// =====================
// Backup & Restore (full database)
// =====================
const isBackingUp = ref(false)
const isRestoring = ref(false)
const restoreInputRef = ref<HTMLInputElement | null>(null)

// SQLite files start with the ASCII header "SQLite format 3\0"
const SQLITE_MAGIC = 'SQLite format 3\0'

async function exportBackup() {
  isBackingUp.value = true
  try {
    const data = await db.exportDatabase()
    if (!data || data.length === 0) {
      toast.add({ severity: 'error', summary: 'Backup Failed', detail: 'Could not read the database.', life: 4000 })
      return
    }

    // Build a timestamped filename using LOCAL time (not UTC)
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`
    const filename = `zoomin-pos-backup-${stamp}.db`

    const blob = new Blob([data], { type: 'application/x-sqlite3' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.add({ severity: 'success', summary: 'Backup Saved', detail: `Downloaded ${filename}`, life: 4000 })
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Backup Failed', detail: e?.message || 'Unexpected error.', life: 5000 })
  } finally {
    isBackingUp.value = false
  }
}

function triggerRestore() {
  restoreInputRef.value?.click()
}

function onRestoreFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset the input so selecting the same file again re-triggers change
  input.value = ''
  if (!file) return

  confirm.require({
    header: 'Restore Database',
    message:
      `This will REPLACE all current data with the contents of "${file.name}". ` +
      `Any data not included in this backup will be lost. This cannot be undone. Continue?`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Restore & Replace',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: () => restoreBackup(file)
  })
}

async function restoreBackup(file: File) {
  isRestoring.value = true
  try {
    const buffer = await file.arrayBuffer()
    const data = new Uint8Array(buffer)

    // Validate it's actually a SQLite database before importing
    const header = new TextDecoder('latin1').decode(data.slice(0, 16))
    if (header !== SQLITE_MAGIC) {
      toast.add({
        severity: 'error',
        summary: 'Invalid Backup File',
        detail: 'This file is not a valid Zoomin POS database backup.',
        life: 5000
      })
      return
    }

    await db.importDatabase(data)

    toast.add({
      severity: 'success',
      summary: 'Restore Complete',
      detail: 'Database restored. Reloading…',
      life: 2500
    })

    // Reload so every store/repository re-reads the restored database
    setTimeout(() => window.location.reload(), 1200)
  } catch (e: any) {
    toast.add({ severity: 'error', summary: 'Restore Failed', detail: e?.message || 'Unexpected error.', life: 5000 })
  } finally {
    isRestoring.value = false
  }
}

// Load all settings on mount
onMounted(async () => {
  try {
    await loadAllSettings()
    hydrateFromDB()
    await loadSlideshowImages()
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
})
</script>

<template>
  <ConfirmDialog />
  <div class="settings-page">
    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Settings</h1>
          <p class="text-muted">Configure system settings</p>
        </div>
      </div>
    </div>

    <div class="settings-content">
      <Tabs v-model:value="activeTab" class="settings-tabs">
        <TabList>
          <Tab value="business">
            <i class="pi pi-building"></i>
            <span>Business</span>
          </Tab>
          <Tab value="bir">
            <i class="pi pi-verified"></i>
            <span>BIR Compliance</span>
          </Tab>
          <Tab value="tax">
            <i class="pi pi-percentage"></i>
            <span>Tax</span>
          </Tab>
          <Tab value="receipt">
            <i class="pi pi-receipt"></i>
            <span>Receipt</span>
          </Tab>
          <Tab value="payment">
            <i class="pi pi-wallet"></i>
            <span>Payment</span>
          </Tab>
          <Tab value="loyalty" @click="loadLoyaltyConfig">
            <i class="pi pi-star"></i>
            <span>Loyalty</span>
          </Tab>
          <!-- EIS tab hidden - online feature -->
          <!-- <Tab value="eis" @click="loadEISData">
            <i class="pi pi-cloud-upload"></i>
            <span>EIS Compliance</span>
          </Tab> -->
          <Tab value="system">
            <i class="pi pi-cog"></i>
            <span>System</span>
          </Tab>
        </TabList>

        <TabPanels>
          <!-- Business Information -->
          <TabPanel value="business">
            <div class="settings-section">
              <div class="section-header">
                <h2>Business Information</h2>
                <p>Your registered business details for BIR compliance</p>
              </div>

              <!-- Store Logo -->
              <div class="logo-upload-section">
                <label class="form-label">Store Logo</label>
                <div class="logo-upload-area">
                  <div v-if="businessInfo.logoUrl" class="logo-preview">
                    <img :src="businessInfo.logoUrl" alt="Store logo" class="logo-preview-img" />
                    <div class="logo-actions">
                      <Button label="Change" icon="pi pi-image" size="small" severity="secondary" outlined @click="logoFileInput?.click()" />
                      <Button label="Remove" icon="pi pi-trash" size="small" severity="danger" outlined @click="removeLogo" />
                    </div>
                  </div>
                  <div v-else class="logo-placeholder" @click="logoFileInput?.click()">
                    <i class="pi pi-image" style="font-size: 2rem; color: var(--p-text-muted-color)"></i>
                    <span>Click to upload logo</span>
                    <small>PNG, JPG, or SVG (max 500KB)</small>
                  </div>
                  <input
                    ref="logoFileInput"
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    class="hidden"
                    @change="handleLogoUpload"
                  />
                </div>
              </div>

              <Divider />

              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Registered Business Name</label>
                  <InputText v-model="businessInfo.businessName" class="w-full" />
                  <small>As registered with SEC/DTI and BIR</small>
                </div>

                <div class="form-group">
                  <label>Trade Name / DBA</label>
                  <InputText v-model="businessInfo.tradeName" class="w-full" />
                </div>

                <div class="form-group">
                  <label>TIN (Tax Identification Number)</label>
                  <InputMask v-model="businessInfo.tin" mask="999-999-999-999" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Branch Code</label>
                  <InputText v-model="businessInfo.branchCode" class="w-full" />
                  <small>4-digit branch code (0000 for head office)</small>
                </div>

                <div class="form-group">
                  <label>Phone Number</label>
                  <InputText v-model="businessInfo.phone" v-numeric-only inputmode="numeric" class="w-full" />
                </div>

                <div class="form-group full-width">
                  <label>Business Address</label>
                  <Textarea v-model="businessInfo.address" rows="2" class="w-full" />
                </div>

                <div class="form-group">
                  <label>City</label>
                  <InputText v-model="businessInfo.city" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Province</label>
                  <InputText v-model="businessInfo.province" class="w-full" />
                </div>

                <div class="form-group">
                  <label>ZIP Code</label>
                  <InputText v-model="businessInfo.zipCode" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Email Address</label>
                  <InputText v-model="businessInfo.email" type="email" class="w-full" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Branch Management</h3>
              </div>

              <div class="summary-cards">
                <Card class="summary-card">
                  <template #content>
                    <div class="summary-item">
                      <span class="summary-label">Total Branches</span>
                      <span class="summary-value">{{ branchesSummary.totalBranches }}</span>
                    </div>
                  </template>
                </Card>
                <Card class="summary-card">
                  <template #content>
                    <div class="summary-item">
                      <span class="summary-label">Current Branch</span>
                      <span class="summary-value small">{{ branchesSummary.currentBranch }}</span>
                    </div>
                  </template>
                </Card>
                <Card class="summary-card">
                  <template #content>
                    <div class="summary-item">
                      <span class="summary-label">Multi-Branch</span>
                      <Tag :severity="branchesSummary.multiBranchEnabled ? 'success' : 'secondary'">
                        {{ branchesSummary.multiBranchEnabled ? 'Enabled' : 'Disabled' }}
                      </Tag>
                    </div>
                  </template>
                </Card>
              </div>

              <Divider />

              <div class="section-header">
                <h2>POS Display Settings</h2>
                <p>Control what appears on the POS idle screen</p>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show Store Name</label>
                    <small>Display business name on idle screen</small>
                  </div>
                  <ToggleSwitch v-model="displaySettings.showStoreName" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show Logo</label>
                    <small>Display store logo on idle screen</small>
                  </div>
                  <ToggleSwitch v-model="displaySettings.showLogo" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show Address</label>
                    <small>Display business address on idle screen</small>
                  </div>
                  <ToggleSwitch v-model="displaySettings.showAddress" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show TIN</label>
                    <small>Display TIN and accreditation badges</small>
                  </div>
                  <ToggleSwitch v-model="displaySettings.showTin" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show Terminal Number</label>
                    <small>Display terminal ID badge</small>
                  </div>
                  <ToggleSwitch v-model="displaySettings.showTerminal" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show Time &amp; Date</label>
                    <small>Display clock and date on idle screen</small>
                  </div>
                  <ToggleSwitch v-model="displaySettings.showTime" />
                </div>
              </div>

              <div class="form-grid mt-4">
                <div class="form-group">
                  <label>Time Format</label>
                  <Select
                    v-model="displaySettings.timeFormat"
                    :options="timeFormatOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    :disabled="!displaySettings.showTime"
                  />
                </div>

                <div class="form-group">
                  <label>Date Format</label>
                  <Select
                    v-model="displaySettings.dateFormat"
                    :options="dateFormatOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    :disabled="!displaySettings.showTime"
                  />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Slideshow Images</h3>
                <p>Upload images to cycle on the POS idle screen</p>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Slide Interval (seconds)</label>
                  <InputNumber v-model="displaySettings.slideshowInterval" :min="2" :max="60" suffix=" sec" class="w-full" />
                </div>
              </div>

              <div class="slideshow-upload-area mt-4">
                <Button
                  label="Upload Images"
                  icon="pi pi-upload"
                  outlined
                  :loading="slideshowUploading"
                  @click="slideshowFileInput?.click()"
                />
                <small class="ml-2" style="color: var(--p-text-muted-color)">PNG, JPG (max 2MB each)</small>
                <input
                  ref="slideshowFileInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  class="hidden"
                  @change="handleSlideshowUpload"
                />
              </div>

              <div v-if="slideshowImages.length > 0" class="slideshow-grid mt-4">
                <div
                  v-for="img in slideshowImages"
                  :key="img.id"
                  class="slideshow-thumb"
                >
                  <img :src="img.image_data" alt="Slideshow image" />
                  <button class="slideshow-thumb-remove" @click="removeSlideshowImage(img.id)">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>

              <div v-else class="slideshow-empty mt-4">
                <i class="pi pi-images" style="font-size: 1.5rem; color: var(--p-text-muted-color)"></i>
                <p style="margin: 0.5rem 0 0; color: var(--p-text-muted-color); font-size: 0.875rem;">No slideshow images. The POS idle screen will show the store logo instead.</p>
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveBusinessSettings" :loading="settingsLoading" />
              </div>
            </div>
          </TabPanel>

          <!-- BIR Compliance -->
          <TabPanel value="bir">
            <div class="settings-section">
              <Message severity="info" :closable="false" class="mb-4">
                <template #icon>
                  <i class="pi pi-info-circle"></i>
                </template>
                Ensure all BIR compliance information is accurate. This data is printed on official receipts.
              </Message>

              <div class="section-header">
                <h2>PTU Information</h2>
                <p>Permit to Use details from BIR accreditation</p>
              </div>

              <div class="form-grid">
                <div class="form-group full-width">
                  <label>PTU Number</label>
                  <InputText v-model="birCompliance.ptuNumber" class="w-full" />
                  <small>Format: FPmmyyyy-RDO-TIN-BRANCH</small>
                </div>

                <div class="form-group">
                  <label>PTU Valid From</label>
                  <DatePicker v-model="birCompliance.ptuValidFrom" dateFormat="yy-mm-dd" showIcon class="w-full" />
                </div>

                <div class="form-group">
                  <label>PTU Valid Until</label>
                  <DatePicker v-model="birCompliance.ptuValidUntil" dateFormat="yy-mm-dd" showIcon class="w-full" />
                </div>

                <div class="form-group">
                  <label>Machine Identification Number (MIN)</label>
                  <InputText v-model="birCompliance.minNumber" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Machine Serial Number</label>
                  <InputText v-model="birCompliance.machineSerial" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Accreditation Number</label>
                  <InputText v-model="birCompliance.accreditationNumber" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Date Accredited</label>
                  <DatePicker v-model="birCompliance.dateAccredited" dateFormat="yy-mm-dd" showIcon class="w-full" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h2>OR/SI Series</h2>
                <p>Official Receipt and Sales Invoice series configuration</p>
              </div>

              <DataTable :value="orSeries" class="mb-4">
                <Column field="prefix" header="Prefix" />
                <Column field="startNumber" header="Start" />
                <Column field="endNumber" header="End" />
                <Column field="currentNumber" header="Current" />
                <Column field="status" header="Status">
                  <template #body="{ data }">
                    <Tag :severity="data.status === 'active' ? 'success' : 'secondary'">
                      {{ data.status }}
                    </Tag>
                  </template>
                </Column>
              </DataTable>

              <div class="form-grid">
                <div class="form-group">
                  <label>Series Prefix</label>
                  <InputText v-model="newOrSeries.prefix" placeholder="e.g., OR, SI" class="w-full" />
                </div>
                <div class="form-group">
                  <label>Start Number</label>
                  <InputNumber v-model="newOrSeries.startNumber" :min="1" class="w-full" />
                </div>
                <div class="form-group">
                  <label>End Number</label>
                  <InputNumber v-model="newOrSeries.endNumber" :min="1" class="w-full" />
                </div>
                <div class="form-group form-actions">
                  <Button label="Add Series" icon="pi pi-plus" outlined />
                </div>
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveBusinessSettings" :loading="settingsLoading" />
              </div>
            </div>
          </TabPanel>

          <!-- Tax Settings -->
          <TabPanel value="tax">
            <div class="settings-section">
              <div class="section-header">
                <h2>VAT Configuration</h2>
                <p>Configure Value Added Tax settings</p>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>VAT Rate (%)</label>
                  <InputNumber v-model="taxSettings.vatRate" suffix="%" :min="0" :max="100" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Default Tax Type</label>
                  <Select
                    v-model="taxSettings.defaultTaxType"
                    :options="taxTypes"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                </div>

                <div class="form-group">
                  <label>Senior Citizen Discount (%)</label>
                  <InputNumber v-model="taxSettings.seniorCitizenDiscount" suffix="%" :min="0" :max="100" class="w-full" />
                  <small>Standard SC discount rate (VAT-exempt + 20% discount)</small>
                </div>

                <div class="form-group">
                  <label>PWD Discount (%)</label>
                  <InputNumber v-model="taxSettings.pwdDiscount" suffix="%" :min="0" :max="100" class="w-full" />
                  <small>Standard PWD discount rate</small>
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Display Options</h3>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show VAT Breakdown on Receipt</label>
                    <small>Display VATable sales, VAT amount, and VAT-exempt sales separately</small>
                  </div>
                  <ToggleSwitch v-model="taxSettings.showVatBreakdown" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>VAT Inclusive Pricing</label>
                    <small>Product prices already include VAT</small>
                  </div>
                  <ToggleSwitch v-model="taxSettings.includeVatInPrice" />
                </div>
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveTaxSettings" :loading="settingsLoading" />
              </div>
            </div>
          </TabPanel>

          <!-- Receipt Settings -->
          <TabPanel value="receipt">
            <div class="settings-section">
              <div class="section-header">
                <h2>Receipt Header</h2>
                <p>Customize the header section of your receipts</p>
              </div>

              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Header Line 1 (Business Name)</label>
                  <InputText v-model="receiptSettings.headerLine1" class="w-full" />
                </div>

                <div class="form-group full-width">
                  <label>Header Line 2 (Address)</label>
                  <InputText v-model="receiptSettings.headerLine2" class="w-full" />
                </div>

                <div class="form-group full-width">
                  <label>Header Line 3 (TIN/Contact)</label>
                  <InputText v-model="receiptSettings.headerLine3" class="w-full" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Receipt Footer</h3>
              </div>

              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Footer Line 1</label>
                  <InputText v-model="receiptSettings.footerLine1" class="w-full" />
                </div>

                <div class="form-group full-width">
                  <label>Footer Line 2</label>
                  <InputText v-model="receiptSettings.footerLine2" class="w-full" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Print Settings</h3>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Paper Width</label>
                  <Select
                    v-model="receiptSettings.paperWidth"
                    :options="paperWidthOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                </div>

                <div class="form-group">
                  <label>Font Size</label>
                  <Select
                    v-model="receiptSettings.fontSize"
                    :options="fontSizeOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                </div>
              </div>

              <div class="section-header mt-4">
                <h3>Print Options</h3>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Show Logo on Receipt</label>
                    <small>Print business logo at the top of receipt</small>
                  </div>
                  <ToggleSwitch v-model="receiptSettings.showLogo" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Print Duplicate Copy</label>
                    <small>Automatically print a duplicate receipt</small>
                  </div>
                  <ToggleSwitch v-model="receiptSettings.printDuplicate" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h2>Printer Connection</h2>
                <p>Configure your receipt printer connection</p>
              </div>

              <div class="printer-status-card" :class="{ connected: printerSettings.isConnected }">
                <div class="printer-status-icon">
                  <i :class="printerSettings.isConnected ? 'pi pi-check-circle' : 'pi pi-times-circle'"></i>
                </div>
                <div class="printer-status-info">
                  <h4>{{ printerSettings.printerName || 'No Printer' }}</h4>
                  <span>{{ printerSettings.isConnected ? 'Connected' : 'Disconnected' }}</span>
                </div>
                <Button
                  :label="printerSettings.isConnected ? 'Reconnect' : 'Connect'"
                  :icon="printerSettings.isConnected ? 'pi pi-refresh' : 'pi pi-link'"
                  :severity="printerSettings.isConnected ? 'secondary' : 'primary'"
                  size="small"
                  @click="testPrinterConnection"
                />
              </div>

              <div class="form-grid mt-4">
                <div class="form-group">
                  <label>Printer Name</label>
                  <InputText v-model="printerSettings.printerName" placeholder="e.g., EPSON TM-T82" class="w-full" />
                </div>

                <div class="form-group">
                  <label>Connection Type</label>
                  <Select
                    v-model="printerSettings.connectionType"
                    :options="connectionTypes"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  >
                    <template #option="{ option }">
                      <div class="flex items-center gap-2">
                        <i :class="option.icon"></i>
                        <span>{{ option.label }}</span>
                      </div>
                    </template>
                  </Select>
                </div>

                <!-- Network Settings -->
                <template v-if="printerSettings.connectionType === 'network'">
                  <div class="form-group">
                    <label>IP Address</label>
                    <InputText v-model="printerSettings.ipAddress" placeholder="192.168.1.100" class="w-full" />
                  </div>

                  <div class="form-group">
                    <label>Port</label>
                    <InputNumber v-model="printerSettings.port" :min="1" :max="65535" class="w-full" />
                  </div>
                </template>

                <!-- Serial Settings -->
                <template v-if="printerSettings.connectionType === 'serial'">
                  <div class="form-group">
                    <label>Serial Port</label>
                    <Select
                      v-model="printerSettings.serialPort"
                      :options="serialPortOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                  </div>

                  <div class="form-group">
                    <label>Baud Rate</label>
                    <Select
                      v-model="printerSettings.baudRate"
                      :options="baudRateOptions"
                      optionLabel="label"
                      optionValue="value"
                      class="w-full"
                    />
                  </div>
                </template>

                <!-- Bluetooth Settings -->
                <template v-if="printerSettings.connectionType === 'bluetooth'">
                  <div class="form-group full-width">
                    <!-- Platform notice -->
                    <Message v-if="!printerIsNative" severity="warn" :closable="false" class="mb-3">
                      Bluetooth printing is available on the mobile app only. Browser printing will be used as fallback.
                    </Message>

                    <template v-if="printerIsNative">
                      <!-- Bluetooth status -->
                      <Message v-if="!isBluetoothEnabled" severity="warn" :closable="false" class="mb-3">
                        Bluetooth is disabled. Please enable Bluetooth on your device.
                      </Message>

                      <!-- Connected printer -->
                      <div v-if="btConnected && btConnectedDevice" class="bt-connected-card mb-3">
                        <div class="flex items-center gap-3">
                          <i class="pi pi-check-circle" style="color: var(--p-green-500); font-size: 1.5rem;"></i>
                          <div class="flex-1">
                            <div class="font-semibold">{{ btConnectedDevice.name }}</div>
                            <small class="text-surface-500">{{ btConnectedDevice.address }}</small>
                          </div>
                          <Button label="Disconnect" icon="pi pi-times" severity="danger" size="small" outlined @click="handleBluetoothDisconnect" />
                        </div>
                      </div>

                      <!-- Paired devices -->
                      <div v-if="pairedDevices.length > 0" class="mb-3">
                        <label class="mb-2 block font-semibold">Paired Devices</label>
                        <div class="bt-device-list">
                          <div v-for="device in pairedDevices" :key="device.address" class="bt-device-item">
                            <div class="flex items-center gap-2 flex-1">
                              <i class="pi pi-bluetooth"></i>
                              <div>
                                <div>{{ device.name }}</div>
                                <small class="text-surface-500">{{ device.address }}</small>
                              </div>
                            </div>
                            <Button
                              :label="btConnectedDevice?.address === device.address ? 'Connected' : 'Connect'"
                              size="small"
                              :severity="btConnectedDevice?.address === device.address ? 'success' : 'primary'"
                              :outlined="btConnectedDevice?.address !== device.address"
                              :disabled="btConnecting || btConnectedDevice?.address === device.address"
                              :loading="btConnecting"
                              @click="handleBluetoothConnect(device)"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Discovered devices -->
                      <div v-if="discoveredDevices.length > 0" class="mb-3">
                        <label class="mb-2 block font-semibold">Discovered Devices</label>
                        <div class="bt-device-list">
                          <div v-for="device in discoveredDevices" :key="device.address" class="bt-device-item">
                            <div class="flex items-center gap-2 flex-1">
                              <i class="pi pi-bluetooth"></i>
                              <div>
                                <div>{{ device.name }}</div>
                                <small class="text-surface-500">{{ device.address }}</small>
                              </div>
                            </div>
                            <Button label="Connect" size="small" outlined :disabled="btConnecting" :loading="btConnecting" @click="handleBluetoothConnect(device)" />
                          </div>
                        </div>
                      </div>

                      <!-- Error display -->
                      <Message v-if="btError" severity="error" :closable="false" class="mb-3">{{ btError }}</Message>

                      <!-- Scan button -->
                      <Button label="Scan for Devices" icon="pi pi-search" outlined :loading="btScanning" @click="handleBluetoothScan" class="w-full" />
                      <small class="mt-1 block">Scans for paired and nearby Bluetooth printers</small>
                    </template>
                  </div>
                </template>

                <!-- USB Settings -->
                <template v-if="printerSettings.connectionType === 'usb'">
                  <div class="form-group full-width">
                    <label>USB Device</label>
                    <div class="flex gap-2">
                      <InputText v-model="printerSettings.usbDevice" placeholder="Select USB printer" class="flex-1" readonly />
                      <Button icon="pi pi-refresh" label="Detect" outlined />
                    </div>
                    <small>Click Detect to find connected USB printers</small>
                  </div>
                </template>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Printer Options</h3>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Auto-Cut Paper</label>
                    <small>Automatically cut receipt after printing</small>
                  </div>
                  <ToggleSwitch v-model="printerSettings.autoCut" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Open Cash Drawer</label>
                    <small>Open cash drawer after printing receipt</small>
                  </div>
                  <ToggleSwitch v-model="printerSettings.openCashDrawer" />
                </div>
              </div>

              <div class="form-grid mt-4" v-if="printerSettings.openCashDrawer">
                <div class="form-group">
                  <label>Cash Drawer Pin</label>
                  <Select
                    v-model="printerSettings.cashDrawerPin"
                    :options="cashDrawerPinOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                  <small>Select the pin used to trigger cash drawer</small>
                </div>
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveReceiptSettings" :loading="settingsLoading" />
                <Button label="Test Print" icon="pi pi-print" outlined @click="printTestReceipt" />
                <Button label="Open Drawer" icon="pi pi-inbox" outlined @click="openCashDrawerTest" :disabled="!printerSettings.openCashDrawer" />
              </div>
            </div>
          </TabPanel>

          <!-- Payment Methods -->
          <TabPanel value="payment">
            <div class="settings-section">
              <div class="section-header">
                <h2>Payment Methods</h2>
                <p>Enable or disable payment methods for your POS</p>
              </div>

              <div class="payment-methods-grid">
                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-money-bill payment-icon cash"></i>
                        <div>
                          <h4>Cash</h4>
                          <small>Accept cash payments</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.cashEnabled" />
                    </div>
                  </template>
                </Card>

                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-credit-card payment-icon card"></i>
                        <div>
                          <h4>Credit/Debit Card</h4>
                          <small>Accept card payments via terminal</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.cardEnabled" />
                    </div>
                  </template>
                </Card>

                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-mobile payment-icon gcash"></i>
                        <div>
                          <h4>GCash</h4>
                          <small>Accept GCash e-wallet payments</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.gcashEnabled" />
                    </div>
                  </template>
                </Card>

                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-mobile payment-icon maya"></i>
                        <div>
                          <h4>Maya</h4>
                          <small>Accept Maya e-wallet payments</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.mayaEnabled" />
                    </div>
                  </template>
                </Card>

                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-car payment-icon grab"></i>
                        <div>
                          <h4>GrabPay</h4>
                          <small>Accept GrabPay payments</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.grabPayEnabled" />
                    </div>
                  </template>
                </Card>

                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-building payment-icon bank"></i>
                        <div>
                          <h4>Bank Transfer</h4>
                          <small>Accept direct bank transfers</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.bankTransferEnabled" />
                    </div>
                  </template>
                </Card>

                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-file payment-icon check"></i>
                        <div>
                          <h4>Check</h4>
                          <small>Accept check payments</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.checkEnabled" />
                    </div>
                  </template>
                </Card>
                <Card class="payment-card">
                  <template #content>
                    <div class="payment-item">
                      <div class="payment-info">
                        <i class="pi pi-wallet payment-icon credit"></i>
                        <div>
                          <h4>Credit (Utang)</h4>
                          <small>Allow charge-to-account for customers with credit limit</small>
                        </div>
                      </div>
                      <ToggleSwitch v-model="paymentMethods.creditEnabled" />
                    </div>
                  </template>
                </Card>
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="savePaymentSettings" :loading="settingsLoading" />
              </div>
            </div>
          </TabPanel>

          <!-- Loyalty Program -->
          <TabPanel value="loyalty">
            <div class="settings-section">
              <div class="section-header">
                <h2>Loyalty Program</h2>
                <p>Configure points earning, redemption, and expiration rules</p>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Enable Loyalty Program</label>
                    <small>Allow customers to earn and redeem loyalty points</small>
                  </div>
                  <ToggleSwitch v-model="loyaltySettings.is_active" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Points Earning</h3>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Earn Rate (points per PHP 1)</label>
                  <InputNumber
                    v-model="loyaltySettings.earn_rate"
                    :minFractionDigits="2"
                    :maxFractionDigits="4"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    class="w-full"
                    :disabled="!loyaltySettings.is_active"
                  />
                  <small>e.g., 0.01 means 1 point per PHP 100 spent</small>
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Points Redemption</h3>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Redeem Rate (PHP per point)</label>
                  <InputNumber
                    v-model="loyaltySettings.redeem_rate"
                    :minFractionDigits="2"
                    :maxFractionDigits="4"
                    :min="0"
                    :max="10"
                    :step="0.01"
                    class="w-full"
                    :disabled="!loyaltySettings.is_active"
                  />
                  <small>e.g., 0.10 means 10 points = PHP 1 discount</small>
                </div>

                <div class="form-group">
                  <label>Minimum Points to Redeem</label>
                  <InputNumber
                    v-model="loyaltySettings.min_redemption"
                    :min="1"
                    :max="10000"
                    class="w-full"
                    :disabled="!loyaltySettings.is_active"
                  />
                  <small>Minimum points balance required before redemption</small>
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Points Expiry</h3>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Expiry Period (days)</label>
                  <InputNumber
                    v-model="loyaltySettings.expiry_days"
                    suffix=" days"
                    :min="30"
                    :max="3650"
                    class="w-full"
                    :disabled="!loyaltySettings.is_active"
                  />
                  <small>Points expire after this many days of inactivity</small>
                </div>
              </div>

              <div class="action-buttons">
                <Button label="Save Loyalty Settings" icon="pi pi-save" @click="saveLoyaltyConfig" :loading="loyaltyLoading" />
              </div>
            </div>
          </TabPanel>

          <!-- System Settings -->
          <!-- EIS tab panel hidden - online feature -->
          <!-- <TabPanel value="eis">
            <div class="settings-section">
              <div class="section-header">
                <h2>EIS Electronic OR Submission</h2>
                <p>Configure BIR Electronic Invoicing System integration for automatic receipt submission</p>
              </div>

              <EISConfigForm
                :config="eisConfig"
                :is-testing="eisTesting"
                @save="handleEISSave"
                @test="handleEISTest"
              />
            </div>
          </TabPanel> -->

          <TabPanel value="system">
            <div class="settings-section">
              <!-- Offline Mode & Sync settings hidden - online feature -->
              <!-- <div class="section-header">
                <h2>Offline Mode</h2>
                <p>Configure offline operation and data synchronization</p>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Enable Offline Mode</label>
                    <small>Allow POS to operate without internet connection</small>
                  </div>
                  <ToggleSwitch v-model="systemSettings.offlineModeEnabled" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Auto-Sync When Online</label>
                    <small>Automatically sync data when connection is restored</small>
                  </div>
                  <ToggleSwitch v-model="systemSettings.autoSyncEnabled" />
                </div>
              </div>

              <div class="form-grid mt-4">
                <div class="form-group">
                  <label>Sync Interval</label>
                  <Select
                    v-model="systemSettings.syncInterval"
                    :options="syncIntervalOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                    :disabled="!systemSettings.autoSyncEnabled"
                  />
                </div>
              </div>

              <Divider /> -->

              <div class="section-header">
                <h3>Data Management</h3>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Data Retention Period</label>
                  <InputNumber v-model="systemSettings.dataRetentionYears" suffix=" years" :min="5" :max="20" class="w-full" />
                  <small>BIR requires minimum 10 years retention</small>
                </div>

                <div class="form-group">
                  <label>Low Stock Alert Threshold</label>
                  <InputNumber v-model="systemSettings.lowStockThreshold" suffix=" units" :min="1" class="w-full" />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Backup &amp; Restore</h3>
                <p>Save a full copy of all your data to a file, or restore from a previous backup.</p>
              </div>

              <Message severity="info" :closable="false" class="mb-3">
                Back up regularly and before app updates. A backup is a single
                <strong>.db</strong> file containing your products, sales, customers, and settings —
                keep it somewhere safe.
              </Message>

              <div class="backup-actions">
                <div class="backup-card">
                  <div class="backup-card-info">
                    <i class="pi pi-download backup-card-icon"></i>
                    <div>
                      <label>Download Backup</label>
                      <small>Export the entire database to a file you can keep.</small>
                    </div>
                  </div>
                  <Button
                    label="Download Backup"
                    icon="pi pi-download"
                    :loading="isBackingUp"
                    @click="exportBackup"
                  />
                </div>

                <div class="backup-card">
                  <div class="backup-card-info">
                    <i class="pi pi-upload backup-card-icon"></i>
                    <div>
                      <label>Restore from Backup</label>
                      <small class="text-danger">Replaces ALL current data with the backup file. Cannot be undone.</small>
                    </div>
                  </div>
                  <Button
                    label="Restore…"
                    icon="pi pi-upload"
                    severity="secondary"
                    outlined
                    :loading="isRestoring"
                    @click="triggerRestore"
                  />
                  <input
                    ref="restoreInputRef"
                    type="file"
                    accept=".db,.sqlite,.sqlite3,application/x-sqlite3"
                    class="hidden"
                    @change="onRestoreFileSelected"
                  />
                </div>
              </div>

              <Divider />

              <div class="section-header">
                <h3>Notifications</h3>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Push Notifications</label>
                    <small>Receive notifications for important events</small>
                  </div>
                  <ToggleSwitch v-model="systemSettings.enableNotifications" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Sound Alerts</label>
                    <small>Play sound for new orders and alerts</small>
                  </div>
                  <ToggleSwitch v-model="systemSettings.enableSoundAlerts" />
                </div>
              </div>

              <Divider />

              <!-- Sync Strategy section hidden - online feature -->
              <!-- <div class="section-header">
                <h2>Sync Strategy</h2>
                <p>Configure how data synchronizes between devices and server</p>
              </div>

              <div class="sync-status-grid">
                <div class="sync-status-item">
                  <span class="label">Sync Status</span>
                  <span class="value" :class="syncSettings.syncStatus">
                    {{ syncSettings.syncStatus === 'synced' ? 'All Synced' : syncSettings.syncStatus === 'pending' ? 'Pending' : 'Error' }}
                  </span>
                </div>
                <div class="sync-status-item">
                  <span class="label">Last Sync</span>
                  <span class="value">{{ syncSettings.lastSync }}</span>
                </div>
                <div class="sync-status-item">
                  <span class="label">Pending Changes</span>
                  <span class="value" :class="{ warning: syncSettings.pendingChanges > 0 }">{{ syncSettings.pendingChanges }}</span>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label>Sync Strategy</label>
                  <Select
                    v-model="syncSettings.syncStrategy"
                    :options="syncStrategyOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  >
                    <template #option="{ option }">
                      <div>
                        <div class="font-medium">{{ option.label }}</div>
                        <small class="text-muted">{{ option.description }}</small>
                      </div>
                    </template>
                  </Select>
                </div>

                <div class="form-group">
                  <label>Conflict Resolution</label>
                  <Select
                    v-model="syncSettings.conflictResolution"
                    :options="conflictResolutionOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  >
                    <template #option="{ option }">
                      <div>
                        <div class="font-medium">{{ option.label }}</div>
                        <small class="text-muted">{{ option.description }}</small>
                      </div>
                    </template>
                  </Select>
                </div>
              </div>

              <div class="section-header mt-4">
                <h4>Data to Sync</h4>
              </div>

              <div class="toggle-grid">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Products & Categories</label>
                    <small>Sync product catalog and categories</small>
                  </div>
                  <ToggleSwitch v-model="syncSettings.syncProducts" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Orders & Transactions</label>
                    <small>Sync sales orders and transactions</small>
                  </div>
                  <ToggleSwitch v-model="syncSettings.syncOrders" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Customers</label>
                    <small>Sync customer profiles and history</small>
                  </div>
                  <ToggleSwitch v-model="syncSettings.syncCustomers" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Inventory</label>
                    <small>Sync stock levels and movements</small>
                  </div>
                  <ToggleSwitch v-model="syncSettings.syncInventory" />
                </div>
              </div>

              <div class="action-buttons">
                <Button label="Sync Now" icon="pi pi-sync" @click="triggerSync" />
              </div>

              <Divider /> -->

              <div class="section-header">
                <h2>Backup Settings</h2>
                <p>Configure automatic and manual data backups</p>
              </div>

              <div class="backup-cards">
                <div class="backup-card">
                  <div class="backup-icon cloud">
                    <i class="pi pi-cloud"></i>
                  </div>
                  <div class="backup-info">
                    <h4>Cloud Backup</h4>
                    <small>Last backup: {{ backupSettings.lastBackup }} ({{ backupSettings.lastBackupSize }})</small>
                  </div>
                  <div class="backup-actions">
                    <ToggleSwitch v-model="backupSettings.cloudBackupEnabled" />
                  </div>
                </div>

                <div class="backup-card">
                  <div class="backup-icon local">
                    <i class="pi pi-server"></i>
                  </div>
                  <div class="backup-info">
                    <h4>Local Backup</h4>
                    <small>Path: {{ backupSettings.localBackupPath }}</small>
                  </div>
                  <div class="backup-actions">
                    <ToggleSwitch v-model="backupSettings.localBackupEnabled" />
                  </div>
                </div>
              </div>

              <div class="toggle-grid mt-4">
                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Automatic Backup</label>
                    <small>Enable scheduled automatic backups</small>
                  </div>
                  <ToggleSwitch v-model="backupSettings.autoBackupEnabled" />
                </div>

                <div class="toggle-item">
                  <div class="toggle-info">
                    <label>Encrypt Backups</label>
                    <small>Encrypt backup files for security</small>
                  </div>
                  <ToggleSwitch v-model="backupSettings.encryptBackup" />
                </div>
              </div>

              <div class="form-grid mt-4" v-if="backupSettings.autoBackupEnabled">
                <div class="form-group">
                  <label>Backup Frequency</label>
                  <Select
                    v-model="backupSettings.backupFrequency"
                    :options="backupFrequencyOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-full"
                  />
                </div>

                <div class="form-group">
                  <label>Backup Time</label>
                  <DatePicker v-model="backupSettings.backupTime" timeOnly showIcon icon="pi pi-clock" class="w-full" />
                  <small>Recommended during off-peak hours</small>
                </div>

                <div class="form-group">
                  <label>Keep Backups For</label>
                  <InputNumber v-model="backupSettings.keepBackupDays" suffix=" days" :min="7" :max="365" class="w-full" />
                </div>

                <div class="form-group" v-if="backupSettings.localBackupEnabled">
                  <label>Local Backup Path</label>
                  <div class="flex gap-2">
                    <InputText v-model="backupSettings.localBackupPath" class="flex-1" />
                    <Button icon="pi pi-folder" outlined />
                  </div>
                </div>
              </div>

              <div class="action-buttons">
                <Button label="Backup Now" icon="pi pi-download" :loading="isBackingUp" :disabled="isRestoring" @click="triggerBackup" />
                <Button label="Restore Backup" icon="pi pi-upload" outlined severity="danger" :loading="isRestoring" :disabled="isBackingUp" @click="restoreBackup" />
              </div>

              <Divider />

              <div class="section-header">
                <h3>Users & Roles</h3>
              </div>

              <div class="summary-cards">
                <Card class="summary-card">
                  <template #content>
                    <div class="summary-item">
                      <span class="summary-label">Total Users</span>
                      <span class="summary-value">{{ usersSummary.totalUsers }}</span>
                    </div>
                  </template>
                </Card>
                <Card class="summary-card">
                  <template #content>
                    <div class="summary-item">
                      <span class="summary-label">Active Users</span>
                      <span class="summary-value">{{ usersSummary.activeUsers }}</span>
                    </div>
                  </template>
                </Card>
                <Card class="summary-card">
                  <template #content>
                    <div class="summary-item">
                      <span class="summary-label">Roles</span>
                      <div class="roles-list">
                        <Tag v-for="role in usersSummary.roles" :key="role" severity="secondary" class="mr-1">
                          {{ role }}
                        </Tag>
                      </div>
                    </div>
                  </template>
                </Card>
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveSystemSettings" :loading="settingsLoading" />
                <Button label="Manage Users" icon="pi pi-users" outlined />
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
.logo-upload-section {
  margin-bottom: 0.5rem;
}

.logo-upload-section .form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--p-text-color);
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.logo-preview-img {
  width: 100px;
  height: 100px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--app-surface-200);
  background: var(--app-surface-50);
  padding: 0.5rem;
}

.logo-actions {
  display: flex;
  gap: 0.5rem;
}

.logo-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 200px;
  height: 120px;
  border: 2px dashed var(--app-surface-300);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  color: var(--p-text-muted-color);
}

.logo-placeholder:hover {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50);
}

.logo-placeholder small {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.hidden {
  display: none;
}

.text-danger {
  color: var(--p-red-500);
}

.backup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.backup-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--app-surface-200);
  border-radius: 0.75rem;
  background: var(--app-surface-0);
}

.backup-card-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.backup-card-info label {
  display: block;
  font-weight: 600;
  color: var(--p-text-color);
  margin-bottom: 0.125rem;
}

.backup-card-info small {
  color: var(--p-text-muted-color);
}

.backup-card-icon {
  font-size: 1.25rem;
  color: var(--p-primary-color);
  margin-top: 0.125rem;
}

@media (max-width: 640px) {
  .backup-actions {
    grid-template-columns: 1fr;
  }
}

.settings-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.settings-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.settings-tabs {
  height: 100%;
}

.settings-tabs :deep(.p-tabpanels) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.settings-section {
  background: var(--app-surface-0);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--app-surface-200);
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--p-text-color);
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: var(--p-text-color);
}

.section-header p {
  margin: 0;
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.form-group small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.form-group.form-actions {
  justify-content: flex-end;
}

.toggle-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toggle-info label {
  font-weight: 500;
  color: var(--p-text-color);
}

.toggle-info small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  background: var(--app-surface-50);
}

.summary-card :deep(.p-card-body) {
  padding: 1rem;
}

.summary-card :deep(.p-card-content) {
  padding: 0;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.summary-value.small {
  font-size: 0.875rem;
}

.roles-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.payment-methods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.payment-card {
  background: var(--app-surface-50);
}

.payment-card :deep(.p-card-body) {
  padding: 1rem;
}

.payment-card :deep(.p-card-content) {
  padding: 0;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.payment-icon {
  font-size: 1.5rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.payment-icon.cash {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.payment-icon.card {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.payment-icon.gcash {
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
}

.payment-icon.maya {
  background: rgba(0, 172, 78, 0.1);
  color: #00ac4e;
}

.payment-icon.grab {
  background: rgba(0, 179, 32, 0.1);
  color: #00b320;
}

.payment-icon.bank {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.payment-info h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.payment-info small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--app-surface-200);
}

.w-full {
  width: 100%;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}

.mr-1 {
  margin-right: 0.25rem;
}

.flex {
  display: flex;
}

.flex-1 {
  flex: 1;
}

.gap-2 {
  gap: 0.5rem;
}

.items-center {
  align-items: center;
}

/* Printer Status Card */
.printer-status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  border: 1px solid var(--app-surface-200);
}

.printer-status-card.connected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.printer-status-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-surface-200);
  color: var(--p-text-muted-color);
  font-size: 1.5rem;
}

.printer-status-card.connected .printer-status-icon {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.printer-status-info {
  flex: 1;
}

.printer-status-info h4 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.printer-status-info span {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.printer-status-card.connected .printer-status-info span {
  color: #10b981;
}

/* Backup Card */
.backup-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  border: 1px solid var(--app-surface-200);
}

.backup-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.backup-icon.cloud {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.backup-icon.local {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.backup-info {
  flex: 1;
}

.backup-info h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.backup-info small {
  color: var(--p-text-muted-color);
  font-size: 0.75rem;
}

.backup-actions {
  display: flex;
  gap: 0.5rem;
}

/* Sync Status */
.sync-status-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.sync-status-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  border: 1px solid var(--app-surface-200);
}

.sync-status-item .label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sync-status-item .value {
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.sync-status-item .value.success {
  color: #10b981;
}

.sync-status-item .value.warning {
  color: #f59e0b;
}

.sync-status-item .value.error {
  color: #ef4444;
}

.sync-status-item .value.synced {
  color: #10b981;
}

.backup-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.font-medium {
  font-weight: 500;
}

.text-muted {
  color: var(--p-text-muted-color);
}

.slideshow-upload-area {
  display: flex;
  align-items: center;
}

.slideshow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.slideshow-thumb {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--app-surface-200);
  aspect-ratio: 16/9;
}

.slideshow-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slideshow-thumb-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  transition: background 0.15s;
}

.slideshow-thumb-remove:hover {
  background: rgba(239, 68, 68, 0.9);
}

.slideshow-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  background: var(--app-surface-50);
  border-radius: 8px;
  border: 2px dashed var(--app-surface-200);
  text-align: center;
}

.ml-2 {
  margin-left: 0.5rem;
}

@media (max-width: 1024px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .payment-methods-grid {
    grid-template-columns: 1fr;
  }

  .sync-status-grid {
    grid-template-columns: 1fr;
  }
}

/* Bluetooth device list */
.bt-connected-card {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid var(--p-green-200);
  background: var(--p-green-50);
}

.bt-device-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bt-device-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--app-surface-200);
  background: var(--app-surface-0);
}
</style>
