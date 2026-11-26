import { describe, expect, it } from 'vitest'
import {
  applyMatrix,
  clampRecipe,
  constrainRecipe,
  coversWedge,
  defaultRecipe,
  foldPoint,
  isSymmetryRecipe,
  patternName,
  sourcePlacement,
  toRadians,
  wedgeAngle,
  wedgeCount,
  wedgeMatrix,
  wedgeRegion,
  wedgeSteps,
} from './symmetry'
import type { Matrix2 } from './symmetry'

const AXES = [1, 2, 3, 4, 5, 6, 8, 12]
const ANGLES = [0, 30, 90, 137]
const POINTS: [number, number][] = [
  [10, 0],
  [3, 7],
  [-5, 2],
  [-4, -9],
  [6, -1],
  [0.5, 12],
  [-11, -0.25],
]

const inverse = (m: Matrix2): Matrix2 => {
  const det = m[0] * m[3] - m[2] * m[1]
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det]
}

/** Angle of a point measured from the first mirror line, in [0, 2π). */
const localAngle = (x: number, y: number, axisAngle: number) => {
  const full = Math.PI * 2
  return (((Math.atan2(y, x) - toRadians(axisAngle)) % full) + full) % full
}

describe('wedges (V50)', () => {
  it('cuts the plane into two wedges per mirror line', () => {
    expect(wedgeCount(1)).toBe(2)
    expect(wedgeCount(6)).toBe(12)
    expect(wedgeAngle(1)).toBeCloseTo(Math.PI)
    expect(wedgeAngle(4)).toBeCloseTo(Math.PI / 4)
    expect(wedgeSteps(3)).toHaveLength(6)
  })

  it('leaves the first wedge untouched: it shows the photo itself', () => {
    for (const axisAngle of ANGLES) {
      const m = wedgeMatrix(wedgeSteps(5)[0], axisAngle)
      expect(m[0]).toBeCloseTo(1)
      expect(m[1]).toBeCloseTo(0)
      expect(m[2]).toBeCloseTo(0)
      expect(m[3]).toBeCloseTo(1)
    }
  })

  it('alternates plain and mirrored wedges', () => {
    const dets = wedgeSteps(4).map((step) => {
      const m = wedgeMatrix(step, 20)
      return Math.round(m[0] * m[3] - m[2] * m[1])
    })
    expect(dets).toEqual([1, -1, 1, -1, 1, -1, 1, -1])
  })

  it('tiles the whole plane, each wedge landing on its own slice', () => {
    for (const axes of AXES) {
      const w = wedgeAngle(axes)
      const mid = w / 2
      const seen = new Set<number>()
      for (const step of wedgeSteps(axes)) {
        // A point in the middle of the first wedge, carried to this wedge.
        const [x, y] = applyMatrix(wedgeMatrix(step, 0), Math.cos(mid), Math.sin(mid))
        seen.add(Math.floor(localAngle(x, y, 0) / w))
      }
      expect(seen.size).toBe(axes * 2)
    }
  })
})

describe('the drawing agrees with the definition (V50)', () => {
  it.each(AXES)('every output point shows the folded point, with %i lines', (axes) => {
    const w = wedgeAngle(axes)
    for (const axisAngle of ANGLES) {
      const steps = wedgeSteps(axes)
      for (const [x, y] of POINTS) {
        const expected = foldPoint(x, y, axes, axisAngle)
        // The wedge that covers this point is the one whose inverse lands in the first wedge.
        const candidates = steps
          .map((step) => applyMatrix(inverse(wedgeMatrix(step, axisAngle)), x, y))
          .filter(([qx, qy]) => {
            const a = localAngle(qx, qy, axisAngle)
            return a <= w + 1e-9 || a >= Math.PI * 2 - 1e-9
          })
        expect(candidates.length).toBeGreaterThanOrEqual(1)
        expect(candidates[0][0]).toBeCloseTo(expected[0], 8)
        expect(candidates[0][1]).toBeCloseTo(expected[1], 8)
      }
    }
  })

  it('is symmetric across every mirror line', () => {
    for (const axes of AXES) {
      const w = wedgeAngle(axes)
      for (const [x, y] of POINTS) {
        const a = foldPoint(x, y, axes, 30)
        for (let line = 0; line < axes; line++) {
          // Reflect the point across mirror line number `line`.
          const lineAngle = toRadians(30) + line * w
          const cos = Math.cos(2 * lineAngle)
          const sin = Math.sin(2 * lineAngle)
          const b = foldPoint(cos * x + sin * y, sin * x - cos * y, axes, 30)
          expect(b[0]).toBeCloseTo(a[0], 8)
          expect(b[1]).toBeCloseTo(a[1], 8)
        }
      }
    }
  })

  it('a single vertical line mirrors left and right', () => {
    // First wedge of a vertical line (90°) is the left half in canvas coordinates.
    expect(foldPoint(-4, 3, 1, 90)[0]).toBeCloseTo(-4)
    expect(foldPoint(4, 3, 1, 90)[0]).toBeCloseTo(-4)
    expect(foldPoint(4, 3, 1, 90)[1]).toBeCloseTo(3)
  })

  it('two lines give four quadrants', () => {
    const base = foldPoint(-2, -5, 2, 90)
    for (const [x, y] of [
      [2, -5],
      [-2, 5],
      [2, 5],
    ]) {
      const p = foldPoint(x, y, 2, 90)
      expect(p[0]).toBeCloseTo(base[0])
      expect(p[1]).toBeCloseTo(base[1])
    }
  })

  it('keeps the center', () => {
    expect(foldPoint(0, 0, 7, 12)).toEqual([0, 0])
  })
})

