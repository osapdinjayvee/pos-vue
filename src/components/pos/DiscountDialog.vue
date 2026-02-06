<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Message from 'primevue/message'
import { useCartStore } from '@/stores/cart'
import { vatService } from '@/services/vatService'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'applied'): void
  (e: 'cancel'): void
}>()

const cartStore = useCartStore()
const { totals, hasDiscount } = storeToRefs(cartStore)

// State
const activeTab = ref('0')
const seniorIdNumber = ref('')
const seniorIdName = ref('')
const pwdIdNumber = ref('')
const pwdIdName = ref('')
const percentageValue = ref<number>(0)
const fixedValue = ref<number>(0)

// Computed
const subtotal = computed(() => totals.value.subtotal)
const formattedSubtotal = computed(() => vatService.formatCurrency(subtotal.value))

const percentageDiscount = computed(() =>
  vatService.round((subtotal.value * percentageValue.value) / 100)
)
const formattedPercentageDiscount = computed(() =>
  vatService.formatCurrency(percentageDiscount.value)
)

const canApplySenior = computed(() =>
  seniorIdNumber.value.trim().length > 0 && seniorIdName.value.trim().length > 0
)

const canApplyPWD = computed(() =>
  pwdIdNumber.value.trim().length > 0 && pwdIdName.value.trim().length > 0
)

const canApplyPercentage = computed(() =>
  percentageValue.value > 0 && percentageValue.value <= 100
)

const canApplyFixed = computed(() =>
  fixedValue.value > 0 && fixedValue.value <= subtotal.value
)

// Watch for dialog open
watch(() => props.visible, (visible) => {
  if (visible) {
    resetForm()
  }
})

function resetForm() {
  seniorIdNumber.value = ''
  seniorIdName.value = ''
  pwdIdNumber.value = ''
  pwdIdName.value = ''
  percentageValue.value = 0
  fixedValue.value = 0
  activeTab.value = '0'
}

function applySeniorDiscount() {
  if (!canApplySenior.value) return

  cartStore.applySeniorDiscount(seniorIdNumber.value, seniorIdName.value)
  emit('applied')
  emit('update:visible', false)
}

function applyPWDDiscount() {
  if (!canApplyPWD.value) return

  cartStore.applyPWDDiscount(pwdIdNumber.value, pwdIdName.value)
  emit('applied')
  emit('update:visible', false)
}

function applyPercentageDiscount() {
  if (!canApplyPercentage.value) return

  cartStore.applyPercentageDiscount(percentageValue.value)
  emit('applied')
  emit('update:visible', false)
}

function applyFixedDiscount() {
  if (!canApplyFixed.value) return

  cartStore.applyFixedDiscount(fixedValue.value)
  emit('applied')
  emit('update:visible', false)
}

function handleCancel() {
  emit('update:visible', false)
  emit('cancel')
}

