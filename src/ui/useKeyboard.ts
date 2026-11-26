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
      if (overlays.dialog || overlays.confirm) return
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
      } else if (key === 'Enter' && event.target === document.body) enterAdjust()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
