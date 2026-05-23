export interface CellTransform {
  panX: number
  panY: number
  zoom: number
  rotation: number // 0 | 90 | 180 | 270
}

export interface ImageBlock {
  id: string
  imageId: string
  /** grid col (0-2) */
  col: number
  /** grid row (0+) */
  row: number
  /** span in columns (1-3) */
  colSpan: number
  /** span in rows (1+) */
  rowSpan: number
  barsColor: string
  /** block-level transform applied to the whole image */
  transform: CellTransform
}

export interface UploadedImage {
  id: string
  src: string
  width: number
  height: number
  name: string
}

export interface AppState {
  images: UploadedImage[]
  blocks: ImageBlock[]
  gridRows: number
  selectedBlockIds: string[]
  showGuides: boolean
  gridZoom: number
  gridPanX: number
  gridPanY: number

  addImage: (img: UploadedImage) => void
  addBlock: (block: ImageBlock) => void
  updateBlock: (id: string, patch: Partial<ImageBlock>) => void
  updateBlocks: (ids: string[], patch: Partial<ImageBlock>) => void
  removeBlock: (id: string) => void
  removeBlocks: (ids: string[]) => void
  setSelectedBlocks: (ids: string[]) => void
  toggleBlockSelection: (id: string) => void
  setGridRows: (rows: number) => void
  toggleGuides: () => void
  setGridZoom: (zoom: number) => void
  setGridPan: (x: number, y: number) => void
  clearCanvas: () => void
}
