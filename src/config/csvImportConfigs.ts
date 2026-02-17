/**
 * CSV Import Configuration
 * Defines field mappings, validation rules, and transforms for each entity type.
 */

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'enum'

export interface ImportFieldConfig {
  field: string
  label: string
  required?: boolean
  type: FieldType
  aliases: string[]
  defaultValue?: any
  foreignKey?: {
    entity: 'category' | 'supplier'
    matchField: 'name'
  }
  enumValues?: string[]
  validate?: (value: string) => string | null // returns error message or null
  transform?: (value: string) => any
}

export interface CsvImportConfig {
  entityName: string
  entityLabel: string
  matchField: string // field used to find existing records (for update mode)
  fields: ImportFieldConfig[]
  templateFilename: string
}

// ===== PRODUCT CONFIG =====

export const productImportConfig: CsvImportConfig = {
  entityName: 'product',
  entityLabel: 'Products',
  matchField: 'sku',
  templateFilename: 'products_import_template',
  fields: [
    {
      field: 'name',
      label: 'Product Name',
      required: true,
      type: 'string',
      aliases: ['product_name', 'product', 'item_name', 'item', 'title']
    },
    {
      field: 'sku',
      label: 'SKU',
      required: true,
      type: 'string',
      aliases: ['product_sku', 'item_code', 'code', 'product_code']
    },
    {
      field: 'price',
      label: 'Price',
      required: true,
      type: 'number',
      aliases: ['selling_price', 'retail_price', 'unit_price', 'sell_price'],
      validate: (v) => {
        const n = Number(v)
        if (isNaN(n) || n < 0) return 'Price must be a non-negative number'
        return null
      },
      transform: (v) => Number(v)
    },
    {
      field: 'cost',
      label: 'Cost',
      type: 'number',
      defaultValue: 0,
      aliases: ['cost_price', 'unit_cost', 'buy_price', 'purchase_price'],
      validate: (v) => {
        if (!v) return null
        const n = Number(v)
        if (isNaN(n) || n < 0) return 'Cost must be a non-negative number'
        return null
      },
      transform: (v) => v ? Number(v) : 0
    },
    {
      field: 'description',
      label: 'Description',
      type: 'string',
      defaultValue: '',
      aliases: ['desc', 'product_description', 'details']
    },
    {
      field: 'barcode',
      label: 'Barcode',
      type: 'string',
      defaultValue: '',
      aliases: ['bar_code', 'upc', 'ean', 'gtin']
    },
    {
      field: 'category_name',
      label: 'Category',
      type: 'string',
      aliases: ['category', 'cat', 'product_category', 'group'],
      foreignKey: { entity: 'category', matchField: 'name' }
    },
    {
      field: 'supplier_name',
      label: 'Supplier',
      type: 'string',
      aliases: ['supplier', 'vendor', 'product_supplier'],
      foreignKey: { entity: 'supplier', matchField: 'name' }
    },
    {
      field: 'stock',
      label: 'Stock',
      type: 'number',
      defaultValue: 0,
      aliases: ['quantity', 'qty', 'stock_quantity', 'on_hand', 'inventory'],
      validate: (v) => {
        if (!v) return null
        const n = Number(v)
        if (isNaN(n) || n < 0) return 'Stock must be a non-negative number'
        return null
      },
      transform: (v) => v ? Math.floor(Number(v)) : 0
    },
    {
      field: 'low_stock_threshold',
      label: 'Low Stock Threshold',
      type: 'number',
      defaultValue: 10,
      aliases: ['reorder_level', 'reorder_point', 'min_stock', 'low_stock'],
      transform: (v) => v ? Math.floor(Number(v)) : 10
    },
    {
      field: 'status',
      label: 'Status',
      type: 'enum',
      defaultValue: 'active',
      aliases: ['product_status'],
      enumValues: ['active', 'inactive', 'out-of-stock'],
      transform: (v) => {
        const lower = v.toLowerCase().trim()
        if (['active', 'yes', '1', 'true'].includes(lower)) return 'active'
        if (['inactive', 'no', '0', 'false', 'disabled'].includes(lower)) return 'inactive'
        if (['out-of-stock', 'oos', 'out of stock'].includes(lower)) return 'out-of-stock'
        return lower || 'active'
      }
    },
    {
      field: 'tax_type',
      label: 'Tax Type',
      type: 'enum',
      defaultValue: 'vatable',
      aliases: ['tax', 'vat', 'tax_status'],
      enumValues: ['vatable', 'vat_exempt', 'zero_rated'],
      transform: (v) => {
        const lower = v.toLowerCase().trim()
        // Strip parenthetical like "(12%)" before matching
        const cleaned = lower.replace(/\s*\(.*?\)/g, '').replace(/[\s-]/g, '_').trim()
        if (['vatable', 'vat', 'taxable', 'yes'].includes(cleaned)) return 'vatable'
        if (['vat_exempt', 'exempt', 'no_vat', 'non_vat'].includes(cleaned)) return 'vat_exempt'
        if (['zero_rated', 'zero', '0'].includes(cleaned)) return 'zero_rated'
        return cleaned || 'vatable'
      }
    },
    {
      field: 'wholesale_price',
      label: 'Wholesale Price',
      type: 'number',
      aliases: ['bulk_price', 'trade_price'],
      validate: (v) => {
        if (!v) return null
        const n = Number(v)
        if (isNaN(n) || n < 0) return 'Wholesale price must be a non-negative number'
        return null
      },
      transform: (v) => v ? Number(v) : null
    },
    {
      field: 'wholesale_min_qty',
      label: 'Wholesale Min Qty',
      type: 'number',
      defaultValue: 1,
      aliases: ['min_wholesale_qty', 'bulk_min_qty'],
      transform: (v) => v ? Math.floor(Number(v)) : 1
    },
    {
      field: 'expiration_date',
      label: 'Expiration Date',
      type: 'date',
      aliases: ['expiry', 'exp_date', 'expiry_date', 'best_before'],
      transform: (v) => v ? v.trim() : null
    }
  ]
}

