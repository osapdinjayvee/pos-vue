# Data Model: Advanced Analytics Dashboards

**Feature**: 008-advanced-analytics
**Date**: 2026-02-04

## Entities

### SalesDaily

Pre-aggregated daily sales.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| branch_id | UUID | FK | Branch |
| date | date | NOT NULL | Business date |
| gross_sales | decimal(15,2) | NOT NULL | Daily gross |
| net_sales | decimal(15,2) | NOT NULL | Daily net |
| transaction_count | integer | NOT NULL | Count |
| average_ticket | decimal(15,2) | NOT NULL | Average |

### SalesHourly

Hourly breakdown for time analysis.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| branch_id | UUID | FK | Branch |
| date | date | NOT NULL | Date |
| hour | integer | NOT NULL | Hour (0-23) |
| sales | decimal(15,2) | NOT NULL | Hourly sales |
| transaction_count | integer | NOT NULL | Count |

### ProductDaily

Daily product performance.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| product_id | UUID | FK | Product |
| date | date | NOT NULL | Date |
| quantity_sold | integer | NOT NULL | Units |
| revenue | decimal(15,2) | NOT NULL | Revenue |
| profit | decimal(15,2) | NOT NULL | Profit |

### SavedReport

User's saved report configurations.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| merchant_id | UUID | FK | Merchant |
| user_id | UUID | FK | Creator |
| name | string(100) | NOT NULL | Report name |
| type | string(50) | NOT NULL | Report type |
| config | JSON | NOT NULL | Report configuration |
| schedule | string(50) | NULL | Cron expression |
| last_run | datetime | NULL | Last execution |

## MySQL Schema

```sql
-- Daily sales aggregates
CREATE TABLE sales_daily (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    branch_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    gross_sales DECIMAL(15,2) NOT NULL,
    net_sales DECIMAL(15,2) NOT NULL,
    transaction_count INT NOT NULL,
    average_ticket DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (merchant_id, branch_id, date),
    INDEX idx_daily_date (date),
    INDEX idx_daily_merchant (merchant_id)
);

-- Hourly sales for time analysis
CREATE TABLE sales_hourly (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    branch_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    hour TINYINT NOT NULL,
    sales DECIMAL(15,2) NOT NULL,
    transaction_count INT NOT NULL,
    UNIQUE KEY (merchant_id, branch_id, date, hour)
);

-- Product daily performance
CREATE TABLE product_daily (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    quantity_sold INT NOT NULL,
    revenue DECIMAL(15,2) NOT NULL,
    profit DECIMAL(15,2) NOT NULL,
    UNIQUE KEY (merchant_id, product_id, date),
    INDEX idx_product_date (date)
);

-- Saved reports
CREATE TABLE saved_reports (
    id CHAR(36) PRIMARY KEY,
    merchant_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    config JSON NOT NULL,
    schedule VARCHAR(50),
    last_run TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```
