import { describe, expect, it } from 'vitest'
import { cellKey, exportFileName, numberedCells, orderLabel, uploadNumbers } from './numbering'
import { colorBlock, imageBlock } from './testing'

describe('upload order (V9)', () => {
  it('runs right to left, bottom to top', () => {
    const blocks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) =>
      imageBlock(id, i % 3, i < 3 ? 0 : 1)
    )
    const n = uploadNumbers(blocks)
    expect(n.get(cellKey(2, 1))).toBe(1)
    expect(n.get(cellKey(1, 1))).toBe(2)
    expect(n.get(cellKey(0, 1))).toBe(3)
    expect(n.get(cellKey(2, 0))).toBe(4)
    expect(n.get(cellKey(0, 0))).toBe(6)
  })

  it('numbers every cell of a multi-cell image', () => {
    const blocks = [imageBlock('a', 0, 0, 2, 2), imageBlock('b', 2, 0), imageBlock('c', 2, 1)]
    const n = uploadNumbers(blocks)
    expect(n.get(cellKey(2, 1))).toBe(1)
    expect(n.get(cellKey(1, 1))).toBe(2)
    expect(n.get(cellKey(0, 1))).toBe(3)
    expect(n.get(cellKey(2, 0))).toBe(4)
    expect(n.get(cellKey(1, 0))).toBe(5)
    expect(n.get(cellKey(0, 0))).toBe(6)
  })

  it('skips color cells and empty cells', () => {
    const blocks = [imageBlock('a', 0, 0), colorBlock('b', 1, 0), imageBlock('c', 0, 1)]
    const cells = numberedCells(blocks)
    expect(cells.map((c) => [c.col, c.row, c.number])).toEqual([
      [0, 1, 1],
      [0, 0, 2],
    ])
    expect(uploadNumbers(blocks).has(cellKey(1, 0))).toBe(false)
  })

  it('is empty for an empty grid', () => {
    expect(numberedCells([])).toEqual([])
  })
})

describe('labels (V38, V41)', () => {
  it('pads to two digits', () => {
    expect(orderLabel(3)).toBe('03')
    expect(orderLabel(12)).toBe('12')
    expect(exportFileName(3)).toBe('03.jpg')
  })

  it('pads to the width of the largest number', () => {
    expect(exportFileName(7, 120)).toBe('007.jpg')
  })
})
