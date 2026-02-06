# Tasks: CRM & Loyalty Programs

**Input**: Design documents from `/specs/007-crm-loyalty/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md
**Feature Branch**: `007-crm-loyalty`
**Depends On**: 002-sales-checkout (transactions), 003-user-management

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Existing Infrastructure (DO NOT recreate)

- **Customer table**: Already exists in migration 005 (columns: id, name, email, phone, address, city, postal_code, country, tax_id, customer_type, credit_limit, current_balance, loyalty_points, notes, is_active, created_at, updated_at, synced_at)
- **Customer types**: `Customer`, `CustomerInput`, `DisplayCustomer`, `CustomerType` in `src/types/order.ts`
- **Customer repository**: `src/repositories/customerRepository.ts` - Full CRUD, search, findByPhone, findByEmail, addLoyaltyPoints, deductLoyaltyPoints, getOrderStats, deactivate/reactivate
- **Route**: `/customers` already in `src/router/index.ts:80-83`
- **Menu item**: Customers with `pi-users` icon already in `src/components/layout/AppMenu.vue:68-72`
- **Next migration number**: 010 (009_sync is latest)

---

## Phase 1: Setup (Types & Directory Structure)

**Purpose**: Create new type definitions for loyalty/tier system and ensure component directories exist

- [x] T001 Create loyalty types in `src/types/loyalty.ts` — Define `LoyaltyTransactionType` enum (`earn`, `redeem`, `expire`, `adjustment`), `LoyaltyTransaction`, `LoyaltyTransactionInput`, `LoyaltyConfig`, `LoyaltyConfigInput`, `DisplayLoyaltyTransaction` interfaces, `DEFAULT_LOYALTY_CONFIG` constant (earnRate: 0.01, redeemRate: 0.10, expiryDays: 365, minRedemption: 100)
- [x] T002 [P] Create tier types in `src/types/tier.ts` — Define `MembershipTier`, `MembershipTierInput`, `TierBenefits` interfaces, `DEFAULT_TIERS` array (Bronze/0, Silver/10000/3%/1.25x, Gold/50000/5%/1.5x, Platinum/100000/10%/2x)
- [x] T003 [P] Create CRM component directory `src/components/crm/` with placeholder (empty `.gitkeep` or skip if creating files in Phase 3+)
- [x] T004 [P] Create customer component directory `src/components/customers/` with placeholder

**Checkpoint**: Type definitions compile cleanly

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration, repositories, services, stores, and composables that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create migration `src/db/migrations/010_crm.ts` — Create `loyalty_transactions` table (id, customer_id FK, type CHECK, points, balance_after, transaction_id, reason, created_at, synced_at), `membership_tiers` table (id, name, min_spend, discount_rate, points_multiplier, benefits JSON, display_order, is_active), `loyalty_config` table (id, earn_rate, redeem_rate, expiry_days, min_redemption, is_active). Add indexes: idx_loyalty_customer, idx_loyalty_transaction, idx_loyalty_type, idx_tier_spend. Seed default tiers (Bronze/Silver/Gold/Platinum) and default loyalty config
- [x] T006 Register migration 010 in `src/db/database.ts` — Add `010_crm` migration entry in `runMigrations()` method following the pattern of existing migrations (005-009)
- [x] T007 [P] Create `src/repositories/loyaltyTransactionRepository.ts` — Extend BaseRepository with tableName `loyalty_transactions`, idPrefix `ltx`. Methods: `findByCustomer(customerId, options?)`, `findByTransaction(transactionId)`, `getPointsBalance(customerId)` (SUM query), `getExpiringPoints(customerId, beforeDate)`, `getRecentActivity(customerId, limit?)`, `countByType(customerId, type)`
- [x] T008 [P] Create `src/repositories/tierRepository.ts` — Extend BaseRepository with tableName `membership_tiers`, idPrefix `tier`. Methods: `findAllOrdered()` (ORDER BY display_order), `getForSpend(lifetimeSpend)` (highest tier where min_spend <= amount), `findActive()`
- [x] T009 [P] Create `src/repositories/loyaltyConfigRepository.ts` — Extend BaseRepository with tableName `loyalty_config`, idPrefix `lcfg`. Methods: `getConfig()` (get first/default config), `updateConfig(data)`, `isActive()` returns boolean
- [x] T010 Create `src/services/loyaltyService.ts` — Singleton service class. Methods: `earnPoints(customerId, transactionId, amount)` (calculate using config earnRate × tier multiplier, create loyalty_transaction, update customer.loyalty_points via customerRepository.addLoyaltyPoints), `redeemPoints(customerId, points, transactionId?)` (validate balance >= points >= minRedemption, create redeem transaction, deduct via deductLoyaltyPoints, return PHP value), `adjustPoints(customerId, points, reason, transactionId?)` (for void/refund, create adjustment transaction), `calculateEarning(amount, tierMultiplier?)` (pure calculation), `getCustomerPointsHistory(customerId)`, `expireOldPoints(customerId)` (check config.expiryDays, create expire transactions)
- [x] T011 Create `src/services/tierService.ts` — Singleton service class. Methods: `evaluateTier(customerId)` (get customer.lifetime_spend, find matching tier via tierRepository.getForSpend, update customer.tier_id if changed, return new tier or null), `getTierForCustomer(customerId)` (lookup current tier), `getTierBenefits(tierId)` (parse benefits JSON), `applyTierDiscount(subtotal, tierId)` (get tier discount_rate, return discount amount), `checkAllCustomerTiers()` (batch evaluate all customers)
- [x] T012 [P] Create `src/stores/customer.ts` — Pinia store `useCustomerStore`. State: `customers: Customer[]`, `currentCustomer: Customer | null`, `isLoading: boolean`, `error: string | null`, `totalCount: number`, `searchQuery: string`, `filters: { type?: CustomerType, isActive?: boolean }`. Computed: `activeCustomers`, `getCustomerById(id)`. Actions: `fetchAll(options?)`, `search(query)`, `fetchById(id)`, `create(data: CustomerInput)`, `update(id, data)`, `remove(id)`, `setFilters(filters)`, `clearFilters()`, `clearError()`
- [x] T013 Create `src/composables/useCustomers.ts` — Wraps useCustomerStore. Expose computed refs: `customers`, `currentCustomer`, `isLoading`, `error`, `activeCustomers`. Methods: `fetchCustomers(options?)`, `searchCustomers(query)`, `getCustomer(id)`, `createCustomer(data)`, `updateCustomer(id, data)`, `deleteCustomer(id)`. Follow pattern of `src/composables/useProducts.ts`
- [x] T014 [P] Create `src/composables/useLoyalty.ts` — Wraps loyaltyService. Reactive state: `config: LoyaltyConfig`, `isLoading`, `error`. Methods: `loadConfig()`, `earnPoints(customerId, transactionId, amount)`, `redeemPoints(customerId, points, transactionId?)`, `adjustPoints(customerId, points, reason, transactionId?)`, `getPointsHistory(customerId)`, `calculateEarning(amount)`, `calculateRedemptionValue(points)`
- [x] T015 [P] Create `src/composables/usePointsCalculation.ts` — Pure calculation helpers. `calculatePointsEarned(amount, earnRate, multiplier?)`: returns `Math.floor(amount * earnRate * (multiplier || 1))`. `calculateRedemptionValue(points, redeemRate)`: returns `points * redeemRate`. `formatPoints(points)`: returns formatted string. `formatPointsValue(points, redeemRate)`: returns `₱X.XX` string
- [x] T016 Create `src/services/customerService.ts` — Singleton service. Methods: `registerCustomer(data: CustomerInput)` (create customer, assign default tier Bronze, return customer), `getCustomerProfile(customerId)` (get customer + orderStats + tier + pointsHistory, return composite object), `updateLifetimeSpend(customerId, amount)` (increment lifetime_spend, trigger tier evaluation)
- [x] T017 [P] Add customer detail route to `src/router/index.ts` — Add `{ path: 'customers/:id', name: 'customer-detail', component: () => import('@/views/CustomerDetailView.vue') }` inside the authenticated layout children
- [x] T018 [P] Add breadcrumb entries in `src/components/layout/AppTopbar.vue` — Add handling for `/customers/:id` path to show `[Products → Details]` style breadcrumb. Add `/customer-insights` breadcrumb. Add `/settings/tiers` breadcrumb
- [x] T019 Verify Phase 2 — Run `npx vue-tsc --noEmit` and `npx vite build`. Fix any type errors

**Checkpoint**: Foundation ready — all repositories, services, stores, and composables compile. User story implementation can begin

---

## Phase 3: User Story 1 — Customer Registration (Priority: P1)

**Goal**: Cashiers can register customers and attach them to transactions at checkout

**Independent Test**: Register a customer at /customers, then search by phone in POS and attach to a sale

- [x] T020 [US1] Create `src/components/customers/CustomerList.vue` — DataTable with: search input (name/email/phone), columns: Name (font-weight 600), Contact (email mailto link + phone tel link), Type (Tag with severity: retail=info, wholesale=warn, vip=success), Status (Tag: Active=success, Inactive=danger), Points (number format), Balance (₱ currency format), Actions (Edit, Delete, View buttons). Paginator with 10/20/50 rows. Empty state with "Add First Customer" button. Emit events: `add`, `edit(customer)`, `delete(customer)`, `view(customer)`. Accept `searchQuery` prop for external filtering
- [x] T021 [US1] Create `src/components/customers/CustomerForm.vue` — Dialog form (v-model:visible). Props: `customer: Customer | null` (null = create mode). Fields: name (InputText, required), email (InputText, email validation), phone (InputText), address (Textarea, 3 rows), city (InputText), postal_code (InputText), country (InputText, default 'Philippines'), customer_type (Select: retail/wholesale/vip, default retail), credit_limit (InputNumber, currency mode ₱), notes (Textarea, 3 rows). Emit `save(data: CustomerInput)`. Show loading state on save button
- [x] T022 [US1] Create `src/views/CustomersView.vue` — Layout: Toast + ConfirmDialog + page header (title "Customers", description, search InputText, "Add Customer" Button) + CustomerList + CustomerForm dialog. State: searchQuery, showForm, editingCustomer, formLoading. Handlers: handleAdd (editingCustomer=null, showForm=true), handleEdit(customer), handleSave(data) (create or update via useCustomers, toast success, reload list), handleDelete(customer) (confirm dialog, delete, toast, reload). Follow `src/views/SuppliersView.vue` pattern
- [x] T023 [P] [US1] Create `src/components/crm/CustomerSearch.vue` — AutoComplete or InputText with dropdown. Props: `modelValue: Customer | null`. Search by phone or name using customerRepository.search(). Debounce 300ms. Show results as: "Name — Phone" format. Emit `update:modelValue(customer)`, `register` (when no results, offer "Register New" link). Compact mode for POS embedding
- [x] T024 [P] [US1] Create `src/components/crm/CustomerRegistration.vue` — Dialog for quick registration. Minimal fields: name (required), phone (required), email (optional), customer_type (Select, default retail). On save: call customerService.registerCustomer(), emit `registered(customer)`. Used from POS when customer not found
- [x] T025 [US1] Integrate CustomerSearch into POS checkout — Add CustomerSearch component to the POS checkout area (likely in cart header or order summary panel). When customer selected, store in cart state. When "Register New" clicked, open CustomerRegistration dialog. Show selected customer name with remove button
- [x] T026 [US1] Save customer_id on order — When a customer is attached via CustomerSearch and transaction is completed, ensure customer_id is saved on the order record. Update `src/services/transactionService.ts` or order creation logic to include customer_id from cart state
- [x] T027 [US1] Verify US1 — Navigate to /customers, verify empty state, add customer with all fields, verify in list, edit customer, delete with confirmation, search by phone. Go to POS, search customer by phone, attach to sale, verify customer_id saved on completed order

**Checkpoint**: Customer CRUD works at /customers. Customer search and attach works in POS checkout

---

## Phase 4: User Story 2 — Purchase History (Priority: P1)

**Goal**: Store associates can view customer purchase history for service and returns

**Independent Test**: Make purchases for a customer, view their profile with full transaction history

- [x] T028 [US2] Create `src/components/crm/CustomerHistory.vue` — DataTable of customer's orders. Props: `customerId: string`. Columns: Date (formatted), OR# (receipt number), Items (count), Total (₱ currency), Status (Tag: completed=success, voided=danger, refunded=warn). Sortable by date. Paginator 10/20 rows. Click row to view transaction detail (emit `view-transaction(orderId)`). Empty state: "No purchases yet"
- [x] T029 [US2] Create `src/components/crm/CustomerProfile.vue` — Card displaying customer info. Props: `customer: DisplayCustomer`, `tier: MembershipTier | null`, `stats: { totalOrders, totalSpent, avgTicket, lastVisit }`. Layout: header with name + TierBadge, contact info (phone, email), account info (member since, type Tag), stats row (4 metric cards: Total Orders, Lifetime Spend ₱, Avg Ticket ₱, Last Visit date). Points balance prominently displayed
- [x] T030 [P] [US2] Create `src/components/crm/CustomerStats.vue` — Compact summary metrics component. Props: `stats: { totalOrders, totalSpent, avgTicket, visitFrequency }`. Display as 4 inline stat cards with labels and values. Reusable in both CustomerProfile and CustomerDetailView
- [x] T031 [US2] Create `src/views/CustomerDetailView.vue` — Full page view for `/customers/:id`. Load customer by route param via useCustomers.getCustomer(). Layout: Back button to /customers, CustomerProfile at top, TabView with tabs: "History" (CustomerHistory), "Loyalty" (PointsHistory + LoyaltyPointsDisplay, added in Phase 5), "Info" (full address, notes, edit button). Loading and error states
- [x] T032 [US2] Update `src/repositories/customerRepository.ts` — Add `getCustomerWithHistory(customerId, options?)` method: JOIN orders ON customer_id, return customer data + recent orders array. Add `getCustomerStats(customerId)`: query for totalOrders (COUNT), totalSpent (SUM), avgTicket (AVG), lastVisit (MAX created_at) from orders where customer_id matches
- [x] T033 [P] [US2] Update `src/composables/useCustomers.ts` — Add `fetchCustomerDetail(id)` (calls customerService.getCustomerProfile), `fetchCustomerHistory(customerId, options?)` (calls orderRepository with customer_id filter). Add reactive `customerDetail` ref
- [x] T034 [US2] Wire navigation — CustomerList "View" action navigates to `/customers/:id`. CustomerDetailView back button returns to /customers. Add `router-link` or `router.push` in CustomersView for view action
- [x] T035 [US2] Verify US2 — Create a customer, make 2-3 purchases attached to that customer, navigate to customer detail page, verify profile stats are correct, verify purchase history shows all transactions, click a transaction row

**Checkpoint**: Customer detail page works with profile and purchase history

---

## Phase 5: User Story 3 — Loyalty Points Earning (Priority: P2)

**Goal**: Customers earn loyalty points on purchases, points deducted on voids/refunds

**Independent Test**: Attach customer to ₱500 sale, verify 5 points earned. Void sale, verify 5 points deducted

- [x] T036 [US3] Create `src/components/crm/LoyaltyPointsDisplay.vue` — Card showing: current points balance (large number), points value in PHP (calculated via config.redeemRate), recent activity list (last 5 loyalty_transactions with type icon, points +/-, date). Props: `customerId: string`. Uses useLoyalty composable to load data
- [x] T037 [US3] Integrate points earning into transaction completion — In `src/services/transactionService.ts`, after successful payment processing (step 8), check if order has customer_id. If yes: call `loyaltyService.earnPoints(customerId, transactionId, totalAmount)`. Also call `customerService.updateLifetimeSpend(customerId, totalAmount)` to track spend and trigger tier evaluation. Wrap in try-catch so points failure doesn't block transaction
- [x] T038 [US3] Handle points deduction on void — In `src/services/transactionService.ts` void logic, after voiding transaction: check if original order had customer_id. If yes: find loyalty_transaction for that transaction_id, call `loyaltyService.adjustPoints(customerId, -earnedPoints, 'Void: OR#xxx', transactionId)`. Also subtract from lifetime_spend
- [x] T039 [US3] Handle points deduction on refund — Similar to void but for refund flow. Create compensating loyalty_transaction with type `adjustment`, negative points, reason `Refund: OR#xxx`. Deduct proportional points if partial refund
- [x] T040 [P] [US3] Create `src/components/crm/PointsHistory.vue` — DataTable of loyalty_transactions. Props: `customerId: string`. Columns: Date, Type (Tag: earn=success, redeem=info, expire=warn, adjustment=secondary), Points (+/- with color), Balance After, Reason, Transaction ref (link to order if exists). Sortable by date descending. Paginator 10/20 rows
- [x] T041 [US3] Add loyalty tab content to CustomerDetailView — In the "Loyalty" tab of CustomerDetailView: add LoyaltyPointsDisplay at top, PointsHistory below. Both receive customerId from route param
- [x] T042 [P] [US3] Add points earned notification — After transaction completion with customer, show toast: "Customer earned X points! Balance: Y points". Display in checkout success state or receipt preview
- [x] T043 [US3] Verify US3 — Attach customer to ₱500 sale (earnRate 0.01 = 5 points), complete sale, check customer detail shows 5 points earned. Check PointsHistory shows earn transaction. Void the sale, verify points adjusted back to 0. Check PointsHistory shows adjustment