// ===== CATEGORY CONFIG =====

export const categoryImportConfig: CsvImportConfig = {
  entityName: 'category',
  entityLabel: 'Categories',
  matchField: 'name',
  templateFilename: 'categories_import_template',
  fields: [
    {
      field: 'name',
      label: 'Category Name',
      required: true,
      type: 'string',
      aliases: ['category', 'category_name', 'title', 'group']
    },
    {
      field: 'description',
      label: 'Description',
      type: 'string',
      defaultValue: '',
      aliases: ['desc', 'category_description', 'details', 'notes']
    },
    {
      field: 'icon',
      label: 'Icon',
      type: 'string',
      defaultValue: 'pi pi-tag',
      aliases: ['icon_class', 'category_icon'],
      transform: (v) => v?.trim() || 'pi pi-tag'
    }
  ]
}

// ===== SUPPLIER CONFIG =====

export const supplierImportConfig: CsvImportConfig = {
  entityName: 'supplier',
  entityLabel: 'Suppliers',
  matchField: 'name',
  templateFilename: 'suppliers_import_template',
  fields: [
    {
      field: 'name',
      label: 'Supplier Name',
      required: true,
      type: 'string',
      aliases: ['supplier', 'supplier_name', 'vendor', 'vendor_name', 'company']
    },
    {
      field: 'contact_person',
      label: 'Contact Person',
      type: 'string',
      aliases: ['contact', 'contact_name', 'representative', 'rep']
    },
    {
      field: 'phone',
      label: 'Phone',
      type: 'string',
      aliases: ['phone_number', 'tel', 'telephone', 'mobile', 'contact_phone']
    },
    {
      field: 'email',
      label: 'Email',
      type: 'string',
      aliases: ['email_address', 'contact_email', 'e_mail'],
      validate: (v) => {
        if (!v) return null
        if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email format'
        return null
      }
    },
    {
      field: 'address',
      label: 'Address',
      type: 'string',
      aliases: ['supplier_address', 'location', 'street_address']
    },
    {
      field: 'payment_terms',
      label: 'Payment Terms',
      type: 'string',
      aliases: ['terms', 'pay_terms', 'payment']
    },
    {
      field: 'notes',
      label: 'Notes',
      type: 'string',
      aliases: ['remarks', 'comments', 'description']
    },
    {
      field: 'is_active',
      label: 'Active',
      type: 'boolean',
      defaultValue: true,
      aliases: ['active', 'status', 'enabled'],
      transform: (v) => {
        if (!v) return true
        const lower = v.toLowerCase().trim()
        return !['false', '0', 'no', 'inactive', 'disabled'].includes(lower)
      }
    }
  ]
}

