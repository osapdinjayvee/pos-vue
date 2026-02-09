<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { useProductStore } from '@/stores/product'
import { vatService } from '@/services/vatService'
import type { Product, ProductVariant } from '@/types'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'update:visible': [value: boolean] }>()

const productStore = useProductStore()

const searchQuery = ref('')
const results = ref<Product[]>([])
const selectedProduct = ref<Product | null>(null)
const isSearching = ref(false)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

watch(() => props.visible, (val) => {
  if (val) {
    searchQuery.value = ''
    results.value = []
    selectedProduct.value = null
    nextTick(() => document.getElementById('price-check-search')?.focus())
  }
})

watch(searchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  selectedProduct.value = null
  if (!val.trim()) {
    results.value = []
    return
  }
  searchTimeout = setTimeout(() => performSearch(val), 250)
})

async function performSearch(query: string) {
  isSearching.value = true
  try {
    results.value = await productStore.searchProducts(query)
  } catch {
    results.value = []
  } finally {
    isSearching.value = false
  }
}

function selectProduct(product: Product) {
  selectedProduct.value = product
}

function backToResults() {
  selectedProduct.value = null
  nextTick(() => document.getElementById('price-check-search')?.focus())
}

function fmt(n: number): string {
  return vatService.formatCurrency(n)
}

function getVariants(product: Product): ProductVariant[] {
  return (product as any).variants || []
}

function taxLabel(type: string): string {
  if (type === 'exempt' || type === 'vat_exempt') return 'VAT-Exempt'
  if (type === 'zero_rated') return 'Zero-Rated'
  return 'VATable'
}

function taxSeverity(type: string): "success" | "warn" | "info" | "secondary" {
  if (type === 'exempt' || type === 'vat_exempt') return 'warn'
  if (type === 'zero_rated') return 'info'
  return 'success'
}

function stockSeverity(stock: number, threshold: number): "success" | "warn" | "danger" | "secondary" {
  if (stock <= 0) return 'danger'
  if (stock <= threshold) return 'warn'
  return 'success'
}

function stockLabel(stock: number): string {
  if (stock <= 0) return 'Out of Stock'
  return `${stock} in stock`
}

