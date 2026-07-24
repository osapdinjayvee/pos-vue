import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Covers the terms-acceptance advance behind QA row 7 ("Accepting Terms needs
 * to do twice"): advancing to the next step must not depend on the acceptance
 * write succeeding, and skipping unavailable terms must still persist progress.
 */

const accept = vi.fn()
const setStep = vi.fn()

vi.mock('@/services/termsService', () => ({
  termsService: { accept: (...a: unknown[]) => accept(...a) }
}))
vi.mock('@/services/onboardingService', () => ({ onboardingService: {} }))
vi.mock('@/services/licenseService', () => ({ licenseService: {} }))
// Imported at module load and reads localStorage; stub it out of the chain.
vi.mock('@/config/sync', () => ({ setApiBaseUrl: vi.fn(), getApiBaseUrl: () => '' }))

// The composable reads these from the store; only setStep matters here.
vi.mock('@/stores/onboarding', () => ({
  useOnboardingStore: () => ({
    progress: { value: null },
    currentStep: { value: 'terms' },
    currentStepIndex: { value: 6 },
    isCompleted: { value: false },
    isLoading: { value: false },
    error: { value: null },
    setStep: (...a: unknown[]) => setStep(...a),
    load: vi.fn(),
    markComplete: vi.fn()
  })
}))

const { useOnboarding } = await import('../useOnboarding')

beforeEach(() => {
  vi.clearAllMocks()
  setStep.mockResolvedValue(undefined)
  accept.mockResolvedValue(true)
})

describe('acceptTerms', () => {
  it('advances to privacy after recording the acceptance', async () => {
    const { acceptTerms } = useOnboarding()

    await acceptTerms('terms-1', 'v1', 'user-admin')

    expect(accept).toHaveBeenCalledWith('terms-1', 'v1', 'user-admin')
    expect(setStep).toHaveBeenCalledWith('privacy')
  })

  it('still advances when recording the acceptance throws', async () => {
    // A failed/slow acceptance write must never trap the user on the terms
    // screen — that was the "accept twice" behaviour.
    accept.mockRejectedValue(new Error('db locked'))
    const { acceptTerms } = useOnboarding()

    await expect(acceptTerms('terms-1', 'v1', 'user-admin')).resolves.toBeUndefined()
    expect(setStep).toHaveBeenCalledWith('privacy')
  })
})

describe('skipTerms', () => {
  it('persists the step so resume does not return to terms', async () => {
    const { skipTerms } = useOnboarding()

    await skipTerms()

    expect(setStep).toHaveBeenCalledWith('privacy')
  })
})
