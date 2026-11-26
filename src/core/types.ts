/** Grid is always 3 columns of 3:4 cells (SPEC C7). */
export const COLS = 3
export const MIN_ROWS = 3
export const CELL_ASPECT = 3 / 4

/** Exported post size (4:5). The profile grid shows its 3:4 center. */
export const EXPORT_W = 1080
export const EXPORT_H = 1350
/** Width of the 3:4 region of an exported post that the profile grid shows. */
export const EXPORT_CELL_W = EXPORT_H * CELL_ASPECT
/** Side margin of an exported post that the profile grid crops away. */
export const EXPORT_BAR_W = (EXPORT_W - EXPORT_CELL_W) / 2

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 8

export type Rotation = 0 | 90 | 180 | 270

/**
 * Image transform, independent of screen size (SPEC V3).
 * pan is the offset of the image center from the frame center, as a fraction of
 * the frame's width / height. zoom multiplies the cover-fit scale.
 */
export interface Transform {
  panX: number
  panY: number
  zoom: number
  rotation: Rotation
  flipX: boolean
  flipY: boolean
}

export const IDENTITY_TRANSFORM: Transform = {
  panX: 0,
  panY: 0,
  zoom: 1,
  rotation: 0,
  flipX: false,
  flipY: false,
}

/**
 * The virtual cell area an image is laid out over (SPEC V5). A block shows the
 * part of that area starting at (col, row). An unsplit block's frame is its own
 * span with offset 0,0.
 */
export interface Frame {
  cols: number
  rows: number
  col: number
  row: number
}

export interface Rect {
  col: number
  row: number
  colSpan: number
  rowSpan: number
}

export interface Block extends Rect {
  id: string
  /** 'image' shows a library image; 'color' is a solid placeholder cell. */
  kind: 'image' | 'color'
  imageId?: string
  /** Fill of a color cell, or the bars color behind an image. */
  color: string
  frame: Frame
  transform: Transform
}

export interface Size {
  width: number
  height: number
}

export type Result<T, R extends string = string> = { ok: true; value: T } | { ok: false; reason: R }

export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })
export const fail = <R extends string>(reason: R): { ok: false; reason: R } => ({
  ok: false,
  reason,
})
