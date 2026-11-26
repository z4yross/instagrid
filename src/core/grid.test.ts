import { describe, expect, it } from 'vitest'
import {
  blockAt,
  contentRows,
  firstFreeCell,
  gridRows,
  hasCollision,
  inBounds,
  isValidLayout,
  moveBlocks,
  placeBlock,
  resizeBlock,
} from './grid'
import { colorBlock, imageBlock } from './testing'

describe('bounds (V2)', () => {
  it('accepts rects inside the 3 columns', () => {
    expect(inBounds({ col: 0, row: 0, colSpan: 3, rowSpan: 4 })).toBe(true)
    expect(inBounds({ col: 2, row: 9, colSpan: 1, rowSpan: 1 })).toBe(true)
  })

  it('rejects rects that leave the grid or are not whole cells', () => {
    expect(inBounds({ col: 2, row: 0, colSpan: 2, rowSpan: 1 })).toBe(false)
    expect(inBounds({ col: -1, row: 0, colSpan: 1, rowSpan: 1 })).toBe(false)
    expect(inBounds({ col: 0, row: 0, colSpan: 0, rowSpan: 1 })).toBe(false)
    expect(inBounds({ col: 0.5, row: 0, colSpan: 1, rowSpan: 1 })).toBe(false)
  })
})

describe('collisions (V1)', () => {
  const blocks = [imageBlock('a', 0, 0, 2, 2), imageBlock('b', 2, 0)]

  it('detects overlap and ignores listed blocks', () => {
    expect(hasCollision(blocks, { col: 1, row: 1, colSpan: 1, rowSpan: 1 })).toBe(true)
    expect(hasCollision(blocks, { col: 1, row: 1, colSpan: 1, rowSpan: 1 }, ['a'])).toBe(false)
    expect(hasCollision(blocks, { col: 2, row: 1, colSpan: 1, rowSpan: 1 })).toBe(false)
  })

  it('finds the block covering a cell', () => {
    expect(blockAt(blocks, 1, 1)?.id).toBe('a')
    expect(blockAt(blocks, 2, 1)).toBeUndefined()
  })

  it('validates a whole layout', () => {
    expect(isValidLayout(blocks)).toBe(true)
    expect(isValidLayout([...blocks, imageBlock('c', 1, 1)])).toBe(false)
  })
})

describe('rows (V10)', () => {
  it('shows at least three rows', () => {
    expect(gridRows([])).toBe(3)
    expect(gridRows([imageBlock('a', 0, 0)])).toBe(3)
  })

  it('keeps one free row under the content', () => {
    const blocks = [imageBlock('a', 0, 0, 1, 3)]
    expect(contentRows(blocks)).toBe(3)
    expect(gridRows(blocks)).toBe(4)
  })
})

describe('first free cell (V11)', () => {
  it('scans left to right, top to bottom', () => {
    expect(firstFreeCell([])).toEqual({ col: 0, row: 0 })
    expect(firstFreeCell([imageBlock('a', 0, 0)])).toEqual({ col: 1, row: 0 })
    expect(firstFreeCell([imageBlock('a', 0, 0, 3, 1)])).toEqual({ col: 0, row: 1 })
  })

  it('fills holes before appending', () => {
    const blocks = [imageBlock('a', 0, 0), imageBlock('b', 2, 0), imageBlock('c', 0, 1, 3, 1)]
    expect(firstFreeCell(blocks)).toEqual({ col: 1, row: 0 })
  })

  it('finds room for a larger span', () => {
    const blocks = [imageBlock('a', 1, 0)]
    expect(firstFreeCell(blocks, 2, 1)).toEqual({ col: 0, row: 1 })
  })

  it('places a batch on distinct cells', () => {
    let blocks = [imageBlock('a', 0, 0)]
    for (const id of ['b', 'c', 'd']) {
      const spot = firstFreeCell(blocks)
      blocks = [...blocks, imageBlock(id, spot.col, spot.row)]
    }
    expect(isValidLayout(blocks)).toBe(true)
    expect(blocks.map((b) => [b.col, b.row])).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ])
  })
})

describe('move (V1, V23)', () => {
  const blocks = [imageBlock('a', 0, 0), imageBlock('b', 1, 0), imageBlock('c', 0, 1)]

  it('moves a group as a unit', () => {
    const result = moveBlocks(blocks, ['a', 'b'], 1, 1)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.find((b) => b.id === 'a')).toMatchObject({ col: 1, row: 1 })
      expect(result.value.find((b) => b.id === 'b')).toMatchObject({ col: 2, row: 1 })
      expect(isValidLayout(result.value)).toBe(true)
    }
  })

  it('lets members of the group take each other’s cells', () => {
    expect(moveBlocks(blocks, ['a', 'b'], 1, 0)).toMatchObject({ ok: true })
  })

  it('rejects a move onto another block', () => {
    expect(moveBlocks(blocks, ['a'], 0, 1)).toEqual({ ok: false, reason: 'collision' })
  })

  it('rejects a move out of the grid', () => {
    expect(moveBlocks(blocks, ['a', 'b'], 2, 0)).toEqual({ ok: false, reason: 'out-of-bounds' })
    expect(moveBlocks(blocks, ['a'], 0, -1)).toEqual({ ok: false, reason: 'out-of-bounds' })
  })

  it('reports unknown ids', () => {
    expect(moveBlocks(blocks, ['zz'], 1, 0)).toEqual({ ok: false, reason: 'not-found' })
  })
})

describe('resize and place', () => {
  const blocks = [imageBlock('a', 0, 0), colorBlock('b', 2, 0)]

  it('resizes and resets the frame to the new span', () => {
    const result = resizeBlock(blocks, 'a', { col: 0, row: 0, colSpan: 2, rowSpan: 2 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value[0]).toMatchObject({
        colSpan: 2,
        rowSpan: 2,
        frame: { cols: 2, rows: 2, col: 0, row: 0 },
      })
    }
  })

  it('rejects a resize into another block or out of the grid', () => {
    expect(resizeBlock(blocks, 'a', { col: 0, row: 0, colSpan: 3, rowSpan: 1 })).toEqual({
      ok: false,
      reason: 'collision',
    })
    expect(resizeBlock(blocks, 'b', { col: 2, row: 0, colSpan: 2, rowSpan: 1 })).toEqual({
      ok: false,
      reason: 'out-of-bounds',
    })
  })

  it('rejects placing a block on an occupied cell', () => {
    expect(placeBlock(blocks, imageBlock('c', 2, 0))).toEqual({ ok: false, reason: 'collision' })
    expect(placeBlock(blocks, imageBlock('c', 1, 0))).toMatchObject({ ok: true })
  })
})
