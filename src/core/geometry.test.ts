import { describe, expect, it } from 'vitest'
import {
  clampTransform,
  containScale,
  coverScale,
  exportUpscale,
  fitZoom,
  isLowRes,
  placeImage,
  placeInBlock,
  placeInExportCell,
} from './geometry'
import { split } from './joinSplit'
import { idSource, imageBlock } from './testing'
import {
  EXPORT_BAR_W,
  EXPORT_CELL_W,
  EXPORT_H,
  EXPORT_W,
  IDENTITY_TRANSFORM,
  MAX_ZOOM,
  MIN_ZOOM,
} from './types'
import type { Transform } from './types'

const frame = { width: 300, height: 400 }

describe('fit scales', () => {
  it('covers and contains', () => {
    expect(coverScale(frame, { width: 1600, height: 800 }, 0)).toBe(0.5)
    expect(containScale(frame, { width: 1600, height: 800 }, 0)).toBe(0.1875)
    expect(fitZoom(frame, { width: 1600, height: 800 }, 0)).toBe(0.375)
  })

  it('swaps the image sides on quarter turns', () => {
    expect(coverScale(frame, { width: 800, height: 600 }, 90)).toBe(0.5)
    expect(coverScale(frame, { width: 800, height: 600 }, 270)).toBe(0.5)
    expect(coverScale(frame, { width: 800, height: 600 }, 180)).toBeCloseTo(400 / 600)
  })
})

describe('placeImage (V3, V4)', () => {
  it('centers a same-ratio image and fills the frame', () => {
    expect(placeImage(frame, { width: 600, height: 800 }, IDENTITY_TRANSFORM)).toEqual({
      cx: 150,
      cy: 200,
      width: 300,
      height: 400,
      rotation: 0,
      flipX: false,
      flipY: false,
    })
  })

  it('applies pan as a fraction of the frame and zoom as a multiplier', () => {
    const t: Transform = { ...IDENTITY_TRANSFORM, panX: 0.1, panY: -0.25, zoom: 2 }
    const p = placeImage(frame, { width: 600, height: 800 }, t)
    expect(p).toMatchObject({ cx: 180, cy: 100, width: 600, height: 800 })
  })

  it('reports the unrotated draw size on quarter turns', () => {
    const t: Transform = { ...IDENTITY_TRANSFORM, rotation: 90 }
    expect(placeImage(frame, { width: 800, height: 600 }, t)).toMatchObject({
      width: 400,
      height: 300,
      rotation: 90,
    })
  })

  it('is the same picture at any frame size', () => {
    const t: Transform = {
      panX: 0.2,
      panY: 0.1,
      zoom: 1.7,
      rotation: 270,
      flipX: true,
      flipY: false,
    }
    const image = { width: 1234, height: 987 }
    const small = placeImage(frame, image, t)
    const big = placeImage({ width: 3000, height: 4000 }, image, t)
    expect(big.cx / 10).toBeCloseTo(small.cx)
    expect(big.cy / 10).toBeCloseTo(small.cy)
    expect(big.width / 10).toBeCloseTo(small.width)
    expect(big.height / 10).toBeCloseTo(small.height)
  })
})

describe('split pieces show their slice (V5, V6)', () => {
  it('places a piece exactly where the whole block had that cell', () => {
    const cell = { width: 150, height: 200 }
    const image = { width: 2000, height: 1500 }
    const whole = imageBlock('a', 0, 0, 3, 2, {
      transform: { ...IDENTITY_TRANSFORM, panX: 0.05, zoom: 1.2 },
    })
    const result = split([whole], 'a', idSource())
    if (!result.ok) throw new Error('split failed')
    const before = placeInBlock(whole, image, cell)
    for (const piece of result.value.blocks) {
      const p = placeInBlock(piece, image, cell)
      // Same absolute position on the grid, before and after the split.
      expect(piece.col * cell.width + p.cx).toBeCloseTo(before.cx)
      expect(piece.row * cell.height + p.cy).toBeCloseTo(before.cy)
      expect(p.width).toBeCloseTo(before.width)
      expect(p.height).toBeCloseTo(before.height)
    }
  })
})

describe('export matches the screen (V4, V41, V42)', () => {
  it('uses the 3:4 center of a 1080×1350 post', () => {
    expect(EXPORT_CELL_W).toBe(1012.5)
    expect(EXPORT_BAR_W * 2 + EXPORT_CELL_W).toBe(EXPORT_W)
  })

  it('draws each cell of a block as the screen shows it', () => {
    const screenCell = { width: 150, height: 200 }
    const k = EXPORT_H / screenCell.height
    const image = { width: 3000, height: 2000 }
    const block = imageBlock('a', 0, 0, 2, 2, {
      transform: { panX: -0.1, panY: 0.15, zoom: 1.3, rotation: 90, flipX: false, flipY: true },
    })
    const onScreen = placeInBlock(block, image, screenCell)
    for (const [c, r] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ]) {
      const p = placeInExportCell(block, image, c, r)
      // Position inside the cell's visible area, converted back to screen pixels.
      expect((p.cx - EXPORT_BAR_W) / k).toBeCloseTo(onScreen.cx - c * screenCell.width)
      expect(p.cy / k).toBeCloseTo(onScreen.cy - r * screenCell.height)
      expect(p.width / k).toBeCloseTo(onScreen.width)
      expect(p.height / k).toBeCloseTo(onScreen.height)
      expect(p).toMatchObject({ rotation: 90, flipX: false, flipY: true })
    }
  })
})

describe('low resolution (V44)', () => {
  it('flags an image the export has to stretch', () => {
    const block = imageBlock('a', 0, 0)
    expect(exportUpscale(block, { width: 1000, height: 1000 })).toBeCloseTo(1.35)
    expect(isLowRes(block, { width: 1000, height: 1000 })).toBe(true)
  })

  it('passes an image with enough pixels for its block', () => {
    expect(isLowRes(imageBlock('a', 0, 0, 2, 2), { width: 4000, height: 4000 })).toBe(false)
    expect(isLowRes(imageBlock('a', 0, 0), { width: 1080, height: 1350 })).toBe(false)
  })

  it('accounts for zoom', () => {
    const zoomed = imageBlock('a', 0, 0, 1, 1, { transform: { ...IDENTITY_TRANSFORM, zoom: 3 } })
    expect(isLowRes(zoomed, { width: 2000, height: 2700 })).toBe(true)
  })
})

describe('clampTransform', () => {
  const image = { width: 600, height: 800 }

  it('keeps zoom in range', () => {
    expect(clampTransform(frame, image, { ...IDENTITY_TRANSFORM, zoom: 99 }).zoom).toBe(MAX_ZOOM)
    expect(clampTransform(frame, image, { ...IDENTITY_TRANSFORM, zoom: 0 }).zoom).toBe(MIN_ZOOM)
  })

  it('stops the image from leaving the frame entirely', () => {
    const t = clampTransform(frame, image, { ...IDENTITY_TRANSFORM, panX: 5, panY: -5 })
    // Same-size image: centers may differ by at most 90% of the frame.
    expect(t.panX).toBeCloseTo(0.9)
    expect(t.panY).toBeCloseTo(-0.9)
  })

  it('leaves a transform inside the limits untouched', () => {
    const t: Transform = { ...IDENTITY_TRANSFORM, panX: 0.2, panY: -0.3, zoom: 1.5 }
    expect(clampTransform(frame, image, t)).toEqual(t)
  })
})
