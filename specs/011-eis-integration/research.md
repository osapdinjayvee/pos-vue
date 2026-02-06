# Research: EIS Electronic OR Submission

**Feature**: 011-eis-integration
**Date**: 2026-02-04

## Research Tasks Completed

### 1. BIR EIS API Structure

**Decision**: Follow BIR EIS specification (as available)

```php
interface EISPayload {
    string $tin;              // Merchant TIN
    string $branch_code;      // Branch identifier
    string $or_number;        // Receipt number
    string $or_date;          // Transaction date
    float $gross_sales;       // Gross amount
    float $vat_amount;        // VAT
    float $net_sales;         // Net after VAT
    array $items;             // Line items
    string $machine_id;       // POS machine ID
    string $ptu_number;       // Permit to Use
}
```

### 2. Submission Queue Strategy

**Decision**: Laravel Queue with database driver

```php
// Queue job for EIS submission
class SubmitToEIS implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 5;
    public $backoff = [60, 300, 900, 3600, 7200]; // Exponential

    public function handle(EISService $eis): void
    {
        $result = $eis->submit($this->submission);

        if ($result->failed) {
            throw new EISSubmissionException($result->error);
        }

        $this->submission->markSubmitted($result->reference);
    }
}
```

### 3. Batch Processing

**Decision**: Batch submissions for efficiency

```php
class ProcessEISBatch implements ShouldQueue
{
    public function handle(EISBatchService $service): void
    {
        $pending = EISSubmission::pending()
            ->take(100)
            ->get();

        if ($pending->isEmpty()) return;

        $batch = $service->createBatch($pending);
        $result = $service->submitBatch($batch);

        foreach ($result->items as $item) {
            if ($item->success) {
                $item->submission->markSubmitted($item->reference);
            } else {
                $item->submission->markFailed($item->error);
            }
        }
    }
}
```

### 4. Error Handling

**Decision**: Categorized errors with different handling

```php
enum EISErrorType: string {
    case TEMPORARY = 'temporary';     // Network, timeout - retry
    case VALIDATION = 'validation';   // Data error - fix and retry
    case REJECTED = 'rejected';       // BIR rejected - manual review
    case DUPLICATE = 'duplicate';     // Already submitted - mark success
}

function handleEISError(EISError $error, EISSubmission $submission): void
{
    match ($error->type) {
        EISErrorType::TEMPORARY => $submission->scheduleRetry(),
        EISErrorType::VALIDATION => $submission->markNeedsCorrection($error),
        EISErrorType::REJECTED => $submission->markRejected($error),
        EISErrorType::DUPLICATE => $submission->markSubmitted($error->existingRef),
    };
}
```

## Technology Decisions Summary

| Component | Choice | Rationale |
|-----------|--------|-----------|
| HTTP Client | Guzzle | Laravel standard |
| Queue | Database driver | Visibility, reliability |
| Scheduler | Laravel Scheduler | Built-in, reliable |
| Monitoring | Filament Resource | Admin visibility |
