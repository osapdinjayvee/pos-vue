<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Message from 'primevue/message'
import { useConfirm } from 'primevue/useconfirm'
import CartItemComponent from './CartItem.vue'
import CustomerSearch from '@/components/crm/CustomerSearch.vue'
import CustomerRegistration from '@/components/crm/CustomerRegistration.vue'
import { useCartStore } from '@/stores/cart'
import { vatService } from '@/services/vatService'
import { tierService } from '@/services/tierService'
import type { Customer } from '@/types/order'

const confirm = useConfirm()
const cartStore = useCartStore()
const { items, totals, isEmpty, hasDiscount, discount, customerId } = storeToRefs(cartStore)

const emit = defineEmits<{
  (e: 'checkout'): void
  (e: 'apply-discount'): void
  (e: 'clear-cart'): void
}>()

// Customer state
const selectedCustomer = ref<Customer | null>(null)
const showRegistration = ref(false)

async function handleCustomerSelected(customer: Customer | null) {
  selectedCustomer.value = customer
  cartStore.setCustomer(customer?.id ?? null)
  await applyTierDiscount(customer)
}

async function handleCustomerRegistered(customer: Customer) {
  selectedCustomer.value = customer
  cartStore.setCustomer(customer.id)
  showRegistration.value = false
  await applyTierDiscount(customer)
}

async function applyTierDiscount(customer: Customer | null) {
  // Remove existing tier discount when customer changes
  if (discount.value?.type === 'percentage' && discount.value?.code === 'tier_discount') {
    cartStore.removeDiscount()
  }
  if (!customer?.tier_id) return
  try {
    const tier = await tierService.getTierForCustomer(customer.id)
    if (tier && tier.discount_rate > 0 && !hasDiscount.value) {
      const pct = tier.discount_rate * 100
      cartStore.applyPercentageDiscount(pct, 'tier_discount')
    }
  } catch {
    // Non-blocking - tier discount is optional
  }
}

// Clear customer when cart is cleared
watch(customerId, (val) => {
  if (!val) {
    selectedCustomer.value = null
  }
})

const formattedSubtotal = computed(() =>
  vatService.formatCurrency(totals.value.subtotal)
)

const formattedDiscount = computed(() =>
  totals.value.discountTotal > 0
    ? vatService.formatCurrency(totals.value.discountTotal)
    : null
)

const formattedVatableSales = computed(() =>
  totals.value.vatableSales > 0
    ? vatService.formatCurrency(totals.value.vatableSales)
    : null
)

const formattedVatAmount = computed(() =>
  totals.value.vatAmount > 0
    ? vatService.formatCurrency(totals.value.vatAmount)
    : null
)

const formattedVatExempt = computed(() =>
  totals.value.vatExemptSales > 0
    ? vatService.formatCurrency(totals.value.vatExemptSales)
    : null
)

const formattedZeroRated = computed(() =>
  totals.value.zeroRatedSales > 0
    ? vatService.formatCurrency(totals.value.zeroRatedSales)
    : null
)

const formattedTotal = computed(() =>
  vatService.formatCurrency(totals.value.grandTotal)
)

const discountLabel = computed(() => {
  if (!discount.value) return ''
  if (discount.value.type === 'senior_citizen') return 'Senior Citizen (20%)'
  if (discount.value.type === 'pwd') return 'PWD (20%)'
  if (discount.value.percentage) return `${discount.value.percentage}% off`
  return 'Discount'
})

function handleIncrement(itemId: string) {
  cartStore.incrementItemQuantity(itemId)
}

function handleDecrement(itemId: string) {
  cartStore.decrementItemQuantity(itemId)
}

function handleRemove(itemId: string) {
  const item = items.value.find(i => i.id === itemId)
  confirm.require({
    message: `Remove "${item?.productName || 'this item'}" from the cart?`,
    header: 'Remove Item',
    icon: 'pi pi-trash',
    rejectLabel: 'Cancel',
    acceptLabel: 'Remove',
    acceptClass: 'p-button-danger',
    accept: () => cartStore.removeItem(itemId)
  })
}

function handleUpdateQuantity(itemId: string, quantity: number) {
  cartStore.updateItemQuantity(itemId, quantity)
}

function handleRemoveDiscount() {
  cartStore.removeDiscount()
}
</script>

