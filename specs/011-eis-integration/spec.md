# Feature Specification: EIS Electronic OR Submission

**Feature Branch**: `011-eis-integration`
**Created**: 2026-02-04
**Status**: Draft
**Priority**: P4 (Low) - Optional future feature
**Input**: PRD Section 2.3 - Optional EIS integration (electronic OR submission)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic EIS Submission (Priority: P1)

As a business owner, I need my electronic receipts submitted to BIR automatically so that I comply with EIS requirements.

**Why this priority**: EIS compliance is mandatory for businesses meeting the threshold; automation reduces manual effort.

**Independent Test**: Can be tested by processing a sale and verifying the OR data is transmitted to BIR EIS.

**Acceptance Scenarios**:

1. **Given** EIS is enabled and a sale completes, **When** receipt is generated, **Then** OR data is queued for EIS submission
2. **Given** EIS queue has pending items, **When** submission runs, **Then** data is transmitted to BIR EIS endpoint
3. **Given** EIS submission succeeds, **When** I check transaction, **Then** I see EIS submission status and reference number
4. **Given** EIS submission fails, **When** I view queue, **Then** failed items are flagged for retry

---

### User Story 2 - EIS Configuration (Priority: P1)

As a system admin, I need to configure EIS credentials and settings so that the merchant can submit to BIR.

**Why this priority**: Configuration is prerequisite for any EIS functionality.

**Independent Test**: Can be tested by entering EIS credentials and verifying connection to BIR endpoint.

**Acceptance Scenarios**:

1. **Given** I am in admin panel, **When** I enter EIS credentials (TIN, branch code, API key), **Then** system validates connection
2. **Given** credentials are valid, **When** I enable EIS for merchant, **Then** new transactions start queueing for submission
3. **Given** I need to test, **When** I use test mode, **Then** submissions go to BIR sandbox, not production
4. **Given** credentials change, **When** I update settings, **Then** new submissions use updated credentials

---

### User Story 3 - EIS Batch Submission (Priority: P2)

As a system, I need to batch EIS submissions efficiently so that we minimize API calls and handle volume.

**Why this priority**: Efficiency optimization; individual submissions work but are slower.

**Independent Test**: Can be tested by processing 100 sales and verifying they submit in batches rather than individually.

**Acceptance Scenarios**:

1. **Given** 50 receipts are pending, **When** batch submission runs, **Then** receipts are submitted in optimal batch sizes
2. **Given** batch submission completes, **When** I check status, **Then** I see all items marked as submitted with timestamps
3. **Given** one item in batch fails validation, **When** batch completes, **Then** other items succeed; failed item flagged
4. **Given** offline transactions sync, **When** EIS queue runs, **Then** synced transactions are included in next batch

---

### User Story 4 - EIS Submission History (Priority: P2)

As an accountant, I need to view EIS submission history so that I can verify compliance and troubleshoot issues.

**Why this priority**: Audit trail for compliance verification; system functions without but audit is important.

**Independent Test**: Can be tested by viewing submission history and matching it to actual transactions.

**Acceptance Scenarios**:

1. **Given** I view EIS history, **When** I select a date range, **Then** I see all submissions with status and BIR reference
2. **Given** I find a failed submission, **When** I view details, **Then** I see error message from BIR and can retry
3. **Given** I need compliance proof, **When** I export history, **Then** I get report suitable for BIR audit
4. **Given** BIR reference number, **When** I search, **Then** I find the corresponding transaction

---

### User Story 5 - EIS Error Handling (Priority: P2)

As a system admin, I need to handle EIS submission errors so that compliance is maintained despite technical issues.

**Why this priority**: Error recovery ensures continuous compliance; errors are inevitable.

**Independent Test**: Can be tested by simulating an EIS error and verifying retry and alerting behavior.

**Acceptance Scenarios**:

1. **Given** EIS submission fails with temporary error, **When** retry runs, **Then** system retries with exponential backoff
2. **Given** EIS submission fails with validation error, **When** I view error, **Then** I see specific field/value that failed
3. **Given** multiple failures occur, **When** threshold exceeded, **Then** admin receives alert notification
4. **Given** BIR system is down, **When** queue builds up, **Then** system continues operation and syncs when BIR returns

---

### User Story 6 - EIS Reports for BIR Filing (Priority: P3)

As an accountant, I need EIS summary reports so that I can include them in periodic BIR filings.

**Why this priority**: Reporting for compliance; manual tracking possible but automated is preferred.

**Independent Test**: Can be tested by generating monthly EIS report and verifying totals match Z-Reading totals.

**Acceptance Scenarios**:

1. **Given** I need monthly report, **When** I generate EIS summary, **Then** I see total submissions, amounts, and status breakdown
2. **Given** some submissions failed, **When** I view report, **Then** failed items are highlighted for attention
3. **Given** I need BIR format, **When** I export report, **Then** format matches BIR EIS filing requirements
4. **Given** I need reconciliation, **When** I compare EIS to Z-Reading, **Then** totals match (accounting for timing)

---

### Edge Cases

- What happens when BIR changes EIS API format? (System has configurable schema; admin updates without code change)
- What happens when EIS submission is weeks late due to extended offline? (Submit all; BIR accepts late submissions with timestamps)
- How does system handle EIS for voided transactions? (Void records submitted as separate EIS entries)
- What happens when merchant switches from non-EIS to EIS? (Historical transactions not submitted; only new ones from enable date)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST queue receipt data for EIS submission upon transaction completion
- **FR-002**: System MUST submit EIS data to BIR endpoint per their API specification
- **FR-003**: System MUST support both test/sandbox and production BIR environments
- **FR-004**: System MUST retry failed submissions with exponential backoff
- **FR-005**: System MUST batch submissions for efficiency
- **FR-006**: System MUST track submission status and BIR reference numbers
- **FR-007**: System MUST provide submission history and reporting
- **FR-008**: System MUST alert on submission failures exceeding threshold
- **FR-009**: System MUST handle BIR system unavailability gracefully
- **FR-010**: System MUST support EIS enable/disable per merchant
- **FR-011**: System MUST submit void and refund records to EIS
- **FR-012**: System MUST generate EIS compliance reports

### Key Entities

- **EISConfig**: Merchant settings - TIN, branch code, API credentials, mode (test/prod), enabled status
- **EISSubmission**: Queue item - transaction reference, payload, status, attempts, last error, BIR reference, submitted timestamp
- **EISBatch**: Grouped submission - batch ID, item count, submitted timestamp, response, status
- **EISAuditLog**: History - submission reference, action, timestamp, result, error details

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 99% of transactions submit to EIS within 24 hours of completion
- **SC-002**: EIS submission latency is under 5 seconds per transaction (batched)
- **SC-003**: Retry mechanism recovers 95% of temporary failures automatically
- **SC-004**: EIS reports match Z-Reading totals within 0.1% accuracy
- **SC-005**: Admin receives alert within 15 minutes of submission failure threshold
- **SC-006**: System handles BIR downtime of up to 72 hours without data loss
- **SC-007**: Batch submission processes 1000 items in under 10 minutes
- **SC-008**: EIS submission history is searchable within 2 seconds

## Assumptions

- BIR EIS API specification is available and stable
- Merchant has valid BIR EIS credentials and accreditation
- EIS is optional until BIR mandates it for specific business categories
- Submission timing follows BIR requirements (typically within 24 hours)
- Test/sandbox mode uses same data format as production
- EIS submissions are one-way (no query/retrieval from BIR)
- Network connectivity is required for EIS submission (queued when offline)
