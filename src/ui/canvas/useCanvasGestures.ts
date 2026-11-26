import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { clampTransform, frameSize } from '@/core/geometry'
import type { Block, Rect, Size, Transform } from '@/core/types'
import { imageById, useLibrary } from '@/store/library'
import { useProject } from '@/store/project'
import { liveSelection, useUi } from '@/store/ui'
import {
  blocksInMarquee,
  cellAtPoint,
  dragToCells,
  movePreview,
  rangeBetween,
  resizePreview,
  resizeRect,
} from './layout'
import type { Corner, DropPreview } from './layout'

/*
 * Pointer handling for the canvas (SPEC V20-V23).
 * Arrange: click selects, drag moves, corner handles resize, marquee on empty
 * canvas. On touch a plain drag scrolls; a long press picks the block up.
 * Adjust: drag pans the photo, wheel or pinch zooms it.
 */

const DRAG_THRESHOLD = 4
const LONG_PRESS_MS = 250
const LONG_PRESS_SLOP = 8
const DOUBLE_TAP_MS = 350
const WHEEL_COMMIT_MS = 250

type Point = { x: number; y: number }

type Gesture =
  | { kind: 'idle' }
  | {
      kind: 'pending'
      pointerId: number
      start: Point
      blockId: string | null
      touch: boolean
      timer: ReturnType<typeof setTimeout> | null
      modifiers: { toggle: boolean; range: boolean }
    }
  | { kind: 'move'; pointerId: number; start: Point; ids: string[] }
  | { kind: 'resize'; pointerId: number; id: string; corner: Corner; rect: Rect }
  | { kind: 'marquee'; pointerId: number; start: Point }
  | {
      kind: 'pan'
      pointers: Map<number, Point>
      id: string
      startTransform: Transform
      startCenter: Point
      startDistance: number
    }

export interface GestureVisual {
  /** Blocks being dragged and their pixel offset. */
  dragging: { ids: string[]; offset: Point } | null
  /** Where the drag or resize would land. */
  preview: DropPreview | null
  /** Marquee corners in grid pixels. */
  marquee: { a: Point; b: Point } | null
}

const NO_VISUAL: GestureVisual = { dragging: null, preview: null, marquee: null }

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const center = (points: Point[]): Point => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
})
const spread = (points: Point[]) => (points.length < 2 ? 0 : distance(points[0], points[1]))

