<script setup lang="ts">
import { ref } from 'vue'
import Toolbar from 'primevue/toolbar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import SelectButton from 'primevue/selectbutton'
import Menu from 'primevue/menu'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'

const search = defineModel<string>('search', { default: '' })
const view = defineModel<string>('view', { default: 'grid' })

const props = defineProps<{
  selectedCount: number
  activeFilterCount: number
}>()

const emit = defineEmits<{
  add: []
  bulkDelete: []
  bulkActivate: []
  bulkDeactivate: []
  bulkReceiveStock: []
  openFilters: []
}>()

const bulkMenu = ref()
const bulkMenuItems = ref([
  {
    label: 'Receive Stock',
    icon: 'pi pi-plus',
    command: () => emit('bulkReceiveStock')
  },
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
      </div>
    </template>

    <template #end>
      <div class="toolbar-end">
        <template v-if="selectedCount > 0">
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
          icon="pi pi-filter"
          severity="secondary"
          outlined
          :badge="activeFilterCount > 0 ? String(activeFilterCount) : undefined"
          badgeSeverity="primary"
          @click="emit('openFilters')"
          v-tooltip.bottom="'Filters'"
        />
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
        <Button
          label="Create"
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
  flex: 1;
}

.search-input {
  flex: 1;
  min-width: 200px;
}

.toolbar-end {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

@media (max-width: 879.98px) {
  .product-toolbar {
    margin-bottom: 1rem;
    border-radius: 8px;
  }

  .product-toolbar :deep(.p-toolbar-start),
  .product-toolbar :deep(.p-toolbar-center),
  .product-toolbar :deep(.p-toolbar-end) {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .search-input {
    min-width: 120px;
  }

  .toolbar-end :deep(.p-button-label) {
    display: none;
  }

  .toolbar-end {
    gap: 0.375rem;
  }
}
</style>
