import db from '@/db/database'
import { onboardingRepository } from '@/repositories/onboardingRepository'
import { businessConfigRepository } from '@/repositories/businessConfigRepository'
import { userRepository } from '@/repositories/userRepository'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import { httpClient } from '@/services/httpClient'
import { hashPin } from '@/utils/crypto'
import { ONBOARDING_STEPS, type OnboardingStep, type AdminSetupInput, type CashierSetupInput, type ActivationCompletePayload } from '@/types/onboarding'
import type { BusinessConfigInput } from '@/types/settings'

class OnboardingService {
  /**
   * Check if a step's prerequisites are met
   */
  canAdvanceTo(targetStep: OnboardingStep, currentStep: OnboardingStep): boolean {
    const targetIdx = ONBOARDING_STEPS.indexOf(targetStep)
    const currentIdx = ONBOARDING_STEPS.indexOf(currentStep)
    return targetIdx <= currentIdx + 1
  }

  /**
   * Update the current step
   */
  async setStep(step: OnboardingStep): Promise<void> {
    await onboardingRepository.setCurrentStep(step)
  }

  /**
   * Complete the business setup step
   */
  async completeBusiness(data: BusinessConfigInput): Promise<void> {
    await businessConfigRepository.updateConfig(data)
    await onboardingRepository.setCurrentStep('admin')
  }

  /**
   * Complete the admin setup step — updates the default admin (user-admin)
   */
  async completeAdmin(data: AdminSetupInput): Promise<void> {
    const pinHash = await hashPin(data.pin)
    const now = db.getCurrentTimestamp()

    await db.execute(
      `UPDATE users SET username = ?, pin_hash = ?, first_name = ?, last_name = ?, email = ?, updated_at = ? WHERE id = 'user-admin'`,
      [data.username.toLowerCase(), pinHash, data.firstName, data.lastName, data.email || null, now]
    )

    await onboardingRepository.setCurrentStep('cashier')
  }

  /**
   * Complete the cashier setup step — creates cashier user(s)
   */
  async completeCashiers(cashiers: CashierSetupInput[]): Promise<void> {
    if (cashiers.length === 0) {
      throw new Error('At least one cashier is required')
    }

    // Pre-hash all PINs before opening the transaction to avoid async yields
    // inside the transaction (bcrypt is async and can allow fire-and-forget
    // DB writes to interfere with the active transaction on Capacitor SQLite)
    const hashedCashiers = await Promise.all(
      cashiers.map(async (cashier) => ({
        ...cashier,
        pinHash: await hashPin(cashier.pin)
      }))
    )

    await db.transaction(async (ctx) => {
      // Remove previously created onboarding cashiers before re-inserting
      await ctx.execute(`DELETE FROM user_roles WHERE user_id != 'user-admin'`)
      await ctx.execute(`DELETE FROM users WHERE id != 'user-admin'`)

      for (const cashier of hashedCashiers) {
        const id = db.generateId('usr')
        const now = db.getCurrentTimestamp()

        await ctx.execute(
          `INSERT INTO users (id, username, pin_hash, first_name, last_name, branch_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'branch-main', 1, ?, ?)`,
          [id, cashier.username.toLowerCase(), cashier.pinHash, cashier.firstName, cashier.lastName, now, now]
        )

        // Assign cashier role
        const urId = db.generateId('ur')
        await ctx.execute(
          `INSERT INTO user_roles (id, user_id, role_id, assigned_at)
           VALUES (?, ?, 'role-cashier', ?)`,
          [urId, id, now]
        )
      }
    })

    await onboardingRepository.setCurrentStep('terms')
  }

  /**
   * Complete the onboarding process
   */
  async completeOnboarding(adminUserId: string): Promise<void> {
    await onboardingRepository.markCompleted()
    localStorage.setItem('pos_onboarding_complete', 'true')

    // Attempt activation POST
    const progress = await onboardingRepository.getProgress()
    const businessConfig = await businessConfigRepository.getConfig()

    if (progress && businessConfig) {
      const payload: ActivationCompletePayload = {
        license_key: progress.license_key || '',
        terminal_id: localStorage.getItem('terminal_id') || 'POS-001',
        business_name: businessConfig.business_name || '',
        tin: businessConfig.tin || '',
        branch_code: businessConfig.branch_code || '',
        admin_username: 'admin',
        activated_at: progress.activated_at || new Date().toISOString()
      }

      try {
        await httpClient.post('/activation/complete', payload)
      } catch {
        // Enqueue for later sync (non-critical, ignore errors)
        try {
          await syncQueueRepository.create({
            entity_type: 'activation',
            entity_id: 'default',
            operation: 'create',
            payload: JSON.stringify(payload),
            priority: 10
          })
        } catch (syncErr) {
          console.warn('Failed to enqueue activation for sync:', syncErr)
        }
      }
    }
  }
}

export const onboardingService = new OnboardingService()
export default onboardingService
