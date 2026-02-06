<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { customerRepository } from '@/repositories/customerRepository'
import type { Customer } from '@/types/order'

interface Props {
  filters?: {
    dateRange?: { start: string; end: string }
  }
}

defineProps<Props>()

const toast = useToast()
const loading = ref(false)

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(isoDate: string): string {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-PH')
}

function buildCsvContent(customers: Customer[]): string {
  const headers = [
    'Name',
    'Phone',
    'Email',
    'Type',
    'Tier ID',
    'Points',
    'Lifetime Spend',
    'Created Date'
  ]

  const rows = customers.map((c) => [
    escapeCsvField(c.name),
    escapeCsvField(c.phone || ''),
    escapeCsvField(c.email || ''),
    escapeCsvField(c.customer_type),
    escapeCsvField(c.tier_id || ''),
    String(c.loyalty_points),
    String(c.lifetime_spend),
    formatDate(c.created_at)
  ])

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.join(','))
  ]

  return csvLines.join('\n')
}

function generateFilename(): string {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `customers_export_${yyyy}-${mm}-${dd}.csv`
}

function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function handleExport(): Promise<void> {
  loading.value = true

  try {
    const customers = await customerRepository.findAllActive({ orderBy: 'name' })

    if (customers.length === 0) {
      toast.add({
        severity: 'warn',
        summary: 'No Data',
        detail: 'No active customers found to export.',
        life: 3000
      })
      return
    }

    const csvContent = buildCsvContent(customers)
    const filename = generateFilename()
    downloadCsv(csvContent, filename)

    toast.add({
      severity: 'success',
      summary: 'Export Complete',
      detail: `Exported ${customers.length} customer${customers.length !== 1 ? 's' : ''}.`,
      life: 3000
    })
  } catch (error) {
    console.error('Customer export failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Export Failed',
      detail: 'An error occurred while exporting customers.',
      life: 4000
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="customer-export">
    <Button
      icon="pi pi-download"
      label="Export CSV"
      :loading="loading"
      @click="handleExport"
    />
  </div>
</template>

<style scoped>
.customer-export {
  display: inline-flex;
}
</style>
