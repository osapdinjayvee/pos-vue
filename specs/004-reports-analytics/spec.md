# Feature Specification: Reports & Analytics

**Feature Branch**: `004-reports-analytics`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P2 (High)
**Input**: PRD Section 2.1.4 - Reports & Analytics

## User Scenarios & Testing *(mandatory)*

### User Story 1 - X-Reading Report (Priority: P1)

As a supervisor, I need to generate X-Reading reports so that I can check current shift totals without closing the register.

**Why this priority**: X-Reading is a BIR requirement for shift monitoring without resetting counters.

**Independent Test**: Can be fully tested by processing several sales, generating X-Reading, and verifying totals match.

**Acceptance Scenarios**:

1. **Given** sales have been processed, **When** I generate X-Reading, **Then** report shows gross sales, discounts, VAT breakdown for current shift
2. **Given** I generate X-Reading, **When** I view the report, **Then** it displays current OR number range used
3. **Given** multiple X-Readings are generated, **When** I check the sequence, **Then** each X-Reading has a sequential number
4. **Given** I am offline, **When** I generate X-Reading, **Then** report generates from local data

---

### User Story 2 - Z-Reading Report (Priority: P1)

As a supervisor, I need to generate Z-Reading at end of day so that I have official BIR-required daily closing report.

**Why this priority**: Z-Reading is a mandatory BIR requirement for daily sales closure.

**Independent Test**: Can be tested by processing a full day of sales and generating Z-Reading with all required fields.

**Acceptance Scenarios**:

1. **Given** it is end of business day, **When** I generate Z-Reading, **Then** report shows daily totals and resets counters
2. **Given** Z-Reading is generated, **When** I check Z-counter, **Then** it increments sequentially (never resets)
3. **Given** Z-Reading is generated, **When** I view the report, **Then** it shows beginning/ending OR numbers, gross sales, net sales, VAT
4. **Given** I already generated Z-Reading today, **When** I try to generate another, **Then** system warns about duplicate and requires confirmation

---

### User Story 3 - Daily Sales Report (Priority: P1)

As a store manager, I need daily sales reports so that I can track business performance day by day.

**Why this priority**: Daily sales visibility is essential for business operations and decision making.

**Independent Test**: Can be tested by selecting a date and verifying all sales for that day appear in the report.

**Acceptance Scenarios**:

1. **Given** I select a date, **When** I generate daily sales report, **Then** I see total sales, transaction count, average ticket size
2. **Given** I view daily sales, **When** I drill down, **Then** I can see sales by hour, by payment method, by category
3. **Given** there were voids and refunds, **When** I view daily report, **Then** gross and net sales are correctly calculated
4. **Given** I am offline, **When** I generate daily report, **Then** report shows local transactions (with sync status indicator)

---

### User Story 4 - VAT Summary Report (Priority: P1)

As an accountant, I need VAT summary reports so that I can prepare accurate BIR tax filings.

**Why this priority**: BIR compliance requires accurate VAT reporting for tax purposes.

**Independent Test**: Can be tested by generating a VAT summary and verifying it matches the sum of all receipt VAT breakdowns.

**Acceptance Scenarios**:

1. **Given** I select a date range, **When** I generate VAT summary, **Then** I see VATable Sales, VAT Amount, VAT-Exempt Sales, Zero-Rated Sales
2. **Given** there were senior/PWD discounts, **When** I view VAT report, **Then** discounted items show correct VAT treatment
3. **Given** I generate monthly VAT summary, **When** I export the report, **Then** format is suitable for BIR filing
4. **Given** there were refunds, **When** I view VAT report, **Then** refunded VAT is properly deducted

---

### User Story 5 - Product Performance Report (Priority: P2)

As a store manager, I need product performance reports so that I can identify best sellers and slow movers.

**Why this priority**: Important for inventory decisions but not critical for daily operations.

**Independent Test**: Can be tested by generating report and verifying products are ranked by sales volume.

**Acceptance Scenarios**:

1. **Given** I select a date range, **When** I generate product performance report, **Then** I see products ranked by quantity sold
2. **Given** I view product report, **When** I filter by category, **Then** only products in that category appear
3. **Given** I view product report, **When** I see the data, **Then** it shows quantity sold, revenue, profit margin per product
4. **Given** products have variants, **When** I view the report, **Then** I can see performance by product or by variant

