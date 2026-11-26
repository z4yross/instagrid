import { describe, expect, it } from 'vitest'
import { placeInBlock, placeInExportCell } from '@/core/geometry'
import type { ImagePlacement } from '@/core/geometry'
import { split } from '@/core/joinSplit'
import { colorBlock, idSource, imageBlock } from '@/core/testing'
import { EXPORT_BAR_W, EXPORT_CELL_W, EXPORT_H } from '@/core/types'
import type { Transform } from '@/core/types'
import { archiveName } from './exportGrid'
import { planExport } from './plan'
import { drawPlacement } from './render'

const sizes = (imageId: string) =>
  imageId === 'small' ? { width: 800, height: 800 } : { width: 4000, height: 3000 }

describe('export plan (V9, V41)', () => {
  it('lists image cells in posting order with padded file names', () => {
    const blocks = [imageBlock('a', 0, 0, 2, 1), colorBlock('c', 2, 0), imageBlock('b', 0, 1)]
    const plan = planExport(blocks, sizes)
    expect(plan.map((i) => [i.fileName, i.block.id, i.cellCol, i.cellRow])).toEqual([
      ['01.jpg', 'b', 0, 0],
      ['02.jpg', 'a', 1, 0],
      ['03.jpg', 'a', 0, 0],
    ])
  })

  it('flags low-resolution items', () => {
    const blocks = [imageBlock('a', 0, 0, 1, 1, { imageId: 'small' }), imageBlock('b', 1, 0)]
    expect(planExport(blocks, sizes).map((i) => i.lowRes)).toEqual([false, true])
  })

  it('exports nothing for a grid without photos', () => {
    expect(planExport([colorBlock('c', 0, 0)], sizes)).toEqual([])
  })
})

describe('archive name', () => {
  it('makes a safe file name from the project name', () => {
    expect(archiveName('Summer feed 2026')).toBe('summer-feed-2026.zip')
    expect(archiveName('  ¿Qué? / tal  ')).toBe('que-tal.zip')
    expect(archiveName('***')).toBe('instagrid.zip')
  })
})

/*
 * Export parity (SPEC V4). A recording 2D context applies the same transform
 * calls a real canvas would, so the corners of the drawn image can be compared
 * between the screen size and the export size, through the real drawing code.
 */
type Matrix = [number, number, number, number, number, number]

function recordingContext() {
  let m: Matrix = [1, 0, 0, 1, 0, 0]
  const stack: Matrix[] = []
  const corners: [number, number][] = []
  const mul = (a: Matrix, b: Matrix): Matrix => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]
  const point = (x: number, y: number): [number, number] => [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5],
  ]
  const ctx = {
    save: () => stack.push(m),
    restore: () => {
      m = stack.pop() ?? m
    },
    translate: (x: number, y: number) => {
      m = mul(m, [1, 0, 0, 1, x, y])
    },
    rotate: (r: number) => {
      m = mul(m, [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0])
    },
    scale: (x: number, y: number) => {
      m = mul(m, [x, 0, 0, y, 0, 0])
    },
    drawImage: (_img: unknown, x: number, y: number, w: number, h: number) => {
      corners.push(point(x, y), point(x + w, y), point(x + w, y + h), point(x, y + h))
    },
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, corners }
}

function drawnCorners(p: ImagePlacement) {
  const { ctx, corners } = recordingContext()
  drawPlacement(ctx, {} as CanvasImageSource, p)
  return corners
}

describe('export matches the screen, through the drawing code (V4)', () => {
  const screenCell = { width: 144, height: 192 }
  const k = EXPORT_H / screenCell.height
  const image = { width: 4000, height: 3000 }
  const transforms: Transform[] = [
    { panX: 0, panY: 0, zoom: 1, rotation: 0, flipX: false, flipY: false },
    { panX: 0.12, panY: -0.2, zoom: 1.6, rotation: 90, flipX: true, flipY: false },
    { panX: -0.3, panY: 0.05, zoom: 0.6, rotation: 180, flipX: false, flipY: true },
    { panX: 0.01, panY: 0.4, zoom: 2.4, rotation: 270, flipX: true, flipY: true },
  ]

  it.each(transforms)('pan $panX,$panY zoom $zoom rot $rotation', (transform) => {
    const block = imageBlock('a', 0, 0, 3, 2, { transform })
    const screen = drawnCorners(placeInBlock(block, image, screenCell))
    for (let r = 0; r < block.rowSpan; r++) {
      for (let c = 0; c < block.colSpan; c++) {
        const exported = drawnCorners(placeInExportCell(block, image, c, r))
        exported.forEach(([x, y], i) => {
          // Export pixel -> position inside the cell's visible area -> screen pixel.
          expect((x - EXPORT_BAR_W) / k + c * screenCell.width).toBeCloseTo(screen[i][0], 6)
          expect(y / k + r * screenCell.height).toBeCloseTo(screen[i][1], 6)
        })
      }
    }
  })

  it('holds for the pieces of a split block', () => {
    const whole = imageBlock('a', 0, 0, 2, 2, { transform: transforms[1] })
    const pieces = split([whole], 'a', idSource())
    if (!pieces.ok) throw new Error('split failed')
    const screen = drawnCorners(placeInBlock(whole, image, screenCell))
    for (const piece of pieces.value.blocks) {
      const exported = drawnCorners(placeInExportCell(piece, image, 0, 0))
      exported.forEach(([x, y], i) => {
        expect((x - EXPORT_BAR_W) / k + piece.col * screenCell.width).toBeCloseTo(screen[i][0], 6)
        expect(y / k + piece.row * screenCell.height).toBeCloseTo(screen[i][1], 6)
      })
    }
  })

  it('keeps the visible 3:4 area centered in the 4:5 post', () => {
    expect(EXPORT_BAR_W).toBeCloseTo(33.75)
    expect(EXPORT_CELL_W / EXPORT_H).toBeCloseTo(0.75)
  })
})
