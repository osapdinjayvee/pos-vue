<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import RoleList from '@/components/users/RoleList.vue'
import RoleForm from '@/components/users/RoleForm.vue'
import { roleRepository } from '@/repositories/roleRepository'
import type { DisplayRole, RoleInput } from '@/types/user'
import { toDisplayRole } from '@/types/user'

const toast = useToast()
const confirm = useConfirm()

// Search
const searchQuery = ref('')

// State
const roles = ref<DisplayRole[]>([])
const isLoading = ref(false)
const showRoleForm = ref(false)
const selectedRole = ref<DisplayRole | null>(null)
const formLoading = ref(false)

onMounted(async () => {
  await loadRoles()
})

async function loadRoles() {
  isLoading.value = true

  try {
    const rawRoles = await roleRepository.findAll()
    roles.value = rawRoles.map(toDisplayRole)
  } catch (err) {
    console.error('Failed to load roles:', err)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load roles',
      life: 5000
    })
  } finally {
    isLoading.value = false
  }
}

function handleAdd() {
  selectedRole.value = null
  showRoleForm.value = true
}

function handleEdit(role: DisplayRole) {
  selectedRole.value = role
  showRoleForm.value = true
}

function handleDuplicate(role: DisplayRole) {
  // Create a copy with modified name/code
  selectedRole.value = {
    ...role,
    id: '', // Clear ID to create new
    name: `${role.name} (Copy)`,
    code: `${role.code}_copy`,
    isDefault: false
  }
  showRoleForm.value = true
}

async function handleSave(data: RoleInput, isNew: boolean) {
  formLoading.value = true

  try {
    if (isNew) {
      // Check if code already exists
      const existing = await roleRepository.findByCode(data.code)
      if (existing) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'A role with this code already exists',
          life: 5000
        })
        return
      }

      await roleRepository.create({
        ...data,
        permissions: JSON.stringify(data.permissions),
        is_default: data.is_default ? 1 : 0
      } as any)

      toast.add({
        severity: 'success',
        summary: 'Role Created',
        detail: `${data.name} has been created successfully.`,
        life: 3000
      })
    } else {
      if (!selectedRole.value) return

      await roleRepository.update(selectedRole.value.id, {
        ...data,
        permissions: JSON.stringify(data.permissions),
        is_default: data.is_default ? 1 : 0
      } as any)

      toast.add({
        severity: 'success',
        summary: 'Role Updated',
        detail: `${data.name} has been updated successfully.`,
        life: 3000
      })
    }

    showRoleForm.value = false
    await loadRoles()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save role'
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000
    })
  } finally {
    formLoading.value = false
  }
}

function handleDelete(role: DisplayRole) {
  if (role.isDefault) {
    toast.add({
      severity: 'warn',
      summary: 'Cannot Delete',
      detail: 'Default roles cannot be deleted.',
      life: 3000
    })
    return
  }

  confirm.require({
    message: `Are you sure you want to delete the "${role.name}" role? This action cannot be undone.`,
    header: 'Delete Role',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true
    },
    acceptProps: {
      label: 'Delete',
      severity: 'danger'
    },
    accept: async () => {
      try {
        await roleRepository.delete(role.id)

        toast.add({
          severity: 'success',
          summary: 'Role Deleted',
          detail: `${role.name} has been deleted.`,
          life: 3000
        })

        await loadRoles()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete role'
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: message,
          life: 5000
        })
      }
    }
  })
}
</script>

<template>
  <div class="roles-view">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Roles</h1>
          <p class="text-muted">Manage user roles and permissions</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search roles..." />
        </IconField>
        <Button label="Add Role" icon="pi pi-plus" @click="handleAdd" />
      </div>
    </div>

    <!-- Role List -->
    <RoleList
      :roles="roles"
      :loading="isLoading"
      :search="searchQuery"
      @add="handleAdd"
      @edit="handleEdit"
      @duplicate="handleDuplicate"
      @delete="handleDelete"
    />

    <!-- Role Form Dialog -->
    <RoleForm
      v-model:visible="showRoleForm"
      :role="selectedRole"
      :loading="formLoading"
      @save="handleSave"
      @cancel="showRoleForm = false"
    />
  </div>
</template>

<style scoped>
.roles-view {
  padding: 1.5rem;
}
</style>
