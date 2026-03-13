import { httpClient } from '@/services/httpClient'
import { onboardingRepository } from '@/repositories/onboardingRepository'
import type { LicenseVerifyResponse } from '@/types/onboarding'

class LicenseService {
  async verify(licenseKey: string): Promise<LicenseVerifyResponse> {
    try {
      const response = await httpClient.post<LicenseVerifyResponse>(
        '/license/verify',
        { license_key: licenseKey }
      )

      const data = response.data

      if (data.valid) {
        await onboardingRepository.setLicenseVerified(licenseKey, data.license_type)
      }

      return data
    } catch (err: any) {
      console.error('[LicenseService] verify failed:', err)
      const serverMsg = err.response?.data?.error
      const errCode = err.code ? ` [${err.code}]` : ''
      const message = serverMsg || `${err.message || 'License verification failed'}${errCode}`
      return {
        valid: false,
        license_type: '',
        error: message
      }
    }
  }
}

export const licenseService = new LicenseService()
export default licenseService
