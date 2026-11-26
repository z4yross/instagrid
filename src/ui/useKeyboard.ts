import { useEffect } from 'react'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import {
  copySelection,
  deleteSelection,
  duplicateSelection,
  enterAdjust,
  paste,
  redo,
  selectedBlocks,
  undo,
} from './actions'
import { nudge, zoomBy } from './adjust'
import { useOverlays } from './overlays'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

/** Desktop keyboard map (SPEC V26). Inactive while a dialog is open or a field has focus. */
export function useKeyboard() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const overlays = useOverlays.getState()
      if (overlays.dialog || overlays.confirm || overlays.symmetry) return
      if (isTyping(event.target)) return

      const ui = useUi.getState()
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (key === 'Escape') {
        if (ui.mode === 'adjust') ui.exitAdjust()
        else if (ui.mode === 'preview') ui.togglePreview()
        else ui.clearSelection()
        return
      }
      if (ui.mode === 'preview') return

      if (mod && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === 'y') {
        event.preventDefault()
        redo()
        return
      }

      if (ui.mode === 'adjust') {
        if (key in ARROWS) {
          event.preventDefault()
          const [dx, dy] = ARROWS[key]
          nudge(dx, dy, event.shiftKey ? 0.1 : 0.02)
        } else if (key === '+' || key === '=') zoomBy(1.1)
        else if (key === '-') zoomBy(1 / 1.1)
        else if (key === 'Enter') ui.exitAdjust()
        return
      }

      if (mod && key === 'a') {
        event.preventDefault()
        ui.select(
          useProject.getState().blocks.map((b) => b.id),
          null
        )
      } else if (mod && key === 'd') {
        event.preventDefault()
        duplicateSelection()
      } else if (mod && key === 'c') copySelection()
      else if (mod && key === 'v') paste()
      else if (key === 'Delete' || key === 'Backspace') {
        if (selectedBlocks().length) {
          event.preventDefault()
          deleteSelection()
        }
      } else if (key in ARROWS && selectedBlocks().length) {
        // Arrows move the selection one cell; with Shift they resize a single block.
        event.preventDefault()
        const [dx, dy] = ARROWS[key]
        const selection = selectedBlocks()
        const project = useProject.getState()
        if (event.shiftKey && selection.length === 1) {
          const block = selection[0]
          project.resize(block.id, {
            col: block.col,
            row: block.row,
            colSpan: Math.max(1, block.colSpan + dx),
            rowSpan: Math.max(1, block.rowSpan + dy),
          })
        } else {
          project.move(
            selection.map((b) => b.id),
            dx,
            dy
          )
        }
      } else if (key === 'Enter' || key === ' ') {
        // On a focused block: select it; Enter on the selected block opens Adjust.
        const id = event.target instanceof HTMLElement ? event.target.dataset.blockId : undefined
        if (id) {
          event.preventDefault()
          if (key === 'Enter' && ui.selection.length === 1 && ui.selection[0] === id) enterAdjust()
          else if (event.shiftKey || mod) ui.toggleSelected(id)
          else ui.select([id])
        } else if (key === 'Enter' && event.target === document.body) {
          enterAdjust()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
