import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { saveTextFile, saveCsvFile, saveBinaryFile } from '../fileDownload'

/**
 * These cover the web/Electron path. Capacitor.isNativePlatform() is false under
 * jsdom, so saveTextFile/saveBinaryFile take the blob-download branch.
 */

let clickSpy: Mock<() => void>
let created: HTMLAnchorElement[]

beforeEach(() => {
  vi.useFakeTimers()
  created = []
  clickSpy = vi.fn<() => void>()

  // jsdom implements neither of these.
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()

  const realCreate = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreate(tag)
    if (tag === 'a') {
      ;(el as HTMLAnchorElement).click = clickSpy
      created.push(el as HTMLAnchorElement)
    }
    return el
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('saveTextFile', () => {
  it('triggers a download with the given filename', async () => {
    const result = await saveTextFile('a,b\n1,2', 'report.csv')

    expect(result).toEqual({ success: true, method: 'download' })
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(created[0]!.getAttribute('download')).toBe('report.csv')
  })

  it('replaces characters that are illegal in file names', async () => {
    await saveTextFile('x', 'sales 2026/05: "final"?.csv')

    expect(created[0]!.getAttribute('download')).toBe('sales 2026-05- -final-.csv')
  })

  it('falls back to a default name when nothing usable remains', async () => {
    await saveTextFile('x', '///')

    expect(created[0]!.getAttribute('download')).toBe('export')
  })

  it('defers cleanup so the download is not cancelled mid-flight', async () => {
    await saveTextFile('x', 'a.csv')

    // Revoking synchronously cancels the download in Electron/WebView.
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(document.body.contains(created[0]!)).toBe(true)

    vi.advanceTimersByTime(1000)

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(document.body.contains(created[0]!)).toBe(false)
  })
})

describe('saveCsvFile', () => {
  it('appends a .csv extension when missing', async () => {
    await saveCsvFile('a,b', 'inventory-2026-05-27')

    expect(created[0]!.getAttribute('download')).toBe('inventory-2026-05-27.csv')
  })

  it('does not double up an existing extension', async () => {
    await saveCsvFile('a,b', 'inventory.csv')

    expect(created[0]!.getAttribute('download')).toBe('inventory.csv')
  })
})

describe('saveBinaryFile', () => {
  it('downloads binary content', async () => {
    const result = await saveBinaryFile(new Uint8Array([1, 2, 3]), 'backup.db', 'application/x-sqlite3')

    expect(result).toEqual({ success: true, method: 'download' })
    expect(created[0]!.getAttribute('download')).toBe('backup.db')
  })

  it('handles payloads far larger than the call-stack limit', async () => {
    // A real DB backup is megabytes; String.fromCharCode(...bytes) overflows
    // well below this size, so this guards the chunked base64 conversion.
    const big = new Uint8Array(5 * 1024 * 1024)
    const result = await saveBinaryFile(big, 'big-backup.db')

    expect(result.success).toBe(true)
  })
})
