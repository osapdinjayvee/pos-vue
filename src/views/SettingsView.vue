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
import EISConfigForm from '@/components/eis/EISConfigForm.vue'
import { useEIS } from '@/composables/useEIS'
import { testConnection } from '@/services/eisConnectionTestService'
import type { EISConfig } from '@/types/eis'

const toast = useToast()
const activeTab = ref('business')

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

// Business Information
const businessInfo = ref({
  businessName: 'Sample Business Corp.',
  tradeName: 'Sample Store',
  tin: '123-456-789-000',
  branchCode: '0001',
  address: '123 Main Street, Makati City, Metro Manila',
  city: 'Makati City',
  province: 'Metro Manila',
  zipCode: '1200',
  phone: '+63 2 8888 8888',
  email: 'info@samplebusiness.com',
  website: 'www.samplebusiness.com'
})

// BIR Compliance
const birCompliance = ref({
  ptuNumber: 'FP012024-123-456789-00001',
  ptuValidFrom: new Date('2024-01-15'),
  ptuValidUntil: new Date('2029-01-14'),
  machineSerial: 'POS-2024-001',
  minNumber: 'MIN-123456789',
  accreditationNumber: 'ACC-2024-12345',
  dateAccredited: new Date('2024-01-01')
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
  headerLine1: 'Sample Business Corp.',
  headerLine2: '123 Main Street, Makati City',
  headerLine3: 'TIN: 123-456-789-000',
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
  printerName: 'EPSON TM-T82',
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

const testPrinterConnection = () => {
  // TODO: Implement printer connection test
  console.log('Testing printer connection...')
  printerSettings.value.isConnected = true
}

const printTestReceipt = () => {
  // TODO: Implement test receipt printing
  console.log('Printing test receipt...')
}

const openCashDrawerTest = () => {
  // TODO: Implement cash drawer open
  console.log('Opening cash drawer...')
}

// Payment Methods
const paymentMethods = ref({
  cashEnabled: true,
  cardEnabled: true,
  gcashEnabled: true,
  mayaEnabled: true,
  grabPayEnabled: false,
  bankTransferEnabled: false,
  checkEnabled: false
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
  localBackupPath: 'C:\\POS_Backups',
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

const triggerBackup = () => {
  console.log('Triggering manual backup...')
}

const triggerSync = () => {
  console.log('Triggering manual sync...')
}

const restoreBackup = () => {
  console.log('Opening restore backup dialog...')
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
  } catch (e) {
    console.error('Failed to save loyalty config:', e)
  } finally {
    loyaltyLoading.value = false
  }
}

const saveSettings = () => {
  // TODO: Implement save functionality
  console.log('Saving settings...')
}
</script>

<template>
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
          <Tab value="eis" @click="loadEISData">
            <i class="pi pi-cloud-upload"></i>
            <span>EIS Compliance</span>
          </Tab>
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
                  <InputText v-model="businessInfo.phone" class="w-full" />
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

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveSettings" />
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
                <Button label="Save Changes" icon="pi pi-save" @click="saveSettings" />
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
                <Button label="Save Changes" icon="pi pi-save" @click="saveSettings" />
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
                    <label>Bluetooth Device</label>
                    <div class="flex gap-2">
                      <InputText v-model="printerSettings.bluetoothDevice" placeholder="Select or scan for device" class="flex-1" readonly />
                      <Button icon="pi pi-search" label="Scan" outlined />
                    </div>
                    <small>Click Scan to search for nearby Bluetooth printers</small>
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
                <Button label="Save Changes" icon="pi pi-save" @click="saveSettings" />
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
              </div>

              <div class="action-buttons">
                <Button label="Save Changes" icon="pi pi-save" @click="saveSettings" />
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
          <TabPanel value="eis">
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
          </TabPanel>

          <TabPanel value="system">
            <div class="settings-section">
              <div class="section-header">
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

              <Divider />

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

              <div class="section-header">
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

              <Divider />

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
                <Button label="Backup Now" icon="pi pi-download" @click="triggerBackup" />
                <Button label="Restore Backup" icon="pi pi-upload" outlined @click="restoreBackup" />
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
                <Button label="Save Changes" icon="pi pi-save" @click="saveSettings" />
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
  display: flex;
  flex-direction: column;
}

.settings-tabs :deep(.p-tablist) {
  background: var(--p-surface-0);
  border-radius: 8px;
  padding: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid var(--p-surface-200);
}

.settings-tabs :deep(.p-tab) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
}

.settings-tabs :deep(.p-tabpanels) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: transparent;
  padding: 0;
}

.settings-tabs :deep(.p-tabpanel) {
  padding: 0;
}

.settings-section {
  background: var(--p-surface-0);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--p-surface-200);
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
  background: var(--p-surface-50);
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
  background: var(--p-surface-50);
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
  background: var(--p-surface-50);
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
  border-top: 1px solid var(--p-surface-200);
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
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
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
  background: var(--p-surface-200);
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
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
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
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
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

@media (max-width: 768px) {
  .settings-tabs :deep(.p-tab span) {
    display: none;
  }

  .settings-tabs :deep(.p-tab) {
    padding: 0.75rem;
  }
}
</style>
