# Research: Filament Admin Panel

**Feature**: 006-admin-panel
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Filament 4 Architecture

**Decision**: Use Filament 4 Resources for CRUD, Widgets for dashboard

**Key Features Used**:
- Resources: Auto-generated CRUD for Merchant, Plan, ORSeries
- Pages: Custom wizard for merchant onboarding
- Widgets: Stats cards and alerts on dashboard
- Actions: Bulk operations and custom actions
- Notifications: Alerts for OR series exhaustion, expiring subscriptions

### 2. Multi-Tenant Scoping

**Decision**: Use Filament's built-in tenant support

```php
// app/Filament/Resources/BranchResource.php
public static function getEloquentQuery(): Builder
{
    return parent::getEloquentQuery()
        ->where('merchant_id', Filament::getTenant()->id);
}
```

### 3. OR Series Validation

**Decision**: Custom validation rule for range validation

```php
// app/Rules/ORSeriesRange.php
class ORSeriesRange implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Check for gaps
        $previous = ORSeries::where('terminal_id', $this->terminalId)
            ->where('is_active', false)
            ->orderBy('end_number', 'desc')
            ->first();

        if ($previous && $value['start_number'] !== $previous->end_number + 1) {
            $fail('OR series must start at ' . ($previous->end_number + 1));
        }

        // Check for overlaps
        $overlap = ORSeries::where('terminal_id', $this->terminalId)
            ->where(function ($q) use ($value) {
                $q->whereBetween('start_number', [$value['start_number'], $value['end_number']])
                  ->orWhereBetween('end_number', [$value['start_number'], $value['end_number']]);
            })->exists();

        if ($overlap) {
            $fail('OR series range overlaps with existing series');
        }
    }
}
```

### 4. Audit Logging

**Decision**: Spatie Activity Log with custom properties

```php
// Model observer for audit logging
protected static function booted(): void
{
    static::created(fn ($model) => activity()
        ->performedOn($model)
        ->causedBy(auth()->user())
        ->withProperties(['action' => 'created'])
        ->log('created'));
}
```

## Technology Decisions Summary

| Component | Choice | Package |
|-----------|--------|---------|
| Admin Framework | Filament 4 | filament/filament |
| Audit Logging | Spatie Activity Log | spatie/laravel-activitylog |
| Permissions | Spatie Permission | spatie/laravel-permission |
| Multi-tenancy | Filament Tenancy | (built-in) |
