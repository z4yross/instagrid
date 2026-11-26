import type { Size } from './types'

/*
 * Symmetry patterns (SPEC V50-V55). A photo is placed under N mirror lines
 * that all pass through the middle of the output. The lines cut the plane into
 * 2N wedges; one wedge shows the photo and the others show its reflections.
 * One line is a plain mirror, two give four quadrants, more give a
 * kaleidoscope.
 *
 * Angles are in the canvas convention: y points down, positive turns clockwise.
 */

export const MIN_AXES = 1
export const MAX_AXES = 12
export const MAX_COLS = 3
export const MAX_ROWS = 4
export const MIN_SYMMETRY_ZOOM = 0.2
export const MAX_SYMMETRY_ZOOM = 8

/** How a symmetry image was made, kept so it can be opened and changed again. */
export interface SymmetryRecipe {
  /** Library image the pattern is made from. */
  sourceImageId: string
  /** Number of mirror lines through the center. */
  axes: number
  /** Direction of the first mirror line, in degrees. 90 is a vertical line. */
  axisAngle: number
  /** Size of the result, in grid cells. */
  cols: number
  rows: number
  /** Offset of the photo's center from the output center, as a fraction of the output size. */
  panX: number
  panY: number
  /** Multiplier over the scale at which the photo covers the output. */
  zoom: number
  /** Turn of the photo itself, in degrees. */
  rotation: number
}

export function defaultRecipe(sourceImageId: string): SymmetryRecipe {
  return {
    sourceImageId,
    axes: 1,
    axisAngle: 90,
    cols: 2,
    rows: 1,
    panX: 0,
    panY: 0,
    zoom: 1,
    rotation: 0,
  }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const finite = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback
const wrapDegrees = (v: number) => ((v % 360) + 360) % 360

/** Bring a recipe into its valid ranges. Also used on recipes read from storage. */
export function clampRecipe(recipe: SymmetryRecipe): SymmetryRecipe {
  return {
    sourceImageId: recipe.sourceImageId,
    axes: clamp(Math.round(finite(recipe.axes, 1)), MIN_AXES, MAX_AXES),
    axisAngle: wrapDegrees(finite(recipe.axisAngle, 90)),
    cols: clamp(Math.round(finite(recipe.cols, 2)), 1, MAX_COLS),
    rows: clamp(Math.round(finite(recipe.rows, 1)), 1, MAX_ROWS),
    panX: clamp(finite(recipe.panX, 0), -2, 2),
    panY: clamp(finite(recipe.panY, 0), -2, 2),
    zoom: clamp(finite(recipe.zoom, 1), MIN_SYMMETRY_ZOOM, MAX_SYMMETRY_ZOOM),
    rotation: wrapDegrees(finite(recipe.rotation, 0)),
  }
}

export function isSymmetryRecipe(value: unknown): value is SymmetryRecipe {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Record<string, unknown>
  return (
    typeof r.sourceImageId === 'string' &&
    ['axes', 'axisAngle', 'cols', 'rows', 'panX', 'panY', 'zoom', 'rotation'].every(
      (key) => typeof r[key] === 'number' && Number.isFinite(r[key])
    )
  )
}

export const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Angle of one wedge, in radians. */
export const wedgeAngle = (axes: number) => Math.PI / axes

/** Number of wedges the mirror lines cut the plane into. */
export const wedgeCount = (axes: number) => axes * 2

/**
 * How a wedge is drawn, as the steps a 2D canvas applies after moving to the
 * center: rotate(axis), rotate(turn), then mirror across the x axis when
 * `mirrored`, then rotate(-axis). The first wedge (k = 0) is the photo itself.
 */
export interface WedgeStep {
  /** Extra rotation of this wedge, in radians. */
  turn: number
  mirrored: boolean
}

export function wedgeSteps(axes: number): WedgeStep[] {
  const w = wedgeAngle(axes)
  return Array.from({ length: wedgeCount(axes) }, (_, k) => ({
    // Mirrored wedges sit just before the next unmirrored one.
    turn: 2 * w * Math.ceil(k / 2),
    mirrored: k % 2 === 1,
  }))
}

/** 2×2 matrix [a, b, c, d] meaning x' = a·x + c·y, y' = b·x + d·y. */
export type Matrix2 = [number, number, number, number]

const multiply = (m: Matrix2, n: Matrix2): Matrix2 => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
]
const rotation = (angle: number): Matrix2 => [
  Math.cos(angle),
  Math.sin(angle),
  -Math.sin(angle),
  Math.cos(angle),
]
const MIRROR_X: Matrix2 = [1, 0, 0, -1]

