import { blockAt, contentRows } from './grid'
import { COLS } from './types'
import type { Block } from './types'

export const cellKey = (col: number, row: number) => `${col},${row}`

export interface NumberedCell {
  col: number
  row: number
  number: number
  blockId: string
}

/**
 * SPEC V9: Instagram upload order. The newest post lands top-left, so posting
 * starts at the bottom row and runs right to left, then up. Only cells that
 * hold image content get a number; color cells and empty cells are skipped.
 */
export function numberedCells(blocks: readonly Block[]): NumberedCell[] {
  const cells: NumberedCell[] = []
  for (let row = contentRows(blocks) - 1; row >= 0; row--) {
    for (let col = COLS - 1; col >= 0; col--) {
      const block = blockAt(blocks, col, row)
      if (block?.kind === 'image') {
        cells.push({ col, row, number: cells.length + 1, blockId: block.id })
      }
    }
  }
  return cells
}

/** Upload number per cell, keyed by `cellKey(col, row)`. */
export function uploadNumbers(blocks: readonly Block[]): Map<string, number> {
  return new Map(numberedCells(blocks).map((c) => [cellKey(c.col, c.row), c.number]))
}

/** File name of an exported cell: zero-padded to at least two digits (SPEC V41). */
export function exportFileName(n: number, total = n): string {
  const width = Math.max(2, String(total).length)
  return `${String(n).padStart(width, '0')}.jpg`
}

/** Two-digit label shown on the order chip (SPEC V38). */
export const orderLabel = (n: number) => String(n).padStart(2, '0')
