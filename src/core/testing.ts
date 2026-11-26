import { IDENTITY_TRANSFORM } from './types'
import type { Block } from './types'

/** Test helper: an image block with an unsplit frame. */
export function imageBlock(
  id: string,
  col: number,
  row: number,
  colSpan = 1,
  rowSpan = 1,
  overrides: Partial<Block> = {}
): Block {
  return {
    id,
    kind: 'image',
    imageId: `img-${id}`,
    color: '#000000',
    col,
    row,
    colSpan,
    rowSpan,
    frame: { cols: colSpan, rows: rowSpan, col: 0, row: 0 },
    transform: { ...IDENTITY_TRANSFORM },
    ...overrides,
  }
}

/** Test helper: a solid color cell. */
export function colorBlock(id: string, col: number, row: number, color = '#c8b8a4'): Block {
  return { ...imageBlock(id, col, row), kind: 'color', imageId: undefined, color }
}

/** Test helper: deterministic id source. */
export function idSource(prefix = 'n'): () => string {
  let i = 0
  return () => `${prefix}${++i}`
}
