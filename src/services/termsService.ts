import { httpClient } from '@/services/httpClient'
import { termsRepository } from '@/repositories/termsRepository'
import { syncQueueRepository } from '@/repositories/syncQueueRepository'
import type { TermsDocument, TermsActiveResponse } from '@/types/onboarding'

class TermsService {
  async fetchActive(): Promise<TermsDocument | null> {
    try {
      const response = await httpClient.get<TermsActiveResponse>('/terms/active')
      const data = response.data

      const doc: TermsDocument = {
        id: data.id,
        version: data.version,
        title: data.title,
        content_html: data.content_html,
        published_at: data.published_at,
        fetched_at: new Date().toISOString()
      }

      await termsRepository.saveDocument(doc)
      return doc
    } catch (err: any) {
      console.error('[TermsService] Failed to fetch active terms:', err.message)
      return null
    }
  }

  async getCached(): Promise<TermsDocument | null> {
    return await termsRepository.getCachedActive()
  }

  async accept(termsId: string, version: string, userId: string): Promise<boolean> {
    const acceptanceId = await termsRepository.saveAcceptance(termsId, version, userId)

    // Try to sync immediately
    try {
      await httpClient.post('/terms/accept', {
        terms_id: termsId,
        version,
        user_id: userId,
        accepted_at: new Date().toISOString()
      })
      await termsRepository.markAcceptanceSynced(acceptanceId)
    } catch {
      // Enqueue for later sync (non-critical, ignore errors)
      try {
        await syncQueueRepository.create({
          entity_type: 'terms_acceptance',
          entity_id: acceptanceId,
          operation: 'create',
          payload: JSON.stringify({ terms_id: termsId, version, user_id: userId }),
          priority: 5
        })
      } catch (syncErr) {
        console.warn('Failed to enqueue terms acceptance for sync:', syncErr)
      }
    }

    return true
  }
}

export const termsService = new TermsService()
export default termsService
