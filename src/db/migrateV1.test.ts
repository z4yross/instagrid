import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { isValidLayout } from '@/core/grid'
import { closeDb, DB_NAME, images, meta, projects } from './database'
import { getAll, openDatabase, putAll } from './idb'
import {
  convertV1Block,
  convertV1Layout,
  dataUrlToBlob,
  estimateV1Cell,
  migrateV1,
  readV1Data,
} from './migrateV1'
import type { V1Block, V1Image, V1Profile } from './migrateV1'

const cell = { width: 150, height: 200 }
const sizes = new Map([
  ['portrait', { width: 600, height: 800 }],
  ['wide', { width: 1600, height: 800 }],
])

const v1Block = (overrides: Partial<V1Block> = {}): V1Block => ({
  id: 'b1',
  imageId: 'portrait',
  col: 0,
  row: 0,
  colSpan: 1,
  rowSpan: 1,
  barsColor: '#101010',
  transform: { panX: 0, panY: 0, zoom: 1, rotation: 0 },
  ...overrides,
})

describe('convertV1Block (V3, V17)', () => {
  it('keeps an untouched same-ratio image filling its cell', () => {
    expect(convertV1Block(v1Block(), sizes, cell)).toMatchObject({
      kind: 'image',
      imageId: 'portrait',
      color: '#101010',
      frame: { cols: 1, rows: 1, col: 0, row: 0 },
      transform: { panX: 0, panY: 0, zoom: 1, rotation: 0, flipX: false, flipY: false },
    })
  })

  it('turns v1 contain-fit into a zoom below cover, so bars still show', () => {
    const block = convertV1Block(v1Block({ imageId: 'wide' }), sizes, cell)
    expect(block.transform.zoom).toBeCloseTo(0.375)
  })

  it('turns pixel pan into a fraction of the frame', () => {
    const block = convertV1Block(
      v1Block({ transform: { panX: 30, panY: -50, zoom: 1, rotation: 0 } }),
      sizes,
      cell
    )
    expect(block.transform.panX).toBeCloseTo(0.2)
    expect(block.transform.panY).toBeCloseTo(-0.25)
  })

  it('uses the whole block as the frame for multi-cell blocks', () => {
    const block = convertV1Block(
      v1Block({ colSpan: 2, rowSpan: 2, transform: { panX: 30, panY: 0, zoom: 1, rotation: 0 } }),
      sizes,
      cell
    )
    expect(block.transform.panX).toBeCloseTo(0.1)
  })

  it('maps pan along rotated axes onto screen axes', () => {
    const block = convertV1Block(
      v1Block({ transform: { panX: 30, panY: 0, zoom: 1, rotation: 90, flipX: true } }),
      sizes,
      cell
    )
    expect(block.transform).toMatchObject({ rotation: 90, flipX: true, flipY: false })
    expect(block.transform.panX).toBeCloseTo(0)
    expect(block.transform.panY).toBeCloseTo(0.15)
  })

  it('makes color cells from placeholders and from blocks whose image is gone', () => {
    expect(
      convertV1Block(v1Block({ isPlaceholder: true, imageId: undefined }), sizes, cell)
    ).toMatchObject({
      kind: 'color',
      color: '#101010',
    })
    expect(convertV1Block(v1Block({ imageId: 'missing' }), sizes, cell).kind).toBe('color')
  })
})

describe('convertV1Layout (V1, V2)', () => {
  it('re-seats blocks that overlap or leave the grid', () => {
    const layout = convertV1Layout(
      [
        v1Block({ id: 'a' }),
        v1Block({ id: 'b' }),
        v1Block({ id: 'c', col: 2, colSpan: 2 }),
        v1Block({ id: 'd', col: 1 }),
      ],
      sizes,
      cell
    )
    expect(layout).toHaveLength(4)
    expect(isValidLayout(layout)).toBe(true)
    expect(layout.find((b) => b.id === 'a')).toMatchObject({ col: 0, row: 0 })
    expect(layout.find((b) => b.id === 'd')).toMatchObject({ col: 1, row: 0 })
  })
})

