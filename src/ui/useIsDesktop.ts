import { useSyncExternalStore } from 'react'

/** Matches the `desk` breakpoint in index.css and DESIGN.md (above 820px). */
const QUERY = '(min-width: 821px)'

function subscribe(listener: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

/**
 * Whether the desktop layout is showing. Only one layout is mounted at a time,
 * so controls and their ids are never duplicated (SPEC V33 keeps state across
 * the switch because it lives in the stores).
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true
  )
}
