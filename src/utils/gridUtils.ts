import type { ImageBlock } from '@/store/types'

export const COLS = 3
/** Instagram upload order: right-to-left per row, top-to-bottom */
export function cellUploadNumber(col: number, row: number, totalCols = COLS): number {
  return row * totalCols + (totalCols - 1 - col) + 1
}

/** Check if placing a block at (col, row, colSpan, rowSpan) collides with existing blocks */
export function hasCollision(
  blocks: ImageBlock[],
  col: number,
  row: number,
  colSpan: number,
  rowSpan: number,
  excludeId?: string
): boolean {
  for (const b of blocks) {
    if (b.id === excludeId) continue
    const colOverlap = col < b.col + b.colSpan && col + colSpan > b.col
    const rowOverlap = row < b.row + b.rowSpan && row + rowSpan > b.row
    if (colOverlap && rowOverlap) return true
  }
  return false
}

/** Build default cellOrder for a block: left-to-right, top-to-bottom */
export function defaultCellOrder(colSpan: number, rowSpan: number): [number, number][] {
  const order: [number, number][] = []
  for (let r = 0; r < rowSpan; r++) {
    for (let c = 0; c < colSpan; c++) {
      order.push([c, r])
    }
  }
  return order
}

/**
 * Compute cell pixel size to fit VISIBLE_ROWS rows within availableHeight
 * while never exceeding containerWidth / COLS (whichever is smaller wins).
 */
const VISIBLE_ROWS = 3
export function cellPixelSize(containerWidth: number, containerHeight?: number): { w: number; h: number } {
  const byWidth = containerWidth / COLS
  if (!containerHeight) return { w: byWidth, h: (byWidth * 4) / 3 }
  const byHeight = (containerHeight / VISIBLE_ROWS) * (3 / 4)
  const w = Math.min(byWidth, byHeight)
  return { w, h: (w * 4) / 3 }
}
