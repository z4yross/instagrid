import { describe, expect, it } from 'vitest'
import { imageBlock } from '@/core/testing'
import {
  blocksInMarquee,
  cellAtPoint,
  cellPitch,
  dragToCells,
  movePreview,
  rangeBetween,
  rectToPixels,
  resizePreview,
  resizeRect,
  rowsInView,
} from './layout'

const desktop = { width: 900, height: 820, padX: 24, padY: 32 }
const phone = { width: 390, height: 700, padX: 16, padY: 16 }

describe('cell pitch (V32)', () => {
  it('fits a comfortable width on desktop and the full width on a phone', () => {
    expect(cellPitch(desktop, null)).toEqual({ width: 144, height: 192 })
    const p = cellPitch(phone, null)
    expect(p.width).toBe(119)
    expect(p.width / p.height).toBeCloseTo(0.75)
  })

  it('sizes cells so the requested rows fit, never wider than the viewport allows', () => {
    const four = cellPitch(desktop, 4)
    expect(Math.floor((desktop.height - desktop.padY) / four.height)).toBe(4)
    expect(cellPitch(phone, 2).width).toBe(119)
  })

  it('more rows means smaller cells', () => {
    expect(cellPitch(desktop, 6).width).toBeLessThan(cellPitch(desktop, 3).width)
  })

  it('reports the rows in view within the zoom range', () => {
    expect(rowsInView(desktop, cellPitch(desktop, null))).toBe(4)
    expect(rowsInView(desktop, { width: 600, height: 800 })).toBe(2)
  })
})

describe('pixels and cells', () => {
  const pitch = { width: 150, height: 200 }

  it('insets a rect by half the gap on each side', () => {
    expect(rectToPixels({ col: 1, row: 2, colSpan: 2, rowSpan: 1 }, pitch, 4)).toEqual({
      left: 152,
      top: 402,
      width: 296,
      height: 196,
    })
  })

  it('finds the cell under a point and clamps columns', () => {
    expect(cellAtPoint(160, 410, pitch)).toEqual({ col: 1, row: 2 })
    expect(cellAtPoint(-20, -5, pitch)).toEqual({ col: 0, row: 0 })
    expect(cellAtPoint(900, 0, pitch)).toEqual({ col: 2, row: 0 })
  })

  it('snaps a drag to whole cells', () => {
    expect(dragToCells(80, -90, pitch)).toEqual({ dCol: 1, dRow: -0 })
    expect(dragToCells(70, -110, pitch)).toEqual({ dCol: 0, dRow: -1 })
  })
})

describe('resize from a corner', () => {
  const rect = { col: 1, row: 1, colSpan: 1, rowSpan: 1 }

  it('grows toward the pointer and keeps the opposite corner', () => {
    expect(resizeRect(rect, 'br', { col: 2, row: 3 })).toEqual({
      col: 1,
      row: 1,
      colSpan: 2,
      rowSpan: 3,
    })
    expect(resizeRect(rect, 'tl', { col: 0, row: 0 })).toEqual({
      col: 0,
      row: 0,
      colSpan: 2,
      rowSpan: 2,
    })
  })

  it('never inverts or drops below one cell', () => {
    expect(resizeRect(rect, 'br', { col: 0, row: 0 })).toEqual(rect)
    expect(
      resizeRect({ col: 0, row: 0, colSpan: 2, rowSpan: 2 }, 'tl', { col: 2, row: 5 })
    ).toEqual({
      col: 1,
      row: 1,
      colSpan: 1,
      rowSpan: 1,
    })
  })
})

describe('drop previews (V22)', () => {
  const blocks = [imageBlock('a', 0, 0), imageBlock('b', 1, 0), imageBlock('c', 0, 1)]

  it('marks a free target valid and an occupied one invalid', () => {
    expect(movePreview(blocks, ['a'], 2, 0)).toEqual({
      rects: [{ col: 2, row: 0, colSpan: 1, rowSpan: 1 }],
      valid: true,
    })
    expect(movePreview(blocks, ['a'], 0, 1).valid).toBe(false)
    expect(movePreview(blocks, ['a', 'b'], 2, 0).valid).toBe(false)
  })

  it('checks a resize against the other blocks', () => {
    expect(resizePreview(blocks, 'b', { col: 1, row: 0, colSpan: 2, rowSpan: 2 }).valid).toBe(true)
    expect(resizePreview(blocks, 'a', { col: 0, row: 0, colSpan: 1, rowSpan: 2 }).valid).toBe(false)
  })
})

describe('selection helpers (V23)', () => {
  const pitch = { width: 100, height: 100 }
  const blocks = [
    imageBlock('a', 0, 0),
    imageBlock('b', 1, 0, 2, 1),
    imageBlock('c', 0, 1),
    imageBlock('d', 2, 2),
  ]

  it('selects blocks a marquee touches', () => {
    expect(blocksInMarquee(blocks, { x: 150, y: 20 }, { x: 20, y: 150 }, pitch)).toEqual([
      'a',
      'b',
      'c',
    ])
    expect(blocksInMarquee(blocks, { x: 110, y: 110 }, { x: 190, y: 190 }, pitch)).toEqual([])
  })

  it('ranges in reading order, either direction', () => {
    expect(rangeBetween(blocks, 'a', 'c')).toEqual(['a', 'b', 'c'])
    expect(rangeBetween(blocks, 'd', 'b')).toEqual(['b', 'c', 'd'])
    expect(rangeBetween(blocks, 'zz', 'b')).toEqual(['b'])
  })
})
