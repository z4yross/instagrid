import { isLowRes } from '@/core/geometry'
import { exportFileName, numberedCells } from '@/core/numbering'
import type { Block, Size } from '@/core/types'

/** One file of an export: a single grid cell of an image block. */
export interface ExportItem {
  number: number
  fileName: string
  block: Block
  /** Cell inside the block. */
  cellCol: number
  cellRow: number
  lowRes: boolean
}

/**
 * What an export will produce, in posting order (SPEC V9, V41). Color cells
 * and empty cells are not exported.
 */
export function planExport(
  blocks: readonly Block[],
  imageSize: (imageId: string) => Size | undefined
): ExportItem[] {
  const cells = numberedCells(blocks)
  const byId = new Map(blocks.map((b) => [b.id, b]))
  return cells.map((cell) => {
    const block = byId.get(cell.blockId) as Block
    const size = block.imageId ? imageSize(block.imageId) : undefined
    return {
      number: cell.number,
      fileName: exportFileName(cell.number, cells.length),
      block,
      cellCol: cell.col - block.col,
      cellRow: cell.row - block.row,
      lowRes: size ? isLowRes(block, size) : false,
    }
  })
}
