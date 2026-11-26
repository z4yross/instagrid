import { EXPORT_BAR_W, EXPORT_CELL_W, EXPORT_H, MAX_ZOOM, MIN_ZOOM } from './types'
import type { Block, Size, Transform } from './types'

/**
 * Where an image is drawn inside its frame, in frame pixels (SPEC V4).
 * Draw order for any renderer: translate to (cx, cy), rotate by `rotation`
 * degrees, scale by (flipX ? -1 : 1, flipY ? -1 : 1), then draw the image
 * centered at the origin with size (width, height).
 */
export interface ImagePlacement {
  cx: number
  cy: number
  /** Drawn size of the unrotated image. */
  width: number
  height: number
  rotation: number
  flipX: boolean
  flipY: boolean
}

const isQuarterTurn = (rotation: number) => rotation === 90 || rotation === 270

/** Size the image occupies on screen after rotation, before scaling. */
export function rotatedSize(image: Size, rotation: number): Size {
  return isQuarterTurn(rotation) ? { width: image.height, height: image.width } : { ...image }
}

/** Scale at which the (rotated) image exactly covers the frame. */
export function coverScale(frame: Size, image: Size, rotation: number): number {
  const r = rotatedSize(image, rotation)
  return Math.max(frame.width / r.width, frame.height / r.height)
}

/** Scale at which the (rotated) image fits entirely inside the frame. */
export function containScale(frame: Size, image: Size, rotation: number): number {
  const r = rotatedSize(image, rotation)
  return Math.min(frame.width / r.width, frame.height / r.height)
}

/** Zoom value that makes the whole image visible (shows bars). */
export function fitZoom(frame: Size, image: Size, rotation: number): number {
  return containScale(frame, image, rotation) / coverScale(frame, image, rotation)
}

/**
 * The single mapping from (frame, image, transform) to a draw rect. The screen
 * and the exporter both call this, so they cannot disagree (SPEC V4).
 */
export function placeImage(frame: Size, image: Size, t: Transform): ImagePlacement {
  const scale = coverScale(frame, image, t.rotation) * t.zoom
  return {
    cx: frame.width / 2 + t.panX * frame.width,
    cy: frame.height / 2 + t.panY * frame.height,
    width: image.width * scale,
    height: image.height * scale,
    rotation: t.rotation,
    flipX: t.flipX,
    flipY: t.flipY,
  }
}

/** Pixel size of a block's frame for a given cell size. */
export function frameSize(block: Pick<Block, 'frame'>, cell: Size): Size {
  return { width: block.frame.cols * cell.width, height: block.frame.rows * cell.height }
}

/** Offset of the block's visible area inside its frame, in pixels. */
export function frameOffset(block: Pick<Block, 'frame'>, cell: Size): { x: number; y: number } {
  return { x: block.frame.col * cell.width, y: block.frame.row * cell.height }
}

/**
 * Placement of a block's image relative to the block's own top-left corner.
 * This is what the screen renders inside the (clipped) block element.
 */
export function placeInBlock(
  block: Pick<Block, 'frame' | 'transform'>,
  image: Size,
  cell: Size
): ImagePlacement {
  const p = placeImage(frameSize(block, cell), image, block.transform)
  const o = frameOffset(block, cell)
  return { ...p, cx: p.cx - o.x, cy: p.cy - o.y }
}

/**
 * Placement of a block's image on the 1080×1350 export canvas of one of its
 * cells (SPEC V41, V42). (cellCol, cellRow) is the cell inside the block.
 * The cell's visible 3:4 area lands in the horizontal center of the canvas; the
 * side margins get whatever the image has there.
 */
export function placeInExportCell(
  block: Pick<Block, 'frame' | 'transform'>,
  image: Size,
  cellCol: number,
  cellRow: number
): ImagePlacement {
  const cell = { width: EXPORT_CELL_W, height: EXPORT_H }
  const p = placeInBlock(block, image, cell)
  return {
    ...p,
    cx: p.cx - cellCol * cell.width + EXPORT_BAR_W,
    cy: p.cy - cellRow * cell.height,
  }
}

/**
 * Upscale factor of the source image in the export (SPEC V44). Above 1 the
 * export stretches source pixels and will look soft.
 */
