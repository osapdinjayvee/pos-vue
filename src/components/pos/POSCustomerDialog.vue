<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { customerRepository } from '@/repositories/customerRepository'
import { customerService } from '@/services/customerService'
import type { Customer, CustomerType } from '@/types/order'

interface Props {
  visible: boolean
  currentCustomerId?: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'selected': [customer: Customer]
  'removed': []
}>()

// View mode: 'search' or 'register'
const mode = ref<'search' | 'register'>('search')

// Search state
const searchQuery = ref('')
const customers = ref<Customer[]>([])
const isSearching = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Register form state
const regName = ref('')
const regPhone = ref('')
const regEmail = ref('')
const regType = ref<CustomerType>('retail')
const isRegistering = ref(false)
const regErrors = ref<Record<string, string>>({})

const customerTypeOptions = [
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'VIP', value: 'vip' }
]

const typeTagSeverity = (type: CustomerType) => {
  if (type === 'vip') return 'warn'
  if (type === 'wholesale') return 'info'
  return 'secondary'
}

// Load recent customers on open
watch(() => props.visible, async (val) => {
  if (val) {
    mode.value = 'search'
    searchQuery.value = ''
    resetRegForm()
    await loadCustomers()
    await nextTick()
    document.getElementById('pos-customer-search')?.focus()
  }
})

// Debounced search
watch(searchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => loadCustomers(val), 250)
})

async function loadCustomers(query?: string) {
  isSearching.value = true
  try {
    if (query && query.trim().length >= 1) {
      customers.value = await customerRepository.search(query.trim(), { limit: 50 })
    } else {
      customers.value = await customerRepository.findAllActive({ limit: 50, orderBy: 'updated_at', orderDir: 'DESC' })
    }
  } catch {
    customers.value = []
  } finally {
    isSearching.value = false
  }
}

function selectCustomer(customer: Customer) {
  emit('selected', customer)
  emit('update:visible', false)
}

function removeCustomer() {
  emit('removed')
  emit('update:visible', false)
}

function switchToRegister() {
  mode.value = 'register'
  resetRegForm()
  nextTick(() => document.getElementById('pos-reg-name')?.focus())
}

function switchToSearch() {
  mode.value = 'search'
  nextTick(() => document.getElementById('pos-customer-search')?.focus())
}

function resetRegForm() {
  regName.value = ''
  regPhone.value = ''
  regEmail.value = ''
  regType.value = 'retail'
  regErrors.value = {}
}

function validateReg(): boolean {
  regErrors.value = {}
  if (!regName.value.trim()) regErrors.value.name = 'Name is required'
  if (!regPhone.value.trim()) regErrors.value.phone = 'Phone is required'
  if (regEmail.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.value)) {
    regErrors.value.email = 'Invalid email'
  }
  return Object.keys(regErrors.value).length === 0
}

async function handleRegister() {
  if (!validateReg()) return
  isRegistering.value = true
  try {
    const customer = await customerService.registerCustomer({
      name: regName.value.trim(),
      phone: regPhone.value.trim(),
      email: regEmail.value.trim() || undefined,
      customer_type: regType.value
    })
    emit('selected', customer)
    emit('update:visible', false)
  } catch (error) {
    regErrors.value.general = error instanceof Error ? error.message : 'Registration failed'
  } finally {
    isRegistering.value = false
  }
}

function handleClose() {
  emit('update:visible', false)
}

