<script setup lang="ts">
import { ref } from 'vue'
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
  bulkArchive: []
  bulkActivate: []
  bulkDeactivate: []
  bulkReceiveStock: []
  openFilters: []
  importCsv: []
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
    label: 'Archive Selected',
    icon: 'pi pi-inbox',
    command: () => emit('bulkArchive')
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
  <IconField>
    <InputIcon class="pi pi-search" />
    <InputText v-model="search" placeholder="Search products..." />
  </IconField>
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
    icon="pi pi-upload"
    severity="secondary"
    outlined
    @click="emit('importCsv')"
    v-tooltip.bottom="'Import CSV'"
  />
  <Button
    label="Create"
    icon="pi pi-plus"
    @click="emit('add')"
  />
</template>
