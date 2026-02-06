# Research: Product & Inventory Management

**Feature**: 001-product-inventory
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Product Variant Modeling

**Decision**: Variants as separate entities with parent product reference

**Rationale**:
- Each variant has independent SKU, barcode, price, and stock
- Allows querying variants directly for POS
- Parent product holds shared attributes (name, description, category)
- Clean inventory tracking per variant

**Alternatives Considered**:
- JSON column for variants: Difficult to query, no FK constraints
- Single products with attributes: Complex for stock tracking
- EAV (Entity-Attribute-Value): Over-engineered

**Data Structure**:
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  category_id: string;
  base_price: number;
  cost_price: number;
  tax_type: 'vatable' | 'exempt' | 'zero_rated';
  has_variants: boolean;
}

interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  barcode: string | null;
  name: string;  // e.g., "Small", "Red", "500ml"
  price_override: number | null;  // null = use base_price
  attributes: Record<string, string>;  // { size: 'S', color: 'Red' }
  is_active: boolean;
}
```

### 2. Stock Movement vs Direct Stock

**Decision**: Stock derived from movement history (never directly edited)

**Rationale**:
- Full audit trail of all stock changes
- Supports batch tracking and FIFO
- Enables investigation of discrepancies
- BIR compliance for inventory audit

**Alternatives Considered**:
- Direct stock field: No audit trail
- Hybrid (movements + cache): Complexity for marginal benefit

**Stock Calculation**:
```typescript
function calculateStock(variantId: string): number {
  const movements = db.exec(`
    SELECT COALESCE(SUM(quantity), 0) as total
    FROM stock_movements
    WHERE variant_id = ?
  `, [variantId]);

  return movements[0].values[0][0] as number;
}
```

### 3. Barcode Handling

**Decision**: Support EAN-13, UPC-A, Code 128; index for fast lookup

**Rationale**:
- EAN-13: Standard for Philippine retail
- UPC-A: Common for imported products
- Code 128: Internal SKUs and variants
- Index essential for POS performance

**Implementation Notes**:
```typescript
// Barcode validation
function validateBarcode(barcode: string): boolean {
  // EAN-13 check digit validation
  if (barcode.length === 13 && /^\d+$/.test(barcode)) {
    return validateEAN13CheckDigit(barcode);
  }
  // UPC-A check digit validation
  if (barcode.length === 12 && /^\d+$/.test(barcode)) {
    return validateUPCACheckDigit(barcode);
  }
  // Code 128 (alphanumeric, any length)
  if (barcode.length >= 1 && barcode.length <= 48) {
    return true;
  }
  return false;
}
```

### 4. Batch and Expiry Tracking

**Decision**: Optional batch entity linked to stock movements

**Rationale**:
- Not all products need batch tracking
- Perishables require FIFO enforcement
- Expiry alerts prevent selling expired goods
- Batch traceability for recalls

**Alternatives Considered**:
- Batch on every movement: Overhead for non-perishables
- No batch tracking: Fails food/pharma requirements

**Data Structure**:
```typescript
interface Batch {
  id: string;
  variant_id: string;
  batch_number: string;
  expiry_date: string | null;
  received_date: string;
  supplier_id: string | null;
  notes: string | null;
}

// Stock movement references batch (optional)
interface StockMovement {
  id: string;
  variant_id: string;
  batch_id: string | null;  // Only for batch-tracked items
  quantity: number;  // Positive for in, negative for out
  movement_type: 'receive' | 'sale' | 'adjustment' | 'transfer' | 'return';
  // ...
}
```

### 5. Low Stock Alert System

**Decision**: Threshold-based alerts with real-time calculation

**Rationale**:
- Alerts calculated when stock changes
- Threshold per product (configurable)
- Dashboard shows all low-stock items
- Offline-capable (local calculation)

**Implementation Notes**:
```typescript
async function checkLowStockAlert(variantId: string): Promise<void> {
  const variant = await variantRepository.findById(variantId);
  const product = await productRepository.findById(variant.product_id);
  const currentStock = calculateStock(variantId);

  if (currentStock <= product.low_stock_threshold) {
    await stockAlertRepository.createOrUpdate({
      variant_id: variantId,
      current_stock: currentStock,
      threshold: product.low_stock_threshold,
      alert_type: currentStock === 0 ? 'out_of_stock' : 'low_stock',
      created_at: new Date().toISOString(),
    });
  } else {
    // Remove alert if stock is now above threshold
    await stockAlertRepository.removeByVariant(variantId);
  }
}
```

### 6. Category Hierarchy

**Decision**: Simple parent-child category structure

**Rationale**:
- Two levels sufficient (Category > Subcategory)
- Enables product grouping for reports
- Simple to implement and query

**Data Structure**:
```typescript
interface Category {
  id: string;
  name: string;
  parent_id: string | null;  // NULL for top-level
  display_order: number;
  is_active: boolean;
}
```

### 7. Supplier Integration

**Decision**: Basic supplier entity with product linking

**Rationale**:
- Track where products come from
- Enable supplier-based reorder reports
- Store contact info for procurement

**Scope for V1**:
- CRUD for suppliers
- Link products to suppliers
- Reorder report by supplier
- **Out of scope**: Purchase orders, supplier pricing tiers

### 8. Inventory Sync Strategy

**Decision**: Incremental sync with movement-level granularity

**Rationale**:
- Stock movements are the source of truth
- Sync movements, not calculated stock
- Server recalculates stock from movements
- Handles offline edits cleanly

**Sync Flow**:
1. Terminal creates stock movements locally
2. Movements have unique IDs (UUID)
3. On sync, send unsynced movements to server
4. Server acknowledges receipt
5. Mark movements as synced locally
6. Receive server-side movements (from other terminals)

## Technology Decisions Summary

| Component | Choice | Package/Library |
|-----------|--------|-----------------|
| Local Database | SQLite | sql.js |
| UUID Generation | uuid v4 | uuid |
| Barcode Validation | Custom | (built-in) |
| State Management | Pinia | pinia |
| UI Components | PrimeVue | primevue |
| Form Validation | Zod | zod |
| Data Tables | PrimeVue DataTable | primevue |

## Performance Considerations

### Barcode Lookup
- Index on `barcode` column
- In-memory cache for frequently scanned items
- Target: < 500ms for any lookup

### Stock Calculation
- Recalculate on movement, cache result
- Avoid recalculating on every render
- Pre-calculate for product lists

### Large Product Catalogs
- Virtual scrolling for product lists (PrimeVue)
- Paginated queries (not load all)
- Search debouncing (300ms)

## Open Questions (Resolved)

1. ~~Should variants share barcodes?~~ → No, each variant has unique barcode
2. ~~How to handle stocktake?~~ → Create adjustment movements
3. ~~Price history needed?~~ → Not for V1; store current price only