describe('recipes (V53)', () => {
  it('starts as a vertical mirror over two cells', () => {
    expect(defaultRecipe('img')).toMatchObject({
      axes: 1,
      axisAngle: 90,
      cols: 2,
      rows: 1,
      zoom: 1,
    })
  })

  it('clamps and repairs values', () => {
    const fixed = clampRecipe({
      sourceImageId: 'img',
      axes: 40.6,
      axisAngle: -90,
      cols: 9,
      rows: 0,
      panX: 50,
      panY: Number.NaN,
      zoom: 0,
      rotation: 725,
    })
    expect(fixed).toEqual({
      sourceImageId: 'img',
      axes: 12,
      axisAngle: 270,
      cols: 3,
      rows: 1,
      panX: 2,
      panY: 0,
      zoom: 0.2,
      rotation: 5,
    })
  })

  it('recognises a stored recipe and rejects anything else', () => {
    expect(isSymmetryRecipe(defaultRecipe('img'))).toBe(true)
    expect(isSymmetryRecipe({ ...defaultRecipe('img'), axes: '3' })).toBe(false)
    expect(isSymmetryRecipe({ sourceImageId: 'img' })).toBe(false)
    expect(isSymmetryRecipe(null)).toBe(false)
  })

  it('places the photo to cover the output, then applies zoom and offset', () => {
    const output = { width: 2160, height: 1440 }
    const image = { width: 1000, height: 1000 }
    const fill = sourcePlacement(defaultRecipe('img'), output, image)
    expect(fill).toMatchObject({ cx: 0, cy: 0, width: 2160, height: 2160, rotation: 0 })
    const moved = sourcePlacement(
      { ...defaultRecipe('img'), zoom: 2, panX: 0.25, panY: -0.5, rotation: 90 },
      output,
      image
    )
    expect(moved).toMatchObject({ cx: 540, cy: -720, width: 4320, height: 4320 })
    expect(moved.rotation).toBeCloseTo(Math.PI / 2)
  })

  it('names the pattern', () => {
    expect(patternName(1)).toBe('Mirror')
    expect(patternName(2)).toBe('Four-way mirror')
    expect(patternName(6)).toBe('Kaleidoscope 6')
  })
})

