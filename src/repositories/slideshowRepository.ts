import db from '@/db/database'
import type { SlideshowImage } from '@/types/settings'

class SlideshowRepository {
  async getAll(): Promise<SlideshowImage[]> {
    return await db.query<SlideshowImage>(
      'SELECT * FROM slideshow_images ORDER BY sort_order ASC'
    )
  }

  async add(imageData: string): Promise<SlideshowImage> {
    const id = db.generateId('slide')
    const now = db.getCurrentTimestamp()

    // Get max sort_order
    const result = await db.getOne<{ max_order: number | null }>(
      'SELECT MAX(sort_order) as max_order FROM slideshow_images'
    )
    const sortOrder = (result?.max_order ?? -1) + 1

    await db.execute(
      'INSERT INTO slideshow_images (id, image_data, sort_order, created_at) VALUES (?, ?, ?, ?)',
      [id, imageData, sortOrder, now]
    )

    return { id, image_data: imageData, sort_order: sortOrder, created_at: now }
  }

  async remove(id: string): Promise<void> {
    await db.execute('DELETE FROM slideshow_images WHERE id = ?', [id])
  }

  async updateOrder(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await db.execute(
        'UPDATE slideshow_images SET sort_order = ? WHERE id = ?',
        [i, ids[i]]
      )
    }
  }
}

export const slideshowRepository = new SlideshowRepository()
export default slideshowRepository
