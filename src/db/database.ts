import type { Block } from '@/core/types'
import type { ImageOrigin } from '@/store/library'
import { countAll, deleteOne, getAll, getOne, openDatabase, putAll } from './idb'

export const DB_NAME = 'instagrid'
const DB_VERSION = 1
const IMAGES = 'images'
const PROJECTS = 'projects'
const META = 'meta'

/** Images are stored as Blobs, never as data URLs (SPEC V15). */
export interface StoredImage {
  id: string
  name: string
  width: number
  height: number
  origin: ImageOrigin
  createdAt: number
  blob: Blob
}

export interface StoredProject {
  id: string
  name: string
  blocks: Block[]
  createdAt: number
  updatedAt: number
}

export type MetaKey = 'lastProjectId' | 'migratedV1'

let opened: Promise<IDBDatabase> | null = null

export function openDb(): Promise<IDBDatabase> {
  opened ??= openDatabase(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(IMAGES)) db.createObjectStore(IMAGES, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(PROJECTS)) db.createObjectStore(PROJECTS, { keyPath: 'id' })
    if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' })
  }).catch((error) => {
    opened = null
    throw error
  })
  return opened
}

/** Test hook: forget the cached connection. */
export async function closeDb() {
  if (!opened) return
  const db = await opened.catch(() => null)
  db?.close()
  opened = null
}

export const images = {
  all: async () => getAll<StoredImage>(await openDb(), IMAGES),
  count: async () => countAll(await openDb(), IMAGES),
  put: async (items: readonly StoredImage[]) => putAll(await openDb(), IMAGES, items),
  delete: async (id: string) => deleteOne(await openDb(), IMAGES, id),
}

export const projects = {
  all: async () => getAll<StoredProject>(await openDb(), PROJECTS),
  get: async (id: string) => getOne<StoredProject>(await openDb(), PROJECTS, id),
  put: async (items: readonly StoredProject[]) => putAll(await openDb(), PROJECTS, items),
  delete: async (id: string) => deleteOne(await openDb(), PROJECTS, id),
}

export const meta = {
  get: async <T>(key: MetaKey): Promise<T | undefined> =>
    (await getOne<{ key: string; value: T }>(await openDb(), META, key))?.value,
  set: async (key: MetaKey, value: unknown) => putAll(await openDb(), META, [{ key, value }]),
}
