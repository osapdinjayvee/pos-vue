import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import categoryRepository from '@/repositories/categoryRepository'
import type { Category, CategoryInput } from '@/repositories/categoryRepository'

export const useCategoryStore = defineStore('category', () => {
  // State
  const categories = ref<Category[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeCategories = computed(() =>
    categories.value.filter(c => c.is_active === 1)
  )

  const categoryOptions = computed(() =>
    activeCategories.value.map(c => ({ label: c.name, value: c.id }))
  )

  const getCategoryById = computed(() => (id: string) =>
    categories.value.find(c => c.id === id)
  )

  const getCategoryName = computed(() => (id: string) =>
    categories.value.find(c => c.id === id)?.name || 'Uncategorized'
  )

  // Actions
  async function fetchAll() {
    isLoading.value = true
    error.value = null
    try {
      categories.value = await categoryRepository.findAllWithProductCount({
        orderBy: 'display_order',
        orderDir: 'ASC'
      })
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch categories'
      console.error('Error fetching categories:', e)
    } finally {
      isLoading.value = false
    }
  }

  async function create(data: CategoryInput): Promise<Category | null> {
    isLoading.value = true
    error.value = null
    try {
      const category = await categoryRepository.create({
        name: data.name,
        description: data.description || '',
        parent_id: data.parent_id,
        display_order: data.display_order || categories.value.length + 1,
        is_active: data.is_active ?? 1
      })
      categories.value.push(category)
      return category
    } catch (e: any) {
      error.value = e.message || 'Failed to create category'
      console.error('Error creating category:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function update(id: string, data: Partial<CategoryInput>): Promise<Category | null> {
    isLoading.value = true
    error.value = null
    try {
      const updated = await categoryRepository.update(id, data as Partial<Category>)
      if (updated) {
        const index = categories.value.findIndex(c => c.id === id)
        if (index !== -1) {
          categories.value[index] = updated
        }
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to update category'
      console.error('Error updating category:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      const productCount = await categoryRepository.getProductCount(id)
      if (productCount > 0) {
        error.value = `Cannot delete category with ${productCount} products`
        return false
      }

      const success = await categoryRepository.delete(id)
      if (success) {
        categories.value = categories.value.filter(c => c.id !== id)
      }
      return success
    } catch (e: any) {
      error.value = e.message || 'Failed to delete category'
      console.error('Error deleting category:', e)
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function toggleActive(id: string): Promise<Category | null> {
    try {
      const updated = await categoryRepository.toggleActive(id)
      if (updated) {
        const index = categories.value.findIndex(c => c.id === id)
        if (index !== -1) {
          categories.value[index] = updated
        }
      }
      return updated
    } catch (e: any) {
      error.value = e.message || 'Failed to toggle category status'
      console.error('Error toggling category:', e)
      return null
    }
  }

  async function reorder(categoryIds: string[]): Promise<void> {
    try {
      await categoryRepository.reorder(categoryIds)
      await fetchAll()
    } catch (e: any) {
      error.value = e.message || 'Failed to reorder categories'
      console.error('Error reordering categories:', e)
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    categories,
    isLoading,
    error,
    // Getters
    activeCategories,
    categoryOptions,
    getCategoryById,
    getCategoryName,
    // Actions
    fetchAll,
    create,
    update,
    remove,
    toggleActive,
    reorder,
    clearError
  }
})
