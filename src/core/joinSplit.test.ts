import { describe, expect, it } from 'vitest'
import { isValidLayout } from './grid'
import { applyJoin, canSplit, compositeBlock, planJoin, split } from './joinSplit'
import { colorBlock, idSource, imageBlock } from './testing'
import type { Block, Transform } from './types'

const transform: Transform = {
  panX: 0.1,
  panY: -0.05,
  zoom: 1.4,
  rotation: 90,
  flipX: true,
  flipY: false,
}

describe('split (V6)', () => {
  it('refuses a single cell', () => {
    expect(canSplit(imageBlock('a', 0, 0))).toEqual({ ok: false, reason: 'single-cell' })
    expect(canSplit(undefined)).toEqual({ ok: false, reason: 'not-found' })
  })

  it('makes one 1×1 piece per cell, sharing image, transform and frame', () => {
    const source = imageBlock('a', 1, 2, 2, 2, { transform })
    const result = split([source], 'a', idSource())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { blocks, pieceIds } = result.value
    expect(pieceIds).toEqual(['n1', 'n2', 'n3', 'n4'])
    expect(isValidLayout(blocks)).toBe(true)
    expect(blocks.map((b) => [b.col, b.row, b.frame.col, b.frame.row])).toEqual([
      [1, 2, 0, 0],
      [2, 2, 1, 0],
      [1, 3, 0, 1],
      [2, 3, 1, 1],
    ])
    for (const piece of blocks) {
      expect(piece).toMatchObject({ colSpan: 1, rowSpan: 1, imageId: 'img-a', transform })
      expect(piece.frame).toMatchObject({ cols: 2, rows: 2 })
    }
  })

  it('keeps the other blocks and their order', () => {
    const blocks = [imageBlock('x', 0, 0), imageBlock('a', 1, 0, 2, 1), imageBlock('y', 0, 1)]
    const result = split(blocks, 'a', idSource())
    expect(result.ok && result.value.blocks.map((b) => b.id)).toEqual(['x', 'n1', 'n2', 'y'])
  })
})

describe('join (V7)', () => {
  it('needs two or more blocks that tile a rectangle', () => {
    const blocks = [imageBlock('a', 0, 0), imageBlock('b', 1, 0), imageBlock('c', 1, 1)]
    expect(planJoin(blocks, ['a'])).toEqual({ ok: false, reason: 'too-few' })
    expect(planJoin(blocks, ['a', 'zz'])).toEqual({ ok: false, reason: 'not-found' })
    // L shape
    expect(planJoin(blocks, ['a', 'b', 'c'])).toEqual({ ok: false, reason: 'not-rectangle' })
    // gap between them
    expect(planJoin([imageBlock('a', 0, 0), imageBlock('b', 2, 0)], ['a', 'b'])).toEqual({
      ok: false,
      reason: 'not-rectangle',
    })
  })

  it('refuses a selection with a foreign block inside its bounds', () => {
    const blocks = [imageBlock('a', 0, 0), imageBlock('x', 1, 0), imageBlock('b', 2, 0)]
    expect(planJoin(blocks, ['a', 'b'])).toEqual({ ok: false, reason: 'not-rectangle' })
  })

  it('reverses a split exactly', () => {
    const source = imageBlock('a', 0, 1, 3, 2, { transform })
    const parts = split([source], 'a', idSource())
    if (!parts.ok) throw new Error('split failed')
    const plan = planJoin(parts.value.blocks, parts.value.pieceIds)
    expect(plan.ok && plan.value.kind).toBe('rejoin')
    if (!plan.ok || plan.value.kind !== 'rejoin') return
    const joined: Block = { ...plan.value.block, id: 'a' }
    expect(joined).toEqual(source)
    expect(applyJoin(parts.value.blocks, parts.value.pieceIds, joined)).toEqual([source])
  })

  it('rejoins part of a split, keeping the original frame', () => {
    const source = imageBlock('a', 0, 0, 3, 1)
    const parts = split([source], 'a', idSource())
    if (!parts.ok) throw new Error('split failed')
    const plan = planJoin(parts.value.blocks, ['n2', 'n3'])
    expect(plan.ok && plan.value.kind).toBe('rejoin')
    if (plan.ok && plan.value.kind === 'rejoin') {
      expect(plan.value.block).toMatchObject({
        col: 1,
        colSpan: 2,
        frame: { cols: 3, rows: 1, col: 1, row: 0 },
      })
    }
  })

  it('does not rejoin pieces that were moved out of place', () => {
    const source = imageBlock('a', 0, 0, 2, 1)
    const parts = split([source], 'a', idSource())
    if (!parts.ok) throw new Error('split failed')
    const [left, right] = parts.value.blocks
    const swapped = [
      { ...left, col: 1 },
      { ...right, col: 0 },
    ]
    const plan = planJoin(swapped, ['n1', 'n2'])
    expect(plan.ok && plan.value.kind).toBe('composite')
  })

  it('does not rejoin pieces whose transform diverged', () => {
    const source = imageBlock('a', 0, 0, 2, 1)
    const parts = split([source], 'a', idSource())
    if (!parts.ok) throw new Error('split failed')
    const edited = parts.value.blocks.map((b, i) =>
      i === 0 ? { ...b, transform: { ...b.transform, zoom: 2 } } : b
    )
    expect(planJoin(edited, ['n1', 'n2'])).toMatchObject({ ok: true, value: { kind: 'composite' } })
  })

  it('merges same-color cells into one color cell', () => {
    const plan = planJoin([colorBlock('a', 0, 0), colorBlock('b', 0, 1)], ['a', 'b'])
    expect(plan).toMatchObject({
      ok: true,
      value: { kind: 'color', block: { kind: 'color', colSpan: 1, rowSpan: 2 } },
    })
  })

  it('plans a composite for different images, listing sources in grid order', () => {
    const blocks = [imageBlock('b', 1, 0), imageBlock('a', 0, 0), colorBlock('c', 2, 0)]
    const plan = planJoin(blocks, ['a', 'b', 'c'])
    expect(plan.ok && plan.value.kind).toBe('composite')
    if (plan.ok && plan.value.kind === 'composite') {
      expect(plan.value.rect).toEqual({ col: 0, row: 0, colSpan: 3, rowSpan: 1 })
      expect(plan.value.sources.map((b) => b.id)).toEqual(['a', 'b', 'c'])
    }
  })

  it('builds the composite block over the joined rect with a fresh frame', () => {
    const rect = { col: 1, row: 2, colSpan: 2, rowSpan: 1 }
    expect(compositeBlock(rect, 'new-image', '#000000')).toMatchObject({
      ...rect,
      kind: 'image',
      imageId: 'new-image',
      frame: { cols: 2, rows: 1, col: 0, row: 0 },
      transform: { panX: 0, panY: 0, zoom: 1, rotation: 0 },
    })
  })

  it('puts the joined block where the first source was', () => {
    const blocks = [
      imageBlock('x', 0, 0),
      imageBlock('a', 1, 0),
      imageBlock('y', 0, 1),
      imageBlock('b', 2, 0),
    ]
    const joined = imageBlock('j', 1, 0, 2, 1)
    expect(applyJoin(blocks, ['a', 'b'], joined).map((b) => b.id)).toEqual(['x', 'j', 'y'])
  })
})
