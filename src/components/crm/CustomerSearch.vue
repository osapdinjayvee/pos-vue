<script setup lang="ts">
import { ref, watch } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import { customerRepository } from '@/repositories/customerRepository'
import type { Customer } from '@/types/order'

interface Props {
  modelValue?: Customer | null
  compact?: boolean
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  compact: false,
  placeholder: 'Search customer by name or phone...'
})

const emit = defineEmits<{
  'update:modelValue': [customer: Customer | null]
  'register': []
}>()

const searchQuery = ref('')
const suggestions = ref<Customer[]>([])
const selectedCustomer = ref<Customer | null>(props.modelValue || null)

watch(() => props.modelValue, (val) => {
  selectedCustomer.value = val || null
  if (!val) {
    searchQuery.value = ''
  }
})

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function searchCustomers(event: { query: string }) {
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(async () => {
    const query = event.query.trim()
    if (query.length < 2) {
      suggestions.value = []
      return
    }

    try {
      suggestions.value = await customerRepository.search(query, { limit: 10 })
    } catch (e) {
      console.error('Error searching customers:', e)
      suggestions.value = []
    }
  }, 300)
}

function onSelect(event: { value: Customer }) {
  selectedCustomer.value = event.value
  emit('update:modelValue', event.value)
}

function clearSelection() {
  selectedCustomer.value = null
  searchQuery.value = ''
  emit('update:modelValue', null)
}

function handleRegister() {
  emit('register')
}

function formatCustomer(customer: Customer): string {
  const parts = [customer.name]
  if (customer.phone) parts.push(customer.phone)
  return parts.join(' — ')
}
</script>

<template>
  <div class="customer-search" :class="{ compact }">
    <div v-if="selectedCustomer" class="selected-customer">
      <div class="customer-info">
        <i class="pi pi-user"></i>
        <span class="customer-name">{{ selectedCustomer.name }}</span>
        <span v-if="selectedCustomer.phone" class="customer-phone">{{ selectedCustomer.phone }}</span>
      </div>
      <Button
        icon="pi pi-times"
        text
        rounded
        size="small"
        severity="secondary"
        @click="clearSelection"
        v-tooltip.top="'Remove customer'"
      />
    </div>

    <div v-else class="search-container">
      <AutoComplete
        v-model="searchQuery"
        :suggestions="suggestions"
        :placeholder="placeholder"
        :optionLabel="(c: Customer) => formatCustomer(c)"
        :delay="300"
        :minLength="2"
        class="customer-autocomplete"
        @complete="searchCustomers"
        @item-select="onSelect"
      >
        <template #option="{ option }">
          <div class="customer-option">
            <div class="option-name">{{ option.name }}</div>
            <div class="option-details">
              <span v-if="option.phone"><i class="pi pi-phone"></i> {{ option.phone }}</span>
              <span v-if="option.email"><i class="pi pi-envelope"></i> {{ option.email }}</span>
            </div>
          </div>
        </template>
        <template #empty>
          <div class="no-results">
            <p>No customers found</p>
            <Button
              label="Register New Customer"
              icon="pi pi-plus"
              text
              size="small"
              @click="handleRegister"
            />
          </div>
        </template>
      </AutoComplete>
    </div>
  </div>
</template>

<style scoped>
.customer-search {
  width: 100%;
}

.selected-customer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--p-surface-50);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.customer-info i {
  color: var(--p-primary-color);
}

.customer-name {
  font-weight: 600;
}

.customer-phone {
  color: var(--p-text-muted-color);
  font-size: 0.875rem;
}

.search-container {
  width: 100%;
}

.customer-autocomplete {
  width: 100%;
}

.customer-autocomplete :deep(.p-autocomplete-input) {
  width: 100%;
}

.customer-option {
  padding: 0.25rem 0;
}

.option-name {
  font-weight: 600;
}

.option-details {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin-top: 0.125rem;
}

.option-details i {
  font-size: 0.75rem;
  margin-right: 0.25rem;
}

.no-results {
  padding: 0.5rem;
  text-align: center;
}

.no-results p {
  margin: 0 0 0.5rem;
  color: var(--p-text-muted-color);
}

.compact .selected-customer {
  padding: 0.375rem 0.5rem;
}

.compact .customer-name {
  font-size: 0.875rem;
}
</style>
