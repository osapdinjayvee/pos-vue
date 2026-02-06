# Research: CRM & Loyalty Programs

**Feature**: 007-crm-loyalty
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Points Calculation Model

**Decision**: Configurable earn/redeem rates per merchant

```typescript
interface LoyaltyConfig {
  earnRate: number;       // Points per PHP (e.g., 0.01 = 1 point per PHP 100)
  redeemRate: number;     // PHP per point (e.g., 0.10 = PHP 0.10 per point)
  expiryDays: number;     // Days until points expire (0 = never)
  minRedemption: number;  // Minimum points to redeem
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  earnRate: 0.01,         // 1 point per PHP 100
  redeemRate: 0.10,       // 10 points = PHP 1
  expiryDays: 365,        // 1 year
  minRedemption: 100,     // 100 points minimum
};

function calculatePointsEarned(amount: number, config: LoyaltyConfig): number {
  return Math.floor(amount * config.earnRate);
}

function calculateRedemptionValue(points: number, config: LoyaltyConfig): number {
  return points * config.redeemRate;
}
```

### 2. Membership Tier System

**Decision**: Threshold-based tiers with automatic upgrade

```typescript
interface MembershipTier {
  id: string;
  name: string;
  minSpend: number;       // Lifetime spend threshold
  discount: number;       // Percentage (e.g., 0.05 = 5%)
  pointsMultiplier: number; // Bonus points (e.g., 1.5 = 50% bonus)
  benefits: string[];     // Description list
}

const DEFAULT_TIERS: MembershipTier[] = [
  { id: 'bronze', name: 'Bronze', minSpend: 0, discount: 0, pointsMultiplier: 1 },
  { id: 'silver', name: 'Silver', minSpend: 10000, discount: 0.03, pointsMultiplier: 1.25 },
  { id: 'gold', name: 'Gold', minSpend: 50000, discount: 0.05, pointsMultiplier: 1.5 },
  { id: 'platinum', name: 'Platinum', minSpend: 100000, discount: 0.10, pointsMultiplier: 2 },
];
```

### 3. Points on Void/Refund

**Decision**: Create compensating loyalty transaction

```typescript
async function handleTransactionVoid(
  transaction: Transaction,
  customer: Customer
): Promise<void> {
  // Find points earned on original transaction
  const earnedPoints = await loyaltyRepository.findByTransaction(transaction.id);

  if (earnedPoints) {
    // Create deduction record
    await loyaltyRepository.create({
      type: 'adjustment',
      points: -earnedPoints.points,
      reason: `Void: OR ${transaction.or_number}`,
      reference_id: transaction.id,
    });
  }
}
```

### 4. Offline Customer Operations

**Decision**: Full customer data synced to terminal

```typescript
// Customer sync strategy
// - All customers for merchant synced to terminal
// - New registrations queued for upload
// - Points calculated locally, reconciled on sync

interface CustomerSyncPayload {
  customers: Customer[];
  loyaltyTransactions: LoyaltyTransaction[];
  tiers: MembershipTier[];
  config: LoyaltyConfig;
}
```

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Customer search | Phone number index | Primary identifier |
| Points storage | Separate loyalty_transactions | Audit trail |
| Tier check | On customer load | Real-time display |
