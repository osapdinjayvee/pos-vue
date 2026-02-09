import db from '@/db/database'
import { BaseRepository } from './baseRepository'
import type { ReceiptConfig, ReceiptConfigInput } from '@/types/settings'

class ReceiptConfigRepository extends BaseRepository<ReceiptConfig> {
  protected tableName = 'receipt_config'
  protected idPrefix = 'rcfg'

  async getConfig(): Promise<ReceiptConfig | null> {
    return await db.getOne<ReceiptConfig>(
      `SELECT * FROM ${this.tableName} WHERE id = 'default'`
    )
  }

  async updateConfig(data: ReceiptConfigInput): Promise<ReceiptConfig | null> {
    const now = db.getCurrentTimestamp()
    const fields: string[] = []
    const values: any[] = []

    const boolFields = ['show_logo', 'print_duplicate', 'auto_cut', 'open_cash_drawer'] as const
    const stringFields = ['header_line1', 'header_line2', 'header_line3', 'footer_line1', 'footer_line2',
      'paper_width', 'font_size', 'printer_name', 'connection_type', 'ip_address',
      'usb_device', 'bluetooth_device', 'serial_port'] as const
    const numFields = ['port', 'baud_rate', 'cash_drawer_pin'] as const

    for (const key of stringFields) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]) }
    }
    for (const key of numFields) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key]) }
    }
    for (const key of boolFields) {
      if (data[key] !== undefined) { fields.push(`${key} = ?`); values.push(data[key] ? 1 : 0) }
    }

    if (fields.length === 0) return await this.getConfig()

    fields.push('updated_at = ?')
    values.push(now)

    await db.execute(
      `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = 'default'`,
      values
    )
    return await this.getConfig()
  }
}

export const receiptConfigRepository = new ReceiptConfigRepository()
export default receiptConfigRepository
