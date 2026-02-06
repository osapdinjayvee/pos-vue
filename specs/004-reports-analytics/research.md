# Research: Reports & Analytics

**Feature**: 004-reports-analytics
**Date**: 2026-02-04

## Research Tasks Completed

### 1. BIR X-Reading and Z-Reading Requirements

**Decision**: Implement per BIR RR 16-2018 requirements

**X-Reading Requirements**:
- Can be generated multiple times per shift
- Shows current shift totals without resetting counters
- Sequential X-counter (resets on Z-Reading)
- Fields: X-counter, terminal ID, cashier, shift start, current time
- Sales breakdown: gross, discounts, net, VAT breakdown
- OR range used in current shift

**Z-Reading Requirements**:
- Generated once per day at end of business
- Resets daily accumulators (X-counter back to 1)
- Sequential Z-counter (NEVER resets - critical for BIR)
- Fields: Z-counter, terminal ID, date, all X-Reading fields
- Beginning/ending OR numbers for the day
- Accumulated totals since last Z-Reading

```typescript
interface ZReading {
  id: string;
  z_counter: number;           // Sequential, never resets
  terminal_id: string;
  branch_id: string;
  date: string;                // YYYY-MM-DD
  beginning_or: string;
  ending_or: string;
  gross_sales: number;
  discount_total: number;
  net_sales: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  void_count: number;
  void_amount: number;
  refund_count: number;
  refund_amount: number;
  transaction_count: number;
  generated_by: string;
  generated_at: string;
}
```

### 2. Z-Counter Integrity Strategy

**Decision**: Dedicated table with single-row-per-terminal pattern

**Rationale**:
- Z-counter must never reset or skip
- Each terminal has its own Z-counter
- Counter survives app restarts, crashes, data corruption
- Counter is only incremented atomically with Z-Reading generation

```typescript
// Z-counter table
interface ZCounter {
  terminal_id: string;    // PK
  current_value: number;  // Current Z-counter
  last_z_date: string;    // Last Z-Reading date
  updated_at: string;
}

// Atomic increment with Z-Reading generation
async function generateZReading(terminalId: string): Promise<ZReading> {
  return db.transaction(async (tx) => {
    // 1. Get and increment Z-counter atomically
    const counter = await tx.run(
      `UPDATE z_counters SET current_value = current_value + 1 WHERE terminal_id = ?`,
      [terminalId]
    );

    const newCounter = await tx.get(
      `SELECT current_value FROM z_counters WHERE terminal_id = ?`,
      [terminalId]
    );

    // 2. Calculate totals since last Z-Reading
    const totals = await calculateZReadingTotals(tx, terminalId);

    // 3. Create Z-Reading record
    const zReading = await insertZReading(tx, {
      z_counter: newCounter.current_value,
      ...totals
    });

    // 4. Reset X-counter
    await tx.run(
      `UPDATE x_counters SET current_value = 0 WHERE terminal_id = ?`,
      [terminalId]
    );

    return zReading;
  });
}
```

### 3. Report Calculation Strategy

**Decision**: Derive from transaction data; pre-aggregate for performance

**Real-time Calculations** (X-Reading, current day):
- Query transaction_items grouped by tax_type
- Sum voids and refunds separately
- Fast for single shift/day

**Pre-aggregated Data** (historical reports):
- Daily aggregates calculated on Z-Reading
- Stored in sales_aggregates table
- Enables fast monthly/yearly reports

```typescript
interface SalesAggregate {
  id: string;
  date: string;             // YYYY-MM-DD
  terminal_id: string;
  branch_id: string;
  gross_sales: number;
  discount_total: number;
  net_sales: number;
  vatable_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  transaction_count: number;
  void_count: number;
  refund_count: number;
  created_at: string;
}

// Monthly report from aggregates
function getMonthlyReport(year: number, month: number): Promise<SalesAggregate[]> {
  return db.all(
    `SELECT
       SUM(gross_sales) as gross_sales,
       SUM(net_sales) as net_sales,
       SUM(vat_amount) as vat_amount,
       -- ... other sums
     FROM sales_aggregates
     WHERE strftime('%Y-%m', date) = ?`,
    [`${year}-${month.toString().padStart(2, '0')}`]
  );
}
```

