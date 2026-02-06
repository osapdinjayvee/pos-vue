<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import UserList from '@/components/users/UserList.vue'
import UserForm from '@/components/users/UserForm.vue'
import { useUsers } from '@/composables/useUsers'
import type { DisplayUser, UserInput, UserUpdateInput } from '@/types/user'

const toast = useToast()
const confirm = useConfirm()

const {
  users,
  roles,
  isLoading,
  loadAll,
  createUser,
  updateUser,
  deactivateUser,
  reactivateUser,
  resetUserPin
} = useUsers()

// Search
const searchQuery = ref('')

// Form state
const showUserForm = ref(false)
const selectedUser = ref<DisplayUser | null>(null)
const formLoading = ref(false)

// Reset PIN dialog
const showResetPinDialog = ref(false)
const resetPinUser = ref<DisplayUser | null>(null)
const newPin = ref('')
const confirmNewPin = ref('')
const resetPinLoading = ref(false)

onMounted(async () => {
  await loadAll()
})

function handleAdd() {
  selectedUser.value = null
  showUserForm.value = true
}

function handleEdit(user: DisplayUser) {
  selectedUser.value = user
  showUserForm.value = true
}

async function handleSave(data: UserInput | UserUpdateInput, isNew: boolean) {
  formLoading.value = true

  try {
    if (isNew) {
      const result = await createUser(data as UserInput)

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: 'User Created',
          detail: `User has been created successfully.`,
          life: 3000
        })
        showUserForm.value = false
      } else {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error || 'Failed to create user',
          life: 5000
        })
      }
    } else {
      if (!selectedUser.value) return

      const result = await updateUser(selectedUser.value.id, data as UserUpdateInput)

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: 'User Updated',
          detail: `User has been updated successfully.`,
          life: 3000
        })
        showUserForm.value = false
      } else {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error || 'Failed to update user',
          life: 5000
        })
      }
    }
  } finally {
    formLoading.value = false
  }
}

function handleDeactivate(user: DisplayUser) {
  confirm.require({
    message: `Are you sure you want to deactivate ${user.fullName}? They will no longer be able to log in.`,
    header: 'Deactivate User',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Deactivate',
      severity: 'danger'
    },
    accept: async () => {
      const result = await deactivateUser(user.id)

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: 'User Deactivated',
          detail: `${user.fullName} has been deactivated.`,
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error || 'Failed to deactivate user',
          life: 5000
        })
      }
    }
  })
}

function handleReactivate(user: DisplayUser) {
  confirm.require({
    message: `Are you sure you want to reactivate ${user.fullName}?`,
    header: 'Reactivate User',
    icon: 'pi pi-question-circle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Reactivate',
      severity: 'success'
    },
    accept: async () => {
      const result = await reactivateUser(user.id)

      if (result.success) {
        toast.add({
          severity: 'success',
          summary: 'User Reactivated',
          detail: `${user.fullName} has been reactivated.`,
          life: 3000
        })
      } else {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: result.error || 'Failed to reactivate user',
          life: 5000
        })
      }
    }
  })
}

function handleResetPin(user: DisplayUser) {
  resetPinUser.value = user
  newPin.value = ''
  confirmNewPin.value = ''
  showResetPinDialog.value = true
}

async function submitResetPin() {
  if (!resetPinUser.value) return

  if (newPin.value.length < 4) {
    toast.add({
      severity: 'error',
      summary: 'Invalid PIN',
      detail: 'PIN must be at least 4 digits',
      life: 3000
    })
    return
  }

  if (newPin.value !== confirmNewPin.value) {
    toast.add({
      severity: 'error',
      summary: 'PIN Mismatch',
      detail: 'PINs do not match',
      life: 3000
    })
    return
  }

  resetPinLoading.value = true

  try {
    const result = await resetUserPin(resetPinUser.value.id, newPin.value)

    if (result.success) {
      toast.add({
        severity: 'success',
        summary: 'PIN Reset',
        detail: `PIN has been reset for ${resetPinUser.value.fullName}.`,
        life: 3000
      })
      showResetPinDialog.value = false
    } else {
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: result.error || 'Failed to reset PIN',
        life: 5000
      })
    }
  } finally {
    resetPinLoading.value = false
  }
}
</script>

<template>
  <div class="users-view">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Users</h1>
          <p class="text-muted">Manage user accounts and roles</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search users..." />
        </IconField>
        <Button label="Add User" icon="pi pi-plus" @click="handleAdd" />
      </div>
    </div>

    <!-- User List -->
    <UserList
      :users="users"
      :loading="isLoading"
      :search="searchQuery"
      @add="handleAdd"
      @edit="handleEdit"
      @deactivate="handleDeactivate"
      @reactivate="handleReactivate"
      @reset-pin="handleResetPin"
    />

    <!-- User Form Dialog -->
    <UserForm
      v-model:visible="showUserForm"
      :user="selectedUser"
      :roles="roles"
      :loading="formLoading"
      @save="handleSave"
      @cancel="showUserForm = false"
    />

    <!-- Reset PIN Dialog -->
    <Dialog
      v-model:visible="showResetPinDialog"
      header="Reset PIN"
      modal
      :style="{ width: '400px' }"
    >
      <div class="reset-pin-content">
        <p class="reset-pin-info">
          Reset PIN for <strong>{{ resetPinUser?.fullName }}</strong>
        </p>

        <div class="form-field">
          <label for="new-pin">New PIN</label>
          <InputText
            id="new-pin"
            v-model="newPin"
            type="password"
            placeholder="Enter new PIN"
            class="w-full"
          />
        </div>

        <div class="form-field">
          <label for="confirm-new-pin">Confirm PIN</label>
          <InputText
            id="confirm-new-pin"
            v-model="confirmNewPin"
            type="password"
            placeholder="Confirm new PIN"
            class="w-full"
          />
        </div>

        <small class="field-hint">PIN must be 4-6 numeric digits.</small>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="resetPinLoading"
          @click="showResetPinDialog = false"
        />
        <Button
          label="Reset PIN"
          :loading="resetPinLoading"
          :disabled="newPin.length < 4 || newPin !== confirmNewPin"
          @click="submitResetPin"
        />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
.users-view {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.reset-pin-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reset-pin-info {
  margin: 0;
  color: var(--p-text-color);
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

.field-hint {
  color: var(--p-text-muted-color);
  font-size: 0.8125rem;
}
</style>
