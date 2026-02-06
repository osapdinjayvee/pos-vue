<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Checkbox from 'primevue/checkbox'
import Panel from 'primevue/panel'
import {
  DEFAULT_PERMISSIONS,
  PermissionCategoryLabels,
  type PermissionCategory
} from '@/types/user'

const props = defineProps<{
  modelValue: string[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// Group permissions by category
const permissionsByCategory = computed(() => {
  const grouped: Record<PermissionCategory, typeof DEFAULT_PERMISSIONS> = {
    sales: [],
    inventory: [],
    reports: [],
    users: [],
    settings: []
  }

  for (const perm of DEFAULT_PERMISSIONS) {
    grouped[perm.category].push(perm)
  }

  return grouped
})

const categories = computed(() => Object.keys(permissionsByCategory.value) as PermissionCategory[])

// Track selected permissions
const selectedPermissions = ref<Set<string>>(new Set(props.modelValue))

// Full access (superadmin)
const hasFullAccess = computed({
  get: () => selectedPermissions.value.has('*'),
  set: (value) => {
    if (value) {
      selectedPermissions.value.clear()
      selectedPermissions.value.add('*')
    } else {
      selectedPermissions.value.delete('*')
    }
    emitUpdate()
  }
})

// Category wildcard checks
function hasCategoryWildcard(category: PermissionCategory): boolean {
  return selectedPermissions.value.has(`${category}.*`)
}

function setCategoryWildcard(category: PermissionCategory, value: boolean) {
  const wildcardKey = `${category}.*`

  if (value) {
    // Remove individual permissions in this category
    for (const perm of permissionsByCategory.value[category]) {
      selectedPermissions.value.delete(perm.code)
    }
    selectedPermissions.value.add(wildcardKey)
  } else {
    selectedPermissions.value.delete(wildcardKey)
  }

  emitUpdate()
}

// Individual permission checks
function hasPermission(code: string): boolean {
  if (hasFullAccess.value) return true
  if (selectedPermissions.value.has(code)) return true

  // Check category wildcard
  const [category] = code.split('.')
  return selectedPermissions.value.has(`${category}.*`)
}

function setPermission(code: string, value: boolean) {
  const [category] = code.split('.')
  const wildcardKey = `${category}.*`

  if (value) {
    selectedPermissions.value.add(code)
  } else {
    selectedPermissions.value.delete(code)
    // Also remove category wildcard if it exists
    selectedPermissions.value.delete(wildcardKey)
  }

  emitUpdate()
}

// Check if all permissions in a category are selected
function isAllCategorySelected(category: PermissionCategory): boolean {
  if (hasFullAccess.value) return true
  if (hasCategoryWildcard(category)) return true

  return permissionsByCategory.value[category].every((perm) =>
    selectedPermissions.value.has(perm.code)
  )
}

// Toggle all permissions in a category
function toggleCategory(category: PermissionCategory) {
  if (isAllCategorySelected(category)) {
    // Deselect all
    setCategoryWildcard(category, false)
    for (const perm of permissionsByCategory.value[category]) {
      selectedPermissions.value.delete(perm.code)
    }
  } else {
    // Select all (use wildcard)
    setCategoryWildcard(category, true)
  }

  emitUpdate()
}

function emitUpdate() {
  emit('update:modelValue', Array.from(selectedPermissions.value))
}

// Watch for external changes
watch(
  () => props.modelValue,
  (newValue) => {
    selectedPermissions.value = new Set(newValue)
  },
  { deep: true }
)
</script>

<template>
  <div class="permission-picker">
    <!-- Full Access Toggle -->
    <div class="full-access-section">
      <div class="full-access-toggle">
        <Checkbox
          v-model="hasFullAccess"
          :binary="true"
          :disabled="disabled"
          input-id="full-access"
        />
        <label for="full-access" class="full-access-label">
          <span class="label-text">Full Access (Administrator)</span>
          <span class="label-hint">Grants all current and future permissions</span>
        </label>
      </div>
    </div>

    <!-- Category Panels -->
    <div v-if="!hasFullAccess" class="categories-section">
      <Panel
        v-for="category in categories"
        :key="category"
        :header="PermissionCategoryLabels[category]"
        toggleable
        class="category-panel"
      >
        <template #header>
          <div class="panel-header">
            <Checkbox
              :model-value="isAllCategorySelected(category)"
              :binary="true"
              :disabled="disabled"
              @update:model-value="toggleCategory(category)"
            />
            <span class="category-name">{{ PermissionCategoryLabels[category] }}</span>
            <span class="category-count">
              {{ permissionsByCategory[category].length }} permissions
            </span>
          </div>
        </template>

        <div class="permissions-grid">
          <div
            v-for="perm in permissionsByCategory[category]"
            :key="perm.code"
            class="permission-item"
          >
            <Checkbox
              :model-value="hasPermission(perm.code)"
              :binary="true"
              :disabled="disabled || hasCategoryWildcard(category)"
              :input-id="perm.code"
              @update:model-value="setPermission(perm.code, $event)"
            />
            <label :for="perm.code" class="permission-label">
              <span class="permission-name">{{ perm.name }}</span>
              <span class="permission-description">{{ perm.description }}</span>
            </label>
          </div>
        </div>
      </Panel>
    </div>

    <!-- Full Access Message -->
    <div v-else class="full-access-message">
      <i class="pi pi-check-circle"></i>
      <p>This role has full access to all system features and permissions.</p>
    </div>
  </div>
</template>

<style scoped>
.permission-picker {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.full-access-section {
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
}

.full-access-toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.full-access-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
}

.label-text {
  font-weight: 600;
  color: var(--p-text-color);
}

.label-hint {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
}

.categories-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.category-panel :deep(.p-panel-header) {
  padding: 0.75rem 1rem;
}

.category-panel :deep(.p-panel-content) {
  padding: 1rem;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.category-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.category-count {
  font-size: 0.8125rem;
  color: var(--p-text-muted-color);
  margin-left: auto;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--p-surface-0);
  border-radius: 6px;
  border: 1px solid var(--p-surface-200);
}

.permission-label {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  cursor: pointer;
}

.permission-name {
  font-weight: 500;
  color: var(--p-text-color);
  font-size: 0.875rem;
}

.permission-description {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.full-access-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--p-green-50);
  border-radius: 8px;
  color: var(--p-green-700);
}

.full-access-message i {
  font-size: 1.5rem;
}

.full-access-message p {
  margin: 0;
}
</style>
