<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import CustomerList from '@/components/customers/CustomerList.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import { useCustomerStore } from '@/stores/customer'
import type { Customer, CustomerInput } from '@/types/order'

const toast = useToast()
const confirm = useConfirm()
const router = useRouter()
const customerStore = useCustomerStore()

const searchQuery = ref('')
const showCustomerForm = ref(false)
const editingCustomer = ref<Customer | null>(null)
const formLoading = ref(false)

const customerListRef = ref<InstanceType<typeof CustomerList> | null>(null)

function handleAddCustomer() {
  editingCustomer.value = null
  showCustomerForm.value = true
}

function handleEditCustomer(customer: Customer) {
  editingCustomer.value = customer
  showCustomerForm.value = true
}

async function handleSaveCustomer(data: CustomerInput) {
  formLoading.value = true
  try {
    if (editingCustomer.value) {
      await customerStore.update(editingCustomer.value.id, data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Customer updated successfully',
        life: 3000
      })
    } else {
      await customerStore.create(data)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Customer created successfully',
        life: 3000
      })
    }
    showCustomerForm.value = false
    customerListRef.value?.loadCustomers()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to save customer',
      life: 5000
    })
  } finally {
    formLoading.value = false
  }
}

function handleDeleteCustomer(customer: Customer) {
  confirm.require({
    message: `Are you sure you want to delete "${customer.name}"?`,
    header: 'Delete Customer',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary p-button-outlined',
    acceptClass: 'p-button-danger',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    accept: async () => {
      try {
        await customerStore.remove(customer.id)
        toast.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Customer deleted successfully',
          life: 3000
        })
        customerListRef.value?.loadCustomers()
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: error instanceof Error ? error.message : 'Failed to delete customer',
          life: 5000
        })
      }
    }
  })
}

function handleViewCustomer(customer: Customer) {
  router.push({ name: 'customer-detail', params: { id: customer.id } })
}
</script>

<template>
  <div class="customers-view">
    <Toast />
    <ConfirmDialog />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Customers</h1>
          <p class="text-muted">Manage customer information</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search customers..." />
        </IconField>
        <Button label="Add Customer" icon="pi pi-plus" @click="handleAddCustomer" />
      </div>
    </div>

    <div class="table-container">
      <CustomerList
        ref="customerListRef"
        :search="searchQuery"
        @add="handleAddCustomer"
        @edit="handleEditCustomer"
        @delete="handleDeleteCustomer"
        @view="handleViewCustomer"
      />
    </div>

    <CustomerForm
      v-model:visible="showCustomerForm"
      :customer="editingCustomer"
      :loading="formLoading"
      @save="handleSaveCustomer"
    />
  </div>
</template>

<style scoped>
.customers-view {
  padding: 1.5rem;
}

@media (max-width: 879.98px) {
  .customers-view {
    padding: 0.5rem;
  }
}
</style>