<template>
  <div class="cart-view flex flex-column h-full">
    <!-- Cart Header -->
    <div class="cart-header p-3 border-bottom-1 surface-border">
      <div class="flex justify-content-between align-items-center mb-2">
        <h3 class="m-0 text-lg font-semibold">Cart</h3>
        <div class="flex align-items-center gap-2">
          <span class="text-sm text-500">{{ totals.itemCount }} items</span>
          <Button
            v-if="!isEmpty"
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            @click="emit('clear-cart')"
            v-tooltip.left="'Clear Cart'"
          />
        </div>
      </div>
      <CustomerSearch
        :modelValue="selectedCustomer"
        compact
        placeholder="Attach customer..."
        @update:modelValue="handleCustomerSelected"
        @register="showRegistration = true"
      />
    </div>

    <!-- Customer Registration Dialog -->
    <CustomerRegistration
      :visible="showRegistration"
      @update:visible="showRegistration = $event"
      @registered="handleCustomerRegistered"
    />

    <!-- Cart Items -->
    <div class="cart-items flex-1 overflow-y-auto">
      <template v-if="isEmpty">
        <div class="flex flex-column align-items-center justify-content-center h-full p-4 text-center">
          <i class="pi pi-shopping-cart text-5xl text-300 mb-3"></i>
          <p class="text-500 m-0">Cart is empty</p>
          <p class="text-sm text-400 mt-2">Scan or search for products to add</p>
        </div>
      </template>

      <template v-else>
        <CartItemComponent
          v-for="item in items"
          :key="item.id"
          :item="item"
          :editable="true"
          @increment="handleIncrement(item.id)"
          @decrement="handleDecrement(item.id)"
          @remove="handleRemove(item.id)"
          @update-quantity="(qty) => handleUpdateQuantity(item.id, qty)"
        />
      </template>
    </div>

    <!-- Discount Banner -->
    <div v-if="hasDiscount" class="discount-banner p-3 bg-green-50 border-top-1 border-green-200">
      <div class="flex justify-content-between align-items-center">
        <div>
          <span class="font-medium text-green-700">{{ discountLabel }}</span>
          <div v-if="discount?.idNumber" class="text-sm text-green-600">
            ID: {{ discount.idNumber }}
          </div>
        </div>
        <Button
          icon="pi pi-times"
          severity="success"
          text
          rounded
          size="small"
          @click="handleRemoveDiscount"
        />
      </div>
    </div>

    <!-- Cart Totals -->
    <div class="cart-totals p-3 border-top-1 surface-border bg-surface-50">
      <div class="totals-grid">
        <div class="flex justify-content-between text-sm mb-2">
          <span class="text-600">Subtotal:</span>
          <span>{{ formattedSubtotal }}</span>
        </div>

        <div v-if="formattedDiscount" class="flex justify-content-between text-sm mb-2 text-green-600">
          <span>Discount:</span>
          <span>-{{ formattedDiscount }}</span>
        </div>

        <Divider class="my-2" />

        <!-- VAT Breakdown -->
        <div class="vat-breakdown text-xs text-500 mb-2">
          <div v-if="formattedVatableSales" class="flex justify-content-between mb-1">
            <span>VATable Sales:</span>
            <span>{{ formattedVatableSales }}</span>
          </div>
          <div v-if="formattedVatAmount" class="flex justify-content-between mb-1">
            <span>VAT (12%):</span>
            <span>{{ formattedVatAmount }}</span>
          </div>
          <div v-if="formattedVatExempt" class="flex justify-content-between mb-1">
            <span>VAT-Exempt:</span>
            <span>{{ formattedVatExempt }}</span>
          </div>
          <div v-if="formattedZeroRated" class="flex justify-content-between mb-1">
            <span>Zero-Rated:</span>
            <span>{{ formattedZeroRated }}</span>
          </div>
        </div>

        <Divider class="my-2" />

        <div class="flex justify-content-between font-bold text-xl">
          <span>Total:</span>
          <span class="text-primary">{{ formattedTotal }}</span>
        </div>
      </div>
    </div>

    <!-- Cart Actions -->
    <div class="cart-actions p-3 border-top-1 surface-border">
      <div class="flex gap-2">
        <Button
          label="Discount"
          icon="pi pi-percentage"
          severity="secondary"
          outlined
          class="flex-1"
          :disabled="isEmpty"
          @click="emit('apply-discount')"
        />
        <Button
          label="Checkout"
          icon="pi pi-credit-card"
          class="flex-1"
          :disabled="isEmpty"
          @click="emit('checkout')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.cart-view {
  background: var(--surface-card);
  border-radius: var(--border-radius);
}

.cart-items {
  min-height: 200px;
}

.vat-breakdown {
  background: var(--surface-ground);
  padding: 0.5rem;
  border-radius: var(--border-radius);
}
</style>
