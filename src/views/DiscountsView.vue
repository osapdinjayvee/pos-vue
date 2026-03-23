<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDiscountManagementStore } from '@/stores/discountManagement'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Tag from 'primevue/tag'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { PromoDiscount } from '@/types/discount'
import CsvImportDialog from '@/components/import/CsvImportDialog.vue'
import { discountImportConfig } from '@/config/csvImportConfigs'
import type { ImportResult } from '@/services/csvImportService'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const store = useDiscountManagementStore()

// CSV import state
const showImportDialog = ref(false)

// Search and filters
const searchQuery = ref('')
const statusFilter = ref<string>('all')
const autoApplyFilter = ref<string>('all')

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

const autoApplyOptions = [
  { label: 'All Apply', value: 'all' },
  { label: 'Auto', value: 'auto' },
  { label: 'Manual', value: 'manual' }
]

const filteredDiscounts = computed(() => {
  let result = store.discounts

  // Search filter
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(d =>
      d.name.toLowerCase().includes(query) ||
      (d.code && d.code.toLowerCase().includes(query))
    )
  }

  // Status filter
  if (statusFilter.value === 'active') {
    result = result.filter(d => d.is_active === 1)
  } else if (statusFilter.value === 'inactive') {
    result = result.filter(d => d.is_active === 0)
  }

  // Auto-apply filter
  if (autoApplyFilter.value === 'auto') {
    result = result.filter(d => d.auto_apply === 1)
  } else if (autoApplyFilter.value === 'manual') {
    result = result.filter(d => d.auto_apply === 0)
  }

  return result
})

onMounted(async () => {
  await store.fetchAll()
})

const openCreatePage = () => {
  router.push('/discounts/new')
}

const handleImportComplete = async (result: ImportResult) => {
  const total = result.created + result.updated
  if (total > 0) {
    toast.add({
      severity: 'success',
      summary: 'Import Complete',
      detail: `${result.created} created, ${result.updated} updated${result.errors > 0 ? `, ${result.errors} failed` : ''}`,
      life: 4000
    })
    await store.fetchAll()
  }
}

const openEditPage = (discount: PromoDiscount) => {
  router.push(`/discounts/${discount.id}/edit`)
}

const confirmDelete = (discount: PromoDiscount) => {
  confirm.require({
    message: `Are you sure you want to delete "${discount.name}"? This action cannot be undone.`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const success = await store.remove(discount.id)
        if (success) {
          toast.add({
            severity: 'success',
            summary: 'Discount Deleted',
            detail: `${discount.name} has been deleted.`,
            life: 3000
          })
        } else if (store.error) {
          toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: store.error,
            life: 5000
          })
        }
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete discount',
          life: 5000
        })
      }
    }
  })
}

const toggleActive = async (discount: PromoDiscount) => {
  try {
    const updated = await store.toggleActive(discount.id)
    if (updated) {
      toast.add({
        severity: 'success',
        summary: 'Status Updated',
        detail: `${discount.name} is now ${discount.is_active === 1 ? 'inactive' : 'active'}.`,
        life: 3000
      })
    } else if (store.error) {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: store.error,
        life: 5000
      })
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update status',
      life: 5000
    })
  }
}

const formatValue = (discount: PromoDiscount): string => {
  if (discount.type === 'percentage') {
    return `${discount.value}%`
  }
  return `\u20B1${discount.value.toFixed(2)}`
}

const formatSchedule = (discount: PromoDiscount): string => {
  if (!discount.start_date && !discount.end_date) return 'Always'

  const fmt = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  if (discount.start_date && discount.end_date) {
    return `${fmt(discount.start_date)} - ${fmt(discount.end_date)}`
  }
  if (discount.start_date) return `From ${fmt(discount.start_date)}`
  return `Until ${fmt(discount.end_date!)}`
}

const getWeekdayLabels = (discount: PromoDiscount): string[] => {
  if (!discount.weekdays) return []
  try {
    const days = JSON.parse(discount.weekdays) as number[]
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return days.map(d => labels[d]).filter((s): s is string => Boolean(s))
  } catch {
    return []
  }
}

const getTimeRange = (discount: PromoDiscount): string | null => {
  if (!discount.start_time && !discount.end_time) return null
  if (discount.start_time && discount.end_time) {
    return `${discount.start_time} - ${discount.end_time}`
  }
  if (discount.start_time) return `From ${discount.start_time}`
  return `Until ${discount.end_time}`
}
</script>

