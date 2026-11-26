import { COMPOSITE_CELL } from '@/core/joinSplit'
import { sourcePlacement, toRadians, wedgeAngle, wedgeSteps } from '@/core/symmetry'
import type { SymmetryRecipe } from '@/core/symmetry'
import type { Size } from '@/core/types'
import { canvasToBlob, loadImage } from './render'

/*
 * Drawing of a symmetry pattern (SPEC V50). The same routine paints the live
 * preview and the full-size result, so the saved image is what the editor
 * showed.
 */

/** Wedges overlap their neighbours by this many pixels, so no hairline shows between them. */
const SEAM_OVERLAP = 0.75

/** Pixel size of a result of `cols × rows` cells. */
export function symmetryOutputSize(recipe: Pick<SymmetryRecipe, 'cols' | 'rows'>): Size {
  return {
    width: recipe.cols * COMPOSITE_CELL.width,
    height: recipe.rows * COMPOSITE_CELL.height,
  }
}

/**
 * Paint the pattern over the whole `output` area of the context.
 * `image` is the natural size of `source`, which may be a scaled-down copy.
 */
export function drawSymmetry(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  image: Size,
  recipe: SymmetryRecipe,
  output: Size
) {
  const axis = toRadians(recipe.axisAngle)
  const w = wedgeAngle(recipe.axes)
  const reach = Math.hypot(output.width, output.height)
  const p = sourcePlacement(recipe, output, image)

  // Edges of the first wedge, each pushed outward by the seam overlap.
  const a0 = axis
  const a1 = axis + w
  const start = { x: Math.sin(a0) * SEAM_OVERLAP, y: -Math.cos(a0) * SEAM_OVERLAP }
  const end = { x: -Math.sin(a1) * SEAM_OVERLAP, y: Math.cos(a1) * SEAM_OVERLAP }

  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, output.width, output.height)
  ctx.beginPath()
  ctx.rect(0, 0, output.width, output.height)
  ctx.clip()

  for (const step of wedgeSteps(recipe.axes)) {
    ctx.save()
    ctx.translate(output.width / 2, output.height / 2)
    ctx.rotate(axis)
    ctx.rotate(step.turn)
    if (step.mirrored) ctx.scale(1, -1)
    ctx.rotate(-axis)

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(start.x + Math.cos(a0) * reach, start.y + Math.sin(a0) * reach)
    ctx.arc(0, 0, reach, a0, a1)
    ctx.lineTo(end.x + Math.cos(a1) * reach, end.y + Math.sin(a1) * reach)
    ctx.lineTo(end.x, end.y)
    ctx.closePath()
    ctx.clip()

    ctx.translate(p.cx, p.cy)
    ctx.rotate(p.rotation)
    ctx.drawImage(source, -p.width / 2, -p.height / 2, p.width, p.height)
    ctx.restore()
  }
  ctx.restore()
}

/** Render the pattern at full size, ready to store as a library image. */
export async function renderSymmetry(
  recipe: SymmetryRecipe,
  sourceUrl: string
): Promise<{ blob: Blob; size: Size }> {
  const img = await loadImage(sourceUrl)
  const size = symmetryOutputSize(recipe)
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not available')
  ctx.imageSmoothingQuality = 'high'
  drawSymmetry(ctx, img, { width: img.naturalWidth, height: img.naturalHeight }, recipe, size)
  return { blob: await canvasToBlob(canvas, 'image/jpeg', 0.95), size }
}
