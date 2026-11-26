import { coverScale } from '@/core/geometry'
import { firstFreeCell, hasCollision, inBounds } from '@/core/grid'
import { CELL_ASPECT, MAX_ZOOM, MIN_ZOOM } from '@/core/types'
import type { Block, Rotation, Size } from '@/core/types'
import { newId } from '@/store/id'
import { DEFAULT_BARS_COLOR, DEFAULT_CELL_COLOR } from '@/store/project'
import { images, meta, projects } from './database'
import type { StoredImage, StoredProject } from './database'
import { getAll, openExistingDatabase } from './idb'

/*
 * Import of v1 data (SPEC V17). v1 kept images as data URLs in the IndexedDB
 * database `insta-grid-db`, saved layouts ("profiles") in the same database,
 * and the working layout in localStorage. Nothing in v1 storage is modified.
 */

const V1_DB = 'insta-grid-db'
const V1_STATE_KEY = 'insta-grid-state'

export interface V1Transform {
  panX: number
  panY: number
  zoom: number
  rotation: number
  flipX?: boolean
  flipY?: boolean
}

export interface V1Block {
  id: string
  imageId?: string
  isPlaceholder?: boolean
  col: number
  row: number
  colSpan: number
  rowSpan: number
  barsColor: string
  transform: V1Transform
}

export interface V1Image {
  id: string
  src: string
  width: number
  height: number
  name: string
}

export interface V1Profile {
  id?: number
  name: string
  timestamp: number
  blocks: V1Block[]
  gridRows: number
}

/**
 * v1 stored pan in CSS pixels of whatever size the grid had on screen, and did
 * not store that size. This estimates the v1 cell size for a viewport, so the
 * imported framing is close; it cannot be exact.
 */
export function estimateV1Cell(viewport: Size): Size {
  const mobile = viewport.width <= 768
  const availableWidth = mobile ? viewport.width : Math.max(300, viewport.width - 210 - 56)
  const availableHeight = Math.max(300, viewport.height - (mobile ? 120 : 60))
  const rows = mobile ? 5 : 3
  const width = Math.min(availableWidth / 3, (availableHeight / rows) * CELL_ASPECT)
  return { width, height: width / CELL_ASPECT }
}

const toRotation = (degrees: number): Rotation =>
  ((((Math.round(degrees / 90) * 90) % 360) + 360) % 360) as Rotation

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const finite = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

/**
 * Convert one v1 block. v1 drew the image contain-fitted in the block (using
 * its unrotated size), zoomed, and panned in pixels along the rotated axes.
 * v2 stores zoom over the cover fit and pan as a fraction of the frame along
 * screen axes (SPEC V3).
 */
export function convertV1Block(
  v1: V1Block,
  imageSizes: ReadonlyMap<string, Size>,
  v1Cell: Size
): Block {
  const colSpan = Math.max(1, Math.round(finite(v1.colSpan, 1)))
  const rowSpan = Math.max(1, Math.round(finite(v1.rowSpan, 1)))
  const base = {
    id: v1.id || newId(),
    col: Math.round(finite(v1.col, 0)),
    row: Math.round(finite(v1.row, 0)),
    colSpan,
    rowSpan,
    frame: { cols: colSpan, rows: rowSpan, col: 0, row: 0 },
  }
  const image = v1.imageId ? imageSizes.get(v1.imageId) : undefined

  if (v1.isPlaceholder || !image) {
    return {
      ...base,
      kind: 'color',
      color: v1.barsColor || DEFAULT_CELL_COLOR,
      transform: { panX: 0, panY: 0, zoom: 1, rotation: 0, flipX: false, flipY: false },
    }
  }

  const t = v1.transform ?? { panX: 0, panY: 0, zoom: 1, rotation: 0 }
  const rotation = toRotation(finite(t.rotation, 0))
  const frame = { width: colSpan * v1Cell.width, height: rowSpan * v1Cell.height }

  const v1Fit = Math.min(frame.width / image.width, frame.height / image.height)
  const zoom = (finite(t.zoom, 1) * v1Fit) / coverScale(frame, image, rotation)

  const radians = (rotation * Math.PI) / 180
  const cos = Math.round(Math.cos(radians))
  const sin = Math.round(Math.sin(radians))
  const px = finite(t.panX, 0)
  const py = finite(t.panY, 0)

  return {
    ...base,
    kind: 'image',
    imageId: v1.imageId,
    color: v1.barsColor || DEFAULT_BARS_COLOR,
    transform: {
      panX: (px * cos - py * sin) / frame.width,
      panY: (px * sin + py * cos) / frame.height,
      zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
      rotation,
      flipX: Boolean(t.flipX),
      flipY: Boolean(t.flipY),
    },
  }
}

