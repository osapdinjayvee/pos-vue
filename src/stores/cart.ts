// Cart Store - State management for POS shopping cart
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { vatService } from '@/services/vatService'
import type { CartItem, CartTotals, TaxType } from '@/types/transaction'
import type { DiscountType, EligibleDiscount } from '@/types/discount'
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
  const pendingDiscountItemId = ref<string | null>(null)

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
        const discountResult = vatService.applySeniorPWDDiscount(cartItems, discount.value.type)
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

  // Wholesale pricing helpers
  function shouldApplyWholesale(product: Product, qty: number): boolean {
    return !!(
      product.auto_apply_wholesale &&
      product.wholesale_price != null &&
      product.wholesale_price > 0 &&
      product.wholesale_min_qty &&
      qty >= product.wholesale_min_qty
    )
  }

  function recalcWholesale(item: CartItem): void {
    if (!item.autoApplyWholesale || !item.wholesalePrice || !item.wholesaleMinQty) return

    const shouldBeWholesale = item.quantity >= item.wholesaleMinQty

    if (shouldBeWholesale && !item.isWholesale) {
      // Switch to wholesale price
      item.originalPrice = item.originalPrice ?? item.unitPrice
      item.unitPrice = item.wholesalePrice
      item.isWholesale = true
    } else if (!shouldBeWholesale && item.isWholesale && item.originalPrice != null) {
      // Revert to regular price
      item.unitPrice = item.originalPrice
      item.isWholesale = false
    }

    item.lineTotal = vatService.round(item.unitPrice * item.quantity - (item.discount || 0))
  }

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
        recalcWholesale(item)
        item.lineTotal = vatService.round(item.unitPrice * item.quantity - (item.discount || 0))
      }
    } else {
      // Add new item
      const basePrice = variant?.price_override ?? product.price
      const taxType = (product.tax_type || 'vatable') as TaxType
      const isWholesale = shouldApplyWholesale(product, quantity)
      const unitPrice = isWholesale ? product.wholesale_price! : basePrice

      const newItem: CartItem = {
        id: generateItemId(),
        productId: product.id,
        variantId: variant?.id,
        productName: product.name,
        variantName: variant?.name ?? undefined,
        image: product.image || undefined,
        sku: variant?.sku ?? product.sku ?? '',
        barcode: variant?.barcode ?? product.barcode ?? '',
        unitPrice,
        quantity,
        lineTotal: vatService.round(unitPrice * quantity),
        taxType,
        discount: 0,
        categoryId: product.category_id,
        // Wholesale tracking
        originalPrice: isWholesale ? basePrice : undefined,
        isWholesale,
        wholesalePrice: product.wholesale_price ?? undefined,
        wholesaleMinQty: product.wholesale_min_qty ?? undefined,
        autoApplyWholesale: !!(product.auto_apply_wholesale && product.wholesale_price)
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
    // Recalculate wholesale pricing when quantity changes
    recalcWholesale(item)
    // Recalculate promo discount if applied
    if (item.discountId) {
      // For percentage-based, the amount changes with qty; for fixed it stays capped
      // We just keep the existing discount amount, but cap it at the new subtotal
      const newSubtotal = item.unitPrice * item.quantity
      if (item.discount && item.discount > newSubtotal) {
        item.discount = newSubtotal
      }
    }
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
    if (pendingDiscountItemId.value === itemId) {
      pendingDiscountItemId.value = null
    }
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

  function setItemPromoDiscount(itemId: string, eligible: EligibleDiscount | null): void {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return

    if (eligible) {
      item.discountId = eligible.discount.id
      item.discountName = eligible.discount.name
      item.discount = eligible.computedAmount
    } else {
      item.discountId = undefined
      item.discountName = undefined
      item.discount = 0
    }
    item.lineTotal = vatService.round(item.unitPrice * item.quantity - (item.discount || 0))
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
    pendingDiscountItemId.value = null
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
    pendingDiscountItemId,

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
    setItemPromoDiscount,
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
