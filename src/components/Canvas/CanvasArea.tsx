import { useRef, useState, useCallback, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useStore } from '@/store/useStore'
import { cellPixelSize, hasCollision, COLS } from '@/utils/gridUtils'
import GridCanvas from './GridCanvas'
import DropZone from './DropZone'
import Block from '../Block/Block'
import type { ImageBlock } from '@/store/types'

interface Props {
  onLowRes?: (names: string[]) => void
}

export default function CanvasArea({ onLowRes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [activeId, setActiveId] = useState<string | null>(null)

  const blocks = useStore((s) => s.blocks)
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const visibleRows = useStore((s) => s.visibleRows)
  const updateBlock = useStore((s) => s.updateBlock)
  const setSelectedBlocks = useStore((s) => s.setSelectedBlocks)
  const setVisibleRows = useStore((s) => s.setVisibleRows)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w: cellW, h: cellH } = cellPixelSize(dims.w || 600, visibleRows, dims.h || 0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const getCellSize = useCallback(() => cellPixelSize(
    containerRef.current?.clientWidth ?? 600,
    visibleRows,
    containerRef.current?.clientHeight ?? 0
  ), [visibleRows])

  function snapToGrid(pixelX: number, pixelY: number): { col: number; row: number } {
    const { w: cW, h: cH } = getCellSize()
    const col = Math.max(0, Math.min(COLS - 1, Math.round(pixelX / cW)))
    const row = Math.max(0, Math.round(pixelY / cH))
    return { col, row }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, delta } = e
    const draggedBlock = blocks.find((b) => b.id === active.id) as ImageBlock | undefined
    if (!draggedBlock) return

    const { w: cW, h: cH } = getCellSize()

    // V12: if part of group, move all selected blocks
    const isGroupDrag = selectedBlockIds.includes(draggedBlock.id) && selectedBlockIds.length > 1

    if (isGroupDrag) {
      const deltaCol = Math.round(delta.x / cW)
      const deltaRow = Math.round(delta.y / cH)

      // check if all blocks can move
      const selectedBlocks = blocks.filter((b) => selectedBlockIds.includes(b.id))
      const canMove = selectedBlocks.every((b) => {
        const newCol = Math.max(0, Math.min(COLS - b.colSpan, b.col + deltaCol))
        const newRow = Math.max(0, b.row + deltaRow)
        return !hasCollision(
          blocks.filter((bl) => !selectedBlockIds.includes(bl.id)),
          newCol,
          newRow,
          b.colSpan,
          b.rowSpan
        )
      })

      if (canMove) {
        selectedBlocks.forEach((b) => {
          const newCol = Math.max(0, Math.min(COLS - b.colSpan, b.col + deltaCol))
          const newRow = Math.max(0, b.row + deltaRow)
          updateBlock(b.id, { col: newCol, row: newRow })
        })
      }
    } else {
      const newPixelX = draggedBlock.col * cW + delta.x
      const newPixelY = draggedBlock.row * cH + delta.y
      const { col, row } = snapToGrid(newPixelX, newPixelY)

      const clampedCol = Math.min(col, COLS - draggedBlock.colSpan)
      const clampedRow = Math.max(0, row)

      if (hasCollision(blocks, clampedCol, clampedRow, draggedBlock.colSpan, draggedBlock.rowSpan, draggedBlock.id)) return

      updateBlock(draggedBlock.id, { col: clampedCol, row: clampedRow })
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      onClick={() => setSelectedBlocks([])}
    >
      {/* V20: row-based zoom controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 50,
          display: 'flex',
          gap: 4,
          background: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          padding: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setVisibleRows(visibleRows + 1) }}
          disabled={visibleRows >= 10}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            cursor: visibleRows >= 10 ? 'not-allowed' : 'pointer',
            color: 'var(--color-text-primary)',
            opacity: visibleRows >= 10 ? 0.5 : 1,
          }}
        >−</button>
        <span style={{ padding: '6px 10px', fontSize: 11, color: 'var(--color-text-secondary)', minWidth: 60, textAlign: 'center' }}>
          {visibleRows} {visibleRows === 1 ? 'row' : 'rows'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setVisibleRows(visibleRows - 1) }}
          disabled={visibleRows <= 1}
          style={{
            padding: '6px 10px',
            fontSize: 12,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            cursor: visibleRows <= 1 ? 'not-allowed' : 'pointer',
            color: 'var(--color-text-primary)',
            opacity: visibleRows <= 1 ? 0.5 : 1,
          }}
        >+</button>
        <button
          onClick={(e) => { e.stopPropagation(); setVisibleRows(3) }}
          style={{
            padding: '6px 10px',
            fontSize: 11,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
          }}
        >Reset</button>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <DropZone onLowRes={onLowRes}>
          <GridCanvas cellW={cellW} cellH={cellH}>
            {blocks.map((block) => (
              <Block
                key={block.id}
                block={block}
                cellW={cellW}
                cellH={cellH}
                isDragging={activeId === block.id}
              />
            ))}
          </GridCanvas>
        </DropZone>
      </DndContext>
    </div>
  )
}