describe('the photo always covers its wedge (V54)', () => {
  const image = { width: 1200, height: 1500 }
  const outputOf = (r: { cols: number; rows: number }) => ({
    width: r.cols * 1080,
    height: r.rows * 1440,
  })
  const base = defaultRecipe('img')

  it('finds the part of the output that shows the photo', () => {
    // One vertical line over a 2160×1440 output: the first wedge is the left half.
    const region = wedgeRegion(base, outputOf(base))
    const xs = region.map((p) => p[0])
    const ys = region.map((p) => p[1])
    expect(Math.min(...xs)).toBeCloseTo(-1080)
    expect(Math.max(...xs)).toBeCloseTo(0)
    expect(Math.min(...ys)).toBeCloseTo(-720)
    expect(Math.max(...ys)).toBeCloseTo(720)
    // Four lines leave a 45° wedge: a triangle.
    expect(wedgeRegion({ axes: 4, axisAngle: 0 }, { width: 100, height: 100 })).toHaveLength(3)
  })

  it('starts covered, and reports a gap when the photo is pulled away', () => {
    expect(coversWedge(base, outputOf(base), image)).toBe(true)
    expect(coversWedge({ ...base, panX: 0.3 }, outputOf(base), image)).toBe(false)
    // Moving the photo into the mirrored half is fine: only the first wedge must be covered.
    expect(coversWedge({ ...base, panX: -0.2 }, outputOf(base), image)).toBe(true)
  })

  it('accepts a change that keeps the wedge covered, untouched', () => {
    const next = { ...base, panX: -0.1, panY: 0.05 }
    expect(constrainRecipe(base, next, outputOf, image)).toEqual(next)
  })

  it('stops a move at the edge of the photo and lets it slide along it', () => {
    const next = { ...base, panX: 0.4, panY: -0.1 }
    const result = constrainRecipe(base, next, outputOf, image)
    expect(coversWedge(result, outputOf(result), image)).toBe(true)
    expect(result.panX).toBeLessThan(0.01)
    expect(result.panX).toBeGreaterThanOrEqual(0)
    // The vertical part of the move is kept.
    expect(result.panY).toBeCloseTo(-0.1)
    expect(result.zoom).toBe(base.zoom)
  })

  it('zooms in just enough when zooming out would open a gap', () => {
    const result = constrainRecipe(base, { ...base, zoom: 0.5 }, outputOf, image)
    expect(coversWedge(result, outputOf(result), image)).toBe(true)
    expect(result.zoom).toBeGreaterThan(0.5)
    expect(result.zoom).toBeLessThanOrEqual(1.001)
    // A hair less would no longer cover.
    expect(coversWedge({ ...result, zoom: result.zoom * 0.98 }, outputOf(result), image)).toBe(
      false
    )
  })

  it('zooms in when a turn or a bigger result would open a gap', () => {
    const turned = constrainRecipe(base, { ...base, rotation: 30 }, outputOf, image)
    expect(coversWedge(turned, outputOf(turned), image)).toBe(true)
    expect(turned.rotation).toBe(30)
    expect(turned.zoom).toBeGreaterThan(1)

    const moved = { ...base, panX: -0.3 }
    const taller = constrainRecipe(moved, { ...moved, rows: 4 }, outputOf, image)
    expect(coversWedge(taller, outputOf(taller), image)).toBe(true)
    expect(taller.rows).toBe(4)
  })

  /** Independent check: every point of the output shows a point that lies on the photo. */
  const noEmptyArea = (r: ReturnType<typeof defaultRecipe>) => {
    const output = outputOf(r)
    const place = sourcePlacement(r, output, image)
    const cos = Math.cos(-place.rotation)
    const sin = Math.sin(-place.rotation)
    for (let iy = 0; iy <= 24; iy++) {
      for (let ix = 0; ix <= 24; ix++) {
        const x = (ix / 24 - 0.5) * output.width
        const y = (iy / 24 - 0.5) * output.height
        const [fx, fy] = foldPoint(x, y, r.axes, r.axisAngle)
        const dx = fx - place.cx
        const dy = fy - place.cy
        if (Math.abs(dx * cos - dy * sin) > place.width / 2 + 1) return false
        if (Math.abs(dx * sin + dy * cos) > place.height / 2 + 1) return false
      }
    }
    return true
  }

  it('covers the corners of the output, which reach farther than its sides', () => {
    // Eight lines over a 2×2 result: the corners fold back beyond the first wedge's own slice.
    const wide = { ...base, axes: 8, rows: 2 }
    expect(noEmptyArea(wide)).toBe(false)
    expect(coversWedge(wide, outputOf(wide), image)).toBe(false)
    const fixed = constrainRecipe(base, wide, outputOf, image)
    expect(fixed.zoom).toBeGreaterThan(1)
    expect(noEmptyArea(fixed)).toBe(true)
  })

  it('agrees with a point-by-point check of the whole output', () => {
    for (const axes of AXES) {
      for (const rows of [1, 2, 4]) {
        for (const tweak of [
          {},
          { panX: 0.6, panY: -0.4 },
          { rotation: 41, axisAngle: 23 },
          { zoom: 0.3 },
        ]) {
          const start = constrainRecipe(base, { ...base, axes, rows }, outputOf, image)
          const result = constrainRecipe(start, { ...start, ...tweak }, outputOf, image)
          expect(noEmptyArea(result)).toBe(true)
        }
      }
    }
  })

  it('holds for every number of lines after an arbitrary change', () => {
    for (const axes of AXES) {
      const start = constrainRecipe(base, { ...base, axes }, outputOf, image)
      expect(coversWedge(start, outputOf(start), image)).toBe(true)
      const pushed = constrainRecipe(
        start,
        { ...start, panX: start.panX + 0.7, panY: start.panY - 0.6 },
        outputOf,
        image
      )
      expect(coversWedge(pushed, outputOf(pushed), image)).toBe(true)
      const spun = constrainRecipe(
        pushed,
        { ...pushed, rotation: 73, axisAngle: 17 },
        outputOf,
        image
      )
      expect(coversWedge(spun, outputOf(spun), image)).toBe(true)
    }
  })
})
