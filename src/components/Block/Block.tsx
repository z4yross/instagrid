import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '@/store/useStore'
import { cellUploadNumber, COLS } from '@/utils/gridUtils'
import ResizeHandle from './ResizeHandle'
import type { ImageBlock } from '@/store/types'

interface Props {
  block: ImageBlock
  cellW: number
  cellH: number
  isDragging?: boolean
}

export default function Block({ block, cellW, cellH, isDragging }: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
    data: { block },
  })

  const blocks = useStore((s) => s.blocks)
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const lastSelectedId = useStore((s) => s.lastSelectedId)
  const setSelectedBlocks = useStore((s) => s.setSelectedBlocks)
  const toggleBlockSelection = useStore((s) => s.toggleBlockSelection)
  const images = useStore((s) => s.images)
  const gridRows = useStore((s) => s.gridRows)
  const image = block.imageId ? images.find((i) => i.id === block.imageId) : null

  const isSelected = selectedBlockIds.includes(block.id)
  const isPlaceholder = block.isPlaceholder === true
  const style: React.CSSProperties = {
    position: 'absolute',
    left: block.col * cellW,
    top: block.row * cellH,
    width: block.colSpan * cellW,
    height: block.rowSpan * cellH,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : isSelected ? 10 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    outline: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border-subtle)',
    outlineOffset: '-1px',
    boxShadow: isSelected
      ? '0 0 0 1px var(--color-accent), 0 0 20px var(--color-accent-glow), inset 0 0 0 1px var(--color-accent)'
      : isDragging
        ? '0 8px 32px rgba(0,0,0,0.6)'
        : 'none',
    overflow: 'hidden',
    userSelect: 'none',
    touchAction: 'none',
    transition: isDragging ? 'none' : 'box-shadow 0.2s',
    borderRadius: 2,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation()

        // V12: Windows-style multi-select
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+click: toggle individual
          toggleBlockSelection(block.id)
        } else if (e.shiftKey) {
          // Shift+click: range selection
          if (!lastSelectedId) {
            setSelectedBlocks([block.id])
          } else {
            // B27: sort by grid position (visual order) not array order
            const sortedBlocks = [...blocks].sort((a, b) =>
              (a.row * COLS + a.col) - (b.row * COLS + b.col)
            )
            const lastIndex = sortedBlocks.findIndex((b) => b.id === lastSelectedId)
            const currentIndex = sortedBlocks.findIndex((b) => b.id === block.id)
            if (lastIndex === -1 || currentIndex === -1) {
              setSelectedBlocks([block.id])
            } else {
              const start = Math.min(lastIndex, currentIndex)
              const end = Math.max(lastIndex, currentIndex)
              const rangeIds = sortedBlocks.slice(start, end + 1).map((b) => b.id)
              setSelectedBlocks(rangeIds)
            }
          }
        } else {
          // Regular click: select single
          setSelectedBlocks([block.id])
        }
      }}
      {...listeners}
      {...attributes}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: block.barsColor }} />
        {!isPlaceholder && image && (
          <img src={image.src} alt="" draggable={false} style={buildImgStyle(block)} />
        )}
        {isPlaceholder && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              color: 'var(--color-text-muted)',
              fontWeight: 500,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Placeholder
          </div>
        )}
      </div>

      <CellBadges block={block} cellW={cellW} cellH={cellH} gridRows={gridRows} />

      {isSelected && selectedBlockIds.length === 1 && !isDragging && (
        <>
          <ResizeHandle block={block} cellW={cellW} cellH={cellH} edge="right" />
          <ResizeHandle block={block} cellW={cellW} cellH={cellH} edge="bottom" />
          <ResizeHandle block={block} cellW={cellW} cellH={cellH} edge="corner-br" />
        </>
      )}
    </div>
  )
}

function buildImgStyle(block: ImageBlock): React.CSSProperties {
  const { panX, panY, zoom, rotation } = block.transform
  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    transformOrigin: 'center center',
    transform: `rotate(${rotation}deg) translate(${panX}px, ${panY}px) scale(${zoom})`,
  }
  return { ...base, inset: 0, width: '100%', height: '100%', objectFit: 'contain' }
}

function CellBadges({ block, cellW, cellH, gridRows }: { block: ImageBlock; cellW: number; cellH: number; gridRows: number }) {
  const blocks = useStore((s) => s.blocks)
  const badges: React.ReactNode[] = []
  for (let r = 0; r < block.rowSpan; r++) {
    for (let c = 0; c < block.colSpan; c++) {
      const num = cellUploadNumber(block.col + c, block.row + r, gridRows, blocks, COLS)
      if (num > 0) {
        badges.push(
          <div key={`${c},${r}`} style={{
            position: 'absolute', left: c * cellW + 4, top: r * cellH + 4,
            width: 20, height: 20, background: 'rgba(0,0,0,0.55)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 700, color: '#fff', pointerEvents: 'none', zIndex: 5,
          }}>
            {String(num).padStart(2, '0')}
          </div>
        )
      }
    }
  }
  return <>{badges}</>
}
