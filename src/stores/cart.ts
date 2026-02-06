// Cart Store - State management for POS shopping cart
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { vatService } from '@/services/vatService'
import type { CartItem, CartTotals, TaxType } from '@/types/transaction'
import type { DiscountType } from '@/types/discount'
import type { Product, ProductVariant } from '@/types'

// Cart-specific discount application (simpler than the full DiscountApplication)
export interface CartDiscount {
  type: DiscountType | 'percentage' | 'fixed_amount'
  amount: number
  percentage?: number
  code?: string
  idNumber?: string
  idName?: string
}

export const useCartStore = defineStore('cart', () => {
  // State
  const items = ref<CartItem[]>([])
  const discount = ref<CartDiscount | null>(null)
  const customerId = ref<string | null>(null)
  const notes = ref<string>('')

  // Getters
  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  const uniqueItemCount = computed(() => items.value.length)

  const subtotal = computed(() =>
    items.value.reduce((sum, item) => sum + item.lineTotal, 0)
  )

  const totals = computed<CartTotals>(() => {
    const cartItems = items.value.map(item => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxType: item.taxType,
      lineDiscount: item.discount || 0
    }))

    let vatBreakdown = vatService.calculateCartVAT(cartItems)
    let discountAmount = 0

    if (discount.value) {
      if (discount.value.type === 'senior_citizen' || discount.value.type === 'pwd') {
        const discountResult = vatService.applySeniorPWDDiscount(cartItems, 0.20)
        discountAmount = discountResult.discountAmount
        vatBreakdown = discountResult.newVATBreakdown
      } else {
        discountAmount = discount.value.amount
      }
    }

    const totalAmount = vatBreakdown.subtotal - discountAmount

    return {
      itemCount: itemCount.value,
      subtotal: subtotal.value,
      discountTotal: discountAmount,
      vatableSales: vatBreakdown.vatableSales,
      vatAmount: vatBreakdown.vatAmount,
      vatExemptSales: vatBreakdown.vatExemptSales,
      zeroRatedSales: vatBreakdown.zeroRatedSales,
      grandTotal: totalAmount
    }
  })

  const isEmpty = computed(() => items.value.length === 0)

  const hasDiscount = computed(() => discount.value !== null)

  // Actions
  function addItem(
    product: Product,
    variant?: ProductVariant,
    quantity: number = 1
  ): void {
    const existingIndex = findItemIndex(product.id, variant?.id)

    if (existingIndex >= 0) {
      // Update existing item quantity
      const item = items.value[existingIndex]
      if (item) {
        item.quantity += quantity
        item.lineTotal = vatService.round(item.unitPrice * item.quantity - (item.discount || 0))
      }
    } else {
      // Add new item
      const unitPrice = variant?.price_override ?? product.price
      const taxType = (product.tax_type || 'vatable') as TaxType

      const newItem: CartItem = {
        id: generateItemId(),
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name ?? undefined,
        sku: variant?.sku ?? product.sku ?? '',
        barcode: variant?.barcode ?? product.barcode ?? '',
        unitPrice,
        quantity,
        lineTotal: vatService.round(unitPrice * quantity),
        taxType,
        discount: 0
      }

      items.value.push(newItem)
    }
  }

  function addItemByBarcode(
    barcode: string,
    product: Product,
    variant?: ProductVariant,
    quantity: number = 1
  ): void {
    addItem(product, variant, quantity)
  }

  function updateItemQuantity(itemId: string, quantity: number): void {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    item.quantity = quantity
    item.lineTotal = vatService.round(item.unitPrice * item.quantity - (item.discount || 0))
  }

  function incrementItemQuantity(itemId: string): void {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      updateItemQuantity(itemId, item.quantity + 1)
    }
  }

  function decrementItemQuantity(itemId: string): void {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      updateItemQuantity(itemId, item.quantity - 1)
    }
  }

  function removeItem(itemId: string): void {
    const index = items.value.findIndex(i => i.id === itemId)
    if (index >= 0) {
      items.value.splice(index, 1)
    }
  }

  function setItemDiscount(itemId: string, discountAmount: number): void {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    item.discount = discountAmount
    item.lineTotal = vatService.round(item.unitPrice * item.quantity - discountAmount)
  }

  function applyDiscount(discountApplication: CartDiscount): void {
    discount.value = discountApplication
  }

  function removeDiscount(): void {
    discount.value = null
  }

  function applySeniorDiscount(idNumber: string, idName: string): void {
    discount.value = {
      type: 'senior_citizen',
      amount: 0, // Will be calculated in totals
      idNumber,
      idName
    }
  }

  function applyPWDDiscount(idNumber: string, idName: string): void {
    discount.value = {
      type: 'pwd',
      amount: 0, // Will be calculated in totals
      idNumber,
      idName
    }
  }

  function applyPercentageDiscount(percentage: number, code?: string): void {
    const discountAmount = vatService.round(subtotal.value * (percentage / 100))
    discount.value = {
      type: 'percentage',
      amount: discountAmount,
      percentage,
      code
    }
  }

  function applyFixedDiscount(amount: number, code?: string): void {
    discount.value = {
      type: 'fixed_amount',
      amount: Math.min(amount, subtotal.value),
      code
    }
  }

  function setCustomer(id: string | null): void {
    customerId.value = id
  }

  function setNotes(text: string): void {
    notes.value = text
  }

  function clearCart(): void {
    items.value = []
    discount.value = null
    customerId.value = null
    notes.value = ''
  }

  function getCartData() {
    return {
      items: items.value,
      discount: discount.value,
      customerId: customerId.value,
      notes: notes.value,
      totals: totals.value
    }
  }

  // Helper functions
  function findItemIndex(productId: string, variantId?: string): number {
    return items.value.findIndex(item =>
      item.productId === productId && item.variantId === variantId
    )
  }

  function generateItemId(): string {
    return `ci_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function findItemByBarcode(barcode: string): CartItem | undefined {
    return items.value.find(item => item.barcode === barcode)
  }

  function findItemBySku(sku: string): CartItem | undefined {
    return items.value.find(item => item.sku === sku)
  }

  return {
    // State
    items,
    discount,
    customerId,
    notes,

    // Getters
    itemCount,
    uniqueItemCount,
    subtotal,
    totals,
    isEmpty,
    hasDiscount,

    // Actions
    addItem,
    addItemByBarcode,
    updateItemQuantity,
    incrementItemQuantity,
    decrementItemQuantity,
    removeItem,
    setItemDiscount,
    applyDiscount,
    removeDiscount,
    applySeniorDiscount,
    applyPWDDiscount,
    applyPercentageDiscount,
    applyFixedDiscount,
    setCustomer,
    setNotes,
    clearCart,
    getCartData,

    // Helpers
    findItemByBarcode,
    findItemBySku
  }
})
