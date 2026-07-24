/**
 * Variant visibility rules.
 *
 * Every product gets an auto-created variant when it is created (see
 * productService.createProduct), and there is no `is_default` column to
 * distinguish it. So "this product has a variant" is true for the entire
 * catalogue and cannot be used to decide whether to offer a choice.
 *
 * The convention across the app is that a lone variant *is* the product — only
 * two or more represent a real choice (ProductDetailView uses the same rule to
 * decide whether to show per-variant stock).
 */

import type { ProductVariant } from '@/types'

/**
 * Whether the user should be asked to pick a variant.
 */
export function hasSelectableVariants(variants: ProductVariant[] | undefined | null): boolean {
  return (variants?.length ?? 0) > 1
}

/**
 * The variants to offer, in display order. Empty when there is no real choice,
 * so callers can treat "no selectable variants" and "plain product" alike.
 */
export function selectableVariants(variants: ProductVariant[] | undefined | null): ProductVariant[] {
  if (!hasSelectableVariants(variants)) return []
  return [...variants!].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  )
}