// ===== DISCOUNT CONFIG =====

export const discountImportConfig: CsvImportConfig = {
  entityName: 'discount',
  entityLabel: 'Discounts',
  matchField: 'name',
  templateFilename: 'discounts_import_template',
  fields: [
    {
      field: 'name',
      label: 'Discount Name',
      required: true,
      type: 'string',
      aliases: ['discount', 'discount_name', 'title', 'promo_name']
    },
    {
      field: 'code',
      label: 'Code',
      type: 'string',
      aliases: ['discount_code', 'promo_code', 'coupon', 'coupon_code']
    },
    {
      field: 'type',
      label: 'Type',
      required: true,
      type: 'enum',
      aliases: ['discount_type', 'kind'],
      enumValues: ['percentage', 'fixed'],
      transform: (v) => {
        const lower = v.toLowerCase().trim()
        if (['percentage', 'percent', '%', 'pct'].includes(lower)) return 'percentage'
        if (['fixed', 'flat', 'amount', 'peso'].includes(lower)) return 'fixed'
        return lower || 'percentage'
      }
    },
    {
      field: 'value',
      label: 'Value',
      required: true,
      type: 'number',
      aliases: ['discount_value', 'amount', 'rate'],
      validate: (v) => {
        const n = Number(v)
        if (isNaN(n) || n <= 0) return 'Value must be a positive number'
        return null
      },
      transform: (v) => Number(v)
    },
    {
      field: 'min_purchase',
      label: 'Min Purchase',
      type: 'number',
      defaultValue: 0,
      aliases: ['minimum_purchase', 'min_order', 'min_amount'],
      transform: (v) => v ? Number(v) : 0
    },
    {
      field: 'max_discount',
      label: 'Max Discount',
      type: 'number',
      aliases: ['maximum_discount', 'discount_cap', 'cap'],
      transform: (v) => v ? Number(v) : null
    },
    {
      field: 'start_date',
      label: 'Start Date',
      type: 'date',
      aliases: ['valid_from', 'from_date', 'start'],
      transform: (v) => v ? v.trim() : null
    },
    {
      field: 'end_date',
      label: 'End Date',
      type: 'date',
      aliases: ['valid_until', 'to_date', 'end', 'expiry'],
      transform: (v) => v ? v.trim() : null
    },
    {
      field: 'usage_limit',
      label: 'Usage Limit',
      type: 'number',
      aliases: ['max_usage', 'limit', 'max_uses'],
      transform: (v) => v ? Math.floor(Number(v)) : null
    },
    {
      field: 'applicable_to',
      label: 'Applicable To',
      type: 'enum',
      defaultValue: 'all',
      aliases: ['applies_to', 'scope', 'target'],
      enumValues: ['all', 'category', 'product', 'customer_type'],
      transform: (v) => {
        const lower = v.toLowerCase().trim()
        if (['all', 'everyone', 'global'].includes(lower)) return 'all'
        return lower || 'all'
      }
    },
    {
      field: 'is_active',
      label: 'Active',
      type: 'boolean',
      defaultValue: true,
      aliases: ['active', 'status', 'enabled'],
      transform: (v) => {
        if (!v) return true
        const lower = v.toLowerCase().trim()
        return !['false', '0', 'no', 'inactive', 'disabled'].includes(lower)
      }
    }
  ]
}

/** Get import config by entity name */
export function getImportConfig(entityName: string): CsvImportConfig | null {
  switch (entityName) {
    case 'product': return productImportConfig
    case 'category': return categoryImportConfig
    case 'supplier': return supplierImportConfig
    case 'discount': return discountImportConfig
    default: return null
  }
}
