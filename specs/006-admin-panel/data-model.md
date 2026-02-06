# Data Model: Filament Admin Panel

**Feature**: 006-admin-panel
**Date**: 2026-02-04

## Entities

### Merchant

Business account on the platform.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(100) | NOT NULL | Contact name |
| business_name | string(255) | NOT NULL | Business name |
| tin | string(20) | UNIQUE | Tax ID |
| address | text | NOT NULL | Business address |
| phone | string(20) | NOT NULL | Contact phone |
| email | string(255) | UNIQUE | Contact email |
| status | enum | DEFAULT active | active, suspended, closed |
| created_at | datetime | NOT NULL | Registration date |

### Plan

Subscription tier definition.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | string(100) | NOT NULL | Plan name |
| price | decimal(10,2) | NOT NULL | Monthly price |
| billing_cycle | enum | DEFAULT monthly | monthly, annual |
| max_branches | integer | NOT NULL | Branch limit |
| max_users | integer | NOT NULL | User limit |
| max_products | integer | NOT NULL | Product limit |
| features | JSON | NOT NULL | Feature toggles |
| is_active | boolean | DEFAULT true | Available for new subs |

### Subscription

Merchant's active plan.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| plan_id | UUID | FK | Plan |
| status | enum | DEFAULT active | active, expired, cancelled |
| starts_at | datetime | NOT NULL | Start date |
| expires_at | datetime | NOT NULL | Expiry date |
| cancelled_at | datetime | NULL | Cancellation date |

### AdminAuditLog

Admin action history.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| admin_id | UUID | FK | Admin user |
| action | string(50) | NOT NULL | Action type |
| entity_type | string(50) | NOT NULL | Affected entity type |
| entity_id | UUID | NOT NULL | Affected entity ID |
| before_values | JSON | NULL | State before |
| after_values | JSON | NULL | State after |
| ip_address | string(45) | NULL | Client IP |
| created_at | datetime | NOT NULL | Timestamp |

## MySQL Schema

```sql
-- Merchants
CREATE TABLE merchants (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    tin VARCHAR(20) UNIQUE,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('active', 'suspended', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Plans
CREATE TABLE plans (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    billing_cycle ENUM('monthly', 'annual') DEFAULT 'monthly',
    max_branches INT NOT NULL,
    max_users INT NOT NULL,
    max_products INT NOT NULL,
    features JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE subscriptions (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,
    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
    starts_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Admin audit log
CREATE TABLE admin_audit_logs (
    id CHAR(36) PRIMARY KEY,
    admin_id CHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id CHAR(36) NOT NULL,
    before_values JSON,
    after_values JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_admin (admin_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_date (created_at)
);
```
