import { describe, it, expect } from 'vitest'
import { hasSelectableVariants, selectableVariants } from '../variants'
import type { ProductVariant } from '@/types'

/**
 * Guards the rule behind "the variants of a product does not show". Products
 * always carry an auto-created variant, so counting variants naively made every
 * tile in the POS look like a variant product.
 */

const variant = (id: string, name: string, order = 0): ProductVariant =>
  ({ id, name, display_order: order } as ProductVariant)

describe('hasSelectableVariants', () => {
  it('is false for the auto-created variant every product has', () => {
    expect(hasSelectableVariants([variant('v1', 'Default')])).toBe(false)
  })

  it('is false when there are no variants at all', () => {
    expect(hasSelectableVariants([])).toBe(false)
    expect(hasSelectableVariants(undefined)).toBe(false)
    expect(hasSelectableVariants(null)).toBe(false)
  })

  it('is true once real variants have been added', () => {
    expect(hasSelectableVariants([
      variant('v1', 'Default'),
      variant('v2', 'Chilimansi')
    ])).toBe(true)
  })
})

describe('selectableVariants', () => {
  it('returns nothing when there is no real choice', () => {
    expect(selectableVariants([variant('v1', 'Default')])).toEqual([])
    expect(selectableVariants(undefined)).toEqual([])
  })

  it('returns every variant in display order', () => {
    const result = selectableVariants([
      variant('v3', 'Sweet & Spicy', 2),
      variant('v1', 'Original', 0),
      variant('v2', 'Chilimansi', 1)
    ])

    expect(result.map(v => v.name)).toEqual(['Original', 'Chilimansi', 'Sweet & Spicy'])
  })

  it('does not mutate the input', () => {
    const input = [variant('v2', 'B', 1), variant('v1', 'A', 0)]
    selectableVariants(input)

    expect(input.map(v => v.id)).toEqual(['v2', 'v1'])
  })

  it('tolerates a missing display order', () => {
    const result = selectableVariants([
      { id: 'v1', name: 'A' } as ProductVariant,
      { id: 'v2', name: 'B' } as ProductVariant
    ])

    expect(result).toHaveLength(2)
  })
})
