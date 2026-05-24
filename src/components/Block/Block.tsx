import type { ImageBlock } from '@/store/types'
import { useStore } from '@/store/useStore'
import { cellUploadNumber, COLS, hasCollision } from '@/utils/gridUtils'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import ResizeHandle from './ResizeHandle'

interface Props {
  block: ImageBlock
  cellW: number
  cellH: number
  isDragging?: boolean
  isOverlay?: boolean
  dragMode?: boolean
}

export default function Block({
  block,
  cellW,
  cellH,
  isDragging,
  isOverlay = false,
  dragMode = true,
}: Props) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: block.id,
    data: { block },
  })

  const blocks = useStore((s) => s.blocks)
  const selectedBlockIds = useStore((s) => s.selectedBlockIds)
  const lastSelectedId = useStore((s) => s.lastSelectedId)
  const setSelectedBlocks = useStore((s) => s.setSelectedBlocks)
  const toggleBlockSelection = useStore((s) => s.toggleBlockSelection)
  const updateBlock = useStore((s) => s.updateBlock)
  const images = useStore((s) => s.images)
  const gridRows = useStore((s) => s.gridRows)
  const resizeMode = useStore((s) => s.resizeMode)
  const image = block.imageId ? images.find((i) => i.id === block.imageId) : null

  const isSelected = selectedBlockIds.includes(block.id)
  const isPlaceholder = block.isPlaceholder === true

  // T120: dragMode universal - controls drag on all platforms
  const isMobile = window.innerWidth <= 768
  const isDragEnabled = !dragMode // Locked = no drag, unlocked = drag

  // T110/T113/T114/T118: Touch pan on block when drag locked (mobile only)
  const blockTouchRef = useRef<HTMLDivElement | null>(null)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const blockDataRef = useRef(block)
  const isPanEnabled = isMobile && dragMode // Pan only when drag locked

  // T118: Combine refs for DndKit and touch pan
  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node)
      blockTouchRef.current = node
    },
    [setNodeRef]
  )

  // T114: Keep blockDataRef current without triggering effect re-run
  useEffect(() => {
    blockDataRef.current = block
  }, [block])

  // T113/T114/T118: Use native addEventListener on block root (not just img)
  useEffect(() => {
    const blockEl = blockTouchRef.current
    if (!blockEl || !isPanEnabled || !isSelected) return

    let initialPinchDistance: number | null = null

    function getDistance(touch1: Touch, touch2: Touch): number {
      const dx = touch2.clientX - touch1.clientX
      const dy = touch2.clientY - touch1.clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function handleTouchStart(e: TouchEvent) {
      // T125: Skip if touch starts on resize handle (event bubbled despite stopPropagation)
      const target = e.target as HTMLElement
      if (target.closest('[data-resize-handle]')) {
        return
      }

      if (e.touches.length === 2) {
        // T124: Pinch zoom gesture
        initialPinchDistance = getDistance(e.touches[0], e.touches[1])
        touchStartRef.current = null // Disable pan during pinch
      } else if (e.touches.length === 1) {
        // Single touch pan
        const touch = e.touches[0]
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
        initialPinchDistance = null
      }
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault() // Prevent scroll/browser zoom

      if (e.touches.length === 2 && initialPinchDistance !== null) {
        // T124: Pinch zoom
        const currentDistance = getDistance(e.touches[0], e.touches[1])
        const scale = currentDistance / initialPinchDistance
        const currentBlock = blockDataRef.current
        const newZoom = Math.max(0.1, Math.min(10, currentBlock.transform.zoom * scale))

        updateBlock(currentBlock.id, {
          transform: {
            ...currentBlock.transform,
            zoom: newZoom,
          },
        })

        initialPinchDistance = currentDistance // Update for next delta
      } else if (e.touches.length === 1 && touchStartRef.current) {
        // Single touch pan
        const touch = e.touches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y

        // T114: Access current block via ref to avoid deps
        const currentBlock = blockDataRef.current
        updateBlock(currentBlock.id, {
          transform: {
            ...currentBlock.transform,
            panX: currentBlock.transform.panX + deltaX * 0.5,
            panY: currentBlock.transform.panY + deltaY * 0.5,
          },
        })

        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      }
    }

    function handleTouchEnd() {
      touchStartRef.current = null
      initialPinchDistance = null
    }

    blockEl.addEventListener('touchstart', handleTouchStart)
    blockEl.addEventListener('touchmove', handleTouchMove, { passive: false })
    blockEl.addEventListener('touchend', handleTouchEnd)

    return () => {
      blockEl.removeEventListener('touchstart', handleTouchStart)
      blockEl.removeEventListener('touchmove', handleTouchMove)
      blockEl.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPanEnabled, isSelected, updateBlock])

  const style: React.CSSProperties = {
    position: 'absolute',
    left: isOverlay ? 0 : block.col * cellW,
    top: isOverlay ? 0 : block.row * cellH,
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
    touchAction: isDragEnabled || (isPanEnabled && isSelected) ? 'none' : 'auto', // T115/T116: none for drag/pan, auto for scroll
    transition: 'opacity 0.08s linear, box-shadow 0.2s',
    borderRadius: 2,
    opacity: isDragging ? 0 : 1,
  }

  return (
    <div
      ref={setRefs}
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
            const sortedBlocks = [...blocks].sort(
              (a, b) => a.row * COLS + a.col - (b.row * COLS + b.col)
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
          // T117: Regular click - toggle if already sole selection (mobile deselect)
          if (isSelected && selectedBlockIds.length === 1) {
            setSelectedBlocks([])
          } else {
            setSelectedBlocks([block.id])
          }
        }
      }}
      {...(isDragEnabled ? listeners : {})}
      {...attributes}
    >
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: block.barsColor,
          }}
        />
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

      {isSelected &&
        selectedBlockIds.length === 1 &&
        !isDragging &&
        (resizeMode === 'buttons' ? (
          <MobileResizeButtons block={block} />
        ) : (
          <>
            <ResizeHandle block={block} cellW={cellW} cellH={cellH} edge="right" />
            <ResizeHandle block={block} cellW={cellW} cellH={cellH} edge="bottom" />
            <ResizeHandle block={block} cellW={cellW} cellH={cellH} edge="corner-br" />
          </>
        ))}
    </div>
  )
}