/** Convert a v1 layout, re-seating any block that breaks the v2 grid rules (SPEC V1, V2). */
export function convertV1Layout(
  v1Blocks: readonly V1Block[],
  imageSizes: ReadonlyMap<string, Size>,
  v1Cell: Size
): Block[] {
  const placed: Block[] = []
  const displaced: Block[] = []
  for (const v1 of v1Blocks) {
    const block = convertV1Block(v1, imageSizes, v1Cell)
    if (inBounds(block) && !hasCollision(placed, block)) placed.push(block)
    else displaced.push(block)
  }
  for (const block of displaced) {
    const colSpan = Math.min(3, block.colSpan)
    const spot = firstFreeCell(placed, colSpan, block.rowSpan)
    placed.push({
      ...block,
      ...spot,
      colSpan,
      frame: { cols: colSpan, rows: block.rowSpan, col: 0, row: 0 },
    })
  }
  return placed
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const header = dataUrl.slice(0, comma)
  const mime = /data:([^;,]+)/.exec(header)?.[1] ?? 'application/octet-stream'
  const body = dataUrl.slice(comma + 1)
  if (!header.includes(';base64')) return new Blob([decodeURIComponent(body)], { type: mime })
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export interface V1Data {
  images: V1Image[]
  profiles: V1Profile[]
  working: { blocks: V1Block[]; gridRows: number } | null
}

/** Read v1 storage without creating or changing anything. */
export async function readV1Data(storage: Pick<Storage, 'getItem'> | null): Promise<V1Data> {
  const data: V1Data = { images: [], profiles: [], working: null }

  const db = await openExistingDatabase(V1_DB).catch(() => null)
  if (db) {
    try {
      if (db.objectStoreNames.contains('images')) data.images = await getAll<V1Image>(db, 'images')
      if (db.objectStoreNames.contains('profiles')) {
        data.profiles = await getAll<V1Profile>(db, 'profiles')
      }
    } finally {
      db.close()
    }
  }

  try {
    const raw = storage?.getItem(V1_STATE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      data.working = { blocks: parsed.blocks, gridRows: finite(parsed.gridRows, 3) }
    }
  } catch {
    // Unreadable v1 state is skipped; the rest still imports.
  }

  return data
}

export interface MigrationResult {
  imported: boolean
  images: number
  projects: number
}

/**
 * One-time import of v1 data into the v2 database. Safe to call on every start:
 * it does nothing once it has run, and nothing when there is no v1 data.
 */
export async function migrateV1(
  storage: Pick<Storage, 'getItem'> | null,
  viewport: Size,
  now = Date.now()
): Promise<MigrationResult> {
  const none: MigrationResult = { imported: false, images: 0, projects: 0 }
  if (await meta.get('migratedV1')) return none

  const v1 = await readV1Data(storage)
  if (v1.images.length === 0 && v1.profiles.length === 0 && !v1.working) {
    await meta.set('migratedV1', now)
    return none
  }

  const storedImages: StoredImage[] = []
  for (const image of v1.images) {
    if (!image?.id || typeof image.src !== 'string') continue
    try {
      storedImages.push({
        id: image.id,
        name: image.name || 'Image',
        width: finite(image.width, 0),
        height: finite(image.height, 0),
        origin: 'v1',
        createdAt: now,
        blob: dataUrlToBlob(image.src),
      })
    } catch {
      // A corrupt image is skipped; its blocks become color cells.
    }
  }
  const sizes = new Map(
    storedImages
      .filter((i) => i.width > 0 && i.height > 0)
      .map((i) => [i.id, { width: i.width, height: i.height }])
  )
  const cell = estimateV1Cell(viewport)

  const storedProjects: StoredProject[] = v1.profiles.map((profile) => ({
    id: newId(),
    name: profile.name || 'Imported grid',
    blocks: convertV1Layout(profile.blocks ?? [], sizes, cell),
    createdAt: finite(profile.timestamp, now),
    updatedAt: finite(profile.timestamp, now),
  }))

  let lastProjectId = [...storedProjects].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id
  if (v1.working) {
    const working: StoredProject = {
      id: newId(),
      name: 'Last session',
      blocks: convertV1Layout(v1.working.blocks, sizes, cell),
      createdAt: now,
      updatedAt: now,
    }
    storedProjects.push(working)
    lastProjectId = working.id
  }

  await images.put(storedImages)
  await projects.put(storedProjects)
  if (lastProjectId) await meta.set('lastProjectId', lastProjectId)
  await meta.set('migratedV1', now)

  return { imported: true, images: storedImages.length, projects: storedProjects.length }
}
