/**
 * Cross-platform file saving.
 *
 * The blob-URL + `<a download>` trick works in browsers and Electron, but it is
 * a silent no-op inside the Android WebView: Capacitor's WebView has no download
 * manager bound to it, so the click does nothing and no error is raised. That is
 * why every CSV export / template download appeared "unfunctional" on the tablet
 * build while working fine on desktop.
 *
 * On native we instead write the file to the app cache and hand it to the system
 * share sheet, which lets the user drop it into Files, Drive, email, etc.
 */

import { Capacitor } from '@capacitor/core'

export interface SaveFileResult {
  success: boolean
  /** How the file reached the user — 'download' on web/desktop, 'share' on native. */
  method?: 'download' | 'share'
  /** True when the user dismissed the native share sheet (not a failure). */
  cancelled?: boolean
  error?: string
}

/**
 * Strip characters that are illegal in file names on Windows/Android.
 *
 * Runs of replacements are collapsed so "a: b" does not become "a---b", and a
 * name consisting only of illegal characters falls back to a usable default
 * rather than a string of dashes.
 */
function sanitizeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-\s]+|[-\s]+$/g, '')

  return cleaned || 'export'
}

/**
 * Save a text file, using whichever mechanism the current platform supports.
 *
 * @param content  File contents (a BOM, if wanted, should already be prepended)
 * @param filename File name including extension, e.g. "products.csv"
 * @param mimeType MIME type used for the web blob and the native share sheet
 */
export async function saveTextFile(
  content: string,
  filename: string,
  mimeType: string = 'text/csv;charset=utf-8;'
): Promise<SaveFileResult> {
  const name = sanitizeFilename(filename)

  if (Capacitor.isNativePlatform()) {
    return saveViaShareSheet(content, name, mimeType)
  }

  return saveViaBlobDownload(content, name, mimeType)
}

/**
 * Native: write to the app cache directory, then open the system share sheet.
 * Cache needs no storage permission on any supported Android version.
 */
async function saveViaShareSheet(
  content: string,
  filename: string,
  mimeType: string
): Promise<SaveFileResult> {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')

    await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    })

    const { uri } = await Filesystem.getUri({
      path: filename,
      directory: Directory.Cache
    })

    try {
      await Share.share({
        title: filename,
        // `text` is deliberately omitted: some targets (Gmail, Drive) attach the
        // text as the body and drop the file when both are supplied.
        files: [uri],
        dialogTitle: `Save ${filename}`
      })
    } catch (shareError) {
      // Dismissing the share sheet rejects — that is a user choice, not a failure.
      // The file is already written, so report success without an error toast.
      const message = shareError instanceof Error ? shareError.message : String(shareError)
      if (/cancel/i.test(message)) {
        return { success: true, method: 'share', cancelled: true }
      }
      throw shareError
    }

    return { success: true, method: 'share' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save file'
    }
  }
}

/**
 * Web / Electron: classic blob URL download.
 */
function saveViaBlobDownload(
  content: string,
  filename: string,
  mimeType: string
): SaveFileResult {
  try {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()

    // Defer cleanup — revoking the URL synchronously can cancel the download
    // before it starts in Electron/WebView environments.
    setTimeout(() => {
      if (link.parentNode) document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 1000)

    return { success: true, method: 'download' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file'
    }
  }
}

/**
 * Convenience wrapper that appends a .csv extension when missing.
 */
export async function saveCsvFile(content: string, filename: string): Promise<SaveFileResult> {
  const name = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`
  return saveTextFile(content, name, 'text/csv;charset=utf-8;')
}

/**
 * Convert bytes to base64 in chunks — `String.fromCharCode(...bytes)` overflows
 * the call stack on anything larger than ~100KB, and database backups are much
 * bigger than that.
 */
function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/**
 * Save a binary file (e.g. a SQLite database backup).
 */
export async function saveBinaryFile(
  data: Uint8Array,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<SaveFileResult> {
  const name = sanitizeFilename(filename)

  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      // Omitting `encoding` tells Filesystem the payload is base64 binary.
      await Filesystem.writeFile({
        path: name,
        data: bytesToBase64(data),
        directory: Directory.Cache
      })

      const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache })

      try {
        await Share.share({ title: name, files: [uri], dialogTitle: `Save ${name}` })
      } catch (shareError) {
        const message = shareError instanceof Error ? shareError.message : String(shareError)
        if (/cancel/i.test(message)) {
          return { success: true, method: 'share', cancelled: true }
        }
        throw shareError
      }

      return { success: true, method: 'share' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file'
      }
    }
  }

  try {
    const blob = new Blob([data as BlobPart], { type: mimeType })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', name)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()

    setTimeout(() => {
      if (link.parentNode) document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }, 1000)

    return { success: true, method: 'download' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file'
    }
  }
}

export default { saveTextFile, saveCsvFile, saveBinaryFile }