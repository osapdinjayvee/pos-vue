# Tasks: P3 Features (Medium Priority - Enhancement)

**Input**: Design documents from `/specs/007-crm-loyalty/`, `/specs/008-advanced-analytics/`
**Prerequisites**: P1 and P2 features completed

**Features Covered**:
- 007-crm-loyalty (Customer management, loyalty points, tiers)
- 008-advanced-analytics (Merchant dashboards, custom reports)

## Format: `[ID] [P?] [Feature-Story] Description`

- **[P]**: Can run in parallel
- Feature codes: CL = CRM & Loyalty, AA = Advanced Analytics

---

## Phase 1: P3 Setup & Foundations

**Purpose**: Database migrations for P3 features

### Vue Frontend (CRM & Loyalty)

- [ ] T301 Create migration `src/db/migrations/007_crm.ts` (customers, loyalty_transactions, membership_tiers, loyalty_config)
- [ ] T302 Create default tiers seeder (Bronze, Silver, Gold, Platinum)
- [ ] T303 Create default loyalty config seeder (1pt/PHP100, 10pts=PHP1)

### Laravel Backend (Advanced Analytics)

- [ ] T304 Create migration `008_analytics.php` (sales_daily, sales_hourly, product_daily, saved_reports)
- [ ] T305 Create AggregateDaily command in `app/Console/Commands/AggregateDaily.php`
- [ ] T306 Register daily aggregation in scheduler

---

## Phase 2: CRM & Loyalty - US1 (Customer Registration)

**Feature**: 007-crm-loyalty | **Priority**: P1 within feature
**Goal**: Register customers at checkout

### Types

- [ ] T307 [P] [CL-US1] Create Customer type in `src/types/customer.ts`
- [ ] T308 [P] [CL-US1] Create MembershipTier type in `src/types/tier.ts`

### Repositories

- [ ] T309 [CL-US1] Create customerRepository in `src/repositories/customerRepository.ts`
- [ ] T310 [CL-US1] Create tierRepository in `src/repositories/tierRepository.ts`

### Services

- [ ] T311 [CL-US1] Create customerService in `src/services/customerService.ts` (createCustomer, searchByPhone, getCustomer)

### Store

- [ ] T312 [CL-US1] Create customer store in `src/stores/customer.ts` (currentCustomer, searchResults)

### Components

- [ ] T313 [P] [CL-US1] Create CustomerSearch.vue in `src/components/crm/CustomerSearch.vue`
- [ ] T314 [P] [CL-US1] Create CustomerRegistration.vue in `src/components/crm/CustomerRegistration.vue`
- [ ] T315 [CL-US1] Create CustomerProfile.vue in `src/components/crm/CustomerProfile.vue`

### Composables

- [ ] T316 [CL-US1] Create useCustomer composable in `src/composables/useCustomer.ts`

### Integration

- [ ] T317 [CL-US1] Add customer attachment to cart/transaction
- [ ] T318 [CL-US1] Show customer name on receipt

**Checkpoint**: Customers can be registered and attached to transactions

---

## Phase 3: CRM & Loyalty - US2 (Purchase History)

**Feature**: 007-crm-loyalty | **Priority**: P1 within feature
**Goal**: View customer purchase history

### Services

- [ ] T319 [CL-US2] Add getCustomerHistory to customerService
- [ ] T320 [CL-US2] Add getCustomerStats to customerService (total spend, visit count, avg ticket)

### Components

- [ ] T321 [CL-US2] Create CustomerHistory.vue in `src/components/crm/CustomerHistory.vue`
- [ ] T322 [CL-US2] Add history tab to CustomerProfile.vue

**Checkpoint**: Customer history viewable for service and returns

---

## Phase 4: CRM & Loyalty - US3 (Points Earning)

**Feature**: 007-crm-loyalty | **Priority**: P2 within feature
**Goal**: Earn loyalty points on purchases

### Types

- [ ] T323 [CL-US3] Create LoyaltyTransaction type in `src/types/loyalty.ts`
- [ ] T324 [CL-US3] Create LoyaltyConfig type in `src/types/loyaltyConfig.ts`

