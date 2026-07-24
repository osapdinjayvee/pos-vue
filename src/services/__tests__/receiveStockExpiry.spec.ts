import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Covers attaching an expiry date while receiving stock: the receiving flows
 * are where a user actually knows the date, and without a batch the dashboard
 * has nothing to raise an expiry alert from.
 */

const recordReceive = vi.fn()
const findByVariantAndExpiry = vi.fn()
const createBatch = vi.fn()

vi.mock('@/repositories/stockMovementRepository', () => ({
  stockMovementRepository: {
    recordReceive: (...args: unknown[]) => recordReceive(...args),
    calculateStock: vi.fn().mockResolvedValue(10),
    findByVariantId: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/repositories/batchRepository', () => ({
  batchRepository: {
    findByVariantAndExpiry: (...args: unknown[]) => findByVariantAndExpiry(...args),
    createBatch: (...args: unknown[]) => createBatch(...args),
    findExpired: vi.fn().mockResolvedValue([]),
    findExpiringSoon: vi.fn().mockResolvedValue([])
  }
}))

vi.mock('@/repositories/stockAlertRepository', () => ({
  stockAlertRepository: {
    updateStockLevel: vi.fn().mockResolvedValue(undefined),
    findByVariantId: vi.fn().mockResolvedValue(null),
    createExpiryAlert: vi.fn().mockResolvedValue({}),
    findExpiryAlerts: vi.fn().mockResolvedValue([]),
    removeExpiryAlerts: vi.fn().mockResolvedValue(true)
  }
}))

// updateStockAlert dynamically imports this to read the low-stock threshold.
vi.mock('@/repositories/productRepository', () => ({
  default: { findById: vi.fn().mockResolvedValue({ id: 'prod-1', low_stock_threshold: 5 }) }
}))

vi.mock('@/repositories/variantRepository', () => ({
  variantRepository: {
    findById: vi.fn().mockResolvedValue({ id: 'var-1', reorder_point: 5 }),
    findWithProductDetails: vi.fn().mockResolvedValue({ id: 'var-1', reorder_point: 5 })
  }
}))

const { inventoryService } = await import('../inventoryService')

/** Grab the options object handed to recordReceive. */
function receivedOptions() {
  const call = recordReceive.mock.calls[0]
  return call?.[5] as { batchId?: string } | undefined
}

beforeEach(() => {
  vi.clearAllMocks()
  recordReceive.mockResolvedValue({ id: 'mov-1' })
  findByVariantAndExpiry.mockResolvedValue(null)
  createBatch.mockResolvedValue({ id: 'batch-new' })
})

describe('receiveStock with an expiry date', () => {
  it('creates a batch and attaches the movement to it', async () => {
    const result = await inventoryService.receiveStock('var-1', 10, { expiryDate: '2027-01-31' })

    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
    expect(createBatch).toHaveBeenCalledTimes(1)
    expect(createBatch.mock.calls[0]![0]).toMatchObject({
      variant_id: 'var-1',
      expiry_date: '2027-01-31'
    })
    expect(receivedOptions()?.batchId).toBe('batch-new')
  })

  it('reuses the existing batch for the same variant and expiry', async () => {
    findByVariantAndExpiry.mockResolvedValue({ id: 'batch-existing' })

    await inventoryService.receiveStock('var-1', 5, { expiryDate: '2027-01-31' })

    expect(createBatch).not.toHaveBeenCalled()
    expect(receivedOptions()?.batchId).toBe('batch-existing')
  })

  it('records no batch when no expiry is given', async () => {
    await inventoryService.receiveStock('var-1', 5, { unitCost: 12 })

    expect(createBatch).not.toHaveBeenCalled()
    expect(findByVariantAndExpiry).not.toHaveBeenCalled()
    expect(receivedOptions()?.batchId).toBeUndefined()
  })

  it('treats a null expiry as no expiry', async () => {
    await inventoryService.receiveStock('var-1', 5, { expiryDate: null })

    expect(createBatch).not.toHaveBeenCalled()
    expect(receivedOptions()?.batchId).toBeUndefined()
  })

  it('prefers an explicit batchId over the expiry date', async () => {
    await inventoryService.receiveStock('var-1', 5, {
      batchId: 'batch-chosen',
      expiryDate: '2027-01-31'
    })

    expect(createBatch).not.toHaveBeenCalled()
    expect(findByVariantAndExpiry).not.toHaveBeenCalled()
    expect(receivedOptions()?.batchId).toBe('batch-chosen')
  })

  it('carries the supplier onto a newly created batch', async () => {
    await inventoryService.receiveStock('var-1', 5, {
      expiryDate: '2027-01-31',
      supplierId: 'sup-9'
    })

    expect(createBatch.mock.calls[0]![0]).toMatchObject({ supplier_id: 'sup-9' })
  })

  it('rejects a non-positive quantity before touching batches', async () => {
    const result = await inventoryService.receiveStock('var-1', 0, { expiryDate: '2027-01-31' })

    expect(result.success).toBe(false)
    expect(createBatch).not.toHaveBeenCalled()
    expect(recordReceive).not.toHaveBeenCalled()
  })
})
