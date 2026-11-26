import { describe, expect, it } from 'vitest'
import { flipOnScreen, placeInBlock, rotateOnScreen, screenFlips } from './geometry'
import type { ImagePlacement } from './geometry'
import { split } from './joinSplit'
import { idSource, imageBlock } from './testing'
import { IDENTITY_TRANSFORM } from './types'
import type { Block, Size, Transform } from './types'

const cell = { width: 150, height: 200 }
const image = { width: 4000, height: 3000 }

type Point = [number, number]

/** Where a point of the photo (in its own pixels, from its center) lands inside the block. */
function toScreen(p: ImagePlacement, image: Size, u: number, v: number): Point {
  const scale = p.width / image.width
  const x = u * scale * (p.flipX ? -1 : 1)
  const y = v * scale * (p.flipY ? -1 : 1)
  const r = (p.rotation * Math.PI) / 180
  return [p.cx + x * Math.cos(r) - y * Math.sin(r), p.cy + x * Math.sin(r) + y * Math.cos(r)]
}

/** The point of the photo that sits at a given spot of the block. */
function photoPointAt(p: ImagePlacement, image: Size, sx: number, sy: number): Point {
  const scale = p.width / image.width
  const r = (-p.rotation * Math.PI) / 180
  const dx = sx - p.cx
  const dy = sy - p.cy
  const x = dx * Math.cos(r) - dy * Math.sin(r)
  const y = dx * Math.sin(r) + dy * Math.cos(r)
  return [(x * (p.flipX ? -1 : 1)) / scale, (y * (p.flipY ? -1 : 1)) / scale]
}

const blockSize = (b: Block) => ({ width: b.colSpan * cell.width, height: b.rowSpan * cell.height })
const withTransform = (b: Block, transform: Transform): Block => ({ ...b, transform })

const moved: Transform = { ...IDENTITY_TRANSFORM, panX: 0.2, panY: -0.15, zoom: 1.5 }
const samples: Point[] = [
  [0, 0],
  [700, -300],
  [-1200, 900],
]

describe('flip keeps what is framed (owner feedback, V21)', () => {
  const rotations = [0, 90, 180, 270] as const

  it.each(rotations)(
    'mirrors left-right across the middle of the block at %i degrees',
    (rotation) => {
      const block = imageBlock('a', 0, 0, 2, 1, { transform: { ...moved, rotation } })
      const flipped = withTransform(block, flipOnScreen(block, 'horizontal'))
      const before = placeInBlock(block, image, cell)
      const after = placeInBlock(flipped, image, cell)
      const width = blockSize(block).width
      for (const [u, v] of samples) {
        const [x, y] = toScreen(before, image, u, v)
        const [fx, fy] = toScreen(after, image, u, v)
        expect(fx).toBeCloseTo(width - x, 6)
        expect(fy).toBeCloseTo(y, 6)
      }
    }
  )

  it.each(rotations)(
    'mirrors top-bottom across the middle of the block at %i degrees',
    (rotation) => {
      const block = imageBlock('a', 0, 0, 1, 2, { transform: { ...moved, rotation } })
      const flipped = withTransform(block, flipOnScreen(block, 'vertical'))
      const before = placeInBlock(block, image, cell)
      const after = placeInBlock(flipped, image, cell)
      const height = blockSize(block).height
      for (const [u, v] of samples) {
        const [x, y] = toScreen(before, image, u, v)
        const [fx, fy] = toScreen(after, image, u, v)
        expect(fx).toBeCloseTo(x, 6)
        expect(fy).toBeCloseTo(height - y, 6)
      }
    }
  )

  it('does not move a photo that was never moved', () => {
    const block = imageBlock('a', 0, 0)
    expect(flipOnScreen(block, 'horizontal')).toEqual({ ...IDENTITY_TRANSFORM, flipX: true })
  })

  it('undoes itself', () => {
    const block = imageBlock('a', 0, 0, 2, 2, { transform: { ...moved, rotation: 90 } })
    const once = withTransform(block, flipOnScreen(block, 'horizontal'))
    const twice = flipOnScreen(once, 'horizontal')
    expect(twice.panX).toBeCloseTo(block.transform.panX)
    expect(twice.panY).toBeCloseTo(block.transform.panY)
    expect(twice).toMatchObject({ flipX: false, flipY: false, rotation: 90 })
  })

  it('reports the mirror as seen on screen, whatever the rotation', () => {
    const upright = imageBlock('a', 0, 0)
    expect(screenFlips(flipOnScreen(upright, 'horizontal'))).toEqual({
      horizontal: true,
      vertical: false,
    })
    const turned = imageBlock('a', 0, 0, 1, 1, {
      transform: { ...IDENTITY_TRANSFORM, rotation: 90 },
    })
    const flipped = flipOnScreen(turned, 'horizontal')
    expect(flipped).toMatchObject({ flipX: false, flipY: true })
    expect(screenFlips(flipped)).toEqual({ horizontal: true, vertical: false })
  })

  it('mirrors a split piece across its own middle, not the middle of the whole photo', () => {
    const whole = imageBlock('a', 0, 0, 3, 1, { transform: moved })
    const pieces = split([whole], 'a', idSource())
    if (!pieces.ok) throw new Error('split failed')
    const piece = pieces.value.blocks[2]
    const flipped = withTransform(piece, flipOnScreen(piece, 'horizontal'))
    const before = placeInBlock(piece, image, cell)
    const after = placeInBlock(flipped, image, cell)
    for (const [u, v] of samples) {
      const [x] = toScreen(before, image, u, v)
      const [fx] = toScreen(after, image, u, v)
      expect(fx).toBeCloseTo(cell.width - x, 6)
    }
  })
})

