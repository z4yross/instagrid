import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { blockAt, gridRows } from '@/core/grid'
import { numberedCells } from '@/core/numbering'
import { COLS } from '@/core/types'
import { imageById, useLibrary } from '@/store/library'
import { useProject } from '@/store/project'
import { liveSelection, MAX_ZOOM_ROWS, MIN_ZOOM_ROWS, useUi } from '@/store/ui'
import { BlockView } from './BlockView'
import type { CellNumber } from './BlockView'
import { cellPitch, rectToPixels, rowsInView } from './layout'
import type { Viewport } from './layout'
import { useCanvasGestures } from './useCanvasGestures'

const MOBILE_MAX = 820

function useViewport(ref: React.RefObject<HTMLDivElement | null>): Viewport {
  const [viewport, setViewport] = useState<Viewport>({
    width: 900,
    height: 700,
    padX: 24,
    padY: 32,
  })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const mobile = el.clientWidth <= MOBILE_MAX && window.innerWidth <= MOBILE_MAX
      setViewport({
        width: el.clientWidth,
        height: el.clientHeight,
        padX: mobile ? 16 : 24,
        padY: mobile ? 16 : 32,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return viewport
}

export function Canvas() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const blocks = useProject((s) => s.blocks)
  const images = useLibrary((s) => s.images)
  const loading = useLibrary((s) => s.loading)
  const expected = useLibrary((s) => s.expected)
  const selectionIds = useUi((s) => s.selection)
  const mode = useUi((s) => s.mode)
  const adjustId = useUi((s) => s.adjustId)
  const zoomRows = useUi((s) => s.zoomRows)
  const flash = useUi((s) => s.flash)
  const setZoomRows = useUi((s) => s.setZoomRows)

  const viewport = useViewport(scrollRef)
  const pitch = cellPitch(viewport, zoomRows)
  const { visual, handlers } = useCanvasGestures(scrollRef, gridRef, pitch)

  const selection = liveSelection(selectionIds, blocks)
  const rows = gridRows(blocks)
  const inView = rowsInView(viewport, pitch)
  const preview = mode === 'preview'
  const adjusting = mode === 'adjust'

  const numbersByBlock = new Map<string, CellNumber[]>()
  for (const cell of numberedCells(blocks)) {
    const list = numbersByBlock.get(cell.blockId) ?? []
    list.push(cell)
    numbersByBlock.set(cell.blockId, list)
  }

  const emptyCells: { col: number; row: number }[] = []
  if (!preview) {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!blockAt(blocks, col, row)) emptyCells.push({ col, row })
      }
    }
  }

  const single = selection.length === 1
  const marquee = visual.marquee

  return (
    <div className="relative h-full min-h-0 min-w-0">
      <div
        ref={scrollRef}
        {...handlers}
        className={[
          'relative h-full min-h-0 min-w-0 touch-pan-y overflow-x-hidden overflow-y-auto',
          preview ? 'bg-preview' : 'bg-ground',
        ].join(' ')}
        style={{ padding: `${viewport.padY}px ${viewport.padX}px 96px` }}
      >
        <div
          ref={gridRef}
          className="relative mx-auto"
          style={{ width: COLS * pitch.width, height: rows * pitch.height }}
        >
          {loading
            ? Array.from({ length: Math.max(3, Math.min(expected, 12)) }, (_, i) => {
                const box = rectToPixels(
                  { col: i % COLS, row: Math.floor(i / COLS), colSpan: 1, rowSpan: 1 },
                  pitch
                )
                return (
                  <div
                    key={i}
                    aria-hidden
                    className="absolute animate-skeleton bg-cell-empty"
                    style={box}
                  />
                )
              })
            : emptyCells.map(({ col, row }) => (
                <div
                  key={`${col},${row}`}
                  aria-hidden
                  className={`absolute bg-cell-empty ${adjusting ? 'opacity-20' : ''}`}
                  style={rectToPixels({ col, row, colSpan: 1, rowSpan: 1 }, pitch)}
                />
              ))}

          {!loading &&
            blocks.map((block) => {
              const selected = !preview && !adjusting && selection.includes(block.id)
              const isAdjusting = adjusting && block.id === adjustId
              const dragging = visual.dragging?.ids.includes(block.id)
                ? visual.dragging.offset
                : null
              return (
                <BlockView
                  key={block.id}
                  block={block}
                  image={imageById(images, block.imageId)}
                  pitch={pitch}
                  numbers={numbersByBlock.get(block.id) ?? []}
                  mode={mode}
                  selected={selected}
                  adjusting={isAdjusting}
                  dimmed={adjusting && !isAdjusting}
                  dragOffset={dragging}
                  flash={flash?.ids.includes(block.id) ? flash.kind : null}
                  showHandles={selected && single && !visual.dragging}
                />
              )
            })}

          {/* Where a drag or resize will land (SPEC V22). */}
          {visual.preview?.rects.map((rect, i) => (
            <div
              key={i}
              aria-hidden
              className={[
                'pointer-events-none absolute z-4 border-2',
                visual.preview?.valid
                  ? 'border-ink bg-ink/10'
                  : 'border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--hover)_6px_12px)]',
              ].join(' ')}
              style={rectToPixels(rect, pitch, 0)}
            />
          ))}

          {marquee && (
            <div
              aria-hidden
              className="pointer-events-none absolute z-4 border border-ink bg-ink/10"
              style={{
                left: Math.min(marquee.a.x, marquee.b.x),
                top: Math.min(marquee.a.y, marquee.b.y),
                width: Math.abs(marquee.a.x - marquee.b.x),
                height: Math.abs(marquee.a.y - marquee.b.y),
              }}
            />
          )}
        </div>
      </div>

      {adjusting && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-3 bottom-3 z-(--z-canvas-overlay) mx-auto w-max max-w-[calc(100%-1.5rem)] rounded-full border border-line bg-raised px-3 py-1.5 text-center text-sm text-ink-2"
        >
          <span className="pointer-coarse:hidden">
            Drag to move the photo, scroll to zoom. Press Esc when done.
          </span>
          <span className="hidden pointer-coarse:inline">
            Drag to move the photo, pinch to zoom.
          </span>
        </p>
      )}

      {/* Grid zoom: how many rows fit in view (SPEC V32). */}
      {!preview && !adjusting && (
        <div
          role="group"
          aria-label="Grid zoom"
          className="absolute right-3 bottom-3 z-(--z-canvas-overlay) flex items-center gap-0.5 rounded-control border border-line bg-raised p-0.5 text-sm text-ink-2"
        >
          <ZoomButton
            label="Show one fewer row"
            disabled={inView <= MIN_ZOOM_ROWS}
            onClick={() => setZoomRows(inView - 1)}
          >
            <Minus aria-hidden className="size-4" strokeWidth={1.6} />
          </ZoomButton>
          <button
            type="button"
            title="Reset to fit the width"
            onClick={() => setZoomRows(null)}
            className="h-7 min-w-14 rounded-chip px-1.5 tabular-nums transition-colors duration-150 ease-out hover:bg-hover pointer-coarse:h-10"
          >
            {inView} rows
          </button>
          <ZoomButton
            label="Show one more row"
            disabled={inView >= MAX_ZOOM_ROWS}
            onClick={() => setZoomRows(inView + 1)}
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.6} />
          </ZoomButton>
        </div>
      )}
    </div>
  )
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-chip transition-colors duration-150 ease-out hover:bg-hover disabled:text-disabled disabled:hover:bg-transparent pointer-coarse:size-10"
    >
      {children}
    </button>
  )
}
