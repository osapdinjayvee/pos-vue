/**
 * Electron Preload Script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from 'electron'

// Type definitions for the exposed API
export interface ElectronAPI {
  ipcRenderer: {
    invoke(channel: string, ...args: any[]): Promise<any>
    on(channel: string, listener: (...args: any[]) => void): void
    removeListener(channel: string, listener: (...args: any[]) => void): void
  }
  platform: NodeJS.Platform
  isElectron: boolean
}

// List of allowed IPC channels
const validChannels = [
  // Database operations
  'database:initialize',
  'database:close',
  'database:execute',
  'database:query',
  'database:beginTransaction',
  'database:commit',
  'database:rollback',
  'database:txExecute',
  'database:txQuery',
  'database:executeBatch',
  'database:export',
  'database:import',
  // App operations
  'app:getPath',
  'app:getVersion'
]

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => {
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args)
      }
      throw new Error(`Invalid IPC channel: ${channel}`)
    },
    on: (channel: string, listener: (...args: any[]) => void) => {
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (_, ...args) => listener(...args))
      }
    },
    removeListener: (channel: string, listener: (...args: any[]) => void) => {
      if (validChannels.includes(channel)) {
        ipcRenderer.removeListener(channel, listener)
      }
    }
  },
  platform: process.platform,
  isElectron: true
} as ElectronAPI)

// Log when preload script is loaded
console.log('[Preload] Electron API exposed to renderer')
