import { useRef } from 'react'
import { useStore } from '@/store/useStore'
import { COLS } from '@/utils/gridUtils'

interface Props {
  cellW: number
  cellH: number
  children?: React.ReactNode
}

export default function GridCanvas({ cellW, cellH, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gridRows = useStore((s) => s.gridRows)
  const showGuides = useStore((s) => s.showGuides)

  const gridW = cellW * COLS
  const totalHeight = cellH * gridRows

  return (
    <div
      ref={containerRef}
      data-grid-container
      style={{
        position: 'relative',
        width: gridW,
        height: totalHeight,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.04) 0%, transparent 60%), var(--color-bg-surface)',
        flexShrink: 0,
        margin: '0 auto',
        boxShadow: '0 0 0 1px var(--color-border)',
      }}
    >
      {showGuides && (
        <GridGuides cols={COLS} rows={gridRows} cellW={cellW} cellH={cellH} />
      )}
      {children}
    </div>
  )
}

function GridGuides({ cols, rows, cellW, cellH }: { cols: number; rows: number; cellW: number; cellH: number }) {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}
    >
      {Array.from({ length: cols - 1 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * cellW} y1={0} x2={(i + 1) * cellW} y2={rows * cellH}
          stroke="var(--color-border)" strokeWidth={1} />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * cellH} x2={cols * cellW} y2={(i + 1) * cellH}
          stroke="var(--color-border)" strokeWidth={1} />
      ))}
    </svg>
  )
}
