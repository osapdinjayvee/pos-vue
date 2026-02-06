/**
 * Migration 013: Offline Sync & Conflict Handling
 * Creates sync_health and or_allocations tables
 */
export const migration013 = {
  name: '013_offline_sync',
  up: async (execute: (sql: string, params?: any[]) => Promise<any>) => {
    // Sync health - terminal sync monitoring
    await execute(`
      CREATE TABLE IF NOT EXISTS sync_health (
        terminal_id TEXT PRIMARY KEY,
        branch_id TEXT NOT NULL,
        last_heartbeat TEXT,
        last_upload TEXT,
        last_download TEXT,
        queue_depth INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'unknown' CHECK(status IN ('healthy','warning','critical','unknown')),
        updated_at TEXT NOT NULL
      )
    `)
    await execute('CREATE INDEX IF NOT EXISTS idx_sync_health_status ON sync_health(status)')

    // OR allocations - pre-allocated OR number ranges per terminal
    await execute(`
      CREATE TABLE IF NOT EXISTS or_allocations (
        id TEXT PRIMARY KEY,
        terminal_id TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        prefix TEXT NOT NULL,
        start_number INTEGER NOT NULL,
        end_number INTEGER NOT NULL,
        current_number INTEGER NOT NULL,
        allocated_at TEXT NOT NULL,
        exhausted_at TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active','exhausted')),
        UNIQUE(terminal_id, prefix, start_number)
      )
    `)
    await execute('CREATE INDEX IF NOT EXISTS idx_or_alloc_terminal ON or_allocations(terminal_id, status)')

    console.log('[Migration] 013_offline_sync completed')
  }
}
