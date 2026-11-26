import { useSyncExternalStore } from 'react'

/*
 * Theme (SPEC V36). The default follows the system. The toggle stores an
 * override that wins from then on. index.html applies a stored override before
 * first paint; this module keeps it in sync afterwards.
 */

export type Theme = 'light' | 'dark'
export type ThemePreference = Theme | 'system'

export const THEME_STORAGE_KEY = 'instagrid.theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

type ReadStorage = Pick<Storage, 'getItem'>

export function readPreference(storage: ReadStorage | null): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): Theme {
  if (preference !== 'system') return preference
  return systemPrefersDark ? 'dark' : 'light'
}

/** What the toggle should switch to: the opposite of what is showing. */
export const oppositeTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark')

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

const safeStorage = (): Storage | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches

export function currentTheme(): Theme {
  return resolveTheme(readPreference(safeStorage()), systemPrefersDark())
}

export function setThemePreference(preference: ThemePreference) {
  const root = document.documentElement
  try {
    if (preference === 'system') safeStorage()?.removeItem(THEME_STORAGE_KEY)
    else safeStorage()?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage unavailable: the choice still applies for this visit.
  }
  if (preference === 'system') delete root.dataset.theme
  else root.dataset.theme = preference
  notify()
}

export function toggleTheme() {
  const showing = (document.documentElement.dataset.theme as Theme | undefined) ?? currentTheme()
  setThemePreference(oppositeTheme(showing))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', listener)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', listener)
  }
}

const snapshot = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ?? currentTheme()

/** The theme currently showing; re-renders when the toggle or the system changes it. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, snapshot, () => 'light')
}
