// Printer Service - Bluetooth thermal printer management via Capacitor
// Uses registerPlugin to interface with native BluetoothSerial plugin (no npm dep needed)

import { Capacitor, registerPlugin } from '@capacitor/core'
import { escposService, type EscPosOptions } from './escposService'
import { formatReceipt } from '@/utils/receiptFormatter'
import type { ReceiptData } from '@/types/receipt'

export interface BluetoothDevice {
  name: string
  address: string
  id: string
  class?: number
}

export interface PrintResult {
  success: boolean
  error?: string
}

// Native plugin interface matching capacitor-bluetooth-serial
interface BluetoothSerialPlugin {
  isEnabled(): Promise<{ enabled: boolean }>
  list(): Promise<{ devices: any[] }>
  scan(): Promise<{ devices: any[] }>
  connect(options: { address: string }): Promise<void>
  disconnect(): Promise<void>
  isConnected(): Promise<{ connected: boolean }>
  write(options: { value: string }): Promise<void>
}

// Register the native plugin — on web this returns a proxy that throws "not implemented"
const BluetoothSerial = registerPlugin<BluetoothSerialPlugin>('BluetoothSerial')

type PrinterStatus = 'disconnected' | 'connecting' | 'connected' | 'printing'

let _status: PrinterStatus = 'disconnected'
let _connectedAddress: string | null = null
let _connectedName: string | null = null

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Check if Bluetooth is enabled on the device
 */
async function checkBluetoothEnabled(): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const result = await BluetoothSerial.isEnabled()
    return result.enabled
  } catch {
    return false
  }
}

/**
 * Request Bluetooth permissions (Android 12+)
 */
async function requestPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    // The native plugin handles runtime permission requests internally
    // Calling isEnabled triggers the permission flow
    await BluetoothSerial.isEnabled()
    return true
  } catch {
    return false
  }
}

/**
 * List paired/bonded Bluetooth devices
 */
async function listPairedDevices(): Promise<BluetoothDevice[]> {
  if (!isNativePlatform()) return []
  try {
    const result = await BluetoothSerial.list()
    return (result.devices || []).map((d: any) => ({
      name: d.name || 'Unknown Device',
      address: d.address || d.id,
      id: d.id || d.address,
      class: d.class
    }))
  } catch {
    return []
  }
}

/**
 * Scan/discover unpaired Bluetooth devices
 */
async function scanForDevices(): Promise<BluetoothDevice[]> {
  if (!isNativePlatform()) return []
  try {
    const result = await BluetoothSerial.scan()
    return (result.devices || []).map((d: any) => ({
      name: d.name || 'Unknown Device',
      address: d.address || d.id,
      id: d.id || d.address,
      class: d.class
    }))
  } catch {
    return []
  }
}

/**
 * Connect to a Bluetooth device by address
 */
async function connectToDevice(address: string): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    _status = 'connecting'
    await BluetoothSerial.connect({ address })
    _status = 'connected'
    _connectedAddress = address
    return true
  } catch {
    _status = 'disconnected'
    _connectedAddress = null
    _connectedName = null
    return false
  }
}

/**
 * Disconnect from current device
 */
async function disconnect(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await BluetoothSerial.disconnect()
  } catch {
    // Ignore disconnect errors
  }
  _status = 'disconnected'
  _connectedAddress = null
  _connectedName = null
}

/**
 * Check if currently connected
 */
async function isConnected(): Promise<boolean> {
  if (!isNativePlatform()) return false
  try {
    const result = await BluetoothSerial.isConnected()
    const connected = result.connected
    if (!connected) {
      _status = 'disconnected'
    }
    return connected
  } catch {
    _status = 'disconnected'
    return false
  }
}

/**
 * Send raw bytes to the printer
 */
async function printRaw(data: Uint8Array): Promise<PrintResult> {
  if (!isNativePlatform()) {
    return { success: false, error: 'Bluetooth printing is only available on mobile devices' }
  }

  try {
    // Auto-reconnect if we have a saved address but lost connection
    const connected = await isConnected()
    if (!connected && _connectedAddress) {
      const reconnected = await connectToDevice(_connectedAddress)
      if (!reconnected) {
        return { success: false, error: 'Printer disconnected. Please reconnect.' }
      }
    } else if (!connected) {
      return { success: false, error: 'No printer connected' }
    }

    _status = 'printing'

    // Convert Uint8Array to base64 string for the plugin
    const binary = String.fromCharCode(...data)
    const base64 = btoa(binary)

    await BluetoothSerial.write({ value: base64 })
    _status = 'connected'
    return { success: true }
  } catch (error) {
    _status = _connectedAddress ? 'connected' : 'disconnected'
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to print'
    }
  }
}

/**
 * Print a formatted receipt
 */
async function printReceipt(
  receiptData: ReceiptData,
  options: EscPosOptions
): Promise<PrintResult> {
  const charsPerLine = escposService.getCharsPerLine(options.paperWidth)
  const lines = formatReceipt(receiptData, charsPerLine)
  const buffer = escposService.buildReceiptBuffer(lines, options)
  return printRaw(buffer)
}

/**
 * Print a test page
 */
async function printTestPage(options: EscPosOptions): Promise<PrintResult> {
  const buffer = escposService.buildTestPageBuffer(options)
  return printRaw(buffer)
}

/**
 * Get current printer status
 */
function getStatus(): PrinterStatus {
  return _status
}

/**
 * Get connected device info
 */
function getConnectedDevice(): { address: string; name: string } | null {
  if (!_connectedAddress) return null
  return { address: _connectedAddress, name: _connectedName || _connectedAddress }
}

/**
 * Set connected device name (called after successful connect)
 */
function setConnectedName(name: string): void {
  _connectedName = name
}

export const printerService = {
  checkBluetoothEnabled,
  requestPermissions,
  listPairedDevices,
  scanForDevices,
  connectToDevice,
  disconnect,
  isConnected,
  printRaw,
  printReceipt,
  printTestPage,
  getStatus,
  getConnectedDevice,
  setConnectedName
}

export default printerService