**Checkpoint**: Points earning and adjustment works end-to-end with transactions

---

## Phase 6: User Story 4 — Points Redemption (Priority: P2)

**Goal**: Customers redeem loyalty points for discounts at checkout

**Independent Test**: Customer with 1000 points redeems 500 → ₱50 discount applied, 500 points remaining

- [x] T044 [US4] Create `src/components/crm/PointsRedemption.vue` — Dialog component. Props: `visible: boolean`, `customer: Customer`, `config: LoyaltyConfig`. Display: available points balance, InputNumber for points to redeem (min: config.minRedemption, max: customer.loyalty_points), calculated discount value in PHP (points × redeemRate), running total after discount. Validation: cannot exceed balance, must meet minimum. Emit `redeem(points, phpValue)`, `cancel`. Error messages for invalid amounts
- [x] T045 [US4] Add points redemption as payment method — In the checkout/payment flow, when a customer is attached and has redeemable points (>= minRedemption): show "Redeem Points" button. When clicked, open PointsRedemption dialog. On confirm: add a payment entry with method `points`, amount = PHP discount value, reference = loyalty_transaction_id. Integrate with `src/composables/useCart.ts` or payment processing logic
- [x] T046 [US4] Create loyalty payment record — When points redeemed at checkout: (1) call `loyaltyService.redeemPoints(customerId, points, transactionId)` to create redeem loyalty_transaction and deduct points, (2) create payment record with payment_method = 'points' and reference linking to the loyalty_transaction. Ensure this happens atomically with other payments
- [x] T047 [US4] Handle points return on voided redemption — When a transaction containing a points payment is voided: find the redeem loyalty_transaction, create compensating adjustment to restore points. Call `loyaltyService.adjustPoints(customerId, +redeemedPoints, 'Void refund: OR#xxx', transactionId)`
- [x] T048 [P] [US4] Update `src/services/loyaltyService.ts` — Add `validateRedemption(customerId, points)`: check is_active config, check balance >= points, check points >= minRedemption, return `{ valid, error?, maxRedeemable, phpValue }`. Add `processRedemption(customerId, points, transactionId)`: validate then redeem, return `{ success, loyaltyTransactionId, phpValue, remainingPoints }`
- [x] T049 [P] [US4] Add PointsRedemption trigger in POS checkout — When customer is attached and has points >= minRedemption, show a "Redeem Points (X pts)" button near the payment section. Show available points value in PHP
- [x] T050 [US4] Verify US4 — Customer has 1000 points. At checkout, click "Redeem Points", enter 500 points, verify ₱50 discount shown. Complete sale, verify 500 points deducted, payment record shows points method. Void the sale, verify 500 points restored

