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
let quotaWarned = false

export function saveState(state: PersistedState, debounceMs = 500) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const serialized = JSON.stringify(state)
      localStorage.setItem(STORAGE_KEY, serialized)
      quotaWarned = false // reset on success
    } catch (err) {
      // V18: catch quota errors, log + warn user
      console.error('Failed to save state to localStorage:', err)
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        if (!quotaWarned) {
          console.warn('localStorage quota exceeded. State will not persist. Consider reducing image count.')
          quotaWarned = true
          // could dispatch event here for UI notification
        }
      }
    }
  }, debounceMs)
}
