<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import Select from 'primevue/select'
import Button from 'primevue/button'
import type { Customer } from '@/types/order'

const props = defineProps<{
  visible: boolean
  customer: Customer
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'submit', data: { amount: number; paymentMethod: string; referenceNumber?: string; notes?: string }): void
}>()

const amount = ref<number>(0)
const paymentMethod = ref('cash')
const referenceNumber = ref('')
const notes = ref('')

const paymentOptions = [
  { label: 'Cash', value: 'cash' },
  { label: 'GCash', value: 'gcash' },
  { label: 'Maya', value: 'maya' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Check', value: 'check' }
]

const currentBalance = computed(() => props.customer?.current_balance ?? 0)
const remainingAfter = computed(() => Math.max(0, currentBalance.value - (amount.value || 0)))
const canSubmit = computed(() => amount.value > 0 && amount.value <= currentBalance.value)

watch(() => props.visible, (v) => {
  if (v) {
    amount.value = 0
    paymentMethod.value = 'cash'
    referenceNumber.value = ''
    notes.value = ''
  }
})

function handleSubmit() {
  if (!canSubmit.value) return
  emit('submit', {
    amount: amount.value,
    paymentMethod: paymentMethod.value,
    referenceNumber: referenceNumber.value || undefined,
    notes: notes.value || undefined
  })
}

function formatCurrency(val: number): string {
  return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Receive Payment (Bayad Utang)"
    modal
    :style="{ width: '28rem' }"
  >
    <div class="flex flex-col gap-4">
      <!-- Outstanding Balance -->
      <div class="p-3 rounded-lg bg-red-50 border border-red-200">
        <div class="text-sm text-red-600">Outstanding Balance</div>
        <div class="text-2xl font-bold text-red-700">{{ formatCurrency(currentBalance) }}</div>
      </div>

      <!-- Amount -->
      <div>
        <label class="block text-sm font-medium mb-1">Payment Amount</label>
        <InputNumber
          v-model="amount"
          mode="currency"
          currency="PHP"
          locale="en-PH"
          :min="0"
          :max="currentBalance"
          class="w-full"
          placeholder="Enter amount"
        />
        <div class="flex justify-between mt-1">
          <button class="text-xs text-blue-600 hover:underline cursor-pointer" @click="amount = currentBalance">
            Pay Full Balance
          </button>
        </div>
      </div>

      <!-- Payment Method -->
      <div>
        <label class="block text-sm font-medium mb-1">Payment Method</label>
        <Select
          v-model="paymentMethod"
          :options="paymentOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <!-- Reference Number -->
      <div v-if="paymentMethod !== 'cash'">
        <label class="block text-sm font-medium mb-1">Reference Number</label>
        <InputText v-model="referenceNumber" class="w-full" placeholder="Enter reference number" />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium mb-1">Notes (optional)</label>
        <Textarea v-model="notes" class="w-full" rows="2" placeholder="e.g. Partial payment" />
      </div>

      <!-- Remaining Balance Preview -->
      <div v-if="amount > 0" class="p-3 rounded-lg bg-green-50 border border-green-200">
        <div class="text-sm text-green-600">Remaining Balance After Payment</div>
        <div class="text-xl font-bold text-green-700">{{ formatCurrency(remainingAfter) }}</div>
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text @click="emit('update:visible', false)" />
      <Button label="Receive Payment" icon="pi pi-check" :disabled="!canSubmit" @click="handleSubmit" />
    </template>
  </Dialog>
</template>