**Checkpoint**: Full loyalty loop works — earn on purchase, redeem at checkout, restore on void

---

## Phase 7: User Story 5 — Membership Tiers (Priority: P3)

**Goal**: Automatic tier upgrades based on lifetime spend with tier-based discounts

**Independent Test**: Configure Gold tier at ₱50,000, process sales to reach threshold, verify auto-upgrade and discount

- [x] T051 [US5] Create `src/components/crm/TierBadge.vue` — Small Tag component. Props: `tier: MembershipTier | null`. Display tier name with color: Bronze=secondary, Silver=info, Gold=warn, Platinum=success. Show "No Tier" if null. Include optional `size` prop (small/normal)
- [x] T052 [P] [US5] Create `src/components/crm/TierProgress.vue` — Progress indicator. Props: `currentSpend: number`, `currentTier: MembershipTier`, `nextTier: MembershipTier | null`. Show ProgressBar (currentSpend / nextTier.minSpend × 100). Label: "₱X,XXX to next tier (TierName)". If at max tier, show "Highest tier reached". Format currency with ₱
- [x] T053 [US5] Create `src/views/TierManagementView.vue` — Admin page for tier CRUD. DataTable with columns: Display Order (#), Name, Min Spend (₱), Discount (%), Points Multiplier (x), Status (Active/Inactive Tag), Actions (Edit, Delete). Add button opens TierForm dialog. Toast notifications. ConfirmDialog for delete. Load from tierRepository
- [x] T054 [P] [US5] Create `src/components/crm/TierForm.vue` — Dialog form for add/edit tier. Fields: name (InputText, required), min_spend (InputNumber, currency ₱), discount_rate (InputNumber, percentage, 0-100 mapped to 0-1), points_multiplier (InputNumber, decimal, default 1), display_order (InputNumber, integer), is_active (ToggleSwitch). Props: `tier: MembershipTier | null`, `visible: boolean`. Emit `save(data)`, `update:visible`
- [x] T055 [US5] Add tier management route — Add `{ path: 'tiers', name: 'tiers', component: () => import('@/views/TierManagementView.vue') }` to router. Add menu item under Settings or main nav. Add breadcrumb entry
- [x] T056 [US5] Integrate auto-upgrade after transaction — In the points earning flow (T037), after `customerService.updateLifetimeSpend()`, call `tierService.evaluateTier(customerId)`. If tier changed, log the upgrade and optionally show toast: "Congratulations! Upgraded to Gold tier!"
- [x] T057 [US5] Apply tier discount at checkout — When customer is attached in POS and has a tier with discount_rate > 0: auto-calculate tier discount via `tierService.applyTierDiscount(subtotal, tierId)`. Apply as a discount line item or adjust total. Show "Gold Member Discount (5%)" label. Ensure tier discount stacks correctly with other discounts or is exclusive (decide based on business rules)
- [x] T058 [US5] Add TierBadge and TierProgress to customer views — Add TierBadge next to customer name in CustomerProfile. Add TierProgress in CustomerDetailView loyalty tab (below LoyaltyPointsDisplay). Requires loading tier data in customerDetail
- [x] T059 [US5] Verify US5 — Ensure default tiers seeded (Bronze/Silver/Gold/Platinum). View tier management page, verify CRUD. Process sales for a customer totaling ₱10,000+, verify auto-upgrade to Silver. Check customer profile shows Silver badge. At checkout, verify 3% discount auto-applies for Silver member

**Checkpoint**: Tier system works — admin management, auto-upgrade, and discount application

---

## Phase 8: User Story 6 — Customer Insights (Priority: P3)

**Goal**: Store managers can view customer analytics and export data for marketing

**Independent Test**: View top customers by spend, filter by date range, export customer list to CSV

- [x] T060 [US6] Create `src/components/crm/TopCustomers.vue` — DataTable showing top customers. Props: `dateRange?: { start, end }`, `limit?: number` (default 10). Columns: Rank (#), Name, Tier (TierBadge), Total Spent (₱), Transactions (count), Avg Ticket (₱), Last Visit. Sortable. Use customerRepository analytics queries. Date range filter with Calendar inputs
- [x] T061 [P] [US6] Create `src/components/crm/CustomerDistribution.vue` — Summary cards showing: customer count by type (retail/wholesale/vip) with percentages, customer count by tier (bronze/silver/gold/platinum) with percentages. Use simple stat cards or summary rows. Props: accept pre-computed distribution data
- [x] T062 [P] [US6] Create `src/components/crm/InactiveCustomers.vue` — DataTable of customers with no purchase in 30+ days (configurable via `inactiveDays` prop). Columns: Name, Phone, Email, Last Visit (days ago), Tier, Lifetime Spend. Sortable by last visit. Action: "Send Reminder" placeholder button (out of scope for v1)
- [x] T063 [US6] Create `src/components/crm/CustomerExport.vue` — Export button with dropdown (CSV, or just CSV). On click: query all customers (or filtered set), generate CSV with columns: Name, Phone, Email, Type, Tier, Points, Lifetime Spend, Last Visit, Registered Date. Trigger browser download. Use Blob + URL.createObjectURL pattern. Props: `filters?: object` for filtered export
- [x] T064 [US6] Create `src/views/CustomerInsightsView.vue` — Dashboard page. Layout: page header with title "Customer Insights" + date range filter + export button. Summary stats row (Total Customers, New This Month, Active, Average Points). TopCustomers card. Two-column: CustomerDistribution + InactiveCustomers. Loading and error states
- [x] T065 [US6] Add `/customer-insights` route to `src/router/index.ts` — Add `{ path: 'customer-insights', name: 'customer-insights', component: () => import('@/views/CustomerInsightsView.vue'), meta: { requiresPermission: 'reports.sales' } }`
- [x] T066 [P] [US6] Add breadcrumb for customer insights in `src/components/layout/AppTopbar.vue` — Add `/customer-insights` → "Customer Insights" in the titles map
- [x] T067 [P] [US6] Add Customer Insights menu item in `src/components/layout/AppMenu.vue` — Add below Customers: `{ label: 'Customer Insights', icon: 'pi pi-chart-bar', to: '/customer-insights', permission: PERMISSIONS.REPORTS_SALES }`
- [x] T068 [US6] Add analytics queries to `src/repositories/customerRepository.ts` — Methods: `getTopBySpend(limit, dateRange?)` (JOIN orders, SUM totals, GROUP BY customer), `getTopByFrequency(limit, dateRange?)` (COUNT orders), `getInactive(days)` (WHERE last_visit < date), `getTypeDistribution()` (GROUP BY customer_type, COUNT), `getTierDistribution()` (GROUP BY tier_id, COUNT), `getNewCustomers(dateRange)` (WHERE registered_at BETWEEN), `getAveragePoints()` (AVG loyalty_points)
- [x] T069 [P] [US6] Update `src/composables/useCustomers.ts` — Add insight methods: `fetchTopCustomers(limit?, dateRange?)`, `fetchInactiveCustomers(days?)`, `fetchDistribution()`, `fetchNewCustomerCount(dateRange)`. Add reactive state for insights data
- [x] T070 [US6] Verify US6 — Navigate to /customer-insights. Verify summary stats display. Filter top customers by date range. Check type and tier distribution breakdowns. Identify inactive customers. Export customer list to CSV, verify file downloads with correct columns

**Checkpoint**: Customer analytics dashboard works with all visualizations and export

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, integrations, and verification across all user stories

- [x] T071 Handle points expiry — In `src/services/loyaltyService.ts`, implement `expireOldPoints(customerId?)`: query loyalty_transactions where type='earn' and created_at older than config.expiryDays, calculate unexpired balance, create 'expire' transactions to zero out old points. Can be triggered on customer load or as a batch process
- [x] T072 [P] Add loyalty config management UI — In `src/views/SettingsView.vue` or new section: add loyalty configuration form. Fields: earn_rate (InputNumber, "Points per ₱1"), redeem_rate (InputNumber, "₱ per point"), expiry_days (InputNumber), min_redemption (InputNumber), is_active (ToggleSwitch). Save via loyaltyConfigRepository.updateConfig(). Show current values on load
- [x] T073 [P] Add customer dashboard widget — In the main Dashboard view, add a summary card: "Customers" with total count, new this month count, and total loyalty points in circulation. Use customerRepository.count() and custom queries
- [x] T074 Add customer name to receipt — When transaction has customer_id, include customer name on the receipt display/print. Update `src/composables/useReceipt.ts` or receipt template to show "Customer: [Name]" and "Points Earned: [X]" if applicable
- [x] T075 [P] Handle offline customer registration — When registering a customer while offline, save locally and enqueue for sync via syncService. Ensure customerRepository.create() works offline. Queue sync item with entity_type='customer' and operation='create'
- [x] T076 [P] Ensure customer search performance — Verify that customerRepository.search() uses indexed columns (idx_customer_name, idx_customer_phone, idx_customer_email already exist from migration 005). Test with representative data volume. Use LIKE with prefix matching where possible for index utilization
- [x] T077 Update AppTopbar breadcrumbs — Ensure all new routes have breadcrumb entries: `/customers/:id` → "Customers / Details", `/customer-insights` → "Customer Insights", `/tiers` → "Membership Tiers". Verify no missing breadcrumbs for CRM routes
- [x] T078 Full build verification — Run `npx vue-tsc --noEmit` and `npx vite build`. Fix any type errors or build warnings. Ensure no unused imports
- [x] T079 Run quickstart.md verification scenarios — Execute all 4 verification scenarios from quickstart.md: (1) Customer Registration at POS, (2) Points Earning on ₱500 sale = 5 points, (3) Points Redemption of 100 points = ₱10 discount, (4) Tier Upgrade to Silver at ₱10,000 spend
- [x] T080 Code cleanup — Remove any placeholder .gitkeep files, unused imports, console.logs. Ensure consistent patterns across all new files. Verify all new components follow PrimeVue 4 conventions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 types — BLOCKS all user stories
- **US1 Customer Registration (Phase 3)**: Depends on Phase 2 foundation
- **US2 Purchase History (Phase 4)**: Depends on Phase 3 (needs customer CRUD working)
- **US3 Loyalty Earning (Phase 5)**: Depends on Phase 2 foundation + Phase 3 (needs customer attached to transactions)
- **US4 Points Redemption (Phase 6)**: Depends on Phase 5 (needs points to exist)
- **US5 Membership Tiers (Phase 7)**: Depends on Phase 2 foundation; integrates with Phase 5 earning flow
- **US6 Customer Insights (Phase 8)**: Depends on Phase 3-4 (needs customer data and history)
- **Polish (Phase 9)**: Depends on all previous phases

### Recommended Execution Order

1. Phase 1 → Phase 2 (sequential, foundation)
2. Phase 3 (US1 Customer Registration) — MVP customer CRUD
3. Phase 4 (US2 Purchase History) — extends US1
4. Phase 5 (US3 Points Earning) — loyalty system
5. Phase 6 (US4 Points Redemption) — completes loyalty loop
6. Phase 7 (US5 Membership Tiers) — can overlap with Phase 5-6
7. Phase 8 (US6 Customer Insights) — can start after Phase 3-4
8. Phase 9 (Polish) — final pass

### Parallel Opportunities

- T001/T002/T003/T004: All Phase 1 tasks can run in parallel
- T007/T008/T009/T012: Repositories and store can be created in parallel
- T014/T015: Loyalty composables in parallel
- T023/T024: CRM search and registration components in parallel
- T028/T030/T033: History, stats, and composable updates in parallel
- T040/T042: Points history and notification in parallel
- T048/T049: Loyalty validation and UI trigger in parallel
- T051/T052/T054: Tier badge, progress, and form in parallel
- T061/T062: Distribution and inactive components in parallel
- T066/T067/T069: Breadcrumb, menu, and composable updates in parallel
- T072/T073/T075/T076: Polish tasks can run in parallel

---

## Summary

| Phase | Tasks | User Story | Priority |
|-------|-------|------------|----------|
| 1. Setup | T001-T004 | — | — |
| 2. Foundational | T005-T019 | — | — |
| 3. Customer Registration | T020-T027 | US1 | P1 |
| 4. Purchase History | T028-T035 | US2 | P1 |
| 5. Points Earning | T036-T043 | US3 | P2 |
| 6. Points Redemption | T044-T050 | US4 | P2 |
| 7. Membership Tiers | T051-T059 | US5 | P3 |
| 8. Customer Insights | T060-T070 | US6 | P3 |
| 9. Polish | T071-T080 | — | — |
| **Total** | **80 tasks** | **6 stories** | |
