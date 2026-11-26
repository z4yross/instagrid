import JSZip from 'jszip'
import type { ExportItem } from './plan'
import { renderExportCell } from './render'
import type { ImageSource } from './render'

export type ExportFormat = 'zip' | 'files'

export interface ExportProgress {
  done: number
  total: number
}

export interface ExportResult {
  delivered: number
  /** File names that could not be rendered. The rest are still delivered (SPEC V43). */
  failed: string[]
}

const DOWNLOAD_GAP_MS = 180

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Safe file name for the ZIP, from the project name. */
export function archiveName(projectName: string): string {
  const base = projectName
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return `${base || 'instagrid'}.zip`
}

/**
 * Render every item at 1080×1350 and hand the files to the browser, as one ZIP
 * or one download per file (SPEC V41-V43).
 */
export async function exportGrid(
  items: readonly ExportItem[],
  imageFor: (imageId: string | undefined) => ImageSource | undefined,
  format: ExportFormat,
  projectName: string,
  onProgress: (progress: ExportProgress) => void,
  signal?: AbortSignal
): Promise<ExportResult> {
  const rendered: { fileName: string; blob: Blob }[] = []
  const failed: string[] = []
  const total = items.length
  onProgress({ done: 0, total })

  for (const [index, item] of items.entries()) {
    if (signal?.aborted) break
    try {
      const blob = await renderExportCell(
        item.block,
        imageFor(item.block.imageId),
        item.cellCol,
        item.cellRow
      )
      rendered.push({ fileName: item.fileName, blob })
    } catch (error) {
      console.error(`Rendering ${item.fileName} failed`, error)
      failed.push(item.fileName)
    }
    onProgress({ done: index + 1, total })
  }

  if (signal?.aborted || rendered.length === 0) return { delivered: 0, failed }

  if (format === 'zip') {
    const zip = new JSZip()
    for (const file of rendered) zip.file(file.fileName, file.blob)
    download(await zip.generateAsync({ type: 'blob' }), archiveName(projectName))
  } else {
    for (const file of rendered) {
      download(file.blob, file.fileName)
      await pause(DOWNLOAD_GAP_MS)
    }
  }

  return { delivered: rendered.length, failed }
}
