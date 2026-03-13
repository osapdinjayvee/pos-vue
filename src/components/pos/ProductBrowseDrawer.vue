<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useProductStore } from '@/stores/product'
import { vatService } from '@/services/vatService'
import type { Product, ProductVariant } from '@/types'

const props = defineProps<{
  visible: boolean
  initialQuery?: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'select', product: Product, variant?: ProductVariant): void
}>()

const toast = useToast()
const productStore = useProductStore()

const searchQuery = ref('')
const searchResults = ref<Product[]>([])
const allProducts = ref<Product[]>([])
const isSearching = ref(false)
const isLoading = ref(false)
const searchInputRef = ref<any>(null)

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
    // Load all products for tile display
    if (allProducts.value.length === 0) {
      isLoading.value = true
      try {
        await productStore.loadProducts()
        allProducts.value = productStore.products
      } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load products', life: 3000 })
      } finally {
        isLoading.value = false
      }
    }
    setTimeout(() => searchInputRef.value?.$el?.focus(), 200)
  } else {
    searchQuery.value = ''
    searchResults.value = []
  }
})

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
    searchResults.value = await productStore.searchProducts(query)
  } catch {
    toast.add({ severity: 'error', summary: 'Search Error', detail: 'Failed to search products', life: 3000 })
  } finally {
    isSearching.value = false
  }
}

function handleProductSelect(product: Product, variant?: ProductVariant) {
  emit('select', product, variant)
}

function handleClose() {
  emit('update:visible', false)
}

function formatPrice(price: number): string {
  return vatService.formatCurrency(price)
}

function getProductVariants(product: Product): ProductVariant[] {
  return (product as any).variants || []
}

function hasVariants(product: Product): boolean {
  return getProductVariants(product).length > 0
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
              <div v-if="product.tax_type !== 'vatable'" class="mt-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {{ product.tax_type === 'vat_exempt' ? 'VAT-Exempt' : 'Zero-Rated' }}
                </span>
              </div>
            </button>

            <!-- Product with variants -->
            <div v-else class="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div class="p-3">
                <div
                  v-if="product.image"
                  class="w-full aspect-square rounded-lg bg-cover bg-center mb-2"
                  :style="{ backgroundImage: `url(${product.image})` }"
                />
                <div
                  v-else
                  class="w-full aspect-square rounded-lg bg-neutral-100 flex items-center justify-center mb-2"
                >
                  <i class="pi pi-box text-2xl text-neutral-300"></i>
                </div>
                <div class="font-semibold text-sm text-neutral-900 leading-tight line-clamp-2">{{ product.name }}</div>
                <div class="text-xs text-neutral-400 mt-0.5">{{ getProductVariants(product).length }} variants</div>
              </div>
              <div class="border-t border-neutral-100">
                <button
                  v-for="variant in getProductVariants(product)"
                  :key="variant.id"
                  @click="handleProductSelect(product, variant)"
                  class="w-full flex justify-between items-center px-3 py-2 text-left hover:bg-neutral-50 cursor-pointer border-b border-neutral-50 last:border-b-0 transition-colors"
                >
                  <span class="text-xs text-neutral-700 truncate">{{ variant.name }}</span>
                  <span class="text-xs font-semibold shrink-0 ml-2" style="color: var(--p-primary-color)">
                    {{ formatPrice(variant.price_override ?? product.price) }}
                  </span>
                </button>
              </div>
            </div>
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
</template>