/** The transform that carries the first wedge onto wedge `step`. */
export function wedgeMatrix(step: WedgeStep, axisAngle: number): Matrix2 {
  const axis = toRadians(axisAngle)
  let m = multiply(rotation(axis), rotation(step.turn))
  if (step.mirrored) m = multiply(m, MIRROR_X)
  return multiply(m, rotation(-axis))
}

export const applyMatrix = (m: Matrix2, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y,
  m[1] * x + m[3] * y,
]

/**
 * The point of the first wedge that a point of the output shows. Coordinates
 * are relative to the output center. This is the definition the drawing code
 * must agree with.
 */
export function foldPoint(x: number, y: number, axes: number, axisAngle: number): [number, number] {
  const w = wedgeAngle(axes)
  const axis = toRadians(axisAngle)
  const radius = Math.hypot(x, y)
  if (radius === 0) return [0, 0]
  const full = Math.PI * 2
  const local = (((Math.atan2(y, x) - axis) % full) + full) % full
  const within = local % (2 * w)
  const folded = within <= w ? within : 2 * w - within
  return [radius * Math.cos(axis + folded), radius * Math.sin(axis + folded)]
}

/** Where the photo is drawn in the output: center relative to the output center, drawn size, turn. */
export interface SourcePlacement {
  cx: number
  cy: number
  width: number
  height: number
  /** Radians. */
  rotation: number
}

export function sourcePlacement(
  recipe: SymmetryRecipe,
  output: Size,
  image: Size
): SourcePlacement {
  const cover = Math.max(output.width / image.width, output.height / image.height)
  const scale = cover * recipe.zoom
  return {
    cx: recipe.panX * output.width,
    cy: recipe.panY * output.height,
    width: image.width * scale,
    height: image.height * scale,
    rotation: toRadians(recipe.rotation),
  }
}

/** Plain-language name of a pattern, for labels and file names. */
export function patternName(axes: number): string {
  if (axes === 1) return 'Mirror'
  if (axes === 2) return 'Four-way mirror'
  return `Kaleidoscope ${axes}`
}

/* ---------- The photo always covers its wedge (SPEC V54) ---------- */

type Point = [number, number]

/** Keep the part of a convex polygon on the left of the directed line through the origin. */
function clipToSide(polygon: Point[], dx: number, dy: number): Point[] {
  const side = (p: Point) => dx * p[1] - dy * p[0]
  const result: Point[] = []
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const sa = side(a)
    const sb = side(b)
    if (sa >= 0) result.push(a)
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb)
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return result
}

/**
 * The part of the output that shows the photo itself: the first wedge cut to
 * the output rectangle. Corners are relative to the output center.
 */
export function wedgeRegion(
  recipe: Pick<SymmetryRecipe, 'axes' | 'axisAngle'>,
  output: Size
): Point[] {
  const hw = output.width / 2
  const hh = output.height / 2
  const a0 = toRadians(recipe.axisAngle)
  const a1 = a0 + wedgeAngle(recipe.axes)
  let region: Point[] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  // Clockwise from the first edge, and counterclockwise from the second.
  region = clipToSide(region, Math.cos(a0), Math.sin(a0))
  region = clipToSide(region, -Math.cos(a1), -Math.sin(a1))
  return region
}

/**
 * Everything the photo has to cover, as convex pieces inside the first wedge.
 * Each wedge shows its own slice of the output rectangle; folded back onto the
 * first wedge those slices differ, because a rectangle is not round: its
 * corners reach farther out than its sides.
 */
