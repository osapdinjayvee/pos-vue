import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Covers the expiry-alert reconciliation behind "the expired/expiring products
 * doesn't notify". The alert table holds one row per (variant, type), so a
 * variant with several batches must be reduced to its worst one, and variants
 * that are no longer affected must have their alert cleared.
 */

const findExpired = vi.fn()
const findExpiringSoon = vi.fn()
const createExpiryAlert = vi.fn()
const findExpiryAlerts = vi.fn()
const removeExpiryAlerts = vi.fn()

vi.mock('@/repositories/batchRepository', () => ({
  batchRepository: {
    findExpired: (...args: unknown[]) => findExpired(...args),
    findExpiringSoon: (...args: unknown[]) => findExpiringSoon(...args)
  }
}))

vi.mock('@/repositories/stockAlertRepository', () => ({
  stockAlertRepository: {
    createExpiryAlert: (...args: unknown[]) => createExpiryAlert(...args),
    findExpiryAlerts: (...args: unknown[]) => findExpiryAlerts(...args),
    removeExpiryAlerts: (...args: unknown[]) => removeExpiryAlerts(...args)
  }
}))

vi.mock('@/repositories/stockMovementRepository', () => ({ stockMovementRepository: {} }))
vi.mock('@/repositories/variantRepository', () => ({ variantRepository: {} }))

const { inventoryService } = await import('../inventoryService')

/** Build an ISO date `days` from today. */
function dateOffset(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const batch = (variantId: string, days: number) => ({
  variant_id: variantId,
  expiry_date: dateOffset(days)
})

beforeEach(() => {
  vi.clearAllMocks()
  findExpired.mockResolvedValue([])
  findExpiringSoon.mockResolvedValue([])
  findExpiryAlerts.mockResolvedValue([])
  createExpiryAlert.mockResolvedValue({})
  removeExpiryAlerts.mockResolvedValue(true)
})

describe('checkBatchExpiry', () => {
  it('raises one alert per expiring variant', async () => {
    findExpiringSoon.mockResolvedValue([batch('var-1', 3)])

    await inventoryService.checkBatchExpiry()

    expect(createExpiryAlert).toHaveBeenCalledTimes(1)
    expect(createExpiryAlert).toHaveBeenCalledWith('var-1', 3, 7)
  })

  it('reports the nearest expiry when a variant has several batches', async () => {
    findExpiringSoon.mockResolvedValue([
      batch('var-1', 6),
      batch('var-1', 2),
      batch('var-1', 5)
    ])

    await inventoryService.checkBatchExpiry()

    expect(createExpiryAlert).toHaveBeenCalledTimes(1)
    expect(createExpiryAlert).toHaveBeenCalledWith('var-1', 2, 7)
  })

  it('lets an expired batch outrank an expiring one on the same variant', async () => {
    findExpired.mockResolvedValue([batch('var-1', -4)])
    findExpiringSoon.mockResolvedValue([batch('var-1', 2)])

    await inventoryService.checkBatchExpiry()

    expect(createExpiryAlert).toHaveBeenCalledTimes(1)
    const [, days] = createExpiryAlert.mock.calls[0]!
    expect(days).toBeLessThan(0)
  })

  it('keeps variants separate', async () => {
    findExpired.mockResolvedValue([batch('var-2', -1)])
    findExpiringSoon.mockResolvedValue([batch('var-1', 4)])

    await inventoryService.checkBatchExpiry()

    expect(createExpiryAlert).toHaveBeenCalledTimes(2)
    const targets = createExpiryAlert.mock.calls.map(c => c[0]).sort()
    expect(targets).toEqual(['var-1', 'var-2'])
  })

  it('clears alerts for variants that are no longer expiring', async () => {
    // A stale alert left over from a batch that has since been sold or deleted.
    findExpiryAlerts.mockResolvedValue([{ variant_id: 'var-gone', alert_type: 'expiring_soon' }])

    await inventoryService.checkBatchExpiry()

    expect(removeExpiryAlerts).toHaveBeenCalledWith('var-gone')
  })

  it('leaves an alert in place while its batch is still expiring', async () => {
    findExpiringSoon.mockResolvedValue([batch('var-1', 3)])
    findExpiryAlerts.mockResolvedValue([{ variant_id: 'var-1', alert_type: 'expiring_soon' }])

    await inventoryService.checkBatchExpiry()

    expect(removeExpiryAlerts).not.toHaveBeenCalled()
  })

  it('honours a custom warning window', async () => {
    findExpiringSoon.mockResolvedValue([batch('var-1', 20)])

    await inventoryService.checkBatchExpiry(30)

    expect(findExpiringSoon).toHaveBeenCalledWith(30)
    expect(createExpiryAlert).toHaveBeenCalledWith('var-1', 20, 30)
  })
})
