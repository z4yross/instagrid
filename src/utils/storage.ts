import type { ImageBlock, UploadedImage } from '@/store/types'

const STORAGE_KEY = 'insta-grid-state'
const DB_NAME = 'insta-grid-db'
const DB_VERSION = 2
const STORE_NAME = 'images'
const PROFILES_STORE = 'profiles'

export interface PersistedState {
  images: UploadedImage[]
  blocks: ImageBlock[]
  gridRows: number
}

// V22: IndexedDB for images, localStorage for blocks/gridRows
interface LocalStorageState {
  blocks: ImageBlock[]
  gridRows: number
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PROFILES_STORE)) {
        db.createObjectStore(PROFILES_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

async function loadImagesFromIDB(): Promise<UploadedImage[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to load images from IndexedDB:', err)
    return []
  }
}

async function saveImagesToIDB(images: UploadedImage[]): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    // Clear existing images
    store.clear()

    // Add all images
    for (const img of images) {
      store.add(img)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to save images to IndexedDB:', err)
  }
}

export async function clearImagesFromIDB(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to clear images from IndexedDB:', err)
  }
}

export async function deleteImageFromIDB(id: string): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to delete image from IndexedDB:', err)
  }
}

export async function getImageCountFromIDB(): Promise<number> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.count()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to get image count from IndexedDB:', err)
    return 0
  }
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    // Load blocks + gridRows from localStorage
    const raw = localStorage.getItem(STORAGE_KEY)
    const localState: LocalStorageState = raw ? JSON.parse(raw) : { blocks: [], gridRows: 3 }

    // Load images from IndexedDB
    const images = await loadImagesFromIDB()

    return {
      images,
      blocks: localState.blocks,
      gridRows: localState.gridRows,
    }
  } catch (err) {
    console.error('Failed to load state:', err)
    return null
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let quotaWarned = false

export function saveState(state: PersistedState, debounceMs = 500) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      // Save blocks + gridRows to localStorage (small)
      const localState: LocalStorageState = {
        blocks: state.blocks,
        gridRows: state.gridRows,
      }
      const serialized = JSON.stringify(localState)
      localStorage.setItem(STORAGE_KEY, serialized)
      quotaWarned = false

      // Save images to IndexedDB (large)
      await saveImagesToIDB(state.images)
    } catch (err) {
      // V18: catch quota errors, log + warn user
      console.error('Failed to save state:', err)
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        if (!quotaWarned) {
          console.warn('localStorage quota exceeded. State may not fully persist.')
          quotaWarned = true
        }
      }
    }
  }, debounceMs)
}

// T61: Profile management
export interface Profile {
  id?: number
  name: string
  timestamp: number
  blocks: ImageBlock[]
  gridRows: number
}

export async function saveProfile(name: string, blocks: ImageBlock[], gridRows: number): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(PROFILES_STORE, 'readwrite')
    const store = tx.objectStore(PROFILES_STORE)
    const profile: Profile = {
      name,
      timestamp: Date.now(),
      blocks,
      gridRows,
    }
    store.add(profile)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to save profile:', err)
  }
}

export async function listProfiles(): Promise<Profile[]> {
  try {
    const db = await openDB()
    const tx = db.transaction(PROFILES_STORE, 'readonly')
    const store = tx.objectStore(PROFILES_STORE)
    const request = store.getAll()

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to list profiles:', err)
    return []
  }
}

export async function loadProfile(id: number): Promise<Profile | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(PROFILES_STORE, 'readonly')
    const store = tx.objectStore(PROFILES_STORE)
    const request = store.get(id)

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.error('Failed to load profile:', err)
    return null
  }
}

export async function deleteProfile(id: number): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(PROFILES_STORE, 'readwrite')
    const store = tx.objectStore(PROFILES_STORE)
    store.delete(id)

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (err) {
    console.error('Failed to delete profile:', err)
  }
}
