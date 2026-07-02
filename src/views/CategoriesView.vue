<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/stores/category'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import Textarea from 'primevue/textarea'
import Dialog from 'primevue/dialog'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import type { Category, CategoryInput } from '@/types'
import CsvImportDialog from '@/components/import/CsvImportDialog.vue'
import { categoryImportConfig } from '@/config/csvImportConfigs'
import type { ImportResult } from '@/services/csvImportService'

const toast = useToast()
const confirm = useConfirm()
const categoryStore = useCategoryStore()

// CSV import state
const showImportDialog = ref(false)

// Dialog state
const showDialog = ref(false)
const isEditMode = ref(false)
const editingCategory = ref<Category | null>(null)

// Form state
const form = ref<CategoryInput>({
  name: '',
  description: '',
  icon: 'pi pi-tag'
})

// Search
const searchQuery = ref('')
const filteredCategories = computed(() => {
  if (!searchQuery.value.trim()) {
    return categoryStore.categories
  }
  const query = searchQuery.value.toLowerCase()
  return categoryStore.categories.filter(c =>
    c.name.toLowerCase().includes(query) ||
    (c.description && c.description.toLowerCase().includes(query))
  )
})

// Icon options for categories
const iconOptions = [
  'pi pi-tag',
  'pi pi-box',
  'pi pi-shopping-bag',
  'pi pi-gift',
  'pi pi-heart',
  'pi pi-star',
  'pi pi-bolt',
  'pi pi-sun',
  'pi pi-cloud',
  'pi pi-home',
  'pi pi-car',
  'pi pi-phone',
  'pi pi-tablet',
  'pi pi-desktop',
  'pi pi-camera',
  'pi pi-palette'
]

onMounted(async () => {
  await categoryStore.fetchAll()
})

const resetForm = () => {
  form.value = {
    name: '',
    description: '',
    icon: 'pi pi-tag'
  }
  isEditMode.value = false
  editingCategory.value = null
}

const openCreateDialog = () => {
  resetForm()
  showDialog.value = true
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
    await categoryStore.fetchAll()
  }
}

const openEditDialog = (category: Category) => {
  isEditMode.value = true
  editingCategory.value = category
  form.value = {
    name: category.name,
    description: category.description || '',
    icon: category.icon || 'pi pi-tag'
  }
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  resetForm()
}

const validateForm = (): string | null => {
  if (!form.value.name.trim()) return 'Category name is required'
  return null
}

const onSave = async () => {
  const validationError = validateForm()
  if (validationError) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: validationError,
      life: 3000
    })
    return
  }

  try {
    if (isEditMode.value && editingCategory.value) {
      const updated = await categoryStore.update(editingCategory.value.id, form.value)
      if (updated) {
        toast.add({
          severity: 'success',
          summary: 'Category Updated',
          detail: `${form.value.name} has been updated successfully.`,
          life: 3000
        })
        closeDialog()
      } else if (categoryStore.error) {
        toast.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: categoryStore.error,
          life: 5000
        })
      }
    } else {
      const created = await categoryStore.create(form.value)
      if (created) {
        toast.add({
          severity: 'success',
          summary: 'Category Created',
          detail: `${form.value.name} has been created successfully.`,
          life: 3000
        })
        closeDialog()
      } else if (categoryStore.error) {
        toast.add({
          severity: 'error',
          summary: 'Creation Failed',
          detail: categoryStore.error,
          life: 5000
        })
      }
    }
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'An unexpected error occurred',
      life: 5000
    })
  }
}

