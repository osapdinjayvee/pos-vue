/**
 * CSV Import Service
 * Handles column auto-mapping, row validation, FK resolution, and import execution.
 */

import type { CsvImportConfig, ImportFieldConfig } from '@/config/csvImportConfigs'
import categoryRepository from '@/repositories/categoryRepository'
import supplierRepository from '@/repositories/supplierRepository'
import productRepository from '@/repositories/productRepository'
import discountRepository from '@/repositories/discountRepository'
import type { Category } from '@/repositories/categoryRepository'
import type { Supplier } from '@/types/inventory'

export type ImportMode = 'create' | 'create_update'

export type RowAction = 'create' | 'update' | 'skip' | 'error'

export interface ColumnMapping {
  csvHeader: string
  entityField: string | null // null = unmapped
}

export interface ValidatedRow {
  rowIndex: number
  action: RowAction
  data: Record<string, any>
  rawData: Record<string, string>
  errors: string[]
  existingId?: string // populated for update rows
}

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: number
  errorDetails: { rowIndex: number; errors: string[] }[]
}

class CsvImportService {
  // FK lookup caches - populated before validation
  private categoryMap = new Map<string, string>() // lowercase name → id
  private supplierMap = new Map<string, string>()

  /**
   * Auto-map CSV headers to entity fields using aliases.
   */
  autoMapColumns(csvHeaders: string[], config: CsvImportConfig): ColumnMapping[] {
    return csvHeaders.map(header => {
      const normalized = this.normalizeHeader(header)
      let bestMatch: string | null = null

      for (const field of config.fields) {
        // Direct field name match
        if (normalized === field.field) {
          bestMatch = field.field
          break
        }

        // Label match
        if (normalized === this.normalizeHeader(field.label)) {
          bestMatch = field.field
          break
        }

        // Alias match
        for (const alias of field.aliases) {
          if (normalized === this.normalizeHeader(alias)) {
            bestMatch = field.field
            break
          }
        }

        if (bestMatch) break
      }

      return { csvHeader: header, entityField: bestMatch }
    })
  }

  /**
   * Validate all rows against the config and mapping.
   */
  async validateRows(
    rows: Record<string, string>[],
    mapping: ColumnMapping[],
    config: CsvImportConfig,
    mode: ImportMode
  ): Promise<ValidatedRow[]> {
    // Prefetch FK lookups
    await this.loadFkLookups(config)

    // Build reverse mapping: entityField → csvHeader
    const fieldToHeader = new Map<string, string>()
    for (const m of mapping) {
      if (m.entityField) {
        fieldToHeader.set(m.entityField, m.csvHeader)
      }
    }

    // Track values for duplicate detection within CSV
    const seenMatchValues = new Map<string, number>() // value → rowIndex

    const results: ValidatedRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const errors: string[] = []
      const data: Record<string, any> = {}

      // Extract and transform each mapped field
      for (const field of config.fields) {
        const csvHeader = fieldToHeader.get(field.field)
        const rawValue = csvHeader ? (row[csvHeader] ?? '').trim() : ''

        if (field.required && !rawValue) {
          errors.push(`${field.label} is required`)
          continue
        }

        if (!rawValue && field.defaultValue !== undefined) {
          data[field.field] = field.defaultValue
          continue
        }

        if (!rawValue) {
          data[field.field] = null
          continue
        }

        // Run field-level validation
        if (field.validate) {
          const error = field.validate(rawValue)
          if (error) {
            errors.push(`${field.label}: ${error}`)
            continue
          }
        }

        // Enum validation
        if (field.type === 'enum' && field.enumValues) {
          const transformed = field.transform ? field.transform(rawValue) : rawValue.toLowerCase()
          if (!field.enumValues.includes(transformed)) {
            errors.push(`${field.label}: must be one of ${field.enumValues.join(', ')}`)
            continue
          }
          data[field.field] = transformed
          continue
        }

        // FK resolution
        if (field.foreignKey) {
          const resolved = this.resolveFk(field, rawValue)
          if (resolved === null) {
            // Optional FK fields: set to empty/null, don't error
            if (!field.required) {
              const idField = field.foreignKey.entity + '_id'
              data[idField] = null
              continue
            }
            errors.push(`${field.label}: "${rawValue}" not found`)
            continue
          }
          // Store the resolved ID in the FK field (category_name → category_id)
          const idField = field.foreignKey.entity + '_id'
          data[idField] = resolved
          continue
        }

        // Apply transform or store raw
        data[field.field] = field.transform ? field.transform(rawValue) : rawValue
      }

      // Check for duplicate match field within CSV
      const matchFieldConfig = config.fields.find(f => f.field === config.matchField)
      const matchCsvHeader = fieldToHeader.get(config.matchField)
      const matchValue = matchCsvHeader ? (row[matchCsvHeader] ?? '').trim().toLowerCase() : ''

      if (matchValue) {
        const prevRow = seenMatchValues.get(matchValue)
        if (prevRow !== undefined) {
          errors.push(`Duplicate ${matchFieldConfig?.label || config.matchField}: same value in row ${prevRow + 1}`)
        } else {
          seenMatchValues.set(matchValue, i)
        }
      }

      // Determine action (create/update/error)
      let action: RowAction = 'create'
      let existingId: string | undefined

      if (errors.length > 0) {
        action = 'error'
      } else if (mode === 'create_update' && matchValue) {
        const existing = await this.findExisting(config, matchValue, data)
        if (existing) {
          action = 'update'
          existingId = existing
        }
      }

      results.push({
        rowIndex: i,
        action,
        data,
        rawData: row,
        errors,
        existingId
      })
    }

