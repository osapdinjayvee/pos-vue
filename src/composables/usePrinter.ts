// Printer composable - Vue reactive wrapper around printerService

import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { printerService, type BluetoothDevice } from '@/services/printerService'
import type { EscPosOptions } from '@/services/escposService'

export function usePrinter() {
  const isBluetoothEnabled = ref(false)
  const isConnected = ref(false)
  const connectedDevice = ref<{ address: string; name: string } | null>(null)
  const pairedDevices = ref<BluetoothDevice[]>([])
  const discoveredDevices = ref<BluetoothDevice[]>([])
  const isScanning = ref(false)
  const isConnecting = ref(false)
  const isPrinting = ref(false)
  const error = ref<string | null>(null)

  const isNative = computed(() => Capacitor.isNativePlatform())

  async function checkBluetooth(): Promise<void> {
    if (!isNative.value) return
    error.value = null
    try {
      await printerService.requestPermissions()
      isBluetoothEnabled.value = await printerService.checkBluetoothEnabled()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to check Bluetooth'
    }
  }

  async function loadPairedDevices(): Promise<void> {
    if (!isNative.value) return
    error.value = null
    try {
      pairedDevices.value = await printerService.listPairedDevices()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load paired devices'
    }
  }

  async function scanDevices(): Promise<void> {
    if (!isNative.value) return
    error.value = null
    isScanning.value = true
    discoveredDevices.value = []
    try {
      discoveredDevices.value = await printerService.scanForDevices()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to scan for devices'
    } finally {
      isScanning.value = false
    }
  }

  async function connect(device: BluetoothDevice): Promise<boolean> {
    error.value = null
    isConnecting.value = true
    try {
      const success = await printerService.connectToDevice(device.address)
      if (success) {
        printerService.setConnectedName(device.name)
        isConnected.value = true
        connectedDevice.value = { address: device.address, name: device.name }
      } else {
        error.value = 'Failed to connect to printer'
      }
      return success
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Connection error'
      return false
    } finally {
      isConnecting.value = false
    }
  }

  async function disconnect(): Promise<void> {
    error.value = null
    try {
      await printerService.disconnect()
      isConnected.value = false
      connectedDevice.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to disconnect'
    }
  }

  async function testPrint(options: EscPosOptions): Promise<boolean> {
    error.value = null
    isPrinting.value = true
    try {
      const result = await printerService.printTestPage(options)
      if (!result.success) {
        error.value = result.error || 'Test print failed'
      }
      return result.success
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Print error'
      return false
    } finally {
      isPrinting.value = false
    }
  }

  async function refreshConnectionStatus(): Promise<void> {
    if (!isNative.value) return
    try {
      isConnected.value = await printerService.isConnected()
      if (isConnected.value) {
        connectedDevice.value = printerService.getConnectedDevice()
      } else {
        connectedDevice.value = null
      }
    } catch {
      isConnected.value = false
      connectedDevice.value = null
    }
  }

  return {
    // State
    isNative,
    isBluetoothEnabled,
    isConnected,
    connectedDevice,
    pairedDevices,
    discoveredDevices,
    isScanning,
    isConnecting,
    isPrinting,
    error,

    // Actions
    checkBluetooth,
    loadPairedDevices,
    scanDevices,
    connect,
    disconnect,
    testPrint,
    refreshConnectionStatus
  }
}
