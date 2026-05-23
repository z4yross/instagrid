import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

export default function useKeyboard() {
  const { undo, redo } = useStore.temporal.getState()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // ignore when typing in inputs
      if ((e.target as HTMLElement).matches('input,textarea,select')) return

      const ctrl = e.ctrlKey || e.metaKey
      const { selectedBlockIds, blocks, removeBlocks, setSelectedBlocks, updateBlock, visibleRows, setVisibleRows } = useStore.getState()

      // undo/redo
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }

      // escape — deselect
      if (e.key === 'Escape') {
        if (selectedBlockIds.length > 0) { setSelectedBlocks([]); return }
      }

      // delete/backspace — remove selected blocks
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIds.length > 0) {
        e.preventDefault()
        removeBlocks(selectedBlockIds)
        return
      }

      // V16: arrow keys pan image, direction rotates with image rotation
      if (selectedBlockIds.length > 0 && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id))
        if (selectedBlocks.length === 0) return

        const PAN_STEP = 10
        let dx = 0
        let dy = 0

        // base direction (rotation = 0)
        if (e.key === 'ArrowLeft')  dx = -PAN_STEP
        if (e.key === 'ArrowRight') dx = PAN_STEP
        if (e.key === 'ArrowUp')    dy = -PAN_STEP
        if (e.key === 'ArrowDown')  dy = PAN_STEP

        // apply to all selected blocks
        selectedBlocks.forEach((block) => {
          // rotate direction by image rotation
          const rot = block.transform.rotation
          let rotatedDx = dx
          let rotatedDy = dy

          if (rot === 90) {
            rotatedDx = dy
            rotatedDy = -dx
          } else if (rot === 180) {
            rotatedDx = -dx
            rotatedDy = -dy
          } else if (rot === 270) {
            rotatedDx = -dy
            rotatedDy = dx
          }

          updateBlock(block.id, {
            transform: {
              ...block.transform,
              panX: block.transform.panX + rotatedDx,
              panY: block.transform.panY + rotatedDy,
            },
          })
        })
      }

      // T75: +/- context-aware zoom
      if (e.key === '+' || e.key === '=' || e.key === '-') {
        e.preventDefault()
        const isZoomIn = e.key === '+' || e.key === '='
        const ZOOM_STEP = 0.1

        if (selectedBlockIds.length > 0) {
          // Image zoom: adjust transform.zoom for selected blocks
          const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id))
          selectedBlocks.forEach((block) => {
            const newZoom = isZoomIn
              ? Math.min(10, block.transform.zoom + ZOOM_STEP)
              : Math.max(0.1, block.transform.zoom - ZOOM_STEP)

            updateBlock(block.id, {
              transform: {
                ...block.transform,
                zoom: newZoom,
              },
            })
          })
        } else {
          // Grid zoom: adjust visibleRows
          const newRows = isZoomIn
            ? Math.max(1, visibleRows - 1)  // zoom in = fewer rows
            : Math.min(10, visibleRows + 1) // zoom out = more rows

          setVisibleRows(newRows)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])
}
