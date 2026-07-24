<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useProductStore } from '@/stores/product'
import VariantSelectDialog from './VariantSelectDialog.vue'
import { variantRepository } from '@/repositories/variantRepository'
import { hasSelectableVariants, selectableVariants } from '@/utils/variants'
import { vatService } from '@/services/vatService'
import { taxTypeLabel } from '@/types/transaction'
import type { Product, ProductVariant } from '@/types'

const props = defineProps<{
  visible: boolean
  initialQuery?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', product: Product, variant?: ProductVariant): void
}>()

/** A product with its active variants attached by enrichWithVariants. */
type ProductWithVariants = Product & { variants?: ProductVariant[] }

const toast = useToast()
const productStore = useProductStore()

const searchQuery = ref('')
const searchResults = ref<ProductWithVariants[]>([])
const allProducts = ref<ProductWithVariants[]>([])
const isSearching = ref(false)
const isLoading = ref(false)
const searchInputRef = ref<any>(null)
const showVariantPicker = ref(false)
const variantPickerProduct = ref<ProductWithVariants | null>(null)

let searchTimeout: number | null = null

const displayProducts = computed(() => {
  if (searchQuery.value.trim()) return searchResults.value
  return allProducts.value
})

watch(() => props.visible, async (visible) => {
  if (visible) {
    searchQuery.value = props.initialQuery || ''
    if (searchQuery.value) {
      performSearch(searchQuery.value)
    } else {
      searchResults.value = []
    }
    await refreshProducts()
    setTimeout(() => searchInputRef.value?.$el?.focus(), 200)
  } else {
    searchQuery.value = ''
    searchResults.value = []
    // Don't leave the variant picker orphaned if the drawer is dismissed.
    showVariantPicker.value = false
    variantPickerProduct.value = null
  }
})

/**
 * Reload the tile list every time the drawer opens.
 *
 * This used to load once and keep the result for the component's lifetime.
 * The drawer stays mounted for the whole POS session, so a product edited
 * elsewhere — notably adding variants — never appeared until the app was
 * restarted, which is exactly the "variants don't show" report.
 *
 * The previous list stays on screen while the refresh runs, so reopening is
 * still instant and only a genuinely empty list shows the skeleton.
 */
async function refreshProducts() {
  const isFirstLoad = allProducts.value.length === 0
  if (isFirstLoad) isLoading.value = true

  try {
    await productStore.loadProducts()
    allProducts.value = await enrichWithVariants(productStore.products)
  } catch {
    // Keep whatever is already displayed rather than blanking the grid.
    if (isFirstLoad) {
      toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load products', life: 3000 })
    }
  } finally {
    isLoading.value = false
  }
}

function handleSearchInput(value: string | undefined) {
  const query = value || ''
  searchQuery.value = query

  if (searchTimeout) clearTimeout(searchTimeout)

  if (!query.trim()) {
    searchResults.value = []
    return
  }

  searchTimeout = window.setTimeout(() => performSearch(query), 300)
}

async function performSearch(query: string) {
  isSearching.value = true
  try {
    searchResults.value = await enrichWithVariants(await productStore.searchProducts(query))
  } catch {
    toast.add({ severity: 'error', summary: 'Search Error', detail: 'Failed to search products', life: 3000 })
  } finally {
    isSearching.value = false
  }
}

function handleProductSelect(product: Product, variant?: ProductVariant) {
  emit('select', product, variant)
}

function openVariantPicker(product: Product) {
  variantPickerProduct.value = product
  showVariantPicker.value = true
}

function handleVariantSelect(product: Product, variant: ProductVariant) {
  handleProductSelect(product, variant)
}

function handleClose() {
  emit('update:visible', false)
}

function formatPrice(price: number): string {
  return vatService.formatCurrency(price)
}

/** Variants the cashier can actually choose between — see utils/variants. */
function getProductVariants(product: ProductWithVariants): ProductVariant[] {
  return selectableVariants(product.variants)
}

function hasVariants(product: ProductWithVariants): boolean {
  return hasSelectableVariants(product.variants)
}

/**
 * Attach active variants to the products being displayed so the POS can render
 * a variant-selector card. Product loading doesn't join variants, so we fetch
 * them here in a single query. We do NOT rely on the product's `has_variants`
 * flag (it can be stale), so variants always show whenever they exist.
 */
