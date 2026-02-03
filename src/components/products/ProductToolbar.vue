<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Menu from 'primevue/menu'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import { categories } from '@/types'

const search = defineModel<string>('search', { default: '' })
const view = defineModel<string>('view', { default: 'grid' })
const category = defineModel<string | null>('category', { default: null })

const props = defineProps<{
  selectedCount: number
}>()

const emit = defineEmits<{
  add: []
  bulkDelete: []
  bulkActivate: []
  bulkDeactivate: []
}>()

const bulkMenu = ref()
const bulkMenuItems = ref([
  {
    label: 'Set Active',
    icon: 'pi pi-check-circle',
    command: () => emit('bulkActivate')
  },
  {
    label: 'Set Inactive',
    icon: 'pi pi-times-circle',
    command: () => emit('bulkDeactivate')
  },
  { separator: true },
  {
    label: 'Delete Selected',
    icon: 'pi pi-trash',
    class: 'text-red-500',
    command: () => emit('bulkDelete')
  }
])

const viewOptions = [
  { icon: 'pi pi-th-large', value: 'grid' },
  { icon: 'pi pi-list', value: 'list' }
]

const categoryOptions = [
  { label: 'All Categories', value: null },
  ...categories.map(c => ({ label: c, value: c }))
]

const toggleBulkMenu = (event: Event) => {
  bulkMenu.value.toggle(event)
}
</script>

<template>
  <Toolbar class="product-toolbar">
    <template #start>
      <div class="toolbar-start">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText
            v-model="search"
            placeholder="Search products..."
            class="search-input"
          />
        </IconField>
        <Select
          v-model="category"
          :options="categoryOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Category"
          class="category-filter"
        />
      </div>
    </template>

    <template #center>
      <SelectButton
        v-model="view"
        :options="viewOptions"
        optionValue="value"
        :allowEmpty="false"
      >
        <template #option="{ option }">
          <i :class="option.icon"></i>
        </template>
      </SelectButton>
    </template>

    <template #end>
      <div class="toolbar-end">
        <template v-if="selectedCount > 0">
          <span class="selected-count">{{ selectedCount }} selected</span>
          <Button
            label="Bulk Actions"
            icon="pi pi-chevron-down"
            iconPos="right"
            severity="secondary"
            outlined
            @click="toggleBulkMenu"
          />
          <Menu ref="bulkMenu" :model="bulkMenuItems" :popup="true" />
        </template>
        <Button
          label="Add Product"
          icon="pi pi-plus"
          @click="emit('add')"
        />
      </div>
    </template>
  </Toolbar>
</template>

<style scoped>
.product-toolbar {
  margin-bottom: 1.5rem;
  border-radius: 12px;
}

.toolbar-start {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.search-input {
  width: 250px;
}

.category-filter {
  width: 180px;
}

.toolbar-end {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.selected-count {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
  padding-right: 0.5rem;
}

@media (max-width: 768px) {
  .toolbar-start {
    flex-direction: column;
    width: 100%;
  }

  .search-input,
  .category-filter {
    width: 100%;
  }

  .product-toolbar :deep(.p-toolbar-start),
  .product-toolbar :deep(.p-toolbar-center),
  .product-toolbar :deep(.p-toolbar-end) {
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}
</style>
