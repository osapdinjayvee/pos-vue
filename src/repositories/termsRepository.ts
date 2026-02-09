import db from '@/db/database'
import type { TermsDocument, TermsAcceptance } from '@/types/onboarding'

class TermsRepository {
  async saveDocument(doc: TermsDocument): Promise<void> {
    await db.execute(
      `INSERT OR REPLACE INTO terms_documents (id, version, title, content_html, published_at, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [doc.id, doc.version, doc.title, doc.content_html, doc.published_at, doc.fetched_at]
    )
  }

  async getCachedActive(): Promise<TermsDocument | null> {
    return await db.getOne<TermsDocument>(
      `SELECT * FROM terms_documents ORDER BY published_at DESC LIMIT 1`
    )
  }

  async saveAcceptance(termsId: string, version: string, userId: string): Promise<string> {
    const id = db.generateId('ta')
    const now = db.getCurrentTimestamp()
    await db.execute(
      `INSERT INTO terms_acceptances (id, terms_id, terms_version, user_id, accepted_at, sync_status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [id, termsId, version, userId, now]
    )
    return id
  }

  async getAcceptanceByUser(userId: string): Promise<TermsAcceptance | null> {
    return await db.getOne<TermsAcceptance>(
      `SELECT * FROM terms_acceptances WHERE user_id = ? ORDER BY accepted_at DESC LIMIT 1`,
      [userId]
    )
  }

  async getPendingAcceptances(): Promise<TermsAcceptance[]> {
    return await db.query<TermsAcceptance>(
      `SELECT * FROM terms_acceptances WHERE sync_status = 'pending'`
    )
  }

  async markAcceptanceSynced(id: string): Promise<void> {
    const now = db.getCurrentTimestamp()
    await db.execute(
      `UPDATE terms_acceptances SET sync_status = 'synced', synced_at = ? WHERE id = ?`,
      [now, id]
    )
  }
}

export const termsRepository = new TermsRepository()
export default termsRepository
