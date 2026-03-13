import db from '@/db/database'
import { BaseRepository } from './baseRepository'

export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  parent_id?: string
  display_order: number
  is_active: number
  product_count?: number
  created_at?: string
  updated_at?: string
}

export interface CategoryInput {
  name: string
  description?: string
  icon?: string
  parent_id?: string
  display_order?: number
  is_active?: number
}

class CategoryRepository extends BaseRepository<Category> {
  protected tableName = 'categories'
  protected idPrefix = 'cat'

  async findAllWithProductCount(options?: { orderBy?: string; orderDir?: string }): Promise<Category[]> {
    const orderBy = options?.orderBy || 'display_order'
    const orderDir = options?.orderDir || 'ASC'
    return await db.query<Category>(
      `SELECT c.*, COALESCE(pc.cnt, 0) as product_count
       FROM categories c
       LEFT JOIN (SELECT category_id, COUNT(*) as cnt FROM products GROUP BY category_id) pc
         ON pc.category_id = c.id
       ORDER BY c.${orderBy} ${orderDir}`
    )
  }

  async findAllActive(): Promise<Category[]> {
    return await db.query<Category>(
      'SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC, name ASC'
    )
  }

  async findByName(name: string): Promise<Category | null> {
    return await db.getOne<Category>(
      'SELECT * FROM categories WHERE name = ?',
      [name]
    )
  }

  async findByParentId(parentId: string | null): Promise<Category[]> {
    if (parentId === null) {
      return await db.query<Category>(
        'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY display_order ASC'
      )
    }
    return await db.query<Category>(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY display_order ASC',
      [parentId]
    )
  }

  async search(query: string): Promise<Category[]> {
    const searchTerm = `%${query}%`
    return await db.query<Category>(
      'SELECT * FROM categories WHERE name LIKE ? OR description LIKE ? ORDER BY display_order ASC',
      [searchTerm, searchTerm]
    )
  }

  async getProductCount(categoryId: string): Promise<number> {
    const result = await db.getOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [categoryId]
    )
    return result?.count || 0
  }

  async toggleActive(id: string): Promise<Category | null> {
    const category = await this.findById(id)
    if (!category) return null

    const newStatus = category.is_active === 1 ? 0 : 1
    return await this.update(id, { is_active: newStatus } as Partial<Category>)
  }

  async reorder(categoryIds: string[]): Promise<void> {
    for (let i = 0; i < categoryIds.length; i++) {
      await db.execute(
        'UPDATE categories SET display_order = ?, updated_at = ? WHERE id = ?',
        [i + 1, db.getCurrentTimestamp(), categoryIds[i]]
      )
    }
  }

  // Get categories as options for select dropdowns
  async getOptions(): Promise<{ label: string; value: string }[]> {
    const categories = await this.findAllActive()
    return categories.map(c => ({ label: c.name, value: c.id }))
  }
}

export const categoryRepository = new CategoryRepository()
export default categoryRepository
