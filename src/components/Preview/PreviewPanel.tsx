import { useStore } from '@/store/useStore'
import { cellUploadNumber, COLS } from '@/utils/gridUtils'

interface Props {
  onClose: () => void
}

export default function PreviewPanel({ onClose }: Props) {
  const blocks = useStore((s) => s.blocks)
  const images = useStore((s) => s.images)
  const gridRows = useStore((s) => s.gridRows)

  // build a 2D grid of cells for display
  const CELL_SIZE = 80 // px per cell in preview
  const cellH = (CELL_SIZE * 4) / 3

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-bg-surface)',
          borderRadius: 12,
          overflow: 'hidden',
          maxHeight: '90vh',
          overflowY: 'auto',
          width: CELL_SIZE * COLS + 48,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* fake IG profile header */}
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>your_username</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>Preview</div>
            </div>
            <button
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 18 }}
              onClick={onClose}
            >✕</button>
          </div>
        </div>

        {/* grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
            gridAutoRows: `${cellH}px`,
          }}
        >
          {Array.from({ length: gridRows * COLS }, (_, i) => {
            const row = Math.floor(i / COLS)
            const col = i % COLS
            const block = blocks.find(
              (b) => col >= b.col && col < b.col + b.colSpan && row >= b.row && row < b.row + b.rowSpan
            )
            const image = block ? images.find((im) => im.id === block.imageId) : null
            const num = cellUploadNumber(col, row, COLS)

            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: CELL_SIZE,
                  height: cellH,
                  background: 'var(--color-bg-elevated)',
                  borderRight: '1px solid var(--color-bg-base)',
                  borderBottom: '1px solid var(--color-bg-base)',
                  overflow: 'hidden',
                }}
              >
                {image && (
                  <img
                    src={image.src}
                    alt=""
                    draggable={false}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: block?.fillMode === 'bars' ? 'contain' : 'cover',
                    }}
                  />
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    right: 3,
                    width: 18,
                    height: 18,
                    background: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    fontSize: 8,
                    fontWeight: 700,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {num}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
