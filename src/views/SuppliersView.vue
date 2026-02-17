<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import SupplierList from '@/components/inventory/SupplierList.vue'
import SupplierForm from '@/components/inventory/SupplierForm.vue'
import { supplierRepository } from '@/repositories/supplierRepository'
import type { Supplier } from '@/types/inventory'
import type { SupplierFormData } from '@/components/inventory/SupplierForm.vue'
import CsvImportDialog from '@/components/import/CsvImportDialog.vue'
import { supplierImportConfig } from '@/config/csvImportConfigs'
import type { ImportResult } from '@/services/csvImportService'

const toast = useToast()
const confirm = useConfirm()

const searchQuery = ref('')
const showSupplierForm = ref(false)
const editingSupplier = ref<Supplier | null>(null)
const formLoading = ref(false)

const supplierListRef = ref<InstanceType<typeof SupplierList> | null>(null)
const showImportDialog = ref(false)

function handleAddSupplier() {
  editingSupplier.value = null
  showSupplierForm.value = true
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
    supplierListRef.value?.loadSuppliers?.()
  }
}

function handleEditSupplier(supplier: Supplier) {
  editingSupplier.value = supplier
  showSupplierForm.value = true
}

async function handleSaveSupplier(data: SupplierFormData) {
  formLoading.value = true
  try {
    if (editingSupplier.value) {
      await supplierRepository.updateSupplier(editingSupplier.value.id, {
        name: data.name,
        contact_person: data.contact_person || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined
      })
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Supplier updated successfully',
        life: 3000
      })
    } else {
      await supplierRepository.createSupplier({
        name: data.name,
        contact_person: data.contact_person || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        is_active: true
      })
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Supplier created successfully',
        life: 3000
      })
    }
    showSupplierForm.value = false
    supplierListRef.value?.loadSuppliers()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to save supplier',
      life: 5000
    })
  } finally {
    formLoading.value = false
  }
}

function handleDeleteSupplier(supplier: Supplier) {
  confirm.require({
    message: `Are you sure you want to delete "${supplier.name}"?`,
    header: 'Delete Supplier',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await supplierRepository.delete(supplier.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Supplier deleted successfully',
          life: 3000
        })
        supplierListRef.value?.loadSuppliers()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error instanceof Error ? error.message : 'Failed to delete supplier',
          life: 5000
        })
      }
    }
  })
}

function handleViewProducts(supplier: Supplier) {
  // Navigate to products filtered by supplier
  toast.add({
    severity: 'info',
    summary: 'View Products',
    detail: `Viewing products from ${supplier.name}`,
    life: 2000
  })
}
</script>

<template>
  <div class="suppliers-view">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Suppliers</h1>
          <p class="text-muted">Manage product suppliers</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search suppliers..." />
        </IconField>
        <Button icon="pi pi-upload" severity="secondary" outlined @click="showImportDialog = true" v-tooltip.bottom="'Import CSV'" />
        <Button label="Add Supplier" icon="pi pi-plus" @click="handleAddSupplier" />
      </div>
    </div>

    <div class="suppliers-content">
      <SupplierList
        ref="supplierListRef"
        :search="searchQuery"
        @add="handleAddSupplier"
        @edit="handleEditSupplier"
        @delete="handleDeleteSupplier"
        @view-products="handleViewProducts"
      />
    </div>

    <SupplierForm
      v-model:visible="showSupplierForm"
      :supplier="editingSupplier"
      :loading="formLoading"
      @save="handleSaveSupplier"
    />

    <!-- CSV Import Dialog -->
    <CsvImportDialog
      v-model:visible="showImportDialog"
      :config="supplierImportConfig"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<style scoped>
.suppliers-view {
  padding: 1.5rem;
}

.suppliers-content {
  background: var(--p-surface-0);
  border-radius: 12px;
  border: 1px solid var(--p-surface-200);
  padding: 1.5rem;
}

@media (max-width: 767.98px) {
  .suppliers-view {
    padding: 1rem;
  }

  .suppliers-content {
    padding: 1rem;
  }
}

@media (max-width: 879.98px) {
  .suppliers-view {
    padding: 0.5rem;
  }

  .suppliers-content {
    padding: 0.75rem;
    border-radius: 8px;
  }
}
</style>
