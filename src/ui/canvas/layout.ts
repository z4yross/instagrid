import { boundsOf, hasCollision, inBounds, moveBlocks, rectsOverlap } from '@/core/grid'
import { CELL_ASPECT, COLS } from '@/core/types'
import type { Block, Rect, Size } from '@/core/types'
import { MAX_ZOOM_ROWS, MIN_ZOOM_ROWS } from '@/store/ui'

/*
 * Screen layout of the grid. A cell's pitch (its size including the gap) is
 * exactly 3:4 and is the unit all image geometry uses, so the screen shows
 * what the export cuts; the visual gap is drawn inside the pitch.
 */

export const GRID_GAP = 3
/** Width of the grid when the zoom is left on "fit" and there is room. */
export const FIT_GRID_WIDTH = 432

export interface Viewport extends Size {
  /** Horizontal padding kept free on each side of the grid. */
  padX: number
  /** Vertical padding above the grid. */
  padY: number
}

const pitchHeight = (pitchWidth: number) => pitchWidth / CELL_ASPECT

/** Cell pitch for a viewport. `zoomRows` null fits the width (SPEC V32). */
export function cellPitch(viewport: Viewport, zoomRows: number | null): Size {
  const maxWidth = Math.max(60, (viewport.width - viewport.padX * 2) / COLS)
  let width = Math.min(FIT_GRID_WIDTH / COLS, maxWidth)
  if (zoomRows !== null) {
    const rows = Math.min(MAX_ZOOM_ROWS, Math.max(MIN_ZOOM_ROWS, zoomRows))
    const byHeight = ((viewport.height - viewport.padY) / rows) * CELL_ASPECT
    width = Math.min(maxWidth, Math.max(40, byHeight))
  }
  width = Math.floor(width)
  return { width, height: pitchHeight(width) }
}

/** How many whole rows are in view at a pitch; what the zoom buttons step from. */
export function rowsInView(viewport: Viewport, pitch: Size): number {
  const rows = Math.floor((viewport.height - viewport.padY) / pitch.height)
  return Math.min(MAX_ZOOM_ROWS, Math.max(MIN_ZOOM_ROWS, rows))
}

export interface PixelRect {
  left: number
  top: number
  width: number
  height: number
}

/** Pixel box of a rect on the grid, inset by half the gap on every side. */
export function rectToPixels(rect: Rect, pitch: Size, gap = GRID_GAP): PixelRect {
  return {
    left: rect.col * pitch.width + gap / 2,
    top: rect.row * pitch.height + gap / 2,
    width: rect.colSpan * pitch.width - gap,
    height: rect.rowSpan * pitch.height - gap,
  }
}

/** Cell under a point given in grid pixels. Columns are clamped; rows are open-ended. */
export function cellAtPoint(x: number, y: number, pitch: Size): { col: number; row: number } {
  return {
    col: Math.min(COLS - 1, Math.max(0, Math.floor(x / pitch.width))),
    row: Math.max(0, Math.floor(y / pitch.height)),
  }
}

/** Whole-cell delta for a drag distance in pixels. */
export function dragToCells(dx: number, dy: number, pitch: Size): { dCol: number; dRow: number } {
  return { dCol: Math.round(dx / pitch.width), dRow: Math.round(dy / pitch.height) }
}

export type Corner = 'tl' | 'tr' | 'bl' | 'br'

/**
 * Rect of a block being resized from a corner to the cell under the pointer.
 * The opposite corner stays put; the result is never smaller than one cell.
 */
export function resizeRect(rect: Rect, corner: Corner, cell: { col: number; row: number }): Rect {
  const left = rect.col
  const top = rect.row
  const right = rect.col + rect.colSpan - 1
  const bottom = rect.row + rect.rowSpan - 1

  const col0 = corner === 'tl' || corner === 'bl' ? Math.min(cell.col, right) : left
  const col1 = corner === 'tr' || corner === 'br' ? Math.max(cell.col, left) : right
  const row0 = corner === 'tl' || corner === 'tr' ? Math.min(cell.row, bottom) : top
  const row1 = corner === 'bl' || corner === 'br' ? Math.max(cell.row, top) : bottom

  return { col: col0, row: row0, colSpan: col1 - col0 + 1, rowSpan: row1 - row0 + 1 }
}

export interface DropPreview {
  rects: Rect[]
  valid: boolean
}

/** Where a dragged group would land, and whether that is allowed (SPEC V22). */
export function movePreview(
  blocks: readonly Block[],
  ids: readonly string[],
  dCol: number,
  dRow: number
): DropPreview {
  const moving = blocks.filter((b) => ids.includes(b.id))
  const rects = moving.map((b) => ({
    col: b.col + dCol,
    row: b.row + dRow,
    colSpan: b.colSpan,
    rowSpan: b.rowSpan,
  }))
  return { rects, valid: moveBlocks(blocks, ids, dCol, dRow).ok }
}

export function resizePreview(blocks: readonly Block[], id: string, rect: Rect): DropPreview {
  return { rects: [rect], valid: inBounds(rect) && !hasCollision(blocks, rect, [id]) }
}

/** Blocks touched by a marquee given in grid pixels. */
export function blocksInMarquee(
  blocks: readonly Block[],
  a: { x: number; y: number },
  b: { x: number; y: number },
  pitch: Size
): string[] {
  const from = cellAtPoint(Math.min(a.x, b.x), Math.min(a.y, b.y), pitch)
  const to = cellAtPoint(Math.max(a.x, b.x), Math.max(a.y, b.y), pitch)
  const area = boundsOf([
    { ...from, colSpan: 1, rowSpan: 1 },
    { ...to, colSpan: 1, rowSpan: 1 },
  ])
  return blocks.filter((block) => rectsOverlap(block, area)).map((block) => block.id)
}

/** Ids between two blocks in reading order, inclusive (Shift+click range, SPEC V23). */
export function rangeBetween(blocks: readonly Block[], fromId: string, toId: string): string[] {
  const ordered = [...blocks].sort((a, b) => a.row - b.row || a.col - b.col)
  const i = ordered.findIndex((b) => b.id === fromId)
  const j = ordered.findIndex((b) => b.id === toId)
  if (i < 0 || j < 0) return [toId]
  return ordered.slice(Math.min(i, j), Math.max(i, j) + 1).map((b) => b.id)
}
