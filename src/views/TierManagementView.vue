<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import TierForm from '@/components/crm/TierForm.vue'
import { tierRepository } from '@/repositories/tierRepository'
import type { MembershipTier, MembershipTierInput } from '@/types/tier'

const toast = useToast()
const confirm = useConfirm()

const tiers = ref<MembershipTier[]>([])
const loading = ref(false)
const showForm = ref(false)
const editingTier = ref<MembershipTier | null>(null)
const formLoading = ref(false)

async function loadTiers() {
  loading.value = true
  try {
    tiers.value = await tierRepository.findAllOrdered()
  } catch (e) {
    console.error('Failed to load tiers:', e)
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  editingTier.value = null
  showForm.value = true
}

function handleEdit(tier: MembershipTier) {
  editingTier.value = tier
  showForm.value = true
}

async function handleSave(data: MembershipTierInput) {
  formLoading.value = true
  try {
    if (editingTier.value) {
      await tierRepository.update(editingTier.value.id, {
        name: data.name,
        min_spend: data.min_spend,
        discount_rate: data.discount_rate ?? 0,
        points_multiplier: data.points_multiplier ?? 1,
        display_order: data.display_order ?? 1,
        is_active: data.is_active ? 1 : 0,
        benefits: data.benefits ? JSON.stringify(data.benefits) : null
      } as Partial<MembershipTier>)
      toast.add({ severity: 'success', summary: 'Success', detail: 'Tier updated', life: 3000 })
    } else {
      const maxOrder = await tierRepository.getMaxDisplayOrder()
      await tierRepository.create({
        name: data.name,
        min_spend: data.min_spend,
        discount_rate: data.discount_rate ?? 0,
        points_multiplier: data.points_multiplier ?? 1,
        display_order: data.display_order ?? maxOrder + 1,
        is_active: data.is_active ? 1 : 0,
        benefits: data.benefits ? JSON.stringify(data.benefits) : null
      } as any)
      toast.add({ severity: 'success', summary: 'Success', detail: 'Tier created', life: 3000 })
    }
    showForm.value = false
    await loadTiers()
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e instanceof Error ? e.message : 'Failed to save tier',
      life: 5000
    })
  } finally {
    formLoading.value = false
  }
}

function handleDelete(tier: MembershipTier) {
  confirm.require({
    message: `Delete tier "${tier.name}"? Customers in this tier will need to be reassigned.`,
    header: 'Delete Tier',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { severity: 'secondary', label: 'Cancel' },
    acceptProps: { severity: 'danger', label: 'Delete' },
    accept: async () => {
      try {
        await tierRepository.delete(tier.id)
        toast.add({ severity: 'success', summary: 'Deleted', detail: `Tier "${tier.name}" removed`, life: 3000 })
        await loadTiers()
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete tier', life: 5000 })
      }
    }
  })
}

function formatCurrency(value: number): string {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0 })}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`
}

const tierSeverityMap: Record<string, string> = {
  bronze: 'secondary',
  silver: 'info',
  gold: 'warn',
  platinum: 'success'
}

function getTierSeverity(name: string): string {
  return tierSeverityMap[name.toLowerCase()] || 'secondary'
}

onMounted(() => {
  loadTiers()
})
</script>

<template>
  <div class="tier-management-view">
    <Toast />
    <ConfirmDialog />

    <!-- Header -->
    <div class="view-header">
      <div>
        <h2 class="view-title">Membership Tiers</h2>
        <p class="view-subtitle">Configure tier thresholds, discounts, and points multipliers</p>
      </div>
      <Button
        label="New Tier"
        icon="pi pi-plus"
        @click="handleAdd"
      />
    </div>

    <!-- Tiers Table -->
    <div class="tiers-table-card">
      <DataTable
        :value="tiers"
        :loading="loading"
        dataKey="id"
        stripedRows
        sortField="display_order"
        :sortOrder="1"
      >
        <Column field="display_order" header="#" sortable style="width: 60px">
          <template #body="{ data }">
            <span class="order-badge">{{ data.display_order }}</span>
          </template>
        </Column>

        <Column field="name" header="Tier Name" sortable>
          <template #body="{ data }">
            <Tag
              :value="data.name"
              :severity="getTierSeverity(data.name)"
              rounded
            />
          </template>
        </Column>

        <Column field="min_spend" header="Min Spend" sortable>
          <template #body="{ data }">
            <span class="currency">{{ formatCurrency(data.min_spend) }}</span>
          </template>
        </Column>

        <Column field="discount_rate" header="Discount" sortable>
          <template #body="{ data }">
            <span :class="data.discount_rate > 0 ? 'discount-active' : 'discount-none'">
              {{ data.discount_rate > 0 ? formatPercent(data.discount_rate) : 'None' }}
            </span>
          </template>
        </Column>

        <Column field="points_multiplier" header="Points" sortable>
          <template #body="{ data }">
            <span class="multiplier">{{ data.points_multiplier }}x</span>
          </template>
        </Column>

        <Column field="is_active" header="Status" sortable style="width: 100px">
          <template #body="{ data }">
            <Tag
              :value="data.is_active ? 'Active' : 'Inactive'"
              :severity="data.is_active ? 'success' : 'danger'"
              rounded
            />
          </template>
        </Column>

        <Column header="Actions" style="width: 120px">
          <template #body="{ data }">
            <div class="actions-cell">
              <Button
                icon="pi pi-pencil"
                severity="secondary"
                text
                rounded
                size="small"
                @click="handleEdit(data)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                rounded
                size="small"
                @click="handleDelete(data)"
              />
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="empty-state">
            <i class="pi pi-star"></i>
            <p>No tiers configured</p>
            <Button label="Add First Tier" icon="pi pi-plus" size="small" @click="handleAdd" />
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Tier Form Dialog -->
    <TierForm
      v-model:visible="showForm"
      :tier="editingTier"
      :loading="formLoading"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
.tier-management-view {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.view-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.view-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.tiers-table-card {
  background: var(--app-surface-0);
  border: 1px solid var(--app-surface-200);
  border-radius: 12px;
  overflow: hidden;
}

.order-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--app-surface-100);
  font-size: 0.8125rem;
  font-weight: 600;
}

.currency {
  font-weight: 600;
  color: var(--p-text-color);
}

.discount-active {
  font-weight: 600;
  color: var(--p-green-600);
}

.discount-none {
  color: var(--p-text-muted-color);
}

.multiplier {
  font-weight: 600;
  color: var(--p-primary-color);
}

.actions-cell {
  display: flex;
  gap: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: var(--p-text-muted-color);
  gap: 0.75rem;
}

.empty-state i {
  font-size: 2rem;
}

@media (max-width: 767.98px) {
  .tier-management-view {
    padding: 1rem;
  }

  .view-header {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