export function useCanvasGestures(
  scrollRef: RefObject<HTMLDivElement | null>,
  gridRef: RefObject<HTMLDivElement | null>,
  pitch: Size
) {
  const [visual, setVisual] = useState<GestureVisual>(NO_VISUAL)
  const gesture = useRef<Gesture>({ kind: 'idle' })
  const lastTap = useRef<{ id: string; at: number } | null>(null)
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pitchRef = useRef(pitch)

  useEffect(() => {
    pitchRef.current = pitch
  }, [pitch])

  const project = () => useProject.getState()
  const ui = () => useUi.getState()

  const toGrid = (clientX: number, clientY: number): Point => {
    const box = gridRef.current?.getBoundingClientRect()
    return { x: clientX - (box?.left ?? 0), y: clientY - (box?.top ?? 0) }
  }

  const reset = () => {
    const g = gesture.current
    if (g.kind === 'pending' && g.timer) clearTimeout(g.timer)
    gesture.current = { kind: 'idle' }
    setVisual(NO_VISUAL)
  }

  /* ---------- Adjust: pan and zoom the photo ---------- */

  const adjustedBlock = (): { block: Block; image: Size } | null => {
    const block = project().blocks.find((b) => b.id === ui().adjustId)
    const image = imageById(useLibrary.getState().images, block?.imageId)
    return block && image ? { block, image } : null
  }

  const applyTransform = (id: string, next: Transform) => {
    const target = adjustedBlock()
    if (!target || target.block.id !== id) return
    const clamped = clampTransform(
      frameSize(target.block, { width: 3, height: 4 }),
      target.image,
      next
    )
    project().updateGesture(
      project().blocks.map((b) => (b.id === id ? { ...b, transform: clamped } : b))
    )
  }

  const startPan = (pointerId: number, point: Point) => {
    const target = adjustedBlock()
    if (!target) return
    if (wheelTimer.current) {
      clearTimeout(wheelTimer.current)
      wheelTimer.current = null
    } else {
      project().beginGesture()
    }
    gesture.current = {
      kind: 'pan',
      pointers: new Map([[pointerId, point]]),
      id: target.block.id,
      startTransform: target.block.transform,
      startCenter: point,
      startDistance: 0,
    }
  }

  /** Re-anchor a pan when a finger is added or lifted, so the photo does not jump. */
  const rebasePan = (g: Extract<Gesture, { kind: 'pan' }>) => {
    const target = adjustedBlock()
    const points = [...g.pointers.values()]
    g.startTransform = target?.block.transform ?? g.startTransform
    g.startCenter = center(points)
    g.startDistance = spread(points)
  }

  const updatePan = (g: Extract<Gesture, { kind: 'pan' }>) => {
    const target = adjustedBlock()
    if (!target) return
    const points = [...g.pointers.values()]
    const now = center(points)
    const p = pitchRef.current
    const frame = frameSize(target.block, p)
    const scale = g.startDistance > 0 ? spread(points) / g.startDistance : 1
    applyTransform(g.id, {
      ...g.startTransform,
      zoom: g.startTransform.zoom * scale,
      panX: g.startTransform.panX + (now.x - g.startCenter.x) / frame.width,
      panY: g.startTransform.panY + (now.y - g.startCenter.y) / frame.height,
    })
  }

  /* ---------- Arrange ---------- */

  const selectOnClick = (id: string, modifiers: { toggle: boolean; range: boolean }) => {
    const { anchorId, multiSelect } = ui()
    if (modifiers.toggle || multiSelect) ui().toggleSelected(id)
    else if (modifiers.range && anchorId) {
      ui().select(rangeBetween(project().blocks, anchorId, id), anchorId)
    } else ui().select([id])
  }

  const beginMove = (pointerId: number, start: Point, blockId: string) => {
    const selection = liveSelection(ui().selection, project().blocks)
    const ids = selection.includes(blockId) ? selection : [blockId]
    if (!selection.includes(blockId)) ui().select([blockId])
    gesture.current = { kind: 'move', pointerId, start, ids }
    setVisual({ dragging: { ids, offset: { x: 0, y: 0 } }, preview: null, marquee: null })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const mode = ui().mode
    if (mode === 'preview') return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const target = event.target as Element
    const blockId = target.closest<HTMLElement>('[data-block-id]')?.dataset.blockId ?? null
    const corner = target.closest<HTMLElement>('[data-handle]')?.dataset.handle as
      | Corner
      | undefined
    const point = { x: event.clientX, y: event.clientY }
    const touch = event.pointerType === 'touch'

    if (mode === 'adjust') {
      const g = gesture.current
      if (g.kind === 'pan') {
        g.pointers.set(event.pointerId, point)
        rebasePan(g)
      } else if (blockId === ui().adjustId) {
        startPan(event.pointerId, point)
      } else {
        ui().exitAdjust()
        return
      }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }

    if (gesture.current.kind !== 'idle') return

    if (corner && blockId) {
      const block = project().blocks.find((b) => b.id === blockId)
      if (!block) return
      event.currentTarget.setPointerCapture(event.pointerId)
      gesture.current = {
        kind: 'resize',
        pointerId: event.pointerId,
        id: blockId,
        corner,
        rect: block,
      }
      return
    }

    const pending: Extract<Gesture, { kind: 'pending' }> = {
      kind: 'pending',
      pointerId: event.pointerId,
      start: point,
      blockId,
      touch,
      timer: null,
      modifiers: { toggle: event.ctrlKey || event.metaKey, range: event.shiftKey },
    }
    if (touch && blockId) {
      // Long press picks the block up; until then the browser may scroll.
      pending.timer = setTimeout(() => {
        if (gesture.current !== pending) return
        if (!liveSelection(ui().selection, project().blocks).includes(blockId)) {
          if (ui().multiSelect) ui().toggleSelected(blockId)
          else ui().select([blockId])
        }
        ui().setMultiSelect(true)
        navigator.vibrate?.(10)
        beginMove(pending.pointerId, pending.start, blockId)
      }, LONG_PRESS_MS)
    }
    if (!touch) event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = pending
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const point = { x: event.clientX, y: event.clientY }
    const p = pitchRef.current

    if (g.kind === 'pan') {
      if (!g.pointers.has(event.pointerId)) return
      g.pointers.set(event.pointerId, point)
      updatePan(g)
      return
    }
    if (g.kind === 'idle' || g.pointerId !== event.pointerId) return

    if (g.kind === 'pending') {
      const moved = distance(point, g.start)
      if (g.touch) {
        // Finger moved before the long press fired: this is a scroll, let it go.
        if (moved > LONG_PRESS_SLOP) reset()
        return
      }
      if (moved < DRAG_THRESHOLD) return
      if (g.blockId) beginMove(g.pointerId, g.start, g.blockId)
      else gesture.current = { kind: 'marquee', pointerId: g.pointerId, start: g.start }
      return
    }

    if (g.kind === 'move') {
      const offset = { x: point.x - g.start.x, y: point.y - g.start.y }
      const { dCol, dRow } = dragToCells(offset.x, offset.y, p)
      setVisual({
        dragging: { ids: g.ids, offset },
        preview: movePreview(project().blocks, g.ids, dCol, dRow),
        marquee: null,
      })
      return
    }

    if (g.kind === 'resize') {
      const block = project().blocks.find((b) => b.id === g.id)
      if (!block) return
      const at = toGrid(point.x, point.y)
      g.rect = resizeRect(block, g.corner, cellAtPoint(at.x, at.y, p))
      setVisual({
        dragging: null,
        preview: resizePreview(project().blocks, g.id, g.rect),
        marquee: null,
      })
      return
    }

    if (g.kind === 'marquee') {
      const a = toGrid(g.start.x, g.start.y)
      const b = toGrid(point.x, point.y)
      setVisual({ dragging: null, preview: null, marquee: { a, b } })
      ui().select(blocksInMarquee(project().blocks, a, b, p), null)
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    const point = { x: event.clientX, y: event.clientY }

    if (g.kind === 'pan') {
      g.pointers.delete(event.pointerId)
      if (g.pointers.size > 0) {
        rebasePan(g)
        return
      }
      project().commitGesture()
      gesture.current = { kind: 'idle' }
      return
    }
    if (g.kind === 'idle' || g.pointerId !== event.pointerId) return

    if (g.kind === 'pending') {
      const id = g.blockId
      reset()
      if (!id) {
        ui().clearSelection()
        return
      }
      const now = performance.now()
      const block = project().blocks.find((b) => b.id === id)
      const isDouble = lastTap.current?.id === id && now - lastTap.current.at < DOUBLE_TAP_MS
      lastTap.current = { id, at: now }
      if (isDouble && block?.kind === 'image' && !g.modifiers.toggle && !g.modifiers.range) {
        lastTap.current = null
        ui().enterAdjust(id)
        return
      }
      selectOnClick(id, g.modifiers)
      return
    }

    if (g.kind === 'move') {
      const { dCol, dRow } = dragToCells(point.x - g.start.x, point.y - g.start.y, pitchRef.current)
      // An invalid drop is rejected by the store and the blocks spring back (SPEC V22).
      project().move(g.ids, dCol, dRow)
    } else if (g.kind === 'resize') {
      project().resize(g.id, g.rect)
    }
    reset()
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current
    if (g.kind === 'pan') {
      g.pointers.delete(event.pointerId)
      if (g.pointers.size === 0) {
        project().cancelGesture()
        gesture.current = { kind: 'idle' }
      }
      return
    }
    reset()
  }

  // Native listeners: a picked-up block must not scroll the page, and the wheel
  // zooms the photo while adjusting. Both need non-passive handlers.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onTouchMove = (event: TouchEvent) => {
      const kind = gesture.current.kind
      if (kind === 'move' || kind === 'resize' || kind === 'pan') event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      const state = useUi.getState()
      if (state.mode !== 'adjust' || !state.adjustId) return
      const blocks = useProject.getState().blocks
      const block = blocks.find((b) => b.id === state.adjustId)
      const image = imageById(useLibrary.getState().images, block?.imageId)
      if (!block || !image) return
      event.preventDefault()

      if (wheelTimer.current) clearTimeout(wheelTimer.current)
      else if (gesture.current.kind !== 'pan') useProject.getState().beginGesture()
      const zoom = block.transform.zoom * Math.exp(-event.deltaY * 0.0015)
      const next = clampTransform(frameSize(block, { width: 3, height: 4 }), image, {
        ...block.transform,
        zoom,
      })
      useProject
        .getState()
        .updateGesture(blocks.map((b) => (b.id === block.id ? { ...b, transform: next } : b)))
      wheelTimer.current = setTimeout(() => {
        wheelTimer.current = null
        if (gesture.current.kind !== 'pan') useProject.getState().commitGesture()
      }, WHEEL_COMMIT_MS)
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('wheel', onWheel)
    }
  }, [scrollRef])

  return {
    visual,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  }
}
