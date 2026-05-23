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
  relRow: number
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_W
  canvas.height = EXPORT_H
  const ctx = canvas.getContext('2d')!

  const totalCols = block.colSpan
  const totalRows = block.rowSpan

  const { transform } = block
  const { panX, panY, zoom, rotation } = transform

  // bars background
  ctx.fillStyle = block.barsColor
  ctx.fillRect(0, 0, EXPORT_W, EXPORT_H)

  ctx.save()
  ctx.translate(EXPORT_W / 2, EXPORT_H / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.scale(zoom, zoom)
  ctx.translate(panX - (relCol * EXPORT_W), panY - (relRow * EXPORT_H))

  // contain: fit whole image in total area
  const totalPxW = totalCols * EXPORT_W
  const totalPxH = totalRows * EXPORT_H
  const scaleX = totalPxW / img.naturalWidth
  const scaleY = totalPxH / img.naturalHeight
  const scale = Math.min(scaleX, scaleY)
  const drawW = img.naturalWidth * scale
  const drawH = img.naturalHeight * scale
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)

  ctx.restore()

  return new Promise((res, rej) => canvas.toBlob((b) => b ? res(b) : rej(new Error('canvas toBlob failed')), 'image/jpeg', 0.92))
}

export async function exportAllCells(
  blocks: ImageBlock[],
  images: UploadedImage[],
  gridRows: number
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
      const blob = await renderCell(htmlImg, block, relCol, relRow)
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
  blocks: ImageBlock[]
): Promise<void> {
  const htmlImg = await loadHTMLImage(image.src)
  const blob = await renderCell(htmlImg, block, absCol - block.col, absRow - block.row)
  const num = cellUploadNumber(absCol, absRow, gridRows, blocks, COLS)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${String(num).padStart(2, '0')}.jpg`
  a.click()
  URL.revokeObjectURL(url)
}
