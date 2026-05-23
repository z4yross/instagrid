import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { hasCollision, COLS } from '@/utils/gridUtils'

export default function useKeyboard() {
  const { undo, redo } = useStore.temporal.getState()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // ignore when typing in inputs
      if ((e.target as HTMLElement).matches('input,textarea,select')) return

      const ctrl = e.ctrlKey || e.metaKey
      const { selectedBlockId, cellModeBlockId, blocks, removeBlock, setSelectedBlock, setCellMode, updateBlock } = useStore.getState()

      // undo/redo
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }

      // escape — exit cell mode first, then deselect
      if (e.key === 'Escape') {
        if (cellModeBlockId) { setCellMode(null); return }
        if (selectedBlockId) { setSelectedBlock(null); return }
      }

      // delete/backspace — remove selected block
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        e.preventDefault()
        removeBlock(selectedBlockId)
        return
      }

      // arrow keys — move selected block 1 cell
      if (selectedBlockId && !cellModeBlockId && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault()
        const block = blocks.find(b => b.id === selectedBlockId)
        if (!block) return
        let { col, row } = block
        if (e.key === 'ArrowUp')    row = Math.max(0, row - 1)
        if (e.key === 'ArrowDown')  row = row + 1
        if (e.key === 'ArrowLeft')  col = Math.max(0, col - 1)
        if (e.key === 'ArrowRight') col = Math.min(COLS - block.colSpan, col + 1)
        if (!hasCollision(blocks, col, row, block.colSpan, block.rowSpan, block.id)) {
          updateBlock(block.id, { col, row })
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo])
}
