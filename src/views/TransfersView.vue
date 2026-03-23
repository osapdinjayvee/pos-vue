<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import Toast from 'primevue/toast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import TransferList from '@/components/inventory/TransferList.vue'
import TransferForm from '@/components/inventory/TransferForm.vue'
import { inventoryService } from '@/services/inventoryService'
import type { TransferFormData } from '@/components/inventory/TransferForm.vue'

const toast = useToast()

const searchQuery = ref('')
const showTransferForm = ref(false)
const formLoading = ref(false)

const transferListRef = ref<InstanceType<typeof TransferList> | null>(null)

function handleNewTransfer() {
  showTransferForm.value = true
}

async function handleSaveTransfer(data: TransferFormData) {
  formLoading.value = true
  try {
    await inventoryService.transferStock(
      data.from_variant_id,
      data.to_variant_id,
      data.quantity,
      {
        reference: data.reference,
        notes: data.notes
      }
    )
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Stock transferred successfully',
      life: 3000
    })
    showTransferForm.value = false
    transferListRef.value?.loadTransfers()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error instanceof Error ? error.message : 'Failed to transfer stock',
      life: 5000
    })
  } finally {
    formLoading.value = false
  }
}
</script>

<template>
  <div class="transfers-view">
    <Toast />

    <div class="view-header">
      <div class="header-left">
        <div>
          <h1>Transfers</h1>
          <p class="text-muted">Stock transfers between variants</p>
        </div>
      </div>
      <div class="header-actions">
        <IconField>
          <InputIcon class="pi pi-search" />
          <InputText v-model="searchQuery" placeholder="Search transfers..." />
        </IconField>
        <Button label="New Transfer" icon="pi pi-arrow-right-arrow-left" @click="handleNewTransfer" />
      </div>
    </div>

    <div class="table-container">
      <TransferList
        ref="transferListRef"
        :search="searchQuery"
        @new-transfer="handleNewTransfer"
      />
    </div>

    <TransferForm
      v-model:visible="showTransferForm"
      :loading="formLoading"
      @save="handleSaveTransfer"
    />
  </div>
</template>

<style scoped>
.transfers-view {
  padding: 1.5rem;
}

@media (max-width: 879.98px) {
  .transfers-view {
    padding: 0.5rem;
  }
}
</style>