function removeCurrentDiscount() {
  cartStore.removeDiscount()
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    header="Apply Discount"
    :modal="true"
    :closable="true"
    :style="{ width: '500px' }"
    @hide="handleCancel"
  >
    <div class="discount-dialog">
      <!-- Current Discount Notice -->
      <Message v-if="hasDiscount" severity="info" class="mb-4">
        A discount is already applied. Applying a new discount will replace it.
        <Button
          label="Remove"
          severity="secondary"
          text
          size="small"
          @click="removeCurrentDiscount"
          class="ml-2"
        />
      </Message>

      <!-- Subtotal Display -->
      <div class="subtotal-display mb-4 p-3 border-round bg-surface-50 text-center">
        <div class="text-sm text-500">Cart Subtotal</div>
        <div class="text-xl font-bold">{{ formattedSubtotal }}</div>
      </div>

      <!-- Discount Tabs -->
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="0">Senior Citizen</Tab>
          <Tab value="1">PWD</Tab>
          <Tab value="2">Percentage</Tab>
          <Tab value="3">Fixed Amount</Tab>
        </TabList>
        <TabPanels>
          <!-- Senior Citizen Tab -->
          <TabPanel value="0">
            <div class="p-2">
              <div class="mb-3">
                <label class="block text-sm font-medium mb-2">Senior Citizen ID Number *</label>
                <InputText
                  v-model="seniorIdNumber"
                  class="w-full"
                  placeholder="Enter ID number"
                />
              </div>
              <div class="mb-3">
                <label class="block text-sm font-medium mb-2">Name on ID *</label>
                <InputText
                  v-model="seniorIdName"
                  class="w-full"
                  placeholder="Enter name as shown on ID"
                />
              </div>
              <Message severity="info" :closable="false" class="mb-3">
                <div class="text-sm">
                  <strong>20% discount</strong> on VATable items.<br />
                  Discounted items become VAT-exempt per BIR regulations.
                </div>
              </Message>
              <Button
                label="Apply Senior Citizen Discount"
                icon="pi pi-check"
                class="w-full"
                :disabled="!canApplySenior"
                @click="applySeniorDiscount"
              />
            </div>
          </TabPanel>

          <!-- PWD Tab -->
          <TabPanel value="1">
            <div class="p-2">
              <div class="mb-3">
                <label class="block text-sm font-medium mb-2">PWD ID Number *</label>
                <InputText
                  v-model="pwdIdNumber"
                  class="w-full"
                  placeholder="Enter ID number"
                />
              </div>
              <div class="mb-3">
                <label class="block text-sm font-medium mb-2">Name on ID *</label>
                <InputText
                  v-model="pwdIdName"
                  class="w-full"
                  placeholder="Enter name as shown on ID"
                />
              </div>
              <Message severity="info" :closable="false" class="mb-3">
                <div class="text-sm">
                  <strong>20% discount</strong> on VATable items.<br />
                  Discounted items become VAT-exempt per BIR regulations.
                </div>
              </Message>
              <Button
                label="Apply PWD Discount"
                icon="pi pi-check"
                class="w-full"
                :disabled="!canApplyPWD"
                @click="applyPWDDiscount"
              />
            </div>
          </TabPanel>

          <!-- Percentage Discount Tab -->
          <TabPanel value="2">
            <div class="p-2">
              <div class="mb-3">
                <label class="block text-sm font-medium mb-2">Discount Percentage</label>
                <div class="p-inputgroup">
                  <InputNumber
                    v-model="percentageValue"
                    :min="0"
                    :max="100"
                    suffix="%"
                    class="flex-1"
                  />
                </div>
              </div>
              <div v-if="percentageValue > 0" class="discount-preview p-3 border-round bg-green-50 mb-3">
                <div class="flex justify-content-between">
                  <span>Discount Amount:</span>
                  <span class="font-bold text-green-600">{{ formattedPercentageDiscount }}</span>
                </div>
              </div>
              <Button
                label="Apply Percentage Discount"
                icon="pi pi-check"
                class="w-full"
                :disabled="!canApplyPercentage"
                @click="applyPercentageDiscount"
              />
            </div>
          </TabPanel>

          <!-- Fixed Amount Tab -->
          <TabPanel value="3">
            <div class="p-2">
              <div class="mb-3">
                <label class="block text-sm font-medium mb-2">Discount Amount</label>
                <InputNumber
                  v-model="fixedValue"
                  mode="currency"
                  currency="PHP"
                  locale="en-PH"
                  :min="0"
                  :max="subtotal"
                  class="w-full"
                />
              </div>
              <Message v-if="fixedValue > subtotal" severity="warn" class="mb-3">
                Discount cannot exceed subtotal
              </Message>
              <Button
                label="Apply Fixed Discount"
                icon="pi pi-check"
                class="w-full"
                :disabled="!canApplyFixed"
                @click="applyFixedDiscount"
              />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        severity="secondary"
        @click="handleCancel"
      />
    </template>
  </Dialog>
</template>

<style scoped>
.subtotal-display {
  border: 1px solid var(--surface-border);
}

.discount-preview {
  border: 1px solid var(--green-200);
}
</style>
