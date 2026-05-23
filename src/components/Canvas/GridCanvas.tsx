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
  const isLoading = useStore((s) => s.isLoading)
  const imageCount = useStore((s) => s.imageCount)
  const images = useStore((s) => s.images)

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
        background: 'radial-gradient(ellipse at 30% 20%, rgba(168,85,247,0.015) 0%, transparent 60%), var(--color-bg-surface)',
        flexShrink: 0,
        margin: '0 auto',
        boxShadow: '0 0 0 1px var(--color-border)',
      }}
    >
      {showGuides && (
        <GridGuides cols={COLS} rows={gridRows} cellW={cellW} cellH={cellH} />
      )}
      {isLoading && images.length === 0 && imageCount > 0 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: Math.min(imageCount, 9) }).map((_, i) => {
            const col = i % COLS
            const row = Math.floor(i / COLS)
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: col * cellW,
                  top: row * cellH,
                  width: cellW,
                  height: cellH,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 2,
                  animation: 'pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            )
          })}
        </div>
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