export function foldedRegions(
  recipe: Pick<SymmetryRecipe, 'axes' | 'axisAngle'>,
  output: Size
): Point[][] {
  const hw = output.width / 2
  const hh = output.height / 2
  const corners: Point[] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  const a0 = toRadians(recipe.axisAngle)
  const a1 = a0 + wedgeAngle(recipe.axes)
  return wedgeSteps(recipe.axes)
    .map((step) => {
      // The wedge transforms are rotations and reflections, so the inverse is the transpose.
      const [a, b, c, d] = wedgeMatrix(step, recipe.axisAngle)
      const back: Matrix2 = [a, c, b, d]
      let piece = corners.map(([x, y]) => applyMatrix(back, x, y) as Point)
      piece = clipToSide(piece, Math.cos(a0), Math.sin(a0))
      piece = clipToSide(piece, -Math.cos(a1), -Math.sin(a1))
      return piece
    })
    .filter((piece) => piece.length > 0)
}

/** True when the photo reaches every part of the output, so the pattern has no empty area. */
export function coversWedge(recipe: SymmetryRecipe, output: Size, image: Size): boolean {
  const p = sourcePlacement(recipe, output, image)
  const cos = Math.cos(-p.rotation)
  const sin = Math.sin(-p.rotation)
  // Half a pixel of slack absorbs rounding.
  const hw = p.width / 2 + 0.5
  const hh = p.height / 2 + 0.5
  return foldedRegions(recipe, output).every((piece) =>
    piece.every(([x, y]) => {
      const dx = x - p.cx
      const dy = y - p.cy
      return Math.abs(dx * cos - dy * sin) <= hw && Math.abs(dx * sin + dy * cos) <= hh
    })
  )
}

const samePlacementInputs = (a: SymmetryRecipe, b: SymmetryRecipe) =>
  a.axes === b.axes &&
  a.axisAngle === b.axisAngle &&
  a.zoom === b.zoom &&
  a.rotation === b.rotation &&
  a.cols === b.cols &&
  a.rows === b.rows

/**
 * Accept a change to a recipe only as far as the photo still covers its wedge
 * (SPEC V54). A move stops at the photo's edge and slides along it; any other
 * change that would open a gap zooms the photo in just enough to close it.
 * `outputOf` gives the output size for a recipe (it depends on cols and rows).
 */
export function constrainRecipe(
  previous: SymmetryRecipe,
  next: SymmetryRecipe,
  outputOf: (recipe: SymmetryRecipe) => Size,
  image: Size
): SymmetryRecipe {
  const covers = (r: SymmetryRecipe) => coversWedge(r, outputOf(r), image)
  if (covers(next)) return next

  if (samePlacementInputs(previous, next) && covers(previous)) {
    // Only the position changed: keep whichever axis still fits, then creep toward the target.
    const slideX = { ...next, panY: previous.panY }
    const slideY = { ...next, panX: previous.panX }
    let best = covers(slideX) ? slideX : covers(slideY) ? slideY : previous
    let lo = 0
    let hi = 1
    for (let i = 0; i < 12; i++) {
      const t = (lo + hi) / 2
      const candidate = {
        ...next,
        panX: best.panX + (next.panX - best.panX) * t,
        panY: best.panY + (next.panY - best.panY) * t,
      }
      if (covers(candidate)) lo = t
      else hi = t
    }
    best = {
      ...next,
      panX: best.panX + (next.panX - best.panX) * lo,
      panY: best.panY + (next.panY - best.panY) * lo,
    }
    return covers(best) ? best : previous
  }

  // Something else changed: zoom in just enough, first where the photo is, else re-centered.
  for (const base of [next, { ...next, panX: 0, panY: 0 }]) {
    if (!covers({ ...base, zoom: MAX_SYMMETRY_ZOOM })) continue
    let lo = base.zoom
    let hi = MAX_SYMMETRY_ZOOM
    for (let i = 0; i < 24; i++) {
      const mid = Math.sqrt(lo * hi)
      if (covers({ ...base, zoom: mid })) hi = mid
      else lo = mid
    }
    return { ...base, zoom: hi }
  }
  return { ...next, panX: 0, panY: 0, zoom: MAX_SYMMETRY_ZOOM }
}
