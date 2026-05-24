export interface CellTransform {
  panX: number
  panY: number
  zoom: number
  rotation: number // 0 | 90 | 180 | 270
  flipX?: boolean
  flipY?: boolean
}

export interface ImageBlock {
  id: string
  imageId?: string
  isPlaceholder?: boolean
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
  lastSelectedId: string | null
  showGuides: boolean
  visibleRows: number
  isLoading: boolean
  imageCount: number
  gridCellW: number
  gridCellH: number
  currentProfileId: number | null
  sidebarVisible: boolean
  panMode: boolean
  resizeMode: boolean

  addImage: (img: UploadedImage) => void
  addBlock: (block: ImageBlock) => void
  addPlaceholder: () => void
  updateBlock: (id: string, patch: Partial<ImageBlock>) => void
  updateBlocks: (ids: string[], patch: Partial<ImageBlock>) => void
  removeBlock: (id: string) => void
  removeBlocks: (ids: string[]) => void
  setSelectedBlocks: (ids: string[]) => void
  toggleBlockSelection: (id: string) => void
  setGridRows: (rows: number) => void
  toggleGuides: () => void
  setVisibleRows: (rows: number) => void
  setGridCellSize: (w: number, h: number) => void
  clearCanvas: () => void
  clearImages: () => void
  removeImage: (id: string) => void
  loadProfileState: (blocks: ImageBlock[], gridRows: number) => void
  setCurrentProfileId: (id: number | null) => void
  toggleSidebar: () => void
  togglePanMode: () => void
  toggleResizeMode: () => void
}