---

### User Story 6 - Cashier Performance Report (Priority: P2)

As a supervisor, I need cashier performance reports so that I can evaluate staff efficiency and accuracy.

**Why this priority**: Staff management tool; operations work without this but it improves management.

**Independent Test**: Can be tested by generating report for a cashier and verifying transaction counts and totals.

**Acceptance Scenarios**:

1. **Given** I select a cashier and date range, **When** I generate report, **Then** I see transaction count, total sales, average transaction value
2. **Given** I view cashier report, **When** I check details, **Then** I see void count, refund count, discount usage
3. **Given** multiple cashiers worked, **When** I generate comparison report, **Then** I can compare metrics side by side
4. **Given** a cashier had cash variances, **When** I view their report, **Then** over/short amounts are displayed

---

### User Story 7 - Weekly/Monthly Sales Summary (Priority: P2)

As a business owner, I need weekly and monthly summaries so that I can track trends over time.

**Why this priority**: Strategic planning tool; daily reports cover immediate needs.

**Independent Test**: Can be tested by generating monthly summary and verifying it aggregates daily data correctly.

**Acceptance Scenarios**:

1. **Given** I select a week/month, **When** I generate summary, **Then** I see totals, averages, and comparison to previous period
2. **Given** I view monthly summary, **When** I check trends, **Then** I see daily breakdown within the month
3. **Given** I have multiple months of data, **When** I generate year-to-date report, **Then** I see cumulative totals and monthly trend

---

### Edge Cases

- What happens when Z-Reading is generated with unsynced offline transactions? (Warning displayed; Z-Reading includes local data with sync indicator)
- What happens when report date range spans offline/online periods? (Report clearly indicates which data is synced vs pending)
- How does system handle reports during sync? (Reports use snapshot of available data; don't block on sync)
- What happens when a report is generated for a date with no transactions? (Report shows zeros, not an error)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate X-Reading reports with sequential X-counter
- **FR-002**: System MUST generate Z-Reading reports with sequential Z-counter (never resets)
- **FR-003**: System MUST prevent multiple Z-Readings per day without explicit override
- **FR-004**: System MUST generate daily sales reports with gross, net, and VAT breakdown
- **FR-005**: System MUST generate VAT summary reports for any date range
- **FR-006**: System MUST support exporting reports in print-ready and spreadsheet formats
- **FR-007**: System MUST generate product performance reports with sales ranking
- **FR-008**: System MUST generate cashier performance reports with efficiency metrics
- **FR-009**: System MUST generate weekly and monthly summary reports
- **FR-010**: System MUST support filtering and drill-down on all reports
- **FR-011**: System MUST generate reports from local data when offline
- **FR-012**: System MUST clearly indicate sync status on reports generated with pending transactions

### Key Entities

- **XReading**: Shift snapshot - X-counter, timestamp, terminal, cashier, sales totals, VAT breakdown, OR range
- **ZReading**: Daily closing - Z-counter, date, terminal, branch, accumulated totals, VAT breakdown, OR range, signed by
- **ReportRequest**: Generated report metadata - type, parameters, generated by, timestamp, format
- **SalesAggregate**: Pre-calculated totals - date, branch, terminal, gross, net, VAT, transaction count (for performance)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: X-Reading generates in under 5 seconds
- **SC-002**: Z-Reading generates in under 10 seconds (includes counter update)
- **SC-003**: Z-counter sequence is 100% gap-free across all terminals
- **SC-004**: VAT summary accuracy is 100% when compared to individual receipt totals
- **SC-005**: Reports for date ranges up to 1 year generate in under 30 seconds
- **SC-006**: Offline report generation works for all report types
- **SC-007**: Report exports are correctly formatted for BIR submission requirements
- **SC-008**: 95% of managers find reports meet their daily operational needs

## Assumptions

- Z-Reading is generated once per day at close of business
- X-Reading can be generated multiple times per day without affecting totals
- Reports are generated per terminal/branch; consolidated reports require online access
- BIR report format follows current requirements (2024 regulations)
- Report data is retained for 10+ years per BIR data retention requirements
- Export formats include PDF (for printing) and CSV/Excel (for analysis)
