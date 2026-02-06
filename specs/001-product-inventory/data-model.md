# Data Model: Product & Inventory Management

**Feature**: 001-product-inventory
**Date**: 2026-02-04

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│  Category   │◄──────│   Product   │
└─────────────┘       └──────┬──────┘
                             │
                    ┌────────┼────────┐
                    │        │        │
                    ▼        ▼        ▼
             ┌──────────┐ ┌──────┐ ┌──────────┐
             │ Variant  │ │Batch │ │ Supplier │
             └────┬─────┘ └──┬───┘ └──────────┘
                  │          │
                  ▼          ▼
            ┌─────────────────────┐
            │   StockMovement     │
            └─────────────────────┘
                      │
                      ▼
            ┌─────────────────────┐
            │    StockAlert       │
            └─────────────────────┘
```

## Entities

### Category

Organizes products into hierarchical groups.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(100) | NOT NULL | Category name |
| parent_id | UUID | FK, NULL | Parent category (NULL for top-level) |
| description | string(255) | NULL | Category description |
| display_order | integer | DEFAULT 0 | Sort order in lists |
| is_active | boolean | DEFAULT true | Available for new products |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |

**Indexes**:
- `idx_category_parent` on (parent_id)
- `idx_category_active` on (is_active)

### Product

Main product entity with shared attributes.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(255) | NOT NULL | Product name |
| description | text | NULL | Product description |
| category_id | UUID | FK, NOT NULL | Product category |
| supplier_id | UUID | FK, NULL | Primary supplier |
| base_price | decimal(15,2) | NOT NULL | Default selling price (VAT-inclusive) |
| cost_price | decimal(15,2) | DEFAULT 0 | Purchase cost |
| tax_type | enum | NOT NULL | vatable, exempt, zero_rated |
| has_variants | boolean | DEFAULT false | Whether product has variants |
| low_stock_threshold | integer | DEFAULT 10 | Alert when stock falls below |
| track_batches | boolean | DEFAULT false | Enable batch/expiry tracking |
| is_active | boolean | DEFAULT true | Available for sale |
| image_url | string(500) | NULL | Product image path |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_product_category` on (category_id)
- `idx_product_supplier` on (supplier_id)
- `idx_product_active` on (is_active)
- `idx_product_name` on (name)

**Validation Rules**:
- Name: 1-255 characters
- base_price: >= 0
- cost_price: >= 0
- low_stock_threshold: >= 0

### ProductVariant

Specific variation of a product with its own inventory.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| product_id | UUID | FK, NOT NULL | Parent product |
| sku | string(50) | UNIQUE | Stock keeping unit |
| barcode | string(50) | UNIQUE, NULL | Scannable barcode |
| name | string(100) | NOT NULL | Variant name (e.g., "Large", "Red") |
| attributes | JSON | NULL | Variant attributes (size, color, etc.) |
| price_override | decimal(15,2) | NULL | Override base_price (NULL = use base) |
| cost_override | decimal(15,2) | NULL | Override cost_price |
| image_url | string(500) | NULL | Variant-specific image |
| is_active | boolean | DEFAULT true | Available for sale |
| display_order | integer | DEFAULT 0 | Sort order |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_variant_product` on (product_id)
- `idx_variant_barcode` on (barcode)
- `idx_variant_sku` on (sku)
- `idx_variant_active` on (is_active)

**Computed Fields** (not stored):
- `current_stock`: SUM of stock_movements.quantity
- `effective_price`: price_override ?? product.base_price

### StockMovement

Records every change to inventory levels.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| variant_id | UUID | FK, NOT NULL | Which variant changed |
| batch_id | UUID | FK, NULL | Associated batch (for batch-tracked) |
| quantity | integer | NOT NULL | Change amount (+/-) |
| movement_type | enum | NOT NULL | receive, sale, adjustment, transfer_in, transfer_out, return, void |
| reference_type | string(50) | NULL | Related entity type (e.g., "transaction") |
| reference_id | UUID | NULL | Related entity ID |
| unit_cost | decimal(15,2) | NULL | Cost at time of movement |
| reason | string(255) | NULL | Explanation for adjustments |
| user_id | UUID | FK, NOT NULL | Who made the change |
| terminal_id | string(50) | NOT NULL | Where change occurred |
| branch_id | UUID | FK, NOT NULL | Which branch |
| created_at | datetime | NOT NULL | When movement occurred |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_movement_variant` on (variant_id)
- `idx_movement_batch` on (batch_id)
- `idx_movement_type` on (movement_type)
- `idx_movement_reference` on (reference_type, reference_id)
- `idx_movement_created` on (created_at)

**Movement Types**:
- `receive`: Stock received from supplier
- `sale`: Stock sold to customer
- `adjustment`: Manual inventory correction
- `transfer_in`: Received from another branch
- `transfer_out`: Sent to another branch
- `return`: Customer return
- `void`: Voided transaction restores stock

### Batch

