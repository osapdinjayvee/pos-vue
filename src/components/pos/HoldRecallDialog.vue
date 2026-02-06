<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import { useCartStore } from '@/stores/cart'
import { useConfirm } from 'primevue/useconfirm'
import { vatService } from '@/services/vatService'
import type { CartItem, CartTotals } from '@/types/transaction'
import type { CartDiscount } from '@/stores/cart'

const STORAGE_KEY = 'pos_held_transactions'
const MAX_HELD = 10

export interface HeldTransaction {
  id: string
  label: string
  items: CartItem[]
  discount: CartDiscount | null
  customerId: string | null
  notes: string
  totals: CartTotals
  heldAt: string
}

const props = defineProps<{
  visible: boolean
  mode: 'hold' | 'recall'
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'held'): void
  (e: 'recalled'): void
}>()

const cartStore = useCartStore()
const confirm = useConfirm()

const activeTab = ref<string>(props.mode)
const holdLabel = ref('')
const error = ref<string | null>(null)
const heldTransactions = ref<HeldTransaction[]>([])

watch(() => props.visible, (visible) => {
  if (visible) {
    activeTab.value = props.mode
    holdLabel.value = ''
    error.value = null
    loadHeldTransactions()
  }
})

watch(() => props.mode, (mode) => {
  activeTab.value = mode
})

const canHold = computed(() => !cartStore.isEmpty)

const holdCount = computed(() => heldTransactions.value.length)

function loadHeldTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    heldTransactions.value = raw ? JSON.parse(raw) : []
  } catch {
    heldTransactions.value = []
  }
}

function saveHeldTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(heldTransactions.value))
}

function handleHold() {
  if (cartStore.isEmpty) {
    error.value = 'Cart is empty — nothing to hold'
    return
  }

  if (heldTransactions.value.length >= MAX_HELD) {
    error.value = `Maximum of ${MAX_HELD} held transactions reached. Please recall or delete one first.`
    return
  }

  const cartData = cartStore.getCartData()
  const held: HeldTransaction = {
    id: `held_${Date.now()}`,
    label: holdLabel.value.trim() || `Transaction #${heldTransactions.value.length + 1}`,
    items: JSON.parse(JSON.stringify(cartData.items)),
    discount: cartData.discount ? JSON.parse(JSON.stringify(cartData.discount)) : null,
    customerId: cartData.customerId,
    notes: cartData.notes,
    totals: { ...cartData.totals },
    heldAt: new Date().toISOString()
  }

  heldTransactions.value.push(held)
  saveHeldTransactions()
  cartStore.clearCart()
  emit('held')
  close()
}

function handleRecall(held: HeldTransaction) {
  if (!cartStore.isEmpty) {
    confirm.require({
      message: 'Current cart has items. Replace with the held transaction?',
      header: 'Replace Cart',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Replace',
      rejectLabel: 'Cancel',
      acceptClass: 'p-button-warning',
      accept: () => restoreTransaction(held)
    })
  } else {
    restoreTransaction(held)
  }
}

function restoreTransaction(held: HeldTransaction) {
  cartStore.clearCart()

  // Restore items
  for (const item of held.items) {
    // Re-add items directly to the store
    cartStore.items.push({ ...item })
  }

  // Restore discount
  if (held.discount) {
    cartStore.applyDiscount(held.discount)
  }

  // Restore customer
  if (held.customerId) {
    cartStore.setCustomer(held.customerId)
  }

  // Restore notes
  if (held.notes) {
    cartStore.setNotes(held.notes)
  }

  // Remove from held list
  removeHeld(held.id)
  emit('recalled')
  close()
}

function handleDeleteHeld(held: HeldTransaction) {
  confirm.require({
    message: `Delete held transaction "${held.label}"? This cannot be undone.`,
    header: 'Delete Held Transaction',
    icon: 'pi pi-trash',
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptClass: 'p-button-danger',
    accept: () => removeHeld(held.id)
  })
}

function removeHeld(id: string) {
  heldTransactions.value = heldTransactions.value.filter(h => h.id !== id)
  saveHeldTransactions()
}

