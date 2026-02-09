import db from '@/db/database';
import { drawerSessionRepository } from '@/repositories/drawerSessionRepository';
import { drawerOperationRepository } from '@/repositories/drawerOperationRepository';
import type { DrawerSession, DrawerOperation, DenominationCount } from '@/types/cashDrawer';

interface VarianceReportItem {
  sessionId: string;
  date: string;
  cashierName: string;
  cashierId: string;
  openingAmount: number;
  expectedAmount: number;
  closingAmount: number;
  variance: number;
  varianceReason: string | null;
  shiftId: string;
}

interface CashierVarianceSummary {
  cashierId: string;
  cashierName: string;
  shiftCount: number;
  totalOver: number;
  totalShort: number;
  netVariance: number;
  avgVariancePerShift: number;
}

interface ShiftDetail {
  session: DrawerSession;
  operations: Array<DrawerOperation & { denominations: DenominationCount[] }>;
}

class VarianceService {
  /**
   * Get variance report for all closed drawer sessions within a date range
   */
  async getVarianceReport(startDate: string, endDate: string): Promise<VarianceReportItem[]> {
    const query = `
      SELECT
        ds.id as sessionId,
        ds.opened_at as date,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as cashierName,
        ds.user_id as cashierId,
        ds.opening_amount as openingAmount,
        ds.expected_amount as expectedAmount,
        ds.closing_amount as closingAmount,
        ds.variance,
        ds.variance_reason as varianceReason,
        ds.shift_id as shiftId
      FROM drawer_sessions ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.status = 'closed'
        AND DATE(ds.opened_at) >= DATE(?)
        AND DATE(ds.opened_at) <= DATE(?)
      ORDER BY ds.opened_at DESC
    `;

    const results = await db.query<VarianceReportItem>(query, [startDate, endDate]);
    return results;
  }

  /**
   * Get cashier variance summary aggregated by user within a date range
   */
  async getCashierVarianceSummary(
    startDate: string,
    endDate: string
  ): Promise<CashierVarianceSummary[]> {
    const query = `
      SELECT
        ds.user_id as cashierId,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as cashierName,
        COUNT(ds.id) as shiftCount,
        COALESCE(SUM(CASE WHEN ds.variance > 0 THEN ds.variance ELSE 0 END), 0) as totalOver,
        COALESCE(SUM(CASE WHEN ds.variance < 0 THEN ABS(ds.variance) ELSE 0 END), 0) as totalShort,
        COALESCE(SUM(ds.variance), 0) as netVariance,
        COALESCE(AVG(ds.variance), 0) as avgVariancePerShift
      FROM drawer_sessions ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.status = 'closed'
        AND DATE(ds.opened_at) >= DATE(?)
        AND DATE(ds.opened_at) <= DATE(?)
      GROUP BY ds.user_id, u.first_name, u.last_name
      ORDER BY ABS(COALESCE(SUM(ds.variance), 0)) DESC
    `;

    const results = await db.query<CashierVarianceSummary>(query, [startDate, endDate]);
    return results;
  }

  /**
   * Get flagged shifts where variance exceeds a threshold
   */
  async getFlaggedShifts(
    startDate: string,
    endDate: string,
    threshold: number
  ): Promise<VarianceReportItem[]> {
    const query = `
      SELECT
        ds.id as sessionId,
        ds.opened_at as date,
        COALESCE(u.first_name || ' ' || u.last_name, 'Unknown') as cashierName,
        ds.user_id as cashierId,
        ds.opening_amount as openingAmount,
        ds.expected_amount as expectedAmount,
        ds.closing_amount as closingAmount,
        ds.variance,
        ds.variance_reason as varianceReason,
        ds.shift_id as shiftId
      FROM drawer_sessions ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.status = 'closed'
        AND DATE(ds.opened_at) >= DATE(?)
        AND DATE(ds.opened_at) <= DATE(?)
        AND ABS(ds.variance) > ?
      ORDER BY ABS(ds.variance) DESC
    `;

    const results = await db.query<VarianceReportItem>(query, [startDate, endDate, threshold]);
    return results;
  }

  /**
   * Get detailed information for a specific shift including all operations and denominations
   */
  async getShiftDetail(sessionId: string): Promise<ShiftDetail> {
    // Get the session
    const session = await drawerSessionRepository.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Get all operations for this session
    const operationsQuery = `
      SELECT *
      FROM drawer_operations
      WHERE session_id = ?
      ORDER BY created_at ASC
    `;
    const operations = await db.query<DrawerOperation>(operationsQuery, [sessionId]);

    // Get denominations for each operation
    const operationsWithDenominations = await Promise.all(
      operations.map(async (operation) => {
        const denominationsQuery = `
          SELECT *
          FROM denomination_counts
          WHERE operation_id = ?
          ORDER BY denomination DESC
        `;
        const denominations = await db.query<DenominationCount>(denominationsQuery, [operation.id]);

        return {
          ...operation,
          denominations
        };
      })
    );

    return {
      session,
      operations: operationsWithDenominations
    };
  }
}

export const varianceService = new VarianceService();