function handleClose() {
  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :modal="true"
    :closable="true"
    position="top"
    :style="{ width: '100vw', height: '100vh', maxHeight: '100vh', margin: 0 }"
    :contentStyle="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }"
    :pt="{ root: { style: 'border-radius: 0; max-height: 100vh' }, header: { style: 'padding: 0.75rem 1rem; border-bottom: 1px solid var(--p-surface-200)' } }"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-3 w-full">
        <i class="pi pi-info-circle text-lg text-[var(--p-primary-500)]"></i>
        <span class="text-lg font-bold text-neutral-800">Price Check</span>
      </div>
    </template>

    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- DETAIL VIEW -->
      <template v-if="selectedProduct">
        <div class="shrink-0 px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-2">
          <button
            class="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:bg-neutral-200 cursor-pointer transition-colors border-none bg-transparent"
            @click="backToResults"
          >
            <i class="pi pi-arrow-left"></i>
          </button>
          <span class="text-base font-semibold text-neutral-700">Product Details</span>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="p-5 max-w-lg mx-auto">
            <!-- Product icon / image -->
            <div class="flex items-center justify-center mb-5">
              <div
                v-if="selectedProduct.image"
                class="w-24 h-24 rounded-2xl bg-cover bg-center border border-neutral-200"
                :style="{ backgroundImage: `url(${selectedProduct.image})` }"
              />
              <div v-else class="w-24 h-24 rounded-2xl bg-neutral-100 flex items-center justify-center">
                <i class="pi pi-box text-4xl text-neutral-300"></i>
              </div>
            </div>

            <!-- Name -->
            <h2 class="text-xl font-bold text-neutral-900 text-center m-0 mb-1">{{ selectedProduct.name }}</h2>
            <p v-if="selectedProduct.sku" class="text-sm text-neutral-400 text-center m-0 mb-1">SKU: {{ selectedProduct.sku }}</p>
            <p v-if="selectedProduct.barcode" class="text-sm text-neutral-400 text-center m-0 mb-4">
              <i class="pi pi-barcode text-xs mr-1"></i>{{ selectedProduct.barcode }}
            </p>

            <!-- Price card -->
            <div class="bg-[var(--p-primary-50)] rounded-xl p-5 mb-4 text-center">
              <div class="text-sm font-medium text-[var(--p-primary-600)] mb-1 uppercase tracking-wide">Price</div>
              <div class="text-3xl font-extrabold tabular-nums" style="color: var(--p-primary-color)">{{ fmt(selectedProduct.price) }}</div>
            </div>

            <!-- Wholesale price -->
            <div v-if="selectedProduct.wholesale_price" class="bg-blue-50 rounded-xl p-4 mb-4 text-center">
              <div class="text-sm font-medium text-blue-600 mb-1">Wholesale Price ({{ selectedProduct.wholesale_min_qty }}+ units)</div>
              <div class="text-2xl font-bold text-blue-700 tabular-nums">{{ fmt(selectedProduct.wholesale_price) }}</div>
            </div>

            <!-- Info rows -->
            <div class="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
              <!-- Tax Type -->
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-sm text-neutral-500">Tax Type</span>
                <Tag :value="taxLabel(selectedProduct.tax_type)" :severity="taxSeverity(selectedProduct.tax_type)" />
              </div>

              <!-- Stock -->
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-sm text-neutral-500">Stock</span>
                <Tag :value="stockLabel(selectedProduct.stock)" :severity="stockSeverity(selectedProduct.stock, selectedProduct.low_stock_threshold)" />
              </div>

              <!-- Cost (if available) -->
              <div v-if="selectedProduct.cost > 0" class="flex items-center justify-between px-4 py-3">
                <span class="text-sm text-neutral-500">Cost</span>
                <span class="text-sm font-semibold text-neutral-700 tabular-nums">{{ fmt(selectedProduct.cost) }}</span>
              </div>

              <!-- Category -->
              <div v-if="selectedProduct.category_name" class="flex items-center justify-between px-4 py-3">
                <span class="text-sm text-neutral-500">Category</span>
                <span class="text-sm font-medium text-neutral-700">{{ selectedProduct.category_name }}</span>
              </div>

              <!-- Status -->
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-sm text-neutral-500">Status</span>
                <Tag
                  :value="selectedProduct.status === 'active' ? 'Active' : 'Inactive'"
                  :severity="selectedProduct.status === 'active' ? 'success' : 'secondary'"
                />
              </div>
            </div>

            <!-- Variants -->
            <div v-if="getVariants(selectedProduct).length > 0" class="mt-4">
              <h3 class="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-2">Variants</h3>
              <div class="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
                <div
                  v-for="v in getVariants(selectedProduct)"
                  :key="v.id"
                  class="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <span class="text-sm font-medium text-neutral-800">{{ v.name }}</span>
                    <span v-if="v.sku" class="text-xs text-neutral-400 ml-2">{{ v.sku }}</span>
                  </div>
                  <span class="text-sm font-bold tabular-nums" style="color: var(--p-primary-color)">
                    {{ fmt(v.price_override ?? selectedProduct.price) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- SEARCH VIEW -->
      <template v-else>
        <!-- Search bar -->
        <div class="p-3 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
          <div class="relative">
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"></i>
            <InputText
              id="price-check-search"
              v-model="searchQuery"
              placeholder="Scan barcode or search product name / SKU..."
              class="w-full !pl-10 !text-base"
            />
          </div>
        </div>

        <!-- Results -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="isSearching" class="flex items-center justify-center py-12">
            <i class="pi pi-spinner pi-spin text-2xl text-neutral-300"></i>
          </div>

          <div v-else-if="results.length > 0" class="divide-y divide-neutral-100">
            <div
              v-for="product in results"
              :key="product.id"
              class="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-[var(--p-primary-50)] active:bg-[var(--p-primary-100)] transition-colors"
              @click="selectProduct(product)"
            >
              <div class="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <div
                  v-if="product.image"
                  class="w-full h-full rounded-xl bg-cover bg-center"
                  :style="{ backgroundImage: `url(${product.image})` }"
                />
                <i v-else class="pi pi-box text-xl text-neutral-300"></i>
              </div>

              <div class="flex-1 min-w-0">
                <div class="text-base font-semibold text-neutral-800 truncate">{{ product.name }}</div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span v-if="product.sku" class="text-xs text-neutral-400">{{ product.sku }}</span>
                  <Tag :value="taxLabel(product.tax_type)" :severity="taxSeverity(product.tax_type)" class="!text-[10px] !px-1.5 !py-0" />
                  <Tag :value="stockLabel(product.stock)" :severity="stockSeverity(product.stock, product.low_stock_threshold)" class="!text-[10px] !px-1.5 !py-0" />
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-base font-bold tabular-nums" style="color: var(--p-primary-color)">{{ fmt(product.price) }}</div>
                <div v-if="product.wholesale_price" class="text-xs text-blue-500 tabular-nums">
                  WS: {{ fmt(product.wholesale_price) }}
                </div>
              </div>

              <i class="pi pi-chevron-right text-xs text-neutral-300 shrink-0"></i>
            </div>
          </div>

          <!-- Empty states -->
          <div v-else-if="searchQuery && !isSearching" class="flex flex-col items-center justify-center py-16 text-center">
            <i class="pi pi-search text-4xl text-neutral-200 mb-3"></i>
            <p class="text-base font-semibold text-neutral-400 m-0 mb-1">No products found</p>
            <p class="text-sm text-neutral-300 m-0">Try a different search term</p>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-16 text-center">
            <div class="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
              <i class="pi pi-info-circle text-3xl text-neutral-300"></i>
            </div>
            <p class="text-base font-semibold text-neutral-400 m-0 mb-1">Price Check</p>
            <p class="text-sm text-neutral-300 m-0">Scan a barcode or type a product name to check its price</p>
          </div>
        </div>
      </template>
    </div>
  </Dialog>
</template>
