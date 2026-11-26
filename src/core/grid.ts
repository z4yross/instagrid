import { COLS, MIN_ROWS, fail, ok } from './types'
import type { Block, Rect, Result } from './types'

export type GridError = 'out-of-bounds' | 'collision' | 'not-found'

export const rectOf = (b: Rect): Rect => ({
  col: b.col,
  row: b.row,
  colSpan: b.colSpan,
  rowSpan: b.rowSpan,
})

export const area = (r: Rect): number => r.colSpan * r.rowSpan

/** SPEC V2: integer cells inside the 3-column grid. */
export function inBounds(r: Rect): boolean {
  return (
    [r.col, r.row, r.colSpan, r.rowSpan].every(Number.isInteger) &&
    r.col >= 0 &&
    r.row >= 0 &&
    r.colSpan >= 1 &&
    r.rowSpan >= 1 &&
    r.col + r.colSpan <= COLS
  )
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.col < b.col + b.colSpan &&
    a.col + a.colSpan > b.col &&
    a.row < b.row + b.rowSpan &&
    a.row + a.rowSpan > b.row
  )
}

export function containsCell(r: Rect, col: number, row: number): boolean {
  return col >= r.col && col < r.col + r.colSpan && row >= r.row && row < r.row + r.rowSpan
}

export function blockAt(blocks: readonly Block[], col: number, row: number): Block | undefined {
  return blocks.find((b) => containsCell(b, col, row))
}

/** True when `rect` overlaps any block not listed in `ignoreIds`. */
export function hasCollision(
  blocks: readonly Block[],
  rect: Rect,
  ignoreIds: readonly string[] = []
): boolean {
  return blocks.some((b) => !ignoreIds.includes(b.id) && rectsOverlap(b, rect))
}

/** SPEC V1 + V2 for a whole layout. */
export function isValidLayout(blocks: readonly Block[]): boolean {
  return blocks.every(
    (b, i) => inBounds(b) && blocks.every((other, j) => j <= i || !rectsOverlap(b, other))
  )
}

/** First row index below all content. */
export function contentRows(blocks: readonly Block[]): number {
  return blocks.reduce((max, b) => Math.max(max, b.row + b.rowSpan), 0)
}

/** SPEC V10: at least MIN_ROWS, and always one free row under the content. */
export function gridRows(blocks: readonly Block[]): number {
  return Math.max(MIN_ROWS, contentRows(blocks) + 1)
}

/** SPEC V11: first spot that fits, scanning left to right, top to bottom. */
export function firstFreeCell(
  blocks: readonly Block[],
  colSpan = 1,
  rowSpan = 1
): { col: number; row: number } {
  const lastRow = contentRows(blocks)
  for (let row = 0; row <= lastRow; row++) {
    for (let col = 0; col + colSpan <= COLS; col++) {
      if (!hasCollision(blocks, { col, row, colSpan, rowSpan })) return { col, row }
    }
  }
  return { col: 0, row: lastRow }
}

/** Bounding rectangle of several rects. */
export function boundsOf(rects: readonly Rect[]): Rect {
  const col = Math.min(...rects.map((r) => r.col))
  const row = Math.min(...rects.map((r) => r.row))
  const right = Math.max(...rects.map((r) => r.col + r.colSpan))
  const bottom = Math.max(...rects.map((r) => r.row + r.rowSpan))
  return { col, row, colSpan: right - col, rowSpan: bottom - row }
}

/** Blocks ordered as they read on the grid: top to bottom, left to right. */
export function inGridOrder<T extends Rect>(blocks: readonly T[]): T[] {
  return [...blocks].sort((a, b) => a.row - b.row || a.col - b.col)
}

/**
 * Move a group of blocks by a cell delta as one unit (SPEC V1, V23).
 * Rejected, leaving the layout untouched, when any moved block would leave the
 * grid or land on a block outside the group.
 */
export function moveBlocks(
  blocks: readonly Block[],
  ids: readonly string[],
  dCol: number,
  dRow: number
): Result<Block[], GridError> {
  const moving = blocks.filter((b) => ids.includes(b.id))
  if (moving.length === 0) return fail('not-found')
  const moved = moving.map((b) => ({ ...b, col: b.col + dCol, row: b.row + dRow }))
  if (!moved.every(inBounds)) return fail('out-of-bounds')
  if (moved.some((m) => hasCollision(blocks, m, ids))) return fail('collision')
  const byId = new Map(moved.map((m) => [m.id, m]))
  return ok(blocks.map((b) => byId.get(b.id) ?? b))
}

/**
 * Give a block a new rect (SPEC V1, V2). Its frame is reset to the new span, so
 * the image is laid out over the block's own area again.
 */
export function resizeBlock(
  blocks: readonly Block[],
  id: string,
  rect: Rect
): Result<Block[], GridError> {
  const target = blocks.find((b) => b.id === id)
  if (!target) return fail('not-found')
  if (!inBounds(rect)) return fail('out-of-bounds')
  if (hasCollision(blocks, rect, [id])) return fail('collision')
  const resized: Block = {
    ...target,
    ...rect,
    frame: { cols: rect.colSpan, rows: rect.rowSpan, col: 0, row: 0 },
  }
  return ok(blocks.map((b) => (b.id === id ? resized : b)))
}

/** Add a block where it is, rejecting overlap or out-of-grid placement. */
export function placeBlock(blocks: readonly Block[], block: Block): Result<Block[], GridError> {
  if (!inBounds(block)) return fail('out-of-bounds')
  if (hasCollision(blocks, block)) return fail('collision')
  return ok([...blocks, block])
}
