import { placeInBlock, placeInExportCell } from '@/core/geometry'
import type { ImagePlacement } from '@/core/geometry'
import { COMPOSITE_CELL } from '@/core/joinSplit'
import { EXPORT_H, EXPORT_W } from '@/core/types'
import type { Block, Rect, Size } from '@/core/types'

/*
 * Canvas rendering. Every draw goes through the same placement the screen uses
 * (core/geometry), which is what keeps the export identical to the grid
 * (SPEC V4).
 */

export interface ImageSource {
  url: string
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.decoding = 'async'
  img.src = url
  await img.decode()
  return img
}

/** Draw an image at a placement. Mirrors the CSS the grid uses for the same placement. */
export function drawPlacement(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  p: ImagePlacement
) {
  ctx.save()
  ctx.translate(p.cx, p.cy)
  ctx.rotate((p.rotation * Math.PI) / 180)
  ctx.scale(p.flipX ? -1 : 1, p.flipY ? -1 : 1)
  ctx.drawImage(img, -p.width / 2, -p.height / 2, p.width, p.height)
  ctx.restore()
}

function newCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  ctx.imageSmoothingQuality = 'high'
  return { canvas, ctx }
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/jpeg',
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Encoding the image failed'))),
      type,
      quality
    )
  )
}

const naturalSize = (img: HTMLImageElement): Size => ({
  width: img.naturalWidth,
  height: img.naturalHeight,
})

/** One exported post: 1080×1350, the cell's 3:4 view in the center (SPEC V41, V42). */
export async function renderExportCell(
  block: Block,
  image: ImageSource | undefined,
  cellCol: number,
  cellRow: number
): Promise<Blob> {
  const { canvas, ctx } = newCanvas(EXPORT_W, EXPORT_H)
  ctx.fillStyle = block.color
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)
  if (block.kind === 'image' && image) {
    const img = await loadImage(image.url)
    drawPlacement(ctx, img, placeInExportCell(block, naturalSize(img), cellCol, cellRow))
  }
  return canvasToBlob(canvas)
}

/**
 * Render a selection, as it looks on the grid, into one image (SPEC V7).
 * `rect` is the selection's bounding rectangle; each of its cells becomes a
 * COMPOSITE_CELL in the output.
 */
export async function renderComposite(
  sources: readonly Block[],
  rect: Rect,
  imageFor: (block: Block) => ImageSource | undefined
): Promise<{ blob: Blob; size: Size }> {
  const cell = COMPOSITE_CELL
  const size = { width: rect.colSpan * cell.width, height: rect.rowSpan * cell.height }
  const { canvas, ctx } = newCanvas(size.width, size.height)

  for (const block of sources) {
    const x = (block.col - rect.col) * cell.width
    const y = (block.row - rect.row) * cell.height
    const w = block.colSpan * cell.width
    const h = block.rowSpan * cell.height

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
    ctx.fillStyle = block.color
    ctx.fillRect(x, y, w, h)
    const image = block.kind === 'image' ? imageFor(block) : undefined
    if (image) {
      const img = await loadImage(image.url)
      const p = placeInBlock(block, naturalSize(img), cell)
      drawPlacement(ctx, img, { ...p, cx: p.cx + x, cy: p.cy + y })
    }
    ctx.restore()
  }

  return { blob: await canvasToBlob(canvas, 'image/jpeg', 0.95), size }
}