describe('helpers', () => {
  it('estimates a 3:4 v1 cell for desktop and mobile', () => {
    const desktop = estimateV1Cell({ width: 1920, height: 1080 })
    expect(desktop.width / desktop.height).toBeCloseTo(0.75)
    expect(desktop.width).toBeCloseTo(255)
    const mobile = estimateV1Cell({ width: 390, height: 844 })
    expect(mobile.width).toBeLessThanOrEqual(130)
  })

  it('decodes a base64 data URL', async () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=')
    expect(blob.type).toBe('text/plain')
    expect(await blob.text()).toBe('hello')
  })
})

const PIXEL = 'data:image/png;base64,iVBORw0KGgo='

async function seedV1(profiles: V1Profile[] = []) {
  const db = await openDatabase('insta-grid-db', 3, (d) => {
    d.createObjectStore('images', { keyPath: 'id' })
    d.createObjectStore('profiles', { keyPath: 'id', autoIncrement: true })
  })
  const v1Images: V1Image[] = [
    { id: 'portrait', src: PIXEL, width: 600, height: 800, name: 'one.png' },
    { id: 'wide', src: PIXEL, width: 1600, height: 800, name: 'two.png' },
  ]
  await putAll(db, 'images', v1Images)
  await putAll(db, 'profiles', profiles)
  db.close()
}

const storageWith = (value: unknown) => ({
  getItem: (key: string) => (key === 'insta-grid-state' && value ? JSON.stringify(value) : null),
})

async function resetDatabases() {
  await closeDb()
  for (const name of [DB_NAME, 'insta-grid-db']) {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

describe('migrateV1 (V17)', () => {
  const viewport = { width: 1920, height: 1080 }

  beforeEach(resetDatabases)

  it('does nothing, and creates no v1 database, when there is no v1 data', async () => {
    expect(await migrateV1(storageWith(null), viewport)).toEqual({
      imported: false,
      images: 0,
      projects: 0,
    })
    const names = (await indexedDB.databases()).map((d) => d.name)
    expect(names).not.toContain('insta-grid-db')
    expect(await projects.all()).toEqual([])
  })

  it('imports images, profiles and the working layout, and opens the working layout', async () => {
    await seedV1([
      { name: 'Summer', timestamp: 1000, gridRows: 3, blocks: [v1Block({ id: 'p' })] },
      {
        name: 'Winter',
        timestamp: 2000,
        gridRows: 3,
        blocks: [v1Block({ id: 'q', imageId: 'wide' })],
      },
    ])
    const working = { gridRows: 3, blocks: [v1Block({ id: 'w', col: 1 })] }

    const result = await migrateV1(storageWith(working), viewport, 5000)
    expect(result).toEqual({ imported: true, images: 2, projects: 3 })

    const storedImages = await images.all()
    expect(storedImages.map((i) => [i.id, i.origin, i.width])).toEqual([
      ['portrait', 'v1', 600],
      ['wide', 'v1', 1600],
    ])
    expect(storedImages[0].blob).toBeInstanceOf(Blob)

    const storedProjects = await projects.all()
    expect(storedProjects.map((p) => p.name).sort()).toEqual(['Last session', 'Summer', 'Winter'])
    const last = storedProjects.find((p) => p.name === 'Last session')
    expect(last?.blocks[0]).toMatchObject({ id: 'w', col: 1, kind: 'image' })
    expect(await meta.get('lastProjectId')).toBe(last?.id)
  })

  it('opens the newest profile when there is no working layout', async () => {
    await seedV1([
      { name: 'Old', timestamp: 1000, gridRows: 3, blocks: [] },
      { name: 'New', timestamp: 2000, gridRows: 3, blocks: [] },
    ])
    await migrateV1(storageWith(null), viewport)
    const newest = (await projects.all()).find((p) => p.name === 'New')
    expect(await meta.get('lastProjectId')).toBe(newest?.id)
  })

  it('runs once and leaves v1 data untouched', async () => {
    await seedV1([{ name: 'Summer', timestamp: 1000, gridRows: 3, blocks: [v1Block()] }])
    expect((await migrateV1(storageWith(null), viewport)).imported).toBe(true)
    expect((await migrateV1(storageWith(null), viewport)).imported).toBe(false)
    expect(await projects.all()).toHaveLength(1)

    const v1 = await readV1Data(storageWith(null))
    expect(v1.images).toHaveLength(2)
    expect(v1.profiles).toHaveLength(1)
    const db = await openDatabase('insta-grid-db', 3, () => {})
    expect(await getAll<V1Image>(db, 'images')).toHaveLength(2)
    db.close()
  })
})
