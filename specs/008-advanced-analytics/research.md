# Research: Advanced Analytics Dashboards

**Feature**: 008-advanced-analytics
**Date**: 2026-02-04

## Research Tasks Completed

### 1. Dashboard Architecture

**Decision**: Filament Widgets with cached data

```php
// Filament Widget with caching
class SalesChart extends ChartWidget
{
    protected static ?string $heading = 'Sales Trend';

    protected function getData(): array
    {
        return Cache::remember(
            "sales_chart_{$this->merchantId}_{$this->period}",
            now()->addMinutes(5),
            fn () => $this->calculateSalesData()
        );
    }
}
```

### 2. Pre-Aggregation Strategy

**Decision**: Daily aggregation job + hourly snapshots

```php
// Daily aggregation command
class AggregateDaily extends Command
{
    public function handle(): void
    {
        // Aggregate yesterday's data
        $date = now()->subDay()->toDateString();

        DB::table('sales_daily')
            ->insert([
                'date' => $date,
                'gross_sales' => Transaction::whereDate('created_at', $date)->sum('total_amount'),
                'transaction_count' => Transaction::whereDate('created_at', $date)->count(),
                // ... other aggregates
            ]);
    }
}
```

### 3. Chart Types

**Decision**: Standard Filament chart widgets

- Line charts: Sales trends
- Bar charts: Product comparison
- Pie charts: Category distribution
- Tables: Rankings and details

### 4. Custom Report Builder

**Decision**: Saved configuration approach

```php
interface SavedReport {
    string $name;
    string $type;         // 'sales', 'products', 'cashiers'
    array $dimensions;    // ['date', 'category', 'product']
    array $measures;      // ['quantity', 'revenue', 'profit']
    array $filters;       // ['date_from', 'date_to', 'branch_id']
    ?string $schedule;    // Cron expression for scheduled reports
}
```

## Technology Decisions Summary

| Component | Choice | Package |
|-----------|--------|---------|
| Charts | Filament Charts | filament/widgets |
| Caching | Laravel Cache | (built-in) |
| Export | Laravel Excel | maatwebsite/excel |
| Scheduling | Laravel Scheduler | (built-in) |