<template>
  <div class="discounts-page">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Discounts</h1>
          <p class="text-muted">{{ store.discounts.length }} discounts</p>
        </div>
      </div>
      <div class="header-actions">
        <Select
          v-model="statusFilter"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          class="filter-select"
        />
        <Select
          v-model="autoApplyFilter"
          :options="autoApplyOptions"
          optionLabel="label"
          optionValue="value"
          class="filter-select"
        />
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search discounts..." />
        </IconField>
        <Button
          icon="pi pi-upload"
          severity="secondary"
          outlined
          @click="showImportDialog = true"
          v-tooltip.bottom="'Import CSV'"
        />
        <Button
          label="Add Discount"
          icon="pi pi-plus"
          @click="openCreatePage"
        />
      </div>
    </div>

    <div class="table-container">
      <DataTable
        :value="filteredDiscounts"
        :loading="store.isLoading"
        stripedRows
        responsiveLayout="scroll"
        class="discounts-table"
        :paginator="filteredDiscounts.length > 10"
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-percentage"></i>
            <p>No discounts found</p>
            <Button
              v-if="!searchQuery"
              label="Create your first discount"
              icon="pi pi-plus"
              @click="openCreatePage"
            />
          </div>
        </template>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="discount-name">
              <span class="name">{{ data.name }}</span>
              <span v-if="data.code" class="code">{{ data.code }}</span>
            </div>
          </template>
        </Column>

        <Column field="type" header="Type" sortable style="width: 110px">
          <template #body="{ data }">
            <Tag
              :value="data.type === 'percentage' ? '%' : 'Fixed'"
              :severity="data.type === 'percentage' ? 'info' : 'secondary'"
            />
          </template>
        </Column>

        <Column field="value" header="Value" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="discount-value">{{ formatValue(data) }}</span>
          </template>
        </Column>

        <Column header="Scope" style="width: 120px">
          <template #body>
            <span class="scope-label">All Products</span>
          </template>
        </Column>

        <Column header="Schedule" style="width: 200px">
          <template #body="{ data }">
            <div class="schedule-cell">
              <span class="schedule-date">{{ formatSchedule(data) }}</span>
              <div class="schedule-badges">
                <Tag
                  v-if="getTimeRange(data)"
                  :value="getTimeRange(data)!"
                  severity="secondary"
                  class="schedule-tag"
                />
                <Tag
                  v-for="day in getWeekdayLabels(data)"
                  :key="day"
                  :value="day"
                  severity="secondary"
                  class="schedule-tag"
                />
              </div>
            </div>
          </template>
        </Column>

        <Column field="auto_apply" header="Apply" sortable style="width: 100px">
          <template #body="{ data }">
            <Tag
              :value="data.auto_apply === 1 ? 'Auto' : 'Manual'"
              :severity="data.auto_apply === 1 ? 'success' : 'secondary'"
            />
          </template>
        </Column>

        <Column field="is_active" header="Status" sortable style="width: 100px">
          <template #body="{ data }">
            <Tag
              :value="data.is_active === 1 ? 'Active' : 'Inactive'"
              :severity="data.is_active === 1 ? 'success' : 'secondary'"
            />
          </template>
        </Column>

        <Column header="Actions" style="width: 180px">
          <template #body="{ data }">
            <div class="table-actions">
              <Button
                icon="pi pi-pencil"
                text
                rounded
                severity="secondary"
                @click="openEditPage(data)"
                v-tooltip.top="'Edit'"
              />
              <Button
                :icon="data.is_active === 1 ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                :severity="data.is_active === 1 ? 'warn' : 'success'"
                @click="toggleActive(data)"
                v-tooltip.top="data.is_active === 1 ? 'Deactivate' : 'Activate'"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                severity="danger"
                @click="confirmDelete(data)"
                v-tooltip.top="'Delete'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- CSV Import Dialog -->
    <CsvImportDialog
      v-model:visible="showImportDialog"
      :config="discountImportConfig"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<style scoped>
.discounts-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.filter-select {
  min-width: 140px;
}

.discounts-table {
  border: none;
}

.discount-name {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.discount-name .name {
  font-weight: 500;
  color: var(--p-text-color);
}

.discount-name .code {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  font-family: monospace;
}

.discount-value {
  font-weight: 600;
  color: var(--p-text-color);
}

.scope-label {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.schedule-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.schedule-date {
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.schedule-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.schedule-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.35rem;
}

@media (max-width: 879.98px) {
  .discounts-page {
    gap: 1rem;
  }

  .header-left h1 {
    font-size: 1rem;
  }

  .header-actions :deep(.p-button-label) {
    display: none;
  }

  .filter-select {
    min-width: 110px;
  }

}
</style>
