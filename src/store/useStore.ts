import { create } from 'zustand'
import { temporal } from 'zundo'
import type { AppState, ImageBlock, UploadedImage } from './types'

function ensureGridRows(blocks: ImageBlock[], current: number): number {
  const maxRow = blocks.reduce((m, b) => Math.max(m, b.row + b.rowSpan), 0)
  return Math.max(current, maxRow + 1, 3)
}

const useStore = create<AppState>()(
  temporal(
    (set, _get) => ({
      images: [],
      blocks: [],
      gridRows: 3,
      selectedBlockId: null,
      cellModeBlockId: null,
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

      removeBlock: (id: string) =>
        set((s) => {
          const blocks = s.blocks.filter((b) => b.id !== id)
          return {
            blocks,
            gridRows: ensureGridRows(blocks, 3),
            selectedBlockId:
              s.selectedBlockId === id ? null : s.selectedBlockId,
            cellModeBlockId:
              s.cellModeBlockId === id ? null : s.cellModeBlockId,
          }
        }),

      setSelectedBlock: (id) => set({ selectedBlockId: id }),

      setCellMode: (id) => set({ cellModeBlockId: id }),

      setGridRows: (rows) => set({ gridRows: Math.max(rows, 3) }),

      toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),

      clearCanvas: () =>
        set({ blocks: [], gridRows: 3, selectedBlockId: null, cellModeBlockId: null }),
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

export default useStore
export { useStore }