    return results
  }

  /**
   * Execute the import — create/update rows via repos, returning results.
   */
  async executeImport(
    validatedRows: ValidatedRow[],
    config: CsvImportConfig,
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> {
    const result: ImportResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: []
    }

    const actionable = validatedRows.filter(r => r.action === 'create' || r.action === 'update')
    const total = actionable.length
    let processed = 0

    for (const row of validatedRows) {
      if (row.action === 'error') {
        result.errors++
        result.errorDetails.push({ rowIndex: row.rowIndex, errors: row.errors })
        continue
      }

      if (row.action === 'skip') {
        result.skipped++
        continue
      }

      try {
        if (row.action === 'create') {
          await this.createEntity(config, row.data)
          result.created++
        } else if (row.action === 'update' && row.existingId) {
          await this.updateEntity(config, row.existingId, row.data)
          result.updated++
        }
      } catch (e: any) {
        result.errors++
        result.errorDetails.push({
          rowIndex: row.rowIndex,
          errors: [e.message || 'Unknown error during import']
        })
      }

      processed++
      onProgress?.(processed, total)
    }

    return result
  }

  // ===== Private Helpers =====

  private normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/[\s\-\.]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  }

  private async loadFkLookups(config: CsvImportConfig): Promise<void> {
    const needsCategories = config.fields.some(f => f.foreignKey?.entity === 'category')
    const needsSuppliers = config.fields.some(f => f.foreignKey?.entity === 'supplier')

    if (needsCategories) {
      this.categoryMap.clear()
      const categories = await categoryRepository.findAll() as Category[]
      for (const cat of categories) {
        this.categoryMap.set(cat.name.toLowerCase(), cat.id)
      }
    }

    if (needsSuppliers) {
      this.supplierMap.clear()
      const suppliers = await supplierRepository.findAll() as Supplier[]
      for (const sup of suppliers) {
        this.supplierMap.set(sup.name.toLowerCase(), sup.id)
      }
    }
  }

  private resolveFk(field: ImportFieldConfig, value: string): string | null {
    if (!field.foreignKey) return null
    const normalized = value.toLowerCase().trim()
    if (!normalized) return null

    if (field.foreignKey.entity === 'category') {
      return this.categoryMap.get(normalized) ?? null
    }
    if (field.foreignKey.entity === 'supplier') {
      return this.supplierMap.get(normalized) ?? null
    }

    return null
  }

  private async findExisting(config: CsvImportConfig, matchValue: string, data: Record<string, any>): Promise<string | null> {
    switch (config.entityName) {
      case 'product': {
        const product = await productRepository.findBySku(data.sku || matchValue)
        return product?.id ?? null
      }
      case 'category': {
        const category = await categoryRepository.findByName(data.name || matchValue)
        return category?.id ?? null
      }
      case 'supplier': {
        const supplier = await supplierRepository.findByName(data.name || matchValue)
        return supplier?.id ?? null
      }
      case 'discount': {
        // Match discounts by name (case-sensitive match via findByCode first, then by iterating)
        const all = await discountRepository.findAll()
        const found = all.find(d => d.name.toLowerCase() === (data.name || matchValue).toLowerCase())
        return found?.id ?? null
      }
      default:
        return null
    }
  }

  private async createEntity(config: CsvImportConfig, data: Record<string, any>): Promise<void> {
    switch (config.entityName) {
      case 'product':
        await this.createProduct(data)
        break
      case 'category':
        await categoryRepository.create({
          name: data.name,
          description: data.description || '',
          icon: data.icon || 'pi pi-tag',
          display_order: 0,
          is_active: 1
        } as any)
        break
      case 'supplier':
        await supplierRepository.createSupplier({
          name: data.name,
          contact_person: data.contact_person || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          payment_terms: data.payment_terms || undefined,
          notes: data.notes || undefined,
          is_active: data.is_active !== false
        })
        break
      case 'discount':
        await this.createDiscount(data)
        break
    }
  }

  private async updateEntity(config: CsvImportConfig, id: string, data: Record<string, any>): Promise<void> {
    switch (config.entityName) {
      case 'product':
        await productRepository.update(id, {
          name: data.name,
          description: data.description,
          price: data.price,
          cost: data.cost,
          barcode: data.barcode,
          category_id: data.category_id,
          supplier_id: data.supplier_id,
          low_stock_threshold: data.low_stock_threshold,
          status: data.status,
          tax_type: data.tax_type,
          wholesale_price: data.wholesale_price,
          wholesale_min_qty: data.wholesale_min_qty,
          expiration_date: data.expiration_date
        } as any)
        break
      case 'category':
        await categoryRepository.update(id, {
          name: data.name,
          description: data.description,
          icon: data.icon
        } as any)
        break
      case 'supplier':
        await supplierRepository.updateSupplier(id, {
          name: data.name,
          contact_person: data.contact_person,
          phone: data.phone,
          email: data.email,
          address: data.address,
          payment_terms: data.payment_terms,
          notes: data.notes,
          is_active: data.is_active
        })
        break
      case 'discount':
        await discountRepository.update(id, {
          name: data.name,
          code: data.code,
          type: data.type,
          value: data.value,
          min_purchase: data.min_purchase,
          max_discount: data.max_discount,
          start_date: data.start_date,
          end_date: data.end_date,
          usage_limit: data.usage_limit,
          applicable_to: data.applicable_to,
          is_active: data.is_active ? 1 : 0
        } as any)
        break
    }
  }

  /**
   * Product creation mirrors stores/product.ts create action:
   * 1. Create product
   * 2. Create default variant
   * 3. Record initial price history
   * 4. Record initial stock movement (if stock > 0)
   */
  private async createProduct(data: Record<string, any>): Promise<void> {
    const initialStock = data.stock || 0

    const product = await productRepository.create({
      name: data.name,
      description: data.description || '',
      image: '',
      price: data.price,
      cost: data.cost || 0,
      sku: data.sku,
      barcode: data.barcode || '',
      category_id: data.category_id || '',
      supplier_id: data.supplier_id || null,
      stock: initialStock,
      low_stock_threshold: data.low_stock_threshold ?? 10,
      status: data.status || 'active',
      tax_type: data.tax_type || 'vatable',
      sold: 0,
      revenue: 0,
      expiration_date: data.expiration_date || null,
      wholesale_price: data.wholesale_price || null,
      wholesale_min_qty: data.wholesale_min_qty || 1,
      auto_apply_wholesale: 0,
      has_variants: 0,
      track_batches: 0
    } as any)

    if (product) {
      // Create default variant
      const variantRepository = (await import('@/repositories/variantRepository')).default
      const variant = await variantRepository.createVariant({
        product_id: product.id,
        name: 'Default',
        sku: product.sku,
        barcode: product.barcode || undefined,
        is_active: true,
        display_order: 0
      })

      // Record initial price history
      const { priceHistoryRepository } = await import('@/repositories/priceHistoryRepository')
      await priceHistoryRepository.create({
        product_id: product.id,
        old_price: 0,
        new_price: product.price,
        old_cost: 0,
        new_cost: product.cost,
        change_type: 'price',
        reason: 'Initial product creation (CSV import)'
      } as any)

      // Record initial stock movement if stock > 0
      if (variant && initialStock > 0) {
        const { inventoryService } = await import('@/services/inventoryService')
        await inventoryService.receiveStock(variant.id, initialStock, {
          reason: 'Initial stock on product creation (CSV import)',
          unitCost: product.cost
        })
      }
    }
  }

  private async createDiscount(data: Record<string, any>): Promise<void> {
    await discountRepository.createPromo({
      name: data.name,
      code: data.code || undefined,
      type: data.type || 'percentage',
      value: data.value,
      min_purchase: data.min_purchase || 0,
      max_discount: data.max_discount ?? undefined,
      is_active: data.is_active !== false,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      auto_apply: false
    })
  }
}

export const csvImportService = new CsvImportService()
export default csvImportService
