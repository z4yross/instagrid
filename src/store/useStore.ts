import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { temporal } from 'zundo'
import type { AppState, ImageBlock, UploadedImage } from './types'
import { loadState, saveState } from '@/utils/storage'

function ensureGridRows(blocks: ImageBlock[], current: number): number {
  const maxRow = blocks.reduce((m, b) => Math.max(m, b.row + b.rowSpan), 0)
  return Math.max(current, maxRow + 1, 3)
}

// Load persisted state
const persisted = loadState()

const useStore = create<AppState>()(
  subscribeWithSelector(
    temporal(
      (set, _get) => ({
        images: persisted?.images ?? [],
        blocks: persisted?.blocks ?? [],
        gridRows: persisted?.gridRows ?? 3,
        selectedBlockIds: [],
        showGuides: true,

      addImage: (img: UploadedImage) =>
        set((s) => ({ images: [...s.images, img] })),

      addBlock: (block: ImageBlock) =>
        set((s) => {
          const blocks = [...s.blocks, block]
          return { blocks, gridRows: ensureGridRows(blocks, s.gridRows) }
        }),

      updateBlock: (id: string, patch: Partial<ImageBlock>) =>
        set((s) => {
          const blocks = s.blocks.map((b) =>
            b.id === id ? { ...b, ...patch } : b
          )
          return { blocks, gridRows: ensureGridRows(blocks, s.gridRows) }
        }),

      updateBlocks: (ids: string[], patch: Partial<ImageBlock>) =>
        set((s) => {
          const blocks = s.blocks.map((b) =>
            ids.includes(b.id) ? { ...b, ...patch } : b
          )
          return { blocks, gridRows: ensureGridRows(blocks, s.gridRows) }
        }),

      removeBlock: (id: string) =>
        set((s) => {
          const blocks = s.blocks.filter((b) => b.id !== id)
          return {
            blocks,
            gridRows: ensureGridRows(blocks, 3),
            selectedBlockIds: s.selectedBlockIds.filter((bid) => bid !== id),
          }
        }),

      removeBlocks: (ids: string[]) =>
        set((s) => {
          const blocks = s.blocks.filter((b) => !ids.includes(b.id))
          return {
            blocks,
            gridRows: ensureGridRows(blocks, 3),
            selectedBlockIds: s.selectedBlockIds.filter((bid) => !ids.includes(bid)),
          }
        }),

      setSelectedBlocks: (ids) => set({ selectedBlockIds: ids }),

      toggleBlockSelection: (id) =>
        set((s) => ({
          selectedBlockIds: s.selectedBlockIds.includes(id)
            ? s.selectedBlockIds.filter((bid) => bid !== id)
            : [...s.selectedBlockIds, id],
        })),

      setGridRows: (rows) => set({ gridRows: Math.max(rows, 3) }),

      toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),

      clearCanvas: () =>
        set({ blocks: [], gridRows: 3, selectedBlockIds: [] }),
    }),
    {
      // V5: undo/redo only covers canvas mutations, not image uploads
      partialize: (state) => ({
        blocks: state.blocks,
        gridRows: state.gridRows,
      }),
    }
  )
  )
)

// V15: persist state on mutation (debounced 500ms)
useStore.subscribe(
  (state) => ({ images: state.images, blocks: state.blocks, gridRows: state.gridRows }),
  (state) => saveState(state),
  { equalityFn: (a, b) => a === b }
)

export default useStore
export { useStore }
