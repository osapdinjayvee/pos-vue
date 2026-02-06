# Quickstart: Filament Admin Panel

**Feature**: 006-admin-panel
**Date**: 2026-02-04
**Depends On**: Laravel backend, MySQL database

## Prerequisites

- PHP 8.2+
- Composer
- MySQL 8.0+
- Laravel 11 backend project

## Setup Steps

### 1. Install Filament

```bash
cd backend
composer require filament/filament:"^3.0"
php artisan filament:install --panels
```

### 2. Run Migrations

```bash
php artisan migrate
```

### 3. Create Admin User

```bash
php artisan make:filament-user
```

### 4. Generate Resources

```bash
php artisan make:filament-resource Merchant --generate
php artisan make:filament-resource Plan --generate
php artisan make:filament-resource Subscription --generate
```

## Verification Steps

### Test Merchant Management

1. Log in to admin panel at `/admin`
2. Navigate to Merchants
3. Create a new merchant
4. Verify all fields save correctly
5. Edit the merchant
6. Verify audit log shows the changes

### Test Plan Management

1. Navigate to Plans
2. Create a new plan with limits
3. Assign the plan to a merchant
4. Verify subscription is created
5. Check merchant sees correct limits

### Test OR Series Configuration

1. Navigate to OR Series
2. Create new series for a terminal
3. Verify validation prevents overlapping ranges
4. Check 80% alert triggers correctly

## Common Issues

### Admin Panel Not Loading

**Solutions**:
1. Run `php artisan filament:assets`
2. Clear config cache: `php artisan config:clear`
3. Check .env for correct APP_URL

### Audit Log Not Recording

**Solutions**:
1. Verify Spatie Activity Log is installed
2. Check model has LogsActivity trait
3. Verify observer is registered
