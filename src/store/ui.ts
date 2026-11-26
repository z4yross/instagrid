import { create } from 'zustand'
import type { Block } from '@/core/types'

export type CanvasMode = 'arrange' | 'adjust' | 'preview'
export type SaveStatus = 'saved' | 'saving' | 'error'

export const MIN_ZOOM_ROWS = 2
export const MAX_ZOOM_ROWS = 8

/** Interface state. None of it is undoable or saved with the project (SPEC V13). */
interface UiState {
  selection: string[]
  /** Last block picked without Shift; the anchor of a range selection. */
  anchorId: string | null
  mode: CanvasMode
  /** Block being adjusted while mode is 'adjust'. */
  adjustId: string | null
  /** Touch multi-select: taps toggle blocks instead of replacing the selection. */
  multiSelect: boolean
  /** How many rows fit in view (SPEC V32). null = fit the viewport. */
  zoomRows: number | null
  saveStatus: SaveStatus
  clipboard: Block[]
  /** Blocks that just came out of a split or a join; drives a short transition (SPEC V29). */
  flash: { ids: string[]; kind: 'split' | 'join' } | null

  select: (ids: readonly string[], anchorId?: string | null) => void
  toggleSelected: (id: string) => void
  clearSelection: () => void
  setMultiSelect: (on: boolean) => void

  enterAdjust: (id: string) => void
  exitAdjust: () => void
  togglePreview: () => void

  setZoomRows: (rows: number | null) => void
  setSaveStatus: (status: SaveStatus) => void
  setClipboard: (blocks: Block[]) => void
  setFlash: (flash: UiState['flash']) => void
}

export const useUi = create<UiState>()((set, get) => ({
  selection: [],
  anchorId: null,
  mode: 'arrange',
  adjustId: null,
  multiSelect: false,
  zoomRows: null,
  saveStatus: 'saved',
  clipboard: [],
  flash: null,

  select: (ids, anchorId) =>
    set({
      selection: [...new Set(ids)],
      anchorId: anchorId === undefined ? (ids[ids.length - 1] ?? null) : anchorId,
    }),

  toggleSelected: (id) => {
    const { selection } = get()
    const next = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id]
    set({ selection: next, anchorId: id, multiSelect: get().multiSelect && next.length > 0 })
  },

  clearSelection: () => set({ selection: [], anchorId: null, multiSelect: false }),

  setMultiSelect: (on) => set({ multiSelect: on }),

  enterAdjust: (id) =>
    set({ mode: 'adjust', adjustId: id, selection: [id], anchorId: id, multiSelect: false }),

  exitAdjust: () => {
    if (get().mode === 'adjust') set({ mode: 'arrange', adjustId: null })
  },

  togglePreview: () =>
    set(
      get().mode === 'preview'
        ? { mode: 'arrange' }
        : { mode: 'preview', adjustId: null, selection: [], anchorId: null, multiSelect: false }
    ),

  setZoomRows: (rows) =>
    set({
      zoomRows:
        rows === null ? null : Math.min(MAX_ZOOM_ROWS, Math.max(MIN_ZOOM_ROWS, Math.round(rows))),
    }),

  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setClipboard: (clipboard) => set({ clipboard }),
  setFlash: (flash) => set({ flash }),
}))

/** Selection limited to blocks that still exist (an undo can remove selected blocks). */
export function liveSelection(selection: readonly string[], blocks: readonly Block[]): string[] {
  const ids = new Set(blocks.map((b) => b.id))
  return selection.filter((id) => ids.has(id))
}
