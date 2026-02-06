<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import Message from 'primevue/message'
import PermissionPicker from './PermissionPicker.vue'
import type { DisplayRole, RoleInput } from '@/types/user'

const props = defineProps<{
  visible: boolean
  role?: DisplayRole | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: RoleInput, isNew: boolean]
  cancel: []
}>()

// Form state
const name = ref('')
const code = ref('')
const description = ref('')
const permissions = ref<string[]>([])
const error = ref<string | null>(null)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditMode = computed(() => !!props.role)
const isDefaultRole = computed(() => props.role?.isDefault || false)

const dialogTitle = computed(() => {
  if (isEditMode.value) {
    return isDefaultRole.value ? 'Edit Default Role' : 'Edit Role'
  }
  return 'Add Role'
})

const canSubmit = computed(() => {
  if (!name.value.trim()) return false
  if (!code.value.trim()) return false
  if (permissions.value.length === 0) return false
  return true
})

// Auto-generate code from name
function generateCode(nameValue: string): string {
  return nameValue
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// Watch name changes to auto-generate code (only for new roles)
watch(name, (newName) => {
  if (!isEditMode.value && !code.value.trim()) {
    code.value = generateCode(newName)
  }
})

function handleSubmit() {
  if (!canSubmit.value) return

  error.value = null

  const data: RoleInput = {
    name: name.value.trim(),
    code: code.value.trim(),
    description: description.value.trim() || undefined,
    permissions: permissions.value
  }

  emit('save', data, !isEditMode.value)
}

function handleCancel() {
  emit('cancel')
  closeDialog()
}

function closeDialog() {
  dialogVisible.value = false
  resetForm()
}

function resetForm() {
  name.value = ''
  code.value = ''
  description.value = ''
  permissions.value = []
  error.value = null
}

function populateForm() {
  if (props.role) {
    name.value = props.role.name
    code.value = props.role.code
    description.value = props.role.description || ''
    permissions.value = [...props.role.permissions]
  } else {
    resetForm()
  }
}

// Watch for dialog visibility changes
watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      populateForm()
    }
  }
)

// Watch for role changes
watch(
  () => props.role,
  () => {
    if (props.visible) {
      populateForm()
    }
  }
)
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="dialogTitle"
    modal
    :closable="!loading"
    :close-on-escape="!loading"
    :style="{ width: '700px', maxWidth: '95vw' }"
    class="role-form-dialog"
  >
    <div class="form-content">
      <!-- Error Message -->
      <Message v-if="error" severity="error" :closable="false" class="error-message">
        {{ error }}
      </Message>

      <!-- Default Role Warning -->
      <Message v-if="isDefaultRole" severity="warn" :closable="false" class="warning-message">
        This is a default role. Only permissions can be modified.
      </Message>

      <!-- Basic Info -->
      <div class="form-section">
        <h4 class="section-title">Basic Information</h4>

        <div class="form-row">
          <div class="form-field">
            <label for="role-name">Name <span class="required">*</span></label>
            <InputText
              id="role-name"
              v-model="name"
              :disabled="loading || isDefaultRole"
              placeholder="e.g., Lead Cashier"
              class="w-full"
            />
          </div>
          <div class="form-field">
            <label for="role-code">Code <span class="required">*</span></label>
            <InputText
              id="role-code"
              v-model="code"
              :disabled="loading || isEditMode"
              placeholder="e.g., lead_cashier"
              class="w-full"
            />
            <small class="field-hint">Unique identifier. Cannot be changed later.</small>
          </div>
        </div>

        <div class="form-field">
          <label for="role-description">Description</label>
          <Textarea
            id="role-description"
            v-model="description"
            :disabled="loading || isDefaultRole"
            placeholder="Brief description of this role..."
            rows="2"
            class="w-full"
          />
        </div>
      </div>

      <!-- Permissions -->
      <div class="form-section">
        <h4 class="section-title">Permissions <span class="required">*</span></h4>
        <p class="section-hint">Select the permissions this role should have.</p>

        <PermissionPicker v-model="permissions" :disabled="loading" />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" text severity="secondary" :disabled="loading" @click="handleCancel" />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Create Role'"
          :loading="loading"
          :disabled="!canSubmit"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.form-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-height: 70vh;
  overflow-y: auto;
}

.error-message,
.warning-message {
  margin: 0;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.section-hint {
  margin: 0;
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field label {
  font-weight: 500;
  color: var(--p-text-color);
}

.required {
  color: var(--p-red-500);
}

.field-hint {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
