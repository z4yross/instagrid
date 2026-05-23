import { useRef, useState, useCallback, useEffect } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { useStore } from '@/store/useStore'
import { cellPixelSize, hasCollision, COLS } from '@/utils/gridUtils'
import GridCanvas from './GridCanvas'
import DropZone from './DropZone'
import Block from '../Block/Block'
import CellModeOverlay from '../CellMode/CellModeOverlay'
import type { ImageBlock } from '@/store/types'

interface Props {
  onLowRes?: (names: string[]) => void
}

export default function CanvasArea({ onLowRes }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [activeId, setActiveId] = useState<string | null>(null)

  const blocks = useStore((s) => s.blocks)
  const updateBlock = useStore((s) => s.updateBlock)
  const setSelectedBlock = useStore((s) => s.setSelectedBlock)
  const cellModeBlockId = useStore((s) => s.cellModeBlockId)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w: cellW, h: cellH } = cellPixelSize(dims.w || 600, dims.h || 0)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const getCellSize = useCallback(() => cellPixelSize(
    containerRef.current?.clientWidth ?? 600,
    containerRef.current?.clientHeight ?? 0
  ), [])

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
    const block = blocks.find((b) => b.id === active.id) as ImageBlock | undefined
    if (!block) return

    const { w: cW, h: cH } = getCellSize()
    const newPixelX = block.col * cW + delta.x
    const newPixelY = block.row * cH + delta.y
    const { col, row } = snapToGrid(newPixelX, newPixelY)

    const clampedCol = Math.min(col, COLS - block.colSpan)
    const clampedRow = Math.max(0, row)

    if (hasCollision(blocks, clampedCol, clampedRow, block.colSpan, block.rowSpan, block.id)) return

    updateBlock(block.id, { col: clampedCol, row: clampedRow })
  }

  const cellModeBlock = blocks.find((b) => b.id === cellModeBlockId)

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, position: 'relative', overflow: 'hidden auto', display: 'flex', flexDirection: 'column' }}
      onClick={() => setSelectedBlock(null)}
    >
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
            {cellModeBlock && (
              <CellModeOverlay block={cellModeBlock} cellW={cellW} cellH={cellH} />
            )}
          </GridCanvas>
        </DropZone>
      </DndContext>
    </div>
  )
}
