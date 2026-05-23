import JSZip from 'jszip'
import { cellUploadNumber, COLS } from './gridUtils'
import type { ImageBlock, UploadedImage } from '@/store/types'

const EXPORT_W = 1080
const EXPORT_H = 1350

async function loadHTMLImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

function renderCell(
  img: HTMLImageElement,
  block: ImageBlock,
  relCol: number,
  relRow: number,
  gridCellW: number,
  gridCellH: number
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_W
  canvas.height = EXPORT_H
  const ctx = canvas.getContext('2d')!

  const totalCols = block.colSpan
  const totalRows = block.rowSpan

  const { transform } = block
  const { panX, panY, zoom, rotation, flipX, flipY } = transform

  // V24: 1010px crop + 35px bars each side = 1080px
  // T71: Crop area is 1010×1350 (not 1010×1346.67) - slightly off from pure 3:4
  const CROP_W = 1010
  const CROP_H = 1350

  // T69: Scale pan values from grid coordinates to export CROP coordinates
  const panScaleX = CROP_W / gridCellW
  const panScaleY = CROP_H / gridCellH
  const scaledPanX = panX * panScaleX
  const scaledPanY = panY * panScaleY

  // T71: Cell offset in CROP coordinates (not full canvas)
  const cellOffsetX = relCol * CROP_W
  const cellOffsetY = relRow * CROP_H

  // T66: Fill canvas with bars color (no blur)
  ctx.fillStyle = block.barsColor || '#000000'
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)

  // Draw image covering full canvas width
  ctx.save()

  // Apply transforms to full canvas (including bars)
  ctx.translate(EXPORT_W / 2, EXPORT_H / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(scaledPanX - cellOffsetX, scaledPanY - cellOffsetY)
  const flipScaleX = (flipX ? -1 : 1) * zoom
  const flipScaleY = (flipY ? -1 : 1) * zoom
  ctx.scale(flipScaleX, flipScaleY)

  // T71: Scale image to fit within full block CROP area
  const fullW = totalCols * CROP_W
  const fullH = totalRows * CROP_H
  const imgScaleX = fullW / img.naturalWidth
  const imgScaleY = fullH / img.naturalHeight
  const imgScale = Math.min(imgScaleX, imgScaleY)
  const drawW = img.naturalWidth * imgScale
  const drawH = img.naturalHeight * imgScale

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

  ctx.restore()

  return new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error('canvas toBlob failed')), 'image/jpeg', 0.92))
}

export async function exportAllCells(
  blocks: ImageBlock[],
  images: UploadedImage[],
  gridRows: number,
  gridCellW: number,
  gridCellH: number
): Promise<void> {
  const zip = new JSZip()

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < COLS; col++) {
      const block = blocks.find(
        (b) => col >= b.col && col < b.col + b.colSpan && row >= b.row && row < b.row + b.rowSpan
      )
      if (!block) continue

      const image = images.find((i) => i.id === block.imageId)
      if (!image) continue

      const htmlImg = await loadHTMLImage(image.src)
      const relCol = col - block.col
      const relRow = row - block.row
      const num = cellUploadNumber(col, row, gridRows, blocks, COLS)
      const blob = await renderCell(htmlImg, block, relCol, relRow, gridCellW, gridCellH)
      if (num > 0) {
        zip.file(`${String(num).padStart(2, '0')}.jpg`, blob)
      }
    }
  }

  const content = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url
  a.download = 'insta-grid.zip'
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportSingleCell(
  block: ImageBlock,
  image: UploadedImage,
  absCol: number,
  absRow: number,
  gridRows: number,
  blocks: ImageBlock[],
  gridCellW: number,
  gridCellH: number
): Promise<void> {
  const htmlImg = await loadHTMLImage(image.src)
  const blob = await renderCell(htmlImg, block, absCol - block.col, absRow - block.row, gridCellW, gridCellH)
  const num = cellUploadNumber(absCol, absRow, gridRows, blocks, COLS)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${String(num).padStart(2, '0')}.jpg`
  a.click()
  URL.revokeObjectURL(url)
}
