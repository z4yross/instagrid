import type { ImageBlock, UploadedImage } from '@/store/types'

const STORAGE_KEY = 'insta-grid-state'

export interface PersistedState {
  images: UploadedImage[]
  blocks: ImageBlock[]
  gridRows: number
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load state from localStorage:', err)
    return null
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function saveState(state: PersistedState, debounceMs = 500) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (err) {
      console.error('Failed to save state to localStorage:', err)
    }
  }, debounceMs)
}
