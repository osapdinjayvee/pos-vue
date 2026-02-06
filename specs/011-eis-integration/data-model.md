# Data Model: EIS Electronic OR Submission

**Feature**: 011-eis-integration
**Date**: 2026-02-04

## Entities

### EISConfig

Merchant EIS configuration.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK, UNIQUE | Merchant |
| tin | string(20) | NOT NULL | Tax ID |
| branch_code | string(20) | NOT NULL | BIR branch code |
| api_key | string(255) | NOT NULL | EIS API key |
| api_secret | string(255) | NOT NULL | EIS API secret |
| environment | enum | DEFAULT test | test, production |
| is_enabled | boolean | DEFAULT false | Submission enabled |
| created_at | datetime | NOT NULL | Config date |
| updated_at | datetime | NOT NULL | Last update |

### EISSubmission

Individual OR submission queue.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| transaction_id | UUID | FK | Source transaction |
| or_number | string(50) | NOT NULL | Receipt number |
| payload | JSON | NOT NULL | EIS payload data |
| status | enum | DEFAULT pending | pending, submitted, failed, rejected |
| bir_reference | string(100) | NULL | BIR confirmation |
| attempts | integer | DEFAULT 0 | Retry count |
| last_attempt | datetime | NULL | Last try |
| last_error | text | NULL | Error message |
| submitted_at | datetime | NULL | Success time |
| created_at | datetime | NOT NULL | Queue time |

### EISBatch

Batch submission tracking.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| item_count | integer | NOT NULL | Items in batch |
| success_count | integer | DEFAULT 0 | Successful |
| failed_count | integer | DEFAULT 0 | Failed |
| status | enum | DEFAULT processing | processing, completed, partial |
| submitted_at | datetime | NOT NULL | Submission time |
| completed_at | datetime | NULL | Completion time |

## MySQL Schema

```sql
-- EIS configuration
CREATE TABLE eis_configs (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) UNIQUE NOT NULL,
    tin VARCHAR(20) NOT NULL,
    branch_code VARCHAR(20) NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    environment ENUM('test', 'production') DEFAULT 'test',
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

-- EIS submission queue
CREATE TABLE eis_submissions (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    transaction_id CHAR(36) NOT NULL,
    or_number VARCHAR(50) NOT NULL,
    payload JSON NOT NULL,
    status ENUM('pending', 'submitted', 'failed', 'rejected') DEFAULT 'pending',
    bir_reference VARCHAR(100),
    attempts INT DEFAULT 0,
    last_attempt TIMESTAMP,
    last_error TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_eis_status (status),
    INDEX idx_eis_merchant (merchant_id),
    INDEX idx_eis_transaction (transaction_id)
);

-- EIS batch tracking
CREATE TABLE eis_batches (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    item_count INT NOT NULL,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status ENUM('processing', 'completed', 'partial') DEFAULT 'processing',
    submitted_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    INDEX idx_batch_status (status)
);
```