describe('rotate keeps the middle of the frame (V21)', () => {
  it.each([90, -90] as const)('keeps the centered point centered when turning %i', (degrees) => {
    const block = imageBlock('a', 0, 0, 2, 1, { transform: moved })
    const turned = withTransform(block, rotateOnScreen(block, image, degrees))
    const { width, height } = blockSize(block)
    const before = photoPointAt(placeInBlock(block, image, cell), image, width / 2, height / 2)
    const after = photoPointAt(placeInBlock(turned, image, cell), image, width / 2, height / 2)
    expect(after[0]).toBeCloseTo(before[0], 4)
    expect(after[1]).toBeCloseTo(before[1], 4)
    expect(turned.transform.rotation).toBe(degrees === 90 ? 90 : 270)
    expect(turned.transform.zoom).toBe(moved.zoom)
  })

  it('does not move a photo that was never moved', () => {
    const block = imageBlock('a', 0, 0)
    expect(rotateOnScreen(block, image, 90)).toEqual({ ...IDENTITY_TRANSFORM, rotation: 90 })
  })

  it('comes back to the start after four turns', () => {
    let block = imageBlock('a', 0, 0, 2, 2, { transform: { ...moved, flipX: true } })
    const start = block.transform
    for (let i = 0; i < 4; i++) block = withTransform(block, rotateOnScreen(block, image, 90))
    expect(block.transform.rotation).toBe(0)
    expect(block.transform.panX).toBeCloseTo(start.panX)
    expect(block.transform.panY).toBeCloseTo(start.panY)
    expect(block.transform).toMatchObject({ zoom: start.zoom, flipX: true, flipY: false })
  })

  it('left then right is where it started', () => {
    const block = imageBlock('a', 0, 0, 1, 2, { transform: moved })
    const left = withTransform(block, rotateOnScreen(block, image, -90))
    const back = rotateOnScreen(left, image, 90)
    expect(back.panX).toBeCloseTo(moved.panX)
    expect(back.panY).toBeCloseTo(moved.panY)
    expect(back.rotation).toBe(0)
  })
})