### Repositories

- [ ] T325 [CL-US3] Create loyaltyTransactionRepository in `src/repositories/loyaltyTransactionRepository.ts`
- [ ] T326 [CL-US3] Create loyaltyConfigRepository in `src/repositories/loyaltyConfigRepository.ts`

### Services

- [ ] T327 [CL-US3] Create loyaltyService in `src/services/loyaltyService.ts` (calculatePointsEarned, awardPoints, getPointsBalance)

### Composables

- [ ] T328 [CL-US3] Create useLoyalty composable in `src/composables/useLoyalty.ts`
- [ ] T329 [CL-US3] Create usePointsCalculation composable in `src/composables/usePointsCalculation.ts`

### Components

- [ ] T330 [CL-US3] Create LoyaltyPointsDisplay.vue in `src/components/crm/LoyaltyPointsDisplay.vue`

### Integration

- [ ] T331 [CL-US3] Award points on transaction completion
- [ ] T332 [CL-US3] Show points earned on receipt
- [ ] T333 [CL-US3] Deduct points on void/refund

**Checkpoint**: Points earned on purchases; adjusted on voids

---

## Phase 5: CRM & Loyalty - US4 (Points Redemption)

**Feature**: 007-crm-loyalty | **Priority**: P2 within feature
**Goal**: Redeem points for discounts

### Services

- [ ] T334 [CL-US4] Add redeemPoints to loyaltyService
- [ ] T335 [CL-US4] Add calculateRedemptionValue to loyaltyService
- [ ] T336 [CL-US4] Add validateRedemption (min points, balance check)

### Components

- [ ] T337 [CL-US4] Create PointsRedemption.vue in `src/components/crm/PointsRedemption.vue`

### Integration

- [ ] T338 [CL-US4] Add redemption option to payment dialog
- [ ] T339 [CL-US4] Apply points discount to transaction
- [ ] T340 [CL-US4] Restore points on void

**Checkpoint**: Points redeemable for discounts

---

## Phase 6: CRM & Loyalty - US5 (Membership Tiers)

**Feature**: 007-crm-loyalty | **Priority**: P3 within feature
**Goal**: Automatic tier upgrades with benefits

### Services

- [ ] T341 [CL-US5] Create tierService in `src/services/tierService.ts` (calculateTier, upgradeTier, getTierBenefits)
- [ ] T342 [CL-US5] Add tier discount calculation

### Components

- [ ] T343 [CL-US5] Create TierBadge.vue in `src/components/crm/TierBadge.vue`
- [ ] T344 [CL-US5] Add tier progress to CustomerProfile.vue

### Integration

- [ ] T345 [CL-US5] Auto-apply tier discount at checkout
- [ ] T346 [CL-US5] Apply tier points multiplier

**Checkpoint**: Tiers auto-upgrade; discounts apply

---

## Phase 7: Advanced Analytics - US1 (Sales Dashboard)

**Feature**: 008-advanced-analytics | **Priority**: P1 within feature
**Goal**: Visual sales dashboard for merchants

### Filament Merchant Panel

- [ ] T347 [AA-US1] Create Filament merchant panel: `php artisan make:filament-panel merchant`
- [ ] T348 [AA-US1] Create Dashboard page in `app/Filament/Merchant/Pages/Dashboard.php`

### Widgets

- [ ] T349 [P] [AA-US1] Create TodaySalesCard widget
- [ ] T350 [P] [AA-US1] Create TransactionCountCard widget
- [ ] T351 [P] [AA-US1] Create AverageTicketCard widget
- [ ] T352 [AA-US1] Create SalesChart widget (hourly/daily)

### Services

- [ ] T353 [AA-US1] Create DashboardService in `app/Services/DashboardService.php`

**Checkpoint**: Merchant sees sales dashboard with charts

---

## Phase 8: Advanced Analytics - US2 (Product Analytics)

**Feature**: 008-advanced-analytics | **Priority**: P1 within feature
**Goal**: Product performance insights

### Filament Pages

- [ ] T354 [AA-US2] Create ProductAnalytics page in `app/Filament/Merchant/Pages/ProductAnalytics.php`

