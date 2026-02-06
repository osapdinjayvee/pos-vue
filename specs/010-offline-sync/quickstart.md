# Quickstart: Offline Sync & Conflict Handling

**Feature**: 010-offline-sync
**Date**: 2026-02-04
**Depends On**: 005-multi-branch-sync

## Prerequisites

- Base sync feature completed
- Laravel backend running
- Multiple terminals configured

## Setup Steps

### 1. Run Migrations

```bash
# Laravel backend
php artisan migrate
```

### 2. Initialize Terminal Health

```bash
# Register terminal in sync_health
php artisan sync:register-terminal POS-001 --branch=main
```

## Verification Steps

### Test Bulk Sync Recovery

1. Disconnect terminal network
2. Process 100+ transactions offline
3. Reconnect network
4. Trigger sync
5. Verify progress indicator shows
6. Verify all transactions sync
7. Check zero data loss

### Test OR Number Allocation

1. Check current OR allocation
2. Use 80% of allocated range
3. Verify allocation request sent
4. Verify new range allocated
5. Verify no gaps between ranges

### Test Conflict Resolution

1. Disconnect terminal A
2. Edit product X on terminal A
3. Edit product X on admin panel
4. Reconnect terminal A
5. Verify server version wins
6. Verify conflict logged
7. Check conflict dashboard shows record

### Test Sync Health Monitoring

1. Open admin sync dashboard
2. Verify all terminals show status
3. Disconnect a terminal
4. Wait 4+ hours (or adjust threshold)
5. Verify warning status appears

## Common Issues

### OR Range Not Allocating

**Solutions**:
1. Check terminal is registered
2. Verify server is reachable
3. Check current range has <20% remaining

### Conflicts Not Resolving

**Solutions**:
1. Verify conflict resolution rules configured
2. Check timestamp comparison logic
3. Review conflict log for errors
