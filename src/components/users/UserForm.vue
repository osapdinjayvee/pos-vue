<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import MultiSelect from 'primevue/multiselect'
import Password from 'primevue/password'
import type { DisplayUser, DisplayRole, UserInput, UserUpdateInput } from '@/types/user'

const props = defineProps<{
  visible: boolean
  user?: DisplayUser | null
  roles: DisplayRole[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: [data: UserInput | UserUpdateInput, isNew: boolean]
  cancel: []
}>()

// Form state
const username = ref('')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const pin = ref('')
const confirmPin = ref('')
const selectedRoleIds = ref<string[]>([])
const error = ref<string | null>(null)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const isEditMode = computed(() => !!props.user)

const dialogTitle = computed(() => {
  return isEditMode.value ? 'Edit User' : 'Add User'
})

const canSubmit = computed(() => {
  // Username required
  if (!username.value.trim()) return false

  // First name required
  if (!firstName.value.trim()) return false

  // Last name required
  if (!lastName.value.trim()) return false

  // Role required
  if (selectedRoleIds.value.length === 0) return false

  // PIN required for new users
  if (!isEditMode.value) {
    if (!pin.value || pin.value.length < 4) return false
    if (pin.value !== confirmPin.value) return false
  } else {
    // For edit, if PIN is provided, it must match
    if (pin.value && pin.value !== confirmPin.value) return false
    if (pin.value && pin.value.length < 4) return false
  }

  return true
})

const pinError = computed(() => {
  if (!pin.value) return null
  if (pin.value.length < 4) return 'PIN must be at least 4 digits'
  if (!/^\d+$/.test(pin.value)) return 'PIN must contain only numbers'
  if (confirmPin.value && pin.value !== confirmPin.value) return 'PINs do not match'
  return null
})

function handleSubmit() {
  if (!canSubmit.value) return

  error.value = null

  if (isEditMode.value) {
    const updateData: UserUpdateInput = {
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      email: email.value.trim() || undefined,
      role_ids: selectedRoleIds.value
    }

    // Only include PIN if changed
    if (pin.value) {
      updateData.pin = pin.value
    }

    emit('save', updateData, false)
  } else {
    const createData: UserInput = {
      username: username.value.trim(),
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim(),
      email: email.value.trim() || undefined,
      pin: pin.value,
      branch_id: 'default', // TODO: Get from current user's branch
      role_ids: selectedRoleIds.value
    }

    emit('save', createData, true)
  }
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
  username.value = ''
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  pin.value = ''
  confirmPin.value = ''
  selectedRoleIds.value = []
  error.value = null
}

function populateForm() {
  if (props.user) {
    username.value = props.user.username
    firstName.value = props.user.firstName
    lastName.value = props.user.lastName
    email.value = props.user.email || ''
    selectedRoleIds.value = props.user.roles.map((r) => r.id)
    pin.value = ''
    confirmPin.value = ''
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

// Watch for user changes
watch(
  () => props.user,
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
    :style="{ width: '500px', maxWidth: '95vw' }"
    class="user-form-dialog"
  >
    <div class="form-content">
      <!-- Error Message -->
      <Message v-if="error" severity="error" :closable="false" class="error-message">
        {{ error }}
      </Message>

      <!-- Username -->
      <div class="form-field">
        <label for="username">Username <span class="required">*</span></label>
        <InputText
          id="username"
          v-model="username"
          :disabled="isEditMode || loading"
          placeholder="Enter username"
          class="w-full"
        />
        <small v-if="!isEditMode" class="field-hint">Used for login. Cannot be changed later.</small>
      </div>

      <!-- Name Fields -->
      <div class="form-row">
        <div class="form-field">
          <label for="first-name">First Name <span class="required">*</span></label>
          <InputText
            id="first-name"
            v-model="firstName"
            :disabled="loading"
            placeholder="First name"
            class="w-full"
          />
        </div>
        <div class="form-field">
          <label for="last-name">Last Name <span class="required">*</span></label>
          <InputText
            id="last-name"
            v-model="lastName"
            :disabled="loading"
            placeholder="Last name"
            class="w-full"
          />
        </div>
      </div>

      <!-- Email -->
      <div class="form-field">
        <label for="email">Email</label>
        <InputText
          id="email"
          v-model="email"
          type="email"
          :disabled="loading"
          placeholder="user@example.com"
          class="w-full"
        />
      </div>

      <!-- Roles -->
      <div class="form-field">
        <label for="roles">Roles <span class="required">*</span></label>
        <MultiSelect
          id="roles"
          v-model="selectedRoleIds"
          :options="roles"
          option-label="name"
          option-value="id"
          :disabled="loading"
          placeholder="Select roles"
          display="chip"
          class="w-full"
        />
      </div>

      <!-- PIN Section -->
      <div class="pin-section">
        <h4 class="section-title">
          {{ isEditMode ? 'Change PIN (optional)' : 'Set PIN' }}
        </h4>

        <div class="form-row">
          <div class="form-field">
            <label for="pin">{{ isEditMode ? 'New PIN' : 'PIN' }} <span v-if="!isEditMode" class="required">*</span></label>
            <Password
              id="pin"
              v-model="pin"
              :disabled="loading"
              :feedback="false"
              toggle-mask
              placeholder="Enter PIN"
              class="w-full"
              input-class="w-full"
            />
          </div>
          <div class="form-field">
            <label for="confirm-pin">Confirm PIN</label>
            <Password
              id="confirm-pin"
              v-model="confirmPin"
              :disabled="loading"
              :feedback="false"
              toggle-mask
              placeholder="Confirm PIN"
              class="w-full"
              input-class="w-full"
            />
          </div>
        </div>

        <Message v-if="pinError" severity="error" :closable="false" class="pin-error">
          {{ pinError }}
        </Message>

        <small class="field-hint">PIN must be 4-6 numeric digits.</small>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button label="Cancel" text severity="secondary" :disabled="loading" @click="handleCancel" />
        <Button
          :label="isEditMode ? 'Save Changes' : 'Create User'"
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
  gap: 1.25rem;
}

.error-message,
.pin-error {
  margin: 0;
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

.pin-section {
  padding-top: 1rem;
  border-top: 1px solid var(--p-surface-200);
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

@media (max-width: 480px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