### Widgets

- [ ] T355 [P] [AA-US2] Create TopProductsTable widget
- [ ] T356 [P] [AA-US2] Create CategoryPieChart widget
- [ ] T357 [AA-US2] Create SlowMoversTable widget

### Services

- [ ] T358 [AA-US2] Create ProductAnalyticsService in `app/Services/ProductAnalyticsService.php`

**Checkpoint**: Product rankings and category breakdown visible

---

## Phase 9: Advanced Analytics - US3/US4 (Time & Cashier Analysis)

**Feature**: 008-advanced-analytics | **Priority**: P2 within feature
**Goal**: Time-based and cashier performance analysis

### Filament Pages

- [ ] T359 [P] [AA-US3] Create TimeAnalysis page in `app/Filament/Merchant/Pages/TimeAnalysis.php`
- [ ] T360 [P] [AA-US4] Create CashierPerformance page in `app/Filament/Merchant/Pages/CashierPerformance.php`

### Widgets

- [ ] T361 [P] [AA-US3] Create HourlyHeatmap widget
- [ ] T362 [P] [AA-US4] Create CashierRanking widget
- [ ] T363 [AA-US4] Create CashierComparison widget

### Services

- [ ] T364 [AA-US3] Create TimeAnalysisService in `app/Services/TimeAnalysisService.php`
- [ ] T365 [AA-US4] Create CashierAnalyticsService in `app/Services/CashierAnalyticsService.php`

**Checkpoint**: Peak hours and cashier metrics visible

---

## Phase 10: Advanced Analytics - US5/US6 (Inventory & Custom Reports)

**Feature**: 008-advanced-analytics | **Priority**: P2-P3 within feature
**Goal**: Inventory analytics and custom report builder

### Filament Pages

- [ ] T366 [P] [AA-US5] Create InventoryAnalytics page
- [ ] T367 [P] [AA-US6] Create CustomReports page

### Widgets

- [ ] T368 [AA-US5] Create InventoryValueCard widget
- [ ] T369 [AA-US5] Create TurnoverRateChart widget
- [ ] T370 [AA-US5] Create ExpiringProductsTable widget

### Custom Report Builder

- [ ] T371 [AA-US6] Create SavedReport model
- [ ] T372 [AA-US6] Create report builder form (dimensions, measures, filters)
- [ ] T373 [AA-US6] Create saved reports list
- [ ] T374 [AA-US6] Add report scheduling

**Checkpoint**: Inventory insights and custom reports working

---

## Phase 11: P3 Integration & Polish

**Purpose**: Cross-feature integration

### CRM Integration

- [ ] T375 [P] Add customer search to POS terminal
- [ ] T376 [P] Show loyalty status on checkout summary
- [ ] T377 Sync customers to server

### Analytics Integration

- [ ] T378 [P] Connect dashboard to live transaction data
- [ ] T379 [P] Add branch filtering to all analytics
- [ ] T380 Test aggregation job with real data

### Validation

- [ ] T381 [P] Run quickstart.md verification for CRM
- [ ] T382 [P] Run quickstart.md verification for analytics
- [ ] T383 End-to-end: Register customer → Make purchases → Earn points → Redeem → View in dashboard

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → All other phases
                ↓
        ┌───────┴───────┐
        ↓               ↓
   CRM & Loyalty    Analytics
   (Phase 2-6)     (Phase 7-10)
        ↓               ↓
        └───────┬───────┘
                ↓
        Phase 11 (Integration)
```

### Feature Independence

- **CRM (007)**: Vue frontend, can develop after P1/P2
- **Analytics (008)**: Laravel/Filament merchant panel

### Parallel Opportunities

- CRM and Analytics can be developed in parallel
- Vue (CRM) and Laravel (Analytics) are separate codebases
- Within features, components marked [P] can run in parallel

---

## Notes

- Points calculation: 1 point per PHP 100 spent (configurable)
- Redemption rate: 10 points = PHP 1 discount (configurable)
- Tier thresholds based on lifetime spend
- Analytics use pre-aggregated data for performance
- Dashboards cache data for 5 minutes