const confirmDelete = (category: Category) => {
  confirm.require({
    message: `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        const success = await categoryStore.remove(category.id)
        if (success) {
          toast.add({
            severity: 'success',
            summary: 'Category Deleted',
            detail: `${category.name} has been deleted.`,
            life: 3000
          })
        } else if (categoryStore.error) {
          toast.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: categoryStore.error,
            life: 5000
          })
        }
      } catch (error: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to delete category',
          life: 5000
        })
      }
    }
  })
}

const toggleActive = async (category: Category) => {
  try {
    await categoryStore.toggleActive(category.id)
    toast.add({
      severity: 'success',
      summary: 'Status Updated',
      detail: `${category.name} is now ${category.is_active ? 'inactive' : 'active'}.`,
      life: 3000
    })
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.message || 'Failed to update status',
      life: 5000
    })
  }
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <div class="categories-page">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Categories</h1>
          <p class="text-muted">{{ categoryStore.categories.length }} categories</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search categories..." />
        </IconField>
        <Button
          icon="pi pi-upload"
          severity="secondary"
          outlined
          @click="showImportDialog = true"
          v-tooltip.bottom="'Import CSV'"
        />
        <Button
          label="Add Category"
          icon="pi pi-plus"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <div class="table-container">
      <DataTable
        :value="filteredCategories"
        :loading="categoryStore.isLoading"
        stripedRows
        responsiveLayout="scroll"
        class="categories-table"
        :paginator="filteredCategories.length > 10"
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
      >
        <template #empty>
          <div class="empty-state">
            <i class="pi pi-folder-open"></i>
            <p>No categories found</p>
            <Button
              v-if="!searchQuery"
              label="Create your first category"
              icon="pi pi-plus"
              @click="openCreateDialog"
            />
          </div>
        </template>

        <Column field="icon" header="" style="width: 60px">
          <template #body="{ data }">
            <div class="category-icon">
              <i :class="data.icon || 'pi pi-tag'"></i>
            </div>
          </template>
        </Column>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div class="category-name">
              <span class="name">{{ data.name }}</span>
              <span v-if="data.description" class="description">{{ data.description }}</span>
            </div>
          </template>
        </Column>

        <Column field="product_count" header="Products" sortable style="width: 120px">
          <template #body="{ data }">
            <span class="product-count">{{ data.product_count || 0 }}</span>
          </template>
        </Column>

        <Column field="is_active" header="Status" sortable style="width: 120px">
          <template #body="{ data }">
            <Tag
              :value="data.is_active ? 'Active' : 'Inactive'"
              :severity="data.is_active ? 'success' : 'secondary'"
            />
          </template>
        </Column>

        <Column field="created_at" header="Created" sortable style="width: 140px">
          <template #body="{ data }">
            {{ formatDate(data.created_at) }}
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
                @click="openEditDialog(data)"
                v-tooltip.top="'Edit'"
              />
              <Button
                :icon="data.is_active ? 'pi pi-eye-slash' : 'pi pi-eye'"
                text
                rounded
                :severity="data.is_active ? 'warning' : 'success'"
                @click="toggleActive(data)"
                v-tooltip.top="data.is_active ? 'Deactivate' : 'Activate'"
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

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showDialog"
      :header="isEditMode ? 'Edit Category' : 'New Category'"
      :style="{ width: '500px' }"
      :modal="true"
      :closable="true"
      @hide="closeDialog"
    >
      <div class="dialog-content">
        <div class="form-field">
          <label for="name">Category Name *</label>
          <InputText
            id="name"
            v-model="form.name"
            placeholder="Enter category name"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="form.description"
            rows="3"
            placeholder="Enter category description"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label>Icon</label>
          <div class="icon-grid">
            <button
              v-for="icon in iconOptions"
              :key="icon"
              type="button"
              class="icon-option"
              :class="{ selected: form.icon === icon }"
              @click="form.icon = icon"
            >
              <i :class="icon"></i>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="closeDialog"
        />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Create Category'"
          icon="pi pi-check"
          @click="onSave"
          :loading="categoryStore.isLoading"
        />
      </template>
    </Dialog>

    <!-- CSV Import Dialog -->
    <CsvImportDialog
      v-model:visible="showImportDialog"
      :config="categoryImportConfig"
      @import-complete="handleImportComplete"
    />
  </div>
</template>

<style scoped>
.categories-page {
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


.categories-table {
  border: none;
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--app-surface-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--p-primary-color);
  font-size: 1.125rem;
}

.category-name {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-name .name {
  font-weight: 500;
  color: var(--p-text-color);
}

.category-name .description {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-count {
  font-weight: 500;
  color: var(--p-text-color);
}

.dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.w-full {
  width: 100%;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.5rem;
}

.icon-option {
  width: 40px;
  height: 40px;
  border: 1px solid var(--app-surface-200);
  border-radius: 8px;
  background: var(--app-surface-0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--p-text-muted-color);
}

.icon-option:hover {
  border-color: var(--p-primary-color);
  color: var(--p-primary-color);
}

.icon-option.selected {
  border-color: var(--p-primary-color);
  background: var(--p-primary-50);
  color: var(--p-primary-color);
}

@media (max-width: 879.98px) {
  .categories-page {
    gap: 1rem;
  }


  .header-left h1 {
    font-size: 1rem;
  }


  .header-actions :deep(.p-button-label) {
    display: none;
  }

  .icon-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .icon-option {
    width: 36px;
    height: 36px;
  }

}
</style>
