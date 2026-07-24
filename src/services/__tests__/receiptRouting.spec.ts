import { describe, it, expect } from 'vitest'
import { shouldUseBluetooth } from '../receiptService'

/**
 * Guards the routing decision behind the "printing does not work except the
 * test print" report: receipts were falling through to the non-Bluetooth path
 * because connecting a printer never persisted connection_type.
 */
describe('shouldUseBluetooth', () => {
  const WEB = false
  const NATIVE = true

  it('routes to Bluetooth when the config is fully set up', () => {
    expect(shouldUseBluetooth({ connection_type: 'bluetooth', bluetooth_device: 'AA:BB' }, WEB)).toBe(true)
    expect(shouldUseBluetooth({ connection_type: 'bluetooth', bluetooth_device: 'AA:BB' }, NATIVE)).toBe(true)
  })

  it('routes to Bluetooth on native for legacy configs left at the usb default', () => {
    // The exact shape of an install that connected a printer before the
    // connection type was written through.
    expect(shouldUseBluetooth({ connection_type: 'usb', bluetooth_device: 'AA:BB' }, NATIVE)).toBe(true)
  })

  it('does not hijack a deliberate non-Bluetooth choice on desktop', () => {
    expect(shouldUseBluetooth({ connection_type: 'usb', bluetooth_device: 'AA:BB' }, WEB)).toBe(false)
    expect(shouldUseBluetooth({ connection_type: 'network', bluetooth_device: 'AA:BB' }, WEB)).toBe(false)
  })

  it('requires a paired device', () => {
    expect(shouldUseBluetooth({ connection_type: 'bluetooth', bluetooth_device: '' }, NATIVE)).toBe(false)
    expect(shouldUseBluetooth({ connection_type: 'bluetooth' }, NATIVE)).toBe(false)
  })

  it('handles a missing config', () => {
    expect(shouldUseBluetooth(null, NATIVE)).toBe(false)
    expect(shouldUseBluetooth(undefined, WEB)).toBe(false)
  })
})