### 4. VAT Report Compliance

**Decision**: Match BIR 2550M/2550Q form requirements

**VAT Summary Fields**:
- Total VATable Sales (net of VAT)
- Output VAT (12% of VATable)
- VAT-Exempt Sales
- Zero-Rated Sales
- Less: Discounts to SC/PWD (VAT-exempt portion)
- Total Sales (all categories)

```typescript
interface VATReport {
  period_start: string;
  period_end: string;
  vatable_sales: number;      // Net of VAT
  output_vat: number;         // 12%
  vat_exempt_sales: number;
  zero_rated_sales: number;
  sc_pwd_discount: number;    // For audit trail
  total_sales: number;

  // Per transaction breakdown for audit
  transactions: {
    or_number: string;
    date: string;
    vatable: number;
    vat: number;
    exempt: number;
    zero_rated: number;
  }[];
}
```

### 5. Report Export Strategy

**Decision**: Generate PDF for print, CSV for spreadsheet analysis

**PDF Generation**:
- Use browser print API for simple cases
- Format matches BIR receipt requirements
- Include all required headers and footers

**CSV Export**:
- Standard format for Excel/Google Sheets
- Date, OR#, amounts, VAT breakdown per row
- Summary row at end

```typescript
// Report export service
function exportToPDF(report: ReportData): void {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(formatReportHTML(report));
  printWindow.document.close();
  printWindow.print();
}

function exportToCSV(report: ReportData): string {
  const headers = ['Date', 'OR Number', 'Gross', 'Discount', 'Net', 'VAT'];
  const rows = report.transactions.map(t => [
    t.date, t.or_number, t.gross, t.discount, t.net, t.vat
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}
```

### 6. Offline Report Generation

**Decision**: All reports work 100% offline from SQLite

**Implementation**:
- All report queries run against local SQLite
- No network dependency for report generation
- Sync status indicator shows if data is complete
- Historical reports may be incomplete if offline during that period

```typescript
interface ReportMetadata {
  generated_at: string;
  generated_offline: boolean;
  data_sync_status: 'complete' | 'partial' | 'pending';
  pending_transactions: number;  // Count of unsynced
}

function generateReportWithStatus<T>(
  reportFn: () => Promise<T>
): Promise<{ report: T; metadata: ReportMetadata }> {
  const pendingCount = await getPendingSyncCount();
  const report = await reportFn();

  return {
    report,
    metadata: {
      generated_at: new Date().toISOString(),
      generated_offline: !navigator.onLine,
      data_sync_status: pendingCount > 0 ? 'partial' : 'complete',
      pending_transactions: pendingCount
    }
  };
}
```

## Technology Decisions Summary

| Component | Choice | Package/Library |
|-----------|--------|-----------------|
| Charts | PrimeVue Charts | primevue/chart |
| Data Tables | PrimeVue DataTable | primevue/datatable |
| PDF Export | Browser print API | (built-in) |
| CSV Export | Custom formatter | (built-in) |
| Date Filtering | PrimeVue Calendar | primevue/calendar |
| State | Pinia | pinia |

## Performance Considerations

### X-Reading Generation
- Query current shift transactions only
- Index on shift_id for fast lookup
- Target: < 5 seconds

### Z-Reading Generation
- Query day's transactions
- Pre-calculate and store aggregates
- Atomic counter increment
- Target: < 10 seconds

### Historical Reports
- Use pre-aggregated data
- Index on date columns
- Paginate large result sets
- Target: 1 year data < 30 seconds

## Open Questions (Resolved)

1. ~~Can Z-Reading be generated more than once per day?~~ → System warns; requires supervisor override
2. ~~How to handle Z-Reading when terminal was offline?~~ → Generate with offline data; sync status shown
3. ~~Report data retention period?~~ → 10+ years per BIR requirement