async function enrichWithVariants(products: Product[]): Promise<ProductWithVariants[]> {
  if (products.length === 0) return products

  const variants = await variantRepository.findActiveByProductIds(products.map(p => p.id))
  if (variants.length === 0) return products

  const variantMap = new Map<string, ProductVariant[]>()
  for (const v of variants) {
    const list = variantMap.get(v.product_id) || []
    list.push(v)
    variantMap.set(v.product_id, list)
  }

  return products.map((p) => {
    const v = variantMap.get(p.id)
    return v ? { ...p, variants: v } : p
  })
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
    @hide="handleClose"
  >
    <div class="flex flex-col h-full bg-neutral-50">

      <!-- Top bar: close + search -->
      <div class="flex items-center gap-3 px-5 py-4 bg-white border-b border-neutral-200 shrink-0">
        <button
          @click="handleClose"
          class="w-10 h-10 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors cursor-pointer shrink-0"
        >
          <i class="pi pi-arrow-left text-lg"></i>
        </button>
        <div class="flex-1 relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"></i>
          <InputText
            ref="searchInputRef"
            v-model="searchQuery"
            @update:modelValue="handleSearchInput"
            placeholder="Search products by name, SKU, or barcode..."
            class="w-full !pl-10"
          />
        </div>
      </div>

      <!-- Product tiles grid -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5">

        <!-- Loading skeleton -->
        <div v-if="isLoading || isSearching" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          <div v-for="i in 16" :key="i" class="bg-white rounded-xl border border-neutral-200 p-3 animate-pulse">
            <div class="w-full aspect-square bg-neutral-200 rounded-lg mb-3"></div>
            <div class="h-3 bg-neutral-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-neutral-200 rounded w-1/2"></div>
          </div>
        </div>

        <!-- Product tiles -->
        <div
          v-else-if="displayProducts.length > 0"
          class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3"
        >
          <template v-for="product in displayProducts" :key="product.id">
            <!-- Product without variants -->
            <button
              v-if="!hasVariants(product)"
              @click="handleProductSelect(product)"
              class="bg-white rounded-xl border border-neutral-200 p-3 text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div
                v-if="product.image"
                class="w-full aspect-square rounded-lg bg-cover bg-center mb-2"
                :style="{ backgroundImage: `url(${product.image})` }"
              />
              <div
                v-else
                class="w-full aspect-square rounded-lg bg-neutral-100 flex items-center justify-center mb-2 group-hover:bg-blue-50 transition-colors"
              >
                <i class="pi pi-box text-2xl text-neutral-300 group-hover:text-blue-400 transition-colors"></i>
              </div>
              <div class="font-semibold text-sm text-neutral-900 leading-tight line-clamp-2">{{ product.name }}</div>
              <div class="text-xs text-neutral-400 mt-0.5 truncate" v-if="product.sku">{{ product.sku }}</div>
              <div class="font-bold text-sm mt-1.5" style="color: var(--p-primary-color)">
                {{ formatPrice(product.price) }}
              </div>
              <div v-if="product.tax_type && product.tax_type !== 'vatable'" class="mt-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {{ taxTypeLabel(product.tax_type) }}
                </span>
              </div>
            </button>

            <!-- Product with variants — tapping opens the variant picker -->
            <button
              v-else
              @click="openVariantPicker(product)"
              class="bg-white rounded-xl border border-neutral-200 p-3 text-left hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative"
            >
              <div
                v-if="product.image"
                class="w-full aspect-square rounded-lg bg-cover bg-center mb-2"
                :style="{ backgroundImage: `url(${product.image})` }"
              />
              <div
                v-else
                class="w-full aspect-square rounded-lg bg-neutral-100 flex items-center justify-center mb-2 group-hover:bg-blue-50 transition-colors"
              >
                <i class="pi pi-box text-2xl text-neutral-300 group-hover:text-blue-400 transition-colors"></i>
              </div>
              <div class="font-semibold text-sm text-neutral-900 leading-tight line-clamp-2">{{ product.name }}</div>
              <div class="text-xs text-neutral-400 mt-0.5 truncate" v-if="product.sku">{{ product.sku }}</div>
              <div class="font-bold text-sm mt-1.5" style="color: var(--p-primary-color)">
                {{ formatPrice(product.price) }}
              </div>
              <div class="mt-1 flex items-center gap-1 text-[10px] font-semibold" style="color: var(--p-primary-color)">
                <i class="pi pi-sliders-h text-[10px]"></i>
                {{ getProductVariants(product).length }} options
              </div>
            </button>
          </template>
        </div>

        <!-- Empty search -->
        <div v-else-if="searchQuery && !isSearching" class="py-20 text-center text-neutral-400">
          <i class="pi pi-search text-5xl mb-3 block"></i>
          <p class="font-medium text-lg">No products found</p>
          <p class="text-sm mt-1">Try a different search term</p>
        </div>

        <!-- Initial empty (no products at all) -->
        <div v-else-if="!isLoading" class="py-20 text-center text-neutral-300">
          <i class="pi pi-box text-5xl mb-3 block"></i>
          <p class="mb-1 text-neutral-500 font-medium">No products available</p>
        </div>
      </div>
    </div>
  </Dialog>

  <VariantSelectDialog
    v-model:visible="showVariantPicker"
    :product="variantPickerProduct"
    :variants="variantPickerProduct ? getProductVariants(variantPickerProduct) : []"
    @select="handleVariantSelect"
  />
</template>
