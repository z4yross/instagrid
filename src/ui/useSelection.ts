import { exportUpscale, isLowRes } from '@/core/geometry'
import { numberedCells } from '@/core/numbering'
import { EXPORT_H, EXPORT_W } from '@/core/types'
import type { Block } from '@/core/types'
import { imageById, useLibrary } from '@/store/library'
import type { LibraryImage } from '@/store/library'
import { useProject } from '@/store/project'
import { liveSelection, useUi } from '@/store/ui'
import { joinBlocker, splitBlocker } from './actions'

export interface SelectionInfo {
  blocks: Block[]
  /** The one selected block, when exactly one is selected. */
  single: Block | null
  image: LibraryImage | undefined
  /** Upload numbers of the selection's image cells, ascending. */
  numbers: number[]
  lowRes: boolean
  /** Export size of the single block, in pixels. */
  exportSize: { width: number; height: number } | null
  /** Percent the export stretches the source when low resolution. */
  upscalePercent: number
  splitBlocker: string | null
  joinBlocker: string | null
  canAdjust: boolean
}

/** Everything the inspector and the mobile bar need to know about the selection. */
export function useSelection(): SelectionInfo {
  const all = useProject((s) => s.blocks)
  const selection = useUi((s) => s.selection)
  const images = useLibrary((s) => s.images)

  const ids = liveSelection(selection, all)
  const blocks = all.filter((b) => ids.includes(b.id))
  const single = blocks.length === 1 ? blocks[0] : null
  const image = single ? imageById(images, single.imageId) : undefined

  const numbers = numberedCells(all)
    .filter((cell) => ids.includes(cell.blockId))
    .map((cell) => cell.number)
    .sort((a, b) => a - b)

  const lowRes = Boolean(single && image && isLowRes(single, image))

  return {
    blocks,
    single,
    image,
    numbers,
    lowRes,
    exportSize: single
      ? { width: single.colSpan * EXPORT_W, height: single.rowSpan * EXPORT_H }
      : null,
    upscalePercent: single && image ? Math.round(exportUpscale(single, image) * 100) : 100,
    splitBlocker: splitBlocker(blocks),
    joinBlocker: joinBlocker(all, blocks),
    canAdjust: Boolean(single && single.kind === 'image' && image),
  }
}