export function exportUpscale(block: Pick<Block, 'frame' | 'transform'>, image: Size): number {
  const frame = frameSize(block, { width: EXPORT_CELL_W, height: EXPORT_H })
  return coverScale(frame, image, block.transform.rotation) * block.transform.zoom
}

export function isLowRes(block: Pick<Block, 'frame' | 'transform'>, image: Size): boolean {
  return exportUpscale(block, image) > 1
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Keep a transform usable: zoom inside its range, and pan limited so at least
 * part of the image always stays over the frame.
 */
export function clampTransform(frame: Size, image: Size, t: Transform): Transform {
  const zoom = clamp(t.zoom, MIN_ZOOM, MAX_ZOOM)
  const scale = coverScale(frame, image, t.rotation) * zoom
  const shown = rotatedSize(
    { width: image.width * scale, height: image.height * scale },
    t.rotation
  )
  // Image and frame centers may differ by at most half of both extents, minus
  // a 10% sliver of the frame that must stay covered.
  const maxX = (frame.width + shown.width) / 2 / frame.width - 0.1
  const maxY = (frame.height + shown.height) / 2 / frame.height - 0.1
  return {
    ...t,
    zoom,
    panX: clamp(t.panX, -maxX, maxX),
    panY: clamp(t.panY, -maxY, maxY),
  }
}

/* ---------- Flip and rotate as the user sees them ---------- */

/** Any cell size works here: the results are fractions, so only the 3:4 shape matters. */
const UNIT_CELL: Size = { width: 3, height: 4 }

type Framed = Pick<Block, 'frame' | 'transform' | 'colSpan' | 'rowSpan'>

/** Center of the block's visible area inside its frame, in UNIT_CELL pixels. */
function visibleCenter(block: Framed): { x: number; y: number } {
  return {
    x: (block.frame.col + block.colSpan / 2) * UNIT_CELL.width,
    y: (block.frame.row + block.rowSpan / 2) * UNIT_CELL.height,
  }
}

/** Which way the photo is mirrored as seen on screen, whatever its rotation. */
export function screenFlips(t: Transform): { horizontal: boolean; vertical: boolean } {
  return isQuarterTurn(t.rotation)
    ? { horizontal: t.flipY, vertical: t.flipX }
    : { horizontal: t.flipX, vertical: t.flipY }
}

/**
 * Mirror the photo left-right ('horizontal') or top-bottom ('vertical') as seen
 * on screen. The mirror line runs through the middle of the block's visible
 * area, so what was framed stays framed, mirrored; a photo that had been moved
 * in its frame does not jump.
 */
export function flipOnScreen(block: Framed, direction: 'horizontal' | 'vertical'): Transform {
  const t = block.transform
  const frame = frameSize(block, UNIT_CELL)
  const center = visibleCenter(block)
  // On a quarter turn the photo's own axes are swapped relative to the screen.
  const ownAxis = (direction === 'horizontal') !== isQuarterTurn(t.rotation) ? 'flipX' : 'flipY'
  const next: Transform = { ...t, [ownAxis]: !t[ownAxis] }
  if (direction === 'horizontal') next.panX = (2 * center.x) / frame.width - 1 - t.panX
  else next.panY = (2 * center.y) / frame.height - 1 - t.panY
  return next
}

/**
 * Turn the photo a quarter turn on screen (90 clockwise, -90 counterclockwise)
 * around the middle of the block's visible area: the point of the photo that
 * sat there stays there.
 */
export function rotateOnScreen(block: Framed, image: Size, degrees: 90 | -90): Transform {
  const t = block.transform
  const frame = frameSize(block, UNIT_CELL)
  const center = visibleCenter(block)
  const rotation = ((t.rotation + degrees + 360) % 360) as Transform['rotation']

  // Offset of the photo's center from the visible center, before the turn.
  const ox = frame.width / 2 + t.panX * frame.width - center.x
  const oy = frame.height / 2 + t.panY * frame.height - center.y
  // The cover fit changes with the turn; scale the offset with it.
  const k = coverScale(frame, image, rotation) / coverScale(frame, image, t.rotation)
  const [rx, ry] = degrees === 90 ? [-oy, ox] : [oy, -ox]

  return {
    ...t,
    rotation,
    panX: (center.x + rx * k - frame.width / 2) / frame.width,
    panY: (center.y + ry * k - frame.height / 2) / frame.height,
  }
}