function buildImgStyle(block: ImageBlock): React.CSSProperties {
  const { panX, panY, zoom, rotation, flipX, flipY } = block.transform
  const scaleX = (flipX ? -1 : 1) * zoom
  const scaleY = (flipY ? -1 : 1) * zoom
  const base: React.CSSProperties = {
    position: 'absolute',
    pointerEvents: 'none',
    transformOrigin: 'center center',
    transform: `rotate(${rotation}deg) translate(${panX}px, ${panY}px) scale(${scaleX}, ${scaleY})`,
  }
  return {
    ...base,
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  }
}

function CellBadges({
  block,
  cellW,
  cellH,
  gridRows,
}: {
  block: ImageBlock
  cellW: number
  cellH: number
  gridRows: number
}) {
  const blocks = useStore((s) => s.blocks)
  const badges: React.ReactNode[] = []
  for (let r = 0; r < block.rowSpan; r++) {
    for (let c = 0; c < block.colSpan; c++) {
      const num = cellUploadNumber(block.col + c, block.row + r, gridRows, blocks, COLS)
      if (num > 0) {
        badges.push(
          <div
            key={`${c},${r}`}
            style={{
              position: 'absolute',
              left: c * cellW + 4,
              top: r * cellH + 4,
              width: 20,
              height: 20,
              background: 'rgba(0,0,0,0.55)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {String(num).padStart(2, '0')}
          </div>
        )
      }
    }
  }
  return <>{badges}</>
}

function MobileResizeButtons({ block }: { block: ImageBlock }) {
  const updateBlock = useStore((s) => s.updateBlock)
  const blocks = useStore((s) => s.blocks)

  function resize(direction: 'up' | 'down' | 'left' | 'right', delta: 1 | -1) {
    let newColSpan = block.colSpan
    let newRowSpan = block.rowSpan
    let newCol = block.col
    let newRow = block.row

    if (direction === 'right') {
      newColSpan = Math.max(1, Math.min(COLS - block.col, block.colSpan + delta))
    } else if (direction === 'left') {
      if (delta === 1) {
        // Expand left: move col left, increase span
        newCol = Math.max(0, block.col - 1)
        newColSpan = block.colSpan + (block.col - newCol)
      } else {
        // Shrink left: move col right, decrease span
        if (block.colSpan > 1) {
          newCol = block.col + 1
          newColSpan = block.colSpan - 1
        }
      }
    } else if (direction === 'down') {
      newRowSpan = Math.max(1, block.rowSpan + delta)
    } else if (direction === 'up') {
      if (delta === 1) {
        // Expand up: move row up, increase span
        newRow = Math.max(0, block.row - 1)
        newRowSpan = block.rowSpan + (block.row - newRow)
      } else {
        // Shrink up: move row down, decrease span
        if (block.rowSpan > 1) {
          newRow = block.row + 1
          newRowSpan = block.rowSpan - 1
        }
      }
    }

    // Check collision
    if (hasCollision(blocks, newCol, newRow, newColSpan, newRowSpan, block.id)) return

    updateBlock(block.id, {
      col: newCol,
      row: newRow,
      colSpan: newColSpan,
      rowSpan: newRowSpan,
    })
  }

  const btnStyle: React.CSSProperties = {
    position: 'absolute',
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    border: 'none',
    borderRadius: 4,
    color: '#fff',
    cursor: 'pointer',
    zIndex: 20,
    transition: 'background 0.15s',
  }

  return (
    <>
      {/* Top edge: side-by-side horizontal */}
      <button
        style={{ ...btnStyle, top: 4, left: 'calc(50% - 29px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('up', 1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronUp size={16} />
      </button>
      <button
        style={{ ...btnStyle, top: 4, left: 'calc(50% + 1px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('up', -1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronDown size={16} />
      </button>

      {/* Right edge: side-by-side vertical */}
      <button
        style={{ ...btnStyle, right: 4, top: 'calc(50% - 29px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('right', 1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronRight size={16} />
      </button>
      <button
        style={{ ...btnStyle, right: 4, top: 'calc(50% + 1px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('right', -1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Bottom edge: side-by-side horizontal */}
      <button
        style={{ ...btnStyle, bottom: 4, left: 'calc(50% - 29px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('down', 1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronDown size={16} />
      </button>
      <button
        style={{ ...btnStyle, bottom: 4, left: 'calc(50% + 1px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('down', -1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronUp size={16} />
      </button>

      {/* Left edge: side-by-side vertical */}
      <button
        style={{ ...btnStyle, left: 4, top: 'calc(50% - 29px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('left', 1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        style={{ ...btnStyle, left: 4, top: 'calc(50% + 1px)' }}
        onClick={(e) => {
          e.stopPropagation()
          resize('left', -1)
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.4)')}
      >
        <ChevronRight size={16} />
      </button>
    </>
  )
}