const isCurrentCustomer = (id: string) => props.currentCustomerId === id
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    :maximizable="false"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200)' } }"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <i class="pi pi-users text-lg text-[var(--p-primary-500)]"></i>
        <span class="text-lg font-bold text-neutral-800">Select Customer</span>
        <div class="ml-auto flex items-center gap-2">
          <Button
            v-if="currentCustomerId"
            label="Remove Customer"
            icon="pi pi-user-minus"
            severity="danger"
            text
            size="small"
            @click="removeCustomer"
          />
        </div>
      </div>
    </template>

    <!-- SEARCH MODE -->
    <div v-if="mode === 'search'" class="flex flex-col flex-1 overflow-hidden">
      <!-- Search bar -->
      <div class="p-3 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
        <div class="relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"></i>
          <InputText
            id="pos-customer-search"
            v-model="searchQuery"
            placeholder="Search by name, phone, or email..."
            class="w-full !pl-10 !text-base"
          />
        </div>
      </div>

      <!-- Customer list -->
      <div class="flex-1 overflow-y-auto">
        <!-- Loading -->
        <div v-if="isSearching" class="flex items-center justify-center py-12">
          <i class="pi pi-spinner pi-spin text-2xl text-neutral-300"></i>
        </div>

        <!-- Results -->
        <div v-else-if="customers.length > 0" class="divide-y divide-neutral-100">
          <div
            v-for="c in customers"
            :key="c.id"
            class="flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-[var(--p-primary-50)] active:bg-[var(--p-primary-100)]"
            :class="{ 'bg-[var(--p-primary-50)] ring-1 ring-inset ring-[var(--p-primary-200)]': isCurrentCustomer(c.id) }"
            @click="selectCustomer(c)"
          >
            <!-- Avatar -->
            <div class="flex items-center justify-center w-11 h-11 rounded-full shrink-0"
                 :class="isCurrentCustomer(c.id) ? 'bg-[var(--p-primary-500)] text-white' : 'bg-neutral-100 text-neutral-500'">
              <i class="pi pi-user text-lg"></i>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-base font-semibold text-neutral-800 truncate">{{ c.name }}</span>
                <Tag :value="c.customer_type" :severity="typeTagSeverity(c.customer_type)" class="!text-[10px] !px-1.5 !py-0 uppercase" />
                <span v-if="isCurrentCustomer(c.id)" class="text-xs text-[var(--p-primary-500)] font-semibold">Current</span>
              </div>
              <div class="flex items-center gap-3 mt-0.5">
                <span v-if="c.phone" class="text-sm text-neutral-400 flex items-center gap-1">
                  <i class="pi pi-phone text-xs"></i>{{ c.phone }}
                </span>
                <span v-if="c.email" class="text-sm text-neutral-400 flex items-center gap-1 truncate">
                  <i class="pi pi-envelope text-xs"></i>{{ c.email }}
                </span>
              </div>
            </div>

            <!-- Points / spend -->
            <div class="text-right shrink-0">
              <div v-if="c.loyalty_points > 0" class="text-sm font-semibold text-amber-600">
                {{ c.loyalty_points.toLocaleString() }} pts
              </div>
              <div v-if="c.lifetime_spend > 0" class="text-xs text-neutral-400 tabular-nums">
                {{ c.lifetime_spend.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' }) }}
              </div>
            </div>

            <i class="pi pi-chevron-right text-xs text-neutral-300 shrink-0"></i>
          </div>
        </div>

        <!-- Empty -->
        <div v-else class="flex flex-col items-center justify-center py-16 text-center">
          <div class="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <i class="pi pi-users text-2xl text-neutral-300"></i>
          </div>
          <p class="text-base font-semibold text-neutral-400 m-0 mb-1">
            {{ searchQuery ? 'No customers found' : 'No customers yet' }}
          </p>
          <p class="text-sm text-neutral-300 m-0">
            {{ searchQuery ? 'Try a different search term or register a new customer' : 'Register your first customer below' }}
          </p>
        </div>
      </div>

      <!-- Bottom bar -->
      <div class="shrink-0 px-4 py-3 border-t border-neutral-100 bg-white flex items-center gap-3">
        <Button
          label="New Customer"
          icon="pi pi-user-plus"
          class="flex-1"
          @click="switchToRegister"
        />
        <Button
          label="Walk-in"
          icon="pi pi-times"
          severity="secondary"
          outlined
          class="flex-1"
          @click="handleClose"
        />
      </div>
    </div>

    <!-- REGISTER MODE -->
    <div v-else class="flex flex-col flex-1 overflow-hidden">
      <!-- Back bar -->
      <div class="px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/50 shrink-0 flex items-center gap-2">
        <Button
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          size="small"
          @click="switchToSearch"
        />
        <span class="text-base font-semibold text-neutral-700">New Customer</span>
      </div>

      <!-- Form -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="flex flex-col gap-4 max-w-lg mx-auto">
          <div v-if="regErrors.general" class="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
            {{ regErrors.general }}
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="pos-reg-name" class="text-sm font-semibold text-neutral-700">Name *</label>
            <InputText
              id="pos-reg-name"
              v-model="regName"
              placeholder="Customer name"
              :invalid="!!regErrors.name"
              class="w-full !text-base"
            />
            <small v-if="regErrors.name" class="text-red-500">{{ regErrors.name }}</small>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="pos-reg-phone" class="text-sm font-semibold text-neutral-700">Phone *</label>
            <InputText
              id="pos-reg-phone"
              v-model="regPhone"
              v-numeric-only
              inputmode="numeric"
              placeholder="Phone number"
              :invalid="!!regErrors.phone"
              class="w-full !text-base"
            />
            <small v-if="regErrors.phone" class="text-red-500">{{ regErrors.phone }}</small>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="pos-reg-email" class="text-sm font-semibold text-neutral-700">Email</label>
            <InputText
              id="pos-reg-email"
              v-model="regEmail"
              placeholder="Email (optional)"
              :invalid="!!regErrors.email"
              class="w-full !text-base"
            />
            <small v-if="regErrors.email" class="text-red-500">{{ regErrors.email }}</small>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="pos-reg-type" class="text-sm font-semibold text-neutral-700">Customer Type</label>
            <Select
              id="pos-reg-type"
              v-model="regType"
              :options="customerTypeOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
        </div>
      </div>

      <!-- Register bottom bar -->
      <div class="shrink-0 px-4 py-3 border-t border-neutral-100 bg-white flex items-center gap-3">
        <Button
          label="Register & Select"
          icon="pi pi-check"
          class="flex-1"
          :loading="isRegistering"
          @click="handleRegister"
        />
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          class="flex-1"
          @click="switchToSearch"
        />
      </div>
    </div>
  </Dialog>
</template>
