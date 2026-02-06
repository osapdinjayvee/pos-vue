<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { vatService } from '@/services/vatService'
import type { Product, ProductVariant } from '@/types'

const props = defineProps<{
  products: Product[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'select', product: Product, variant?: ProductVariant): void
}>()

function formatPrice(price: number): string {
  return vatService.formatCurrency(price)
}

function handleSelect(product: Product, variant?: ProductVariant) {
  emit('select', product, variant)
}

function getProductVariants(product: Product): ProductVariant[] {
  return (product as any).variants || []
}

function hasVariants(product: Product): boolean {
  return getProductVariants(product).length > 0
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <template v-if="loading">
      <div v-for="i in 3" :key="i" class="p-3 border-b border-neutral-200">
        <div class="flex gap-3">
          <Skeleton width="4rem" height="4rem" />
          <div class="flex-1">
            <Skeleton width="70%" class="mb-2" />
            <Skeleton width="40%" />
          </div>
          <Skeleton width="5rem" height="2rem" />
        </div>
      </div>
    </template>

    <!-- Products List -->
    <template v-else>
      <div
        v-for="product in products"
        :key="product.id"
      >
        <!-- Product without variants -->
        <div
          v-if="!hasVariants(product)"
          class="p-3 border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer flex justify-between items-center transition-colors"
          @click="handleSelect(product)"
        >
          <div class="flex gap-3 items-center">
            <div
              v-if="product.image"
              class="w-14 h-14 shrink-0 rounded-lg bg-cover bg-center"
              :style="{ backgroundImage: `url(${product.image})` }"
            />
            <div
              v-else
              class="w-14 h-14 shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center"
            >
              <i class="pi pi-box text-xl text-neutral-400"></i>
            </div>
            <div>
              <div class="font-medium text-neutral-900">{{ product.name }}</div>
              <div class="text-sm text-neutral-500">
                <span v-if="product.sku">SKU: {{ product.sku }}</span>
                <span v-if="product.barcode" class="ml-2">{{ product.barcode }}</span>
              </div>
              <div v-if="product.tax_type !== 'vatable'" class="mt-1">
                <span class="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                  {{ product.tax_type === 'vat_exempt' ? 'VAT-Exempt' : 'Zero-Rated' }}
                </span>
              </div>
            </div>
          </div>
          <div class="text-right shrink-0 ml-3">
            <div class="font-semibold text-lg" style="color: var(--p-primary-color)">
              {{ formatPrice(product.price) }}
            </div>
            <Button
              icon="pi pi-plus"
              size="small"
              rounded
              class="mt-2"
              @click.stop="handleSelect(product)"
            />
          </div>
        </div>

        <!-- Product with variants -->
        <div v-else class="border-b border-neutral-200">
          <div class="p-3 bg-neutral-50">
            <div class="flex gap-3 items-center">
              <div
                v-if="product.image"
                class="w-14 h-14 shrink-0 rounded-lg bg-cover bg-center"
                :style="{ backgroundImage: `url(${product.image})` }"
              />
              <div
                v-else
                class="w-14 h-14 shrink-0 rounded-lg bg-neutral-100 flex items-center justify-center"
              >
                <i class="pi pi-box text-xl text-neutral-400"></i>
              </div>
              <div>
                <div class="font-medium text-neutral-900">{{ product.name }}</div>
                <div class="text-sm text-neutral-500">
                  {{ getProductVariants(product).length }} variants
                </div>
              </div>
            </div>
          </div>
          <!-- Variants -->
          <div
            v-for="variant in getProductVariants(product)"
            :key="variant.id"
            class="pl-5 pr-3 py-2.5 hover:bg-neutral-50 cursor-pointer flex justify-between items-center border-t border-neutral-100 transition-colors"
            @click="handleSelect(product, variant)"
          >
            <div>
              <div class="text-neutral-900">{{ variant.name }}</div>
              <div class="text-sm text-neutral-500">
                <span v-if="variant.sku">SKU: {{ variant.sku }}</span>
                <span v-if="variant.barcode" class="ml-2">{{ variant.barcode }}</span>
              </div>
            </div>
            <div class="text-right flex items-center gap-2 shrink-0 ml-3">
              <span class="font-semibold" style="color: var(--p-primary-color)">
                {{ formatPrice(variant.price_override ?? product.price) }}
              </span>
              <Button
                icon="pi pi-plus"
                size="small"
                rounded
                text
                @click.stop="handleSelect(product, variant)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-if="!loading && products.length === 0" class="py-12 text-center text-neutral-400">
      <i class="pi pi-inbox text-4xl mb-2 block"></i>
      <p>No products found</p>
    </div>
  </div>
</template>