Tracks lot/batch information for perishables.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| variant_id | UUID | FK, NOT NULL | Which variant |
| batch_number | string(50) | NOT NULL | Lot/batch identifier |
| expiry_date | date | NULL | When batch expires |
| manufacture_date | date | NULL | When produced |
| received_date | date | NOT NULL | When received |
| supplier_id | UUID | FK, NULL | Supplier for this batch |
| notes | text | NULL | Additional info |
| created_at | datetime | NOT NULL | Record creation timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_batch_variant` on (variant_id)
- `idx_batch_expiry` on (expiry_date)
- `idx_batch_number` on (batch_number)

**Computed Fields**:
- `current_quantity`: SUM of movements WHERE batch_id = this.id
- `is_expired`: expiry_date < today
- `days_until_expiry`: expiry_date - today

### Supplier

Vendor/supplier information.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(255) | NOT NULL | Supplier name |
| contact_person | string(255) | NULL | Primary contact |
| phone | string(50) | NULL | Phone number |
| email | string(255) | NULL | Email address |
| address | text | NULL | Full address |
| payment_terms | string(100) | NULL | e.g., "Net 30" |
| notes | text | NULL | Additional info |
| is_active | boolean | DEFAULT true | Available for selection |
| created_at | datetime | NOT NULL | Record creation timestamp |
| updated_at | datetime | NOT NULL | Last modification timestamp |
| synced_at | datetime | NULL | Last sync with server |

**Indexes**:
- `idx_supplier_name` on (name)
- `idx_supplier_active` on (is_active)

### StockAlert

Current low-stock and expiry alerts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| variant_id | UUID | FK, UNIQUE | Which variant (one alert per variant) |
| alert_type | enum | NOT NULL | low_stock, out_of_stock, expiring_soon, expired |
| current_value | decimal | NOT NULL | Current stock or days until expiry |
| threshold | decimal | NOT NULL | Threshold that triggered alert |
| acknowledged | boolean | DEFAULT false | Has been seen by user |
| acknowledged_by | UUID | FK, NULL | Who acknowledged |
| acknowledged_at | datetime | NULL | When acknowledged |
| created_at | datetime | NOT NULL | When alert was created |
| updated_at | datetime | NOT NULL | Last update |

**Indexes**:
- `idx_alert_variant` on (variant_id)
- `idx_alert_type` on (alert_type)
- `idx_alert_acknowledged` on (acknowledged)

## SQLite Schema (Local)

```sql
-- Categories
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Products
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category_id TEXT NOT NULL,
    supplier_id TEXT,
    base_price REAL NOT NULL,
    cost_price REAL DEFAULT 0,
    tax_type TEXT NOT NULL CHECK (tax_type IN ('vatable', 'exempt', 'zero_rated')),
    has_variants INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    track_batches INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    image_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX idx_product_category ON products(category_id);
CREATE INDEX idx_product_name ON products(name);
CREATE INDEX idx_product_active ON products(is_active);

-- Product variants
CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    attributes TEXT,  -- JSON
    price_override REAL,
    cost_override REAL,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_variant_product ON product_variants(product_id);
CREATE INDEX idx_variant_barcode ON product_variants(barcode);
CREATE INDEX idx_variant_sku ON product_variants(sku);

-- Stock movements
CREATE TABLE stock_movements (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL,
    batch_id TEXT,
    quantity INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receive', 'sale', 'adjustment', 'transfer_in', 'transfer_out', 'return', 'void')),
    reference_type TEXT,
    reference_id TEXT,
    unit_cost REAL,
    reason TEXT,
    user_id TEXT NOT NULL,
    terminal_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE INDEX idx_movement_variant ON stock_movements(variant_id);
CREATE INDEX idx_movement_batch ON stock_movements(batch_id);
CREATE INDEX idx_movement_type ON stock_movements(movement_type);
CREATE INDEX idx_movement_created ON stock_movements(created_at);

-- Batches
CREATE TABLE batches (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date TEXT,
    manufacture_date TEXT,
    received_date TEXT NOT NULL,
    supplier_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    synced_at TEXT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE INDEX idx_batch_variant ON batches(variant_id);
CREATE INDEX idx_batch_expiry ON batches(expiry_date);

-- Suppliers
CREATE TABLE suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced_at TEXT
);

CREATE INDEX idx_supplier_name ON suppliers(name);

-- Stock alerts
CREATE TABLE stock_alerts (
    id TEXT PRIMARY KEY,
    variant_id TEXT NOT NULL UNIQUE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'expiring_soon', 'expired')),
    current_value REAL NOT NULL,
    threshold REAL NOT NULL,
    acknowledged INTEGER DEFAULT 0,
    acknowledged_by TEXT,
    acknowledged_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id)
);

CREATE INDEX idx_alert_type ON stock_alerts(alert_type);
CREATE INDEX idx_alert_acknowledged ON stock_alerts(acknowledged);
```

## Sync Payload Schemas

### Product Catalog Sync (Server → Terminal)

```typescript
interface ProductSyncResponse {
  categories: Category[];
  products: (Product & { variants: ProductVariant[] })[];
  suppliers: Supplier[];
  deleted_ids: {
    categories: string[];
    products: string[];
    variants: string[];
    suppliers: string[];
  };
  sync_timestamp: string;
}
```

### Stock Movement Sync (Terminal → Server)

```typescript
interface StockSyncRequest {
  terminal_id: string;
  branch_id: string;
  movements: StockMovement[];
  batches: Batch[];
}

interface StockSyncResponse {
  synced_movement_ids: string[];
  synced_batch_ids: string[];
  server_movements: StockMovement[];  // From other terminals
  sync_timestamp: string;
}
```
