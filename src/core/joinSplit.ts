import { area, boundsOf, inGridOrder } from './grid'
import { IDENTITY_TRANSFORM, fail, ok } from './types'
import type { Block, Rect, Result, Transform } from './types'

export type SplitError = 'not-found' | 'single-cell'
export type JoinError = 'too-few' | 'not-found' | 'not-rectangle'

/** Cell width and height, in pixels, of each cell rendered into a composite image. */
export const COMPOSITE_CELL = { width: 1080, height: 1440 } as const

export function canSplit(block: Block | undefined): Result<true, SplitError> {
  if (!block) return fail('not-found')
  if (area(block) < 2) return fail('single-cell')
  return ok(true)
}

/**
 * SPEC V6: a block spanning N cells becomes N 1×1 blocks. Each piece keeps the
 * image, the transform and the original frame, offset to its own cell, so the
 * picture on the grid does not change.
 */
export function split(
  blocks: readonly Block[],
  id: string,
  newId: () => string
): Result<{ blocks: Block[]; pieceIds: string[] }, SplitError> {
  const block = blocks.find((b) => b.id === id)
  const check = canSplit(block)
  if (!check.ok) return check
  const source = block as Block
  const pieces: Block[] = []
  for (let r = 0; r < source.rowSpan; r++) {
    for (let c = 0; c < source.colSpan; c++) {
      pieces.push({
        ...source,
        id: newId(),
        col: source.col + c,
        row: source.row + r,
        colSpan: 1,
        rowSpan: 1,
        frame: { ...source.frame, col: source.frame.col + c, row: source.frame.row + r },
        transform: { ...source.transform },
      })
    }
  }
  const index = blocks.indexOf(source)
  const next = [...blocks.slice(0, index), ...pieces, ...blocks.slice(index + 1)]
  return ok({ blocks: next, pieceIds: pieces.map((p) => p.id) })
}

const sameTransform = (a: Transform, b: Transform) =>
  a.panX === b.panX &&
  a.panY === b.panY &&
  a.zoom === b.zoom &&
  a.rotation === b.rotation &&
  a.flipX === b.flipX &&
  a.flipY === b.flipY

/** Position of a block's frame origin on the grid. Pieces of one split share it. */
const frameOrigin = (b: Block) => ({ col: b.col - b.frame.col, row: b.row - b.frame.row })

function arePiecesOfOneImage(parts: readonly Block[]): boolean {
  const [first, ...rest] = parts
  if (first.kind !== 'image') return false
  const origin = frameOrigin(first)
  return rest.every((b) => {
    const o = frameOrigin(b)
    return (
      b.kind === 'image' &&
      b.imageId === first.imageId &&
      b.color === first.color &&
      b.frame.cols === first.frame.cols &&
      b.frame.rows === first.frame.rows &&
      o.col === origin.col &&
      o.row === origin.row &&
      sameTransform(b.transform, first.transform)
    )
  })
}

export type JoinPlan =
  /** Pieces of the same split image: merge back, no new image (exact reverse of split). */
  | { kind: 'rejoin'; rect: Rect; block: Omit<Block, 'id'> }
  /** Color cells of one color: one bigger color cell. */
  | { kind: 'color'; rect: Rect; block: Omit<Block, 'id'> }
  /**
   * Anything else: the selection must be rendered, as it looks on the grid,
   * into a new image of `rect.colSpan × rect.rowSpan` composite cells.
   */
  | { kind: 'composite'; rect: Rect; sources: Block[] }

/**
 * SPEC V7: the selection can be joined when its blocks tile a full rectangle.
 * Returns what the join will do; it changes nothing.
 */
export function planJoin(
  blocks: readonly Block[],
  ids: readonly string[]
): Result<JoinPlan, JoinError> {
  if (ids.length < 2) return fail('too-few')
  const parts = inGridOrder(blocks.filter((b) => ids.includes(b.id)))
  if (parts.length !== ids.length) return fail('not-found')

  const rect = boundsOf(parts)
  // Blocks never overlap (SPEC V1), so the selection tiles its bounding rect,
  // with no gap and no foreign block inside, exactly when the areas match.
  if (parts.reduce((sum, b) => sum + area(b), 0) !== area(rect)) return fail('not-rectangle')

  const first = parts[0]

  if (arePiecesOfOneImage(parts)) {
    const origin = frameOrigin(first)
    return ok({
      kind: 'rejoin',
      rect,
      block: {
        ...rect,
        kind: 'image',
        imageId: first.imageId,
        color: first.color,
        frame: { ...first.frame, col: rect.col - origin.col, row: rect.row - origin.row },
        transform: { ...first.transform },
      },
    })
  }

  if (parts.every((b) => b.kind === 'color' && b.color === first.color)) {
    return ok({
      kind: 'color',
      rect,
      block: {
        ...rect,
        kind: 'color',
        color: first.color,
        frame: { cols: rect.colSpan, rows: rect.rowSpan, col: 0, row: 0 },
        transform: { ...IDENTITY_TRANSFORM },
      },
    })
  }

  return ok({ kind: 'composite', rect, sources: parts })
}

/** The block a composite join produces once its image exists (SPEC V7). */
export function compositeBlock(rect: Rect, imageId: string, color: string): Omit<Block, 'id'> {
  return {
    ...rect,
    kind: 'image',
    imageId,
    color,
    frame: { cols: rect.colSpan, rows: rect.rowSpan, col: 0, row: 0 },
    transform: { ...IDENTITY_TRANSFORM },
  }
}

/** Replace the joined blocks with the single resulting block. */
export function applyJoin(
  blocks: readonly Block[],
  ids: readonly string[],
  joined: Block
): Block[] {
  const firstIndex = blocks.findIndex((b) => ids.includes(b.id))
  const rest = blocks.filter((b) => !ids.includes(b.id))
  const at = blocks.slice(0, firstIndex).filter((b) => !ids.includes(b.id)).length
  return [...rest.slice(0, at), joined, ...rest.slice(at)]
}
