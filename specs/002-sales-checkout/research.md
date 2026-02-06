# Research: Sales & Checkout

**Feature**: 002-sales-checkout
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Philippine VAT Computation Rules

**Decision**: VAT-inclusive pricing with breakdown on receipt

**Rationale**:
- Philippine retail standard: prices displayed are VAT-inclusive
- VAT rate: 12% (as of 2024)
- Receipt must show: VATable Sales, VAT Amount, VAT-Exempt, Zero-Rated
- Computation: VATable Sales = Price / 1.12, VAT = Price - VATable Sales

**VAT Types**:
```typescript
type TaxType = 'vatable' | 'exempt' | 'zero_rated';

// For VAT-inclusive price of PHP 112:
// VATable Sales = 112 / 1.12 = 100.00
// VAT Amount = 112 - 100 = 12.00

function calculateVAT(price: number, taxType: TaxType): VATBreakdown {
  if (taxType === 'vatable') {
    const vatableSales = price / 1.12;
    const vatAmount = price - vatableSales;
    return {
      vatableSales: round2(vatableSales),
      vatAmount: round2(vatAmount),
      vatExempt: 0,
      zeroRated: 0,
    };
  } else if (taxType === 'exempt') {
    return { vatableSales: 0, vatAmount: 0, vatExempt: price, zeroRated: 0 };
  } else {
    return { vatableSales: 0, vatAmount: 0, vatExempt: 0, zeroRated: price };
  }
}
```

### 2. BIR Receipt Requirements

**Decision**: Include all mandatory fields per BIR RR 16-2018

**Required Fields**:
1. Business name, address, TIN
2. Branch code (if applicable)
3. OR number (sequential, no gaps)
4. Date and time of transaction
5. Cashier name/ID
6. Item details: description, quantity, unit price, amount
7. VAT breakdown
8. Total amount due
9. Payment tendered and change
10. PTU (Permit to Use) number
11. Machine serial number
12. MIN (Machine Identification Number)
13. "THIS RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF PTU"

**Receipt Format**:
```text
===================================
        SAMPLE STORE INC.
   123 Main Street, Manila City
      TIN: 123-456-789-000
         Branch: Main
===================================
OR No: 0000001234    POS: POS-001
Date: 2026-02-04     Time: 14:30:25
Cashier: Juan Dela Cruz

-----------------------------------
 Item                    Amount
-----------------------------------
 Product A          x2   200.00
 Product B          x1   150.00
-----------------------------------
 VATable Sales           312.50
 VAT 12%                  37.50
 VAT Exempt                0.00
 Zero Rated                0.00
-----------------------------------
 TOTAL                   350.00
 CASH                    500.00
 CHANGE                  150.00
===================================
PTU No: FP012024-123456789-00001
S/N: ABC123456789
MIN: 123456789012345

THIS RECEIPT SHALL BE VALID FOR
FIVE (5) YEARS FROM DATE OF PTU

  Thank you for shopping with us!
===================================
```

### 3. OR Number Generation Strategy

**Decision**: Pre-allocated ranges per terminal with server validation

**Rationale**:
- Offline requires guaranteed unique ORs without server call
- Pre-allocate ranges (e.g., 0001-1000 for Terminal 1)
- Alert when 80% exhausted
- Server validates no gaps on sync

**Implementation**:
```typescript
interface ORSeries {
  id: string;
  terminal_id: string;
  prefix: string;        // e.g., "OR"
  current_number: number;
  start_number: number;
  end_number: number;
  branch_code: string;
  ptu_number: string;
  machine_serial: string;
  is_active: boolean;
}

function getNextORNumber(series: ORSeries): string {
  if (series.current_number >= series.end_number) {
    throw new Error('OR series exhausted - sync required');
  }

  const orNumber = `${series.prefix}-${series.branch_code}-${String(series.current_number + 1).padStart(10, '0')}`;
  series.current_number++;

  return orNumber;
}
```

### 4. Senior Citizen and PWD Discounts

**Decision**: 20% discount on VAT-exempt eligible items per RA 9994 and RA 10754

**Rules**:
- 20% discount on original price
- Items become VAT-exempt when discount applied
- Requires ID number capture for audit
- Only one discount per transaction (SC or PWD, not both)

