import db from '@/db/database'
import type { OnboardingProgress, OnboardingStep } from '@/types/onboarding'

class OnboardingRepository {
  private tableName = 'onboarding_progress'

  async getProgress(): Promise<OnboardingProgress | null> {
    return await db.getOne<OnboardingProgress>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  async setCurrentStep(step: OnboardingStep): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET current_step = ?, updated_at = ? WHERE id = 'default'`,
      [step, now]
    )
  }

  async setLicenseVerified(key: string, type: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET license_key = ?, license_type = ?, license_verified_at = ?, updated_at = ? WHERE id = 'default'`,
      [key, type, now, now]
    )
  }

  async markCompleted(): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET is_completed = 1, activated_at = ?, updated_at = ? WHERE id = 'default'`,
      [now, now]
    )
  }

  async setServerUrl(url: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET server_url = ?, updated_at = ? WHERE id = 'default'`,
      [url, now]
    )
  }

  async setDeviceRegistered(deviceUid: string, registeredAt: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET device_uid = ?, device_registered_at = ?, updated_at = ? WHERE id = 'default'`,
      [deviceUid, registeredAt, now]
    )
  }

  async updateHeartbeatStatus(status: string, expiryDate?: string | null): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE ${this.tableName} SET heartbeat_status = ?, heartbeat_last_at = ?, license_expiry_date = ?, updated_at = ? WHERE id = 'default'`,
      [status, now, expiryDate ?? null, now]
    )
  }

  async isCompleted(): Promise<boolean> {
    const progress = await this.getProgress()
    return progress?.is_completed === 1
  }
}

export const onboardingRepository = new OnboardingRepository()
export default onboardingRepository