function formatCurrency(value: number): string {
  return vatService.formatCurrency(value)
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="emit('update:visible', $event)"
    :modal="true"
    :closable="false"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0, borderRadius: 0 }"
    :pt="{
      header: { style: 'display: none' },
      content: { style: 'padding: 0; flex: 1; overflow: hidden' },
      footer: { style: 'display: none' }
    }"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <i class="pi pi-pause-circle text-amber-600 text-lg"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-neutral-900 m-0">Hold & Recall</h2>
            <p class="text-sm text-neutral-500 m-0">Suspend or restore transactions</p>
          </div>
        </div>
        <button
          @click="close"
          class="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer border-none bg-transparent"
        >
          <i class="pi pi-times text-lg"></i>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex-1 min-h-0 flex flex-col">
        <Tabs v-model:value="activeTab" class="flex-1 flex flex-col min-h-0">
          <TabList class="px-6">
            <Tab value="hold">
              <i class="pi pi-pause mr-2"></i>Hold Transaction
            </Tab>
            <Tab value="recall">
              <i class="pi pi-replay mr-2"></i>Recall
              <span v-if="holdCount > 0" class="ml-2 bg-amber-500 text-white text-xs rounded-full px-2 py-0.5">{{ holdCount }}</span>
            </Tab>
          </TabList>

          <TabPanels class="flex-1 min-h-0 overflow-auto">
            <!-- Hold Tab -->
            <TabPanel value="hold" class="p-6">
              <div v-if="canHold" class="max-w-lg mx-auto">
                <!-- Current cart summary -->
                <div class="bg-neutral-50 rounded-xl p-4 mb-5 border border-neutral-200">
                  <h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-wider m-0 mb-3">Current Cart</h3>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-neutral-600">Items</span>
                    <span class="font-semibold">{{ cartStore.itemCount }} ({{ cartStore.uniqueItemCount }} unique)</span>
                  </div>
                  <div class="flex justify-between text-sm mb-1">
                    <span class="text-neutral-600">Subtotal</span>
                    <span class="font-semibold">{{ formatCurrency(cartStore.totals.subtotal) }}</span>
                  </div>
                  <div v-if="cartStore.hasDiscount" class="flex justify-between text-sm mb-1">
                    <span class="text-green-600">Discount</span>
                    <span class="font-semibold text-green-600">-{{ formatCurrency(cartStore.totals.discountTotal) }}</span>
                  </div>
                  <div class="flex justify-between text-base mt-3 pt-3 border-t border-neutral-200">
                    <span class="font-bold text-neutral-900">Total</span>
                    <span class="font-bold text-neutral-900">{{ formatCurrency(cartStore.totals.grandTotal) }}</span>
                  </div>
                </div>

                <!-- Label input -->
                <div class="mb-5">
                  <label class="block text-sm font-medium text-neutral-700 mb-2">Label (optional)</label>
                  <InputText
                    v-model="holdLabel"
                    placeholder="e.g., Table 3, Juan's order..."
                    class="w-full"
                    @keydown.enter="handleHold"
                  />
                  <p class="text-xs text-neutral-400 mt-1">Give this transaction a name to find it easily later</p>
                </div>

                <Message v-if="error" severity="error" class="mb-4" :closable="false">{{ error }}</Message>

                <Button
                  label="Hold Transaction"
                  icon="pi pi-pause"
                  class="w-full"
                  severity="warn"
                  @click="handleHold"
                />

                <p class="text-xs text-neutral-400 text-center mt-3">
                  {{ holdCount }}/{{ MAX_HELD }} slots used
                </p>
              </div>

              <!-- Empty cart state -->
              <div v-else class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <i class="pi pi-shopping-cart text-2xl text-neutral-400"></i>
                </div>
                <p class="text-neutral-500 font-medium m-0 mb-1">Cart is empty</p>
                <p class="text-sm text-neutral-400 m-0">Add items to the cart before holding</p>
              </div>
            </TabPanel>

            <!-- Recall Tab -->
            <TabPanel value="recall" class="p-6">
              <div v-if="heldTransactions.length > 0" class="max-w-2xl mx-auto grid gap-3">
                <div
                  v-for="held in heldTransactions"
                  :key="held.id"
                  class="bg-white rounded-xl border border-neutral-200 p-4 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer group"
                  @click="handleRecall(held)"
                >
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <h3 class="text-base font-bold text-neutral-900 m-0">{{ held.label }}</h3>
                      <p class="text-xs text-neutral-400 m-0 mt-1">
                        {{ formatDate(held.heldAt) }} at {{ formatTime(held.heldAt) }}
                      </p>
                    </div>
                    <button
                      @click.stop="handleDeleteHeld(held)"
                      class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent opacity-0 group-hover:opacity-100"
                    >
                      <i class="pi pi-trash text-sm"></i>
                    </button>
                  </div>

                  <div class="flex items-center gap-4 text-sm">
                    <span class="text-neutral-500">
                      <i class="pi pi-box mr-1"></i>{{ held.totals.itemCount }} item{{ held.totals.itemCount !== 1 ? 's' : '' }}
                    </span>
                    <span class="font-bold text-neutral-900 ml-auto text-base">
                      {{ formatCurrency(held.totals.grandTotal) }}
                    </span>
                  </div>

                  <!-- Item preview -->
                  <div class="mt-3 pt-3 border-t border-neutral-100">
                    <div v-for="(item, idx) in held.items.slice(0, 3)" :key="idx" class="text-xs text-neutral-500 mb-0.5">
                      {{ item.quantity }}x {{ item.productName }}
                      <span v-if="item.variantName" class="text-neutral-400"> - {{ item.variantName }}</span>
                    </div>
                    <div v-if="held.items.length > 3" class="text-xs text-neutral-400 mt-1">
                      +{{ held.items.length - 3 }} more item{{ held.items.length - 3 !== 1 ? 's' : '' }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty state -->
              <div v-else class="flex flex-col items-center justify-center py-16 text-center">
                <div class="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
                  <i class="pi pi-inbox text-2xl text-neutral-400"></i>
                </div>
                <p class="text-neutral-500 font-medium m-0 mb-1">No held transactions</p>
                <p class="text-sm text-neutral-400 m-0">Hold a transaction to recall it later</p>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-neutral-200 bg-white flex justify-end">
        <Button label="Close" icon="pi pi-times" severity="secondary" @click="close" />
      </div>
    </div>
  </Dialog>
</template>
