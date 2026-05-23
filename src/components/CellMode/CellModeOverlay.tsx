import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { cellUploadNumber, COLS } from '@/utils/gridUtils'
import type { ImageBlock, CellTransform } from '@/store/types'

interface Props {
  block: ImageBlock
  cellW: number
  cellH: number
}

export default function CellModeOverlay({ block, cellW, cellH }: Props) {
  const setCellMode = useStore((s) => s.setCellMode)
  const updateBlock = useStore((s) => s.updateBlock)
  const images = useStore((s) => s.images)
  const gridRows = useStore((s) => s.gridRows)
  const image = images.find((i) => i.id === block.imageId)
  const [dragSrc, setDragSrc] = useState<number | null>(null)

  const blockW = block.colSpan * cellW
  const blockH = block.rowSpan * cellH

  function getCellTransform(relCol: number, relRow: number): CellTransform {
    const key = `${relCol},${relRow}`
    const base: CellTransform = { panX: 0, panY: 0, zoom: 1, rotation: 0 }
    return { ...base, ...block.transform, ...block.cellOverrides[key] }
  }

  function updateCellTransform(relCol: number, relRow: number, patch: Partial<CellTransform>) {
    const key = `${relCol},${relRow}`
    const current = block.cellOverrides[key] ?? {}
    updateBlock(block.id, {
      cellOverrides: { ...block.cellOverrides, [key]: { ...current, ...patch } },
    })
  }

  function reorderCells(srcIdx: number, dstIdx: number) {
    const order = [...block.cellOrder]
    const [moved] = order.splice(srcIdx, 1)
    order.splice(dstIdx, 0, moved)
    updateBlock(block.id, { cellOrder: order })
  }

  const cells = block.cellOrder.map(([relCol, relRow], idx) => {
    const absCol = block.col + relCol
    const absRow = block.row + relRow
    const num = cellUploadNumber(absCol, absRow, gridRows, COLS)
    const t = getCellTransform(relCol, relRow)

    // image positioned to show the correct crop of the whole block
    // image is sized to fill the full block (colSpan×cellW × rowSpan×cellH)
    // then offset so this cell's slice is visible
    const imgLeft = -relCol * cellW
    const imgTop  = -relRow * cellH
    // transformOrigin: center of this cell inside the image coordinate space
    const originX = relCol * cellW + cellW / 2
    const originY = relRow * cellH + cellH / 2

    return (
      <div
        key={`${relCol},${relRow}`}
        style={{
          position: 'absolute',
          left: relCol * cellW,
          top: relRow * cellH,
          width: cellW,
          height: cellH,
          border: '1.5px solid var(--color-accent)',
          boxShadow: dragSrc === idx ? '0 0 0 2px var(--color-accent-glow)' : 'none',
          overflow: 'hidden',
          cursor: 'grab',
          transition: 'box-shadow 0.15s',
        }}
        draggable
        onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragSrc(idx) }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onDrop={(e) => { e.preventDefault(); if (dragSrc !== null && dragSrc !== idx) reorderCells(dragSrc, idx); setDragSrc(null) }}
        onDragEnd={() => setDragSrc(null)}
      >
        {image && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            {block.fillMode === 'bars' && (
              <div style={{ position: 'absolute', inset: 0, background: block.barsColor }} />
            )}
            <img
              src={image.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                /* size = full block dimensions so image crop matches block view */
                width: blockW,
                height: blockH,
                left: imgLeft,
                top: imgTop,
                objectFit: block.fillMode === 'zoom' ? 'cover' : 'contain',
                /* transformOrigin in image-space = center of this cell */
                transformOrigin: `${originX}px ${originY}px`,
                transform: `rotate(${t.rotation}deg) translate(${t.panX}px, ${t.panY}px) scale(${t.zoom})`,
              }}
            />
          </div>
        )}

        {/* per-cell controls */}
        <div
          style={{ position: 'absolute', bottom: 3, left: 3, right: 3, display: 'flex', gap: 2, zIndex: 10 }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button style={CELL_BTN} onClick={() => { const t2 = getCellTransform(relCol, relRow); updateCellTransform(relCol, relRow, { rotation: (t2.rotation + 90) % 360 }) }} title="Rotate 90°">↻</button>
          <button style={CELL_BTN} onClick={() => updateCellTransform(relCol, relRow, { panX: t.panX - 8 })}>←</button>
          <button style={CELL_BTN} onClick={() => updateCellTransform(relCol, relRow, { panX: t.panX + 8 })}>→</button>
          <button style={CELL_BTN} onClick={() => updateCellTransform(relCol, relRow, { panY: t.panY - 8 })}>↑</button>
          <button style={CELL_BTN} onClick={() => updateCellTransform(relCol, relRow, { panY: t.panY + 8 })}>↓</button>
          <button style={CELL_BTN} onClick={() => updateCellTransform(relCol, relRow, { zoom: Math.min(10, t.zoom + 0.1) })}>+</button>
          <button style={CELL_BTN} onClick={() => updateCellTransform(relCol, relRow, { zoom: Math.max(0.1, t.zoom - 0.1) })}>−</button>
        </div>

        <div style={BADGE}>{String(num).padStart(2, '0')}</div>
      </div>
    )
  })

  return (
    <div
      style={{
        position: 'absolute',
        left: block.col * cellW,
        top: block.row * cellH,
        width: blockW,
        height: blockH,
        zIndex: 30,
      }}
    >
      {cells}

      {/* exit button — inside top edge, always visible */}
      <button
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 50,
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 600,
          background: 'var(--color-accent)',
          boxShadow: '0 0 12px var(--color-accent-glow)',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
        onClick={(e) => { e.stopPropagation(); setCellMode(null) }}
      >
        ✕ Exit cell mode
      </button>
    </div>
  )
}

const CELL_BTN: React.CSSProperties = {
  flex: 1,
  padding: '2px 0',
  fontSize: 10,
  background: 'rgba(0,0,0,0.65)',
  color: '#fff',
  border: 'none',
  borderRadius: 3,
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
}

const BADGE: React.CSSProperties = {
  position: 'absolute',
  top: 4,
  left: 4,
  width: 20,
  height: 20,
  background: 'rgba(0,0,0,0.6)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 9,
  fontWeight: 700,
  color: '#fff',
  pointerEvents: 'none',
}
