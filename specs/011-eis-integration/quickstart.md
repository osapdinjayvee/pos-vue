# Quickstart: EIS Electronic OR Submission

**Feature**: 011-eis-integration
**Date**: 2026-02-04
**Depends On**: 002-sales-checkout, 006-admin-panel

## Prerequisites

- Laravel backend running
- BIR EIS credentials (test or production)
- Transaction data available

## Setup Steps

### 1. Run Migrations

```bash
php artisan migrate
```

### 2. Configure Queue Worker

```bash
# Start queue worker for EIS jobs
php artisan queue:work --queue=eis
```

### 3. Set Up EIS Scheduler

Add to `app/Console/Kernel.php`:

```php
$schedule->command('eis:process-batch')
    ->everyFiveMinutes()
    ->withoutOverlapping();
```

### 4. Configure Merchant EIS

1. Log in to admin panel
2. Navigate to EIS Configuration
3. Enter merchant's BIR credentials:
   - TIN
   - Branch Code
   - API Key
   - API Secret
4. Select environment (test first)
5. Enable EIS

## Verification Steps

### Test EIS Queue

1. Enable EIS for merchant (test mode)
2. Process a sale
3. Check eis_submissions table
4. Verify submission queued with status "pending"

### Test Submission

1. Run queue worker
2. Wait for batch processing
3. Check submission status
4. Verify status changed to "submitted"
5. Check BIR reference number recorded

### Test Retry on Failure

1. Simulate network error (disconnect)
2. Process batch
3. Verify submission marked "failed"
4. Verify retry scheduled
5. Reconnect network
6. Verify submission succeeds on retry

### Test Submission History

1. Navigate to EIS Submissions in admin
2. Filter by merchant
3. Verify all submissions visible
4. Check status breakdown
5. Export compliance report

## Common Issues

### Submissions Stuck in Pending

**Solutions**:
1. Check queue worker is running
2. Verify EIS is enabled for merchant
3. Check scheduler is running

### Validation Errors

**Solutions**:
1. Check transaction data completeness
2. Verify TIN format is correct
3. Check OR number format matches BIR spec

### API Connection Errors

**Solutions**:
1. Verify API credentials
2. Check environment setting (test vs production)
3. Verify server can reach BIR endpoints
4. Check firewall/proxy settings
