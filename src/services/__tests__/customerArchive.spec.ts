import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Covers archive-instead-of-delete and the outstanding-balance guard
 * (QA rows 115-116): a customer who owes money must not be archived out of
 * sight, and customers are soft-deactivated rather than hard-deleted.
 */

const findById = vi.fn()
const setActive = vi.fn()

vi.mock('@/repositories/customerRepository', () => ({
  customerRepository: {
    findById: (...args: unknown[]) => findById(...args),
    setActive: (...args: unknown[]) => setActive(...args)
  }
}))

vi.mock('@/repositories/tierRepository', () => ({ tierRepository: {} }))
vi.mock('@/repositories/loyaltyTransactionRepository', () => ({ loyaltyTransactionRepository: {} }))
vi.mock('@/services/tierService', () => ({ tierService: {} }))

const { customerService } = await import('../customerService')

const customer = (over: Record<string, unknown> = {}) => ({
  id: 'cust-1',
  name: 'Juan',
  current_balance: 0,
  is_active: 1,
  ...over
})

beforeEach(() => {
  vi.clearAllMocks()
  setActive.mockImplementation((id: string, active: boolean) =>
    Promise.resolve(customer({ id, is_active: active ? 1 : 0 }))
  )
})

describe('archiveCustomer', () => {
  it('deactivates a customer with no balance', async () => {
    findById.mockResolvedValue(customer({ current_balance: 0 }))

    const result = await customerService.archiveCustomer('cust-1')

    expect(setActive).toHaveBeenCalledWith('cust-1', false)
    expect(result.is_active).toBe(0)
  })

  it('refuses to archive a customer who still owes money', async () => {
    findById.mockResolvedValue(customer({ current_balance: 250 }))

    await expect(customerService.archiveCustomer('cust-1')).rejects.toThrow(/outstanding balance/i)
    expect(setActive).not.toHaveBeenCalled()
  })

  it('treats a missing balance as zero', async () => {
    findById.mockResolvedValue(customer({ current_balance: undefined }))

    await customerService.archiveCustomer('cust-1')

    expect(setActive).toHaveBeenCalledWith('cust-1', false)
  })

  it('throws when the customer does not exist', async () => {
    findById.mockResolvedValue(null)

    await expect(customerService.archiveCustomer('missing')).rejects.toThrow(/not found/i)
    expect(setActive).not.toHaveBeenCalled()
  })
})

describe('reactivateCustomer', () => {
  it('reactivates without any balance check', async () => {
    const result = await customerService.reactivateCustomer('cust-1')

    expect(setActive).toHaveBeenCalledWith('cust-1', true)
    expect(result.is_active).toBe(1)
    // Reactivation never reads the customer first — it is always safe.
    expect(findById).not.toHaveBeenCalled()
  })
})
