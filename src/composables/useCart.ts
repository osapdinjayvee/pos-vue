// useCart composable - Provides cart functionality for POS
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCartStore } from '@/stores/cart'
import { vatService } from '@/services/vatService'
import type { CartItem, TaxType } from '@/types/transaction'
import type { Product, ProductVariant } from '@/types'

export function useCart() {
  const cartStore = useCartStore()
  const {
    items,
    discount,
    customerId,
    notes,
    itemCount,
    uniqueItemCount,
    subtotal,
    totals,
    isEmpty,
    hasDiscount
  } = storeToRefs(cartStore)

  // Formatted values
  const formattedSubtotal = computed(() =>
    vatService.formatCurrency(subtotal.value)
  )

  const formattedTotal = computed(() =>
    vatService.formatCurrency(totals.value.grandTotal)
  )

  const formattedDiscount = computed(() =>
    totals.value.discountTotal > 0
      ? vatService.formatCurrency(totals.value.discountTotal)
      : null
  )

  const formattedVAT = computed(() =>
    totals.value.vatAmount > 0
      ? vatService.formatCurrency(totals.value.vatAmount)
      : null
  )

  // VAT breakdown for display
  const vatBreakdown = computed(() => {
    const { vatableSales, vatAmount, vatExemptSales, zeroRatedSales } = totals.value
    return vatService.generateVATSummary({
      subtotal: subtotal.value,
      vatableSales,
      vatAmount,
      vatExemptSales,
      zeroRatedSales,
      totalSales: totals.value.grandTotal
    })
  })

  // Add product to cart
  function addProduct(product: Product, variant?: ProductVariant, quantity: number = 1) {
    cartStore.addItem(product, variant, quantity)
  }

  // Add by barcode (with lookup callback)
  async function addByBarcode(
    barcode: string,
    lookupFn: (barcode: string) => Promise<{ product: Product; variant?: ProductVariant } | null>
  ): Promise<{ success: boolean; error?: string }> {
    const result = await lookupFn(barcode)

    if (result) {
      cartStore.addItem(result.product, result.variant, 1)
      return { success: true }
    }

    return { success: false, error: `Product not found for barcode: ${barcode}` }
  }

  // Update item quantity
  function updateQuantity(itemId: string, quantity: number) {
    cartStore.updateItemQuantity(itemId, quantity)
  }

  // Increment quantity
  function incrementQuantity(itemId: string) {
    cartStore.incrementItemQuantity(itemId)
  }

  // Decrement quantity
  function decrementQuantity(itemId: string) {
    cartStore.decrementItemQuantity(itemId)
  }

  // Remove item
  function removeItem(itemId: string) {
    cartStore.removeItem(itemId)
  }

  // Clear cart
  function clearCart() {
    cartStore.clearCart()
  }

  // Apply discounts
  function applySeniorDiscount(idNumber: string, idName: string) {
    cartStore.applySeniorDiscount(idNumber, idName)
  }

  function applyPWDDiscount(idNumber: string, idName: string) {
    cartStore.applyPWDDiscount(idNumber, idName)
  }

  function applyPercentageDiscount(percentage: number, code?: string) {
    cartStore.applyPercentageDiscount(percentage, code)
  }

  function applyFixedDiscount(amount: number, code?: string) {
    cartStore.applyFixedDiscount(amount, code)
  }

  function removeDiscount() {
    cartStore.removeDiscount()
  }

  // Customer
  function setCustomer(id: string | null) {
    cartStore.setCustomer(id)
  }

  // Notes
  function setNotes(text: string) {
    cartStore.setNotes(text)
  }

  // Get cart data for transaction
  function getCartData() {
    return cartStore.getCartData()
  }

  // Find item by barcode
  function findItemByBarcode(barcode: string): CartItem | undefined {
    return cartStore.findItemByBarcode(barcode)
  }

  // Check if product is in cart
  function isInCart(productId: string, variantId?: string): boolean {
    return items.value.some(
      item => item.productId === productId && item.variantId === variantId
    )
  }

  // Get quantity for product in cart
  function getQuantityInCart(productId: string, variantId?: string): number {
    const item = items.value.find(
      i => i.productId === productId && i.variantId === variantId
    )
    return item?.quantity || 0
  }

  // Format item price
  function formatItemPrice(item: CartItem): string {
    return vatService.formatCurrency(item.unitPrice)
  }

  // Format item line total
  function formatItemTotal(item: CartItem): string {
    return vatService.formatCurrency(item.lineTotal)
  }

  // Get tax type label
  function getTaxTypeLabel(taxType: TaxType): string {
    return vatService.getTaxTypeLabel(taxType)
  }

  return {
    // State (reactive refs)
    items,
    discount,
    customerId,
    notes,
    itemCount,
    uniqueItemCount,
    subtotal,
    totals,
    isEmpty,
    hasDiscount,

    // Formatted values
    formattedSubtotal,
    formattedTotal,
    formattedDiscount,
    formattedVAT,
    vatBreakdown,

    // Actions
    addProduct,
    addByBarcode,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
    applySeniorDiscount,
    applyPWDDiscount,
    applyPercentageDiscount,
    applyFixedDiscount,
    removeDiscount,
    setCustomer,
    setNotes,
    getCartData,

    // Utilities
    findItemByBarcode,
    isInCart,
    getQuantityInCart,
    formatItemPrice,
    formatItemTotal,
    getTaxTypeLabel
  }
}

export default useCart