**Implementation**:
```typescript
interface SeniorPWDDiscount {
  type: 'senior_citizen' | 'pwd';
  idNumber: string;
  idName: string;
  discountRate: 0.20;
}

function applySeniorPWDDiscount(
  cart: CartItem[],
  discount: SeniorPWDDiscount
): { items: CartItem[]; totalDiscount: number } {
  let totalDiscount = 0;

  const updatedItems = cart.map(item => {
    // Only VATable items eligible for SC/PWD discount
    if (item.taxType === 'vatable') {
      const itemDiscount = item.lineTotal * discount.discountRate;
      totalDiscount += itemDiscount;

      return {
        ...item,
        discount: itemDiscount,
        taxType: 'exempt', // Becomes VAT-exempt
        finalPrice: item.lineTotal - itemDiscount,
      };
    }
    return item;
  });

  return { items: updatedItems, totalDiscount };
}
```

### 5. Payment Method Handling

**Decision**: Support cash, card, e-wallet with split payments

**Payment Types**:
```typescript
type PaymentMethod = 'cash' | 'card' | 'gcash' | 'maya' | 'other_ewallet';

interface Payment {
  id: string;
  transaction_id: string;
  method: PaymentMethod;
  amount: number;
  reference_number: string | null;  // For card/e-wallet
  tendered: number | null;          // For cash (to calculate change)
  change: number | null;            // For cash
  created_at: string;
}
```

**Split Payment Flow**:
1. Transaction total: PHP 500
2. Customer pays PHP 300 GCash → remaining: PHP 200
3. Customer pays PHP 200 cash → remaining: PHP 0
4. Transaction complete with two payment records

### 6. Void and Refund Workflow

**Decision**: Immutable original transaction; create compensating records

**Void** (cancel entire transaction):
- Original transaction status unchanged
- Create Void record referencing original
- Restore stock via stock movements (type: 'void')
- Requires supervisor PIN
- Must be same day

**Refund** (return items):
- Original transaction unchanged
- Create Refund record with items being returned
- Restore stock for returned items
- Generate refund receipt
- Requires supervisor PIN
- Can be days/weeks later

**Implementation**:
```typescript
interface Void {
  id: string;
  transaction_id: string;
  reason: string;
  supervisor_id: string;
  terminal_id: string;
  created_at: string;
}

interface Refund {
  id: string;
  original_transaction_id: string;
  refund_or_number: string;
  items: RefundItem[];
  total_refund_amount: number;
  reason: string;
  supervisor_id: string;
  terminal_id: string;
  created_at: string;
}
```

### 7. Receipt Printing Implementation

**Decision**: Web Print API for browsers; Electron IPC for thermal printers

**Web Browser**:
```typescript
function printReceiptWeb(receiptHtml: string): void {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(receiptHtml);
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}
```

**Electron (Thermal Printer)**:
```typescript
// Main process
ipcMain.handle('print-receipt', async (event, receiptData) => {
  const options = {
    silent: true,
    deviceName: 'THERMAL_PRINTER_NAME',
    pageSize: { width: 80000, height: 297000 }, // 80mm thermal
  };

  const win = new BrowserWindow({ show: false });
  await win.loadURL(`data:text/html,${encodeURIComponent(receiptData.html)}`);
  await win.webContents.print(options);
  win.close();
});
```

### 8. Transaction Sync Strategy

**Decision**: Sync completed transactions with stock movements

**Sync Flow**:
1. Transaction completes locally
2. Stock movements created (type: 'sale')
3. Transaction queued for sync
4. On connectivity:
   - Upload transaction + items + payments
   - Upload stock movements
   - Server acknowledges
   - Mark as synced

**Conflict Handling**:
- Transactions are insert-only (no updates)
- OR numbers guaranteed unique via pre-allocation
- Server validates OR sequence on sync
- Gaps flagged for investigation

## Technology Decisions Summary

| Component | Choice | Package/Library |
|-----------|--------|-----------------|
| VAT Calculation | Custom utility | (built-in) |
| Receipt Format | HTML template | (built-in) |
| Print (Web) | window.print() | (built-in) |
| Print (Electron) | webContents.print() | electron |
| State Management | Pinia | pinia |
| UI Components | PrimeVue | primevue |

## Performance Considerations

### Barcode Scan Response
- Index on `barcode` column
- Cache recently scanned products in memory
- Target: < 500ms including UI update

### Cart Operations
- Computed totals on every change
- Debounce quantity updates (300ms)
- Virtual scroll for large carts (>50 items)

### Receipt Generation
- Template pre-compiled
- Data binding only at print time
- Target: < 1 second to display preview

## Open Questions (Resolved)

1. ~~Multiple OR series per terminal?~~ → One active series per terminal
2. ~~Partial payment allowed?~~ → Yes, via split payments
3. ~~Void time limit?~~ → Same day recommended; supervisor override for later
