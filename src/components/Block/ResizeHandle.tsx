import { useRef } from 'react'
import { useStore } from '@/store/useStore'
import { hasCollision, COLS, defaultCellOrder } from '@/utils/gridUtils'
import type { ImageBlock } from '@/store/types'

type Edge = 'right' | 'bottom' | 'corner-br'

interface Props {
  block: ImageBlock
  cellW: number
  cellH: number
  edge: Edge
}

export default function ResizeHandle({ block, cellW, cellH, edge }: Props) {
  const updateBlock = useStore((s) => s.updateBlock)
  const blocks = useStore((s) => s.blocks)
  const startRef = useRef<{ mouseX: number; mouseY: number; colSpan: number; rowSpan: number } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    startRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      colSpan: block.colSpan,
      rowSpan: block.rowSpan,
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.mouseX
    const dy = e.clientY - startRef.current.mouseY

    let newColSpan = startRef.current.colSpan
    let newRowSpan = startRef.current.rowSpan

    if (edge === 'right' || edge === 'corner-br') {
      newColSpan = Math.max(1, Math.min(COLS - block.col, Math.round(startRef.current.colSpan + dx / cellW)))
    }
    if (edge === 'bottom' || edge === 'corner-br') {
      newRowSpan = Math.max(1, Math.round(startRef.current.rowSpan + dy / cellH))
    }

    if (newColSpan === block.colSpan && newRowSpan === block.rowSpan) return

    // V1: reject if new span collides
    if (hasCollision(blocks, block.col, block.row, newColSpan, newRowSpan, block.id)) return

    updateBlock(block.id, {
      colSpan: newColSpan,
      rowSpan: newRowSpan,
      cellOrder: defaultCellOrder(newColSpan, newRowSpan),
    })
  }

  function onPointerUp(e: React.PointerEvent) {
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    startRef.current = null
  }

  const cursor = edge === 'right' ? 'ew-resize' : edge === 'bottom' ? 'ns-resize' : 'nwse-resize'
  const SIZE = 12

  const style: React.CSSProperties = {
    position: 'absolute',
    background: 'var(--color-accent)',
    opacity: 0.85,
    zIndex: 20,
    cursor,
    borderRadius: 2,
    ...(edge === 'right' && {
      right: 0, top: '50%', transform: 'translateY(-50%)',
      width: SIZE / 2, height: SIZE * 3,
    }),
    ...(edge === 'bottom' && {
      bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: SIZE * 3, height: SIZE / 2,
    }),
    ...(edge === 'corner-br' && {
      right: 0, bottom: 0,
      width: SIZE, height: SIZE,
    }),
  }

  return (
    <div
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    />
  )
}
