# Quickstart: Advanced Analytics Dashboards

**Feature**: 008-advanced-analytics
**Date**: 2026-02-04
**Depends On**: 004-reports-analytics, 006-admin-panel

## Prerequisites

- Laravel backend with Filament
- Base reports feature completed
- Transaction data available

## Setup Steps

### 1. Run Migrations

```bash
php artisan migrate
```

### 2. Set Up Aggregation Job

```bash
# Add to app/Console/Kernel.php
$schedule->command('analytics:aggregate-daily')->dailyAt('01:00');
```

### 3. Create Filament Merchant Panel

```bash
php artisan make:filament-panel merchant
```

## Verification Steps

### Test Sales Dashboard

1. Log in to merchant panel
2. View dashboard
3. Verify today's sales card shows correct total
4. Verify sales chart displays trend
5. Change date range filter
6. Verify chart updates

### Test Product Analytics

1. Navigate to Product Analytics
2. Select date range
3. Verify top products ranked correctly
4. Filter by category
5. Verify filtered results

### Test Custom Report

1. Navigate to Custom Reports
2. Click "Create Report"
3. Select dimensions and measures
4. Save report
5. Run saved report
6. Verify data matches filters

## Common Issues

### Dashboard Shows No Data

**Solutions**:
1. Run aggregation command manually: `php artisan analytics:aggregate-daily`
2. Check transaction data exists
3. Clear cache: `php artisan cache:clear`

### Charts Not Loading

**Solutions**:
1. Verify Chart.js assets are published
2. Check browser console for errors
3. Verify data format matches chart requirements
