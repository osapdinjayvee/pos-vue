# Research: Cash Drawer Management

**Feature**: 009-cash-drawer
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Philippine Currency Denominations

**Decision**: Standard PHP bills and coins

```typescript
const PHP_DENOMINATIONS = [
  // Bills
  { value: 1000, label: '₱1,000', type: 'bill' },
  { value: 500, label: '₱500', type: 'bill' },
  { value: 200, label: '₱200', type: 'bill' },
  { value: 100, label: '₱100', type: 'bill' },
  { value: 50, label: '₱50', type: 'bill' },
  { value: 20, label: '₱20', type: 'bill' },
  // Coins
  { value: 10, label: '₱10', type: 'coin' },
  { value: 5, label: '₱5', type: 'coin' },
  { value: 1, label: '₱1', type: 'coin' },
  { value: 0.25, label: '25¢', type: 'coin' },
];

interface DenominationCount {
  denomination: number;
  quantity: number;
  subtotal: number;
}
```

### 2. Expected Cash Calculation

**Decision**: Opening + cash sales - cash refunds - drops + paid-ins

```typescript
function calculateExpectedCash(session: DrawerSession): number {
  const cashSales = session.transactions
    .filter(t => t.status === 'completed')
    .flatMap(t => t.payments)
    .filter(p => p.method === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  const cashRefunds = session.refunds
    .filter(r => r.refund_method === 'cash')
    .reduce((sum, r) => sum + r.total_refund_amount, 0);

  const drops = session.operations
    .filter(o => o.type === 'drop')
    .reduce((sum, o) => sum + o.amount, 0);

  const paidIns = session.operations
    .filter(o => o.type === 'paid_in')
    .reduce((sum, o) => sum + o.amount, 0);

  return session.opening_amount + cashSales - cashRefunds - drops + paidIns;
}
```

### 3. Variance Thresholds

**Decision**: Configurable per merchant with default PHP 100

```typescript
interface VarianceConfig {
  threshold: number;          // PHP amount (default 100)
  requireReason: boolean;     // Require explanation if over threshold
  alertSupervisor: boolean;   // Auto-alert on large variance
}
```

### 4. Hardware Integration (Optional)

**Decision**: Electron IPC for drawer kick

```typescript
// Electron main process
ipcMain.handle('open-drawer', async () => {
  // Standard drawer kick via printer port
  const printer = await findPrinter('THERMAL_PRINTER');
  if (printer) {
    // ESC/POS command for drawer kick
    printer.write(Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]));
    return { success: true };
  }
  return { success: false, error: 'No printer found' };
});
```

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Denomination UI | PrimeVue InputNumber | Built-in validation |
| Hardware | Optional Electron | Not all setups |
| Variance alert | Configurable threshold | Business flexibility |
