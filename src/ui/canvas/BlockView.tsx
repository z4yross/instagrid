import { TriangleAlert } from 'lucide-react'
import type { CSSProperties } from 'react'
import { isLowRes, placeInBlock } from '@/core/geometry'
import { orderLabel } from '@/core/numbering'
import type { Block, Size } from '@/core/types'
import type { LibraryImage } from '@/store/library'
import type { CanvasMode } from '@/store/ui'
import { GRID_GAP, rectToPixels } from './layout'
import type { Corner } from './layout'

export interface CellNumber {
  col: number
  row: number
  number: number
}

interface BlockViewProps {
  block: Block
  image: LibraryImage | undefined
  pitch: Size
  /** Upload numbers of this block's cells; cell positions are absolute grid cells. */
  numbers: readonly CellNumber[]
  mode: CanvasMode
  selected: boolean
  /** Being adjusted: the photo's full extent shows through, faded, beyond the frame. */
  adjusting: boolean
  /** Not the block being adjusted, while another one is. */
  dimmed: boolean
  /** Pixel offset while being dragged. */
  dragOffset: { x: number; y: number } | null
  flash: 'split' | 'join' | null
  showHandles: boolean
}

const CORNERS: readonly Corner[] = ['tl', 'tr', 'bl', 'br']

const HANDLE_POSITION: Record<Corner, string> = {
  tl: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
  tr: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
  bl: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
  br: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
}

/** Inline geometry for the photo: the same placement the exporter draws (SPEC V4). */
function photoStyle(block: Block, image: LibraryImage, pitch: Size): CSSProperties {
  const p = placeInBlock(block, image, pitch)
  return {
    left: p.cx - p.width / 2 - GRID_GAP / 2,
    top: p.cy - p.height / 2 - GRID_GAP / 2,
    width: p.width,
    height: p.height,
    transform: `rotate(${p.rotation}deg) scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})`,
  }
}

export function BlockView({
  block,
  image,
  pitch,
  numbers,
  mode,
  selected,
  adjusting,
  dimmed,
  dragOffset,
  flash,
  showHandles,
}: BlockViewProps) {
  const box = rectToPixels(block, pitch)
  const preview = mode === 'preview'
  const isImage = block.kind === 'image' && image
  const lowRes = isImage ? isLowRes(block, image) : false
  const photo = isImage ? photoStyle(block, image, pitch) : null
  const multiCell = block.colSpan > 1 || block.rowSpan > 1

  const style: CSSProperties = {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    transform: dragOffset ? `translate(${dragOffset.x}px, ${dragOffset.y}px)` : undefined,
    zIndex: dragOffset ? 5 : selected || adjusting ? 2 : undefined,
    touchAction: adjusting ? 'none' : undefined,
  }

  const label = isImage
    ? `${image.name}, ${block.colSpan} by ${block.rowSpan} cells`
    : `Color cell, ${block.colSpan} by ${block.rowSpan} cells`

  return (
    <div
      data-block-id={block.id}
      role="button"
      tabIndex={preview ? -1 : 0}
      aria-label={label}
      aria-pressed={selected}
      style={style}
      className={[
        'group absolute select-none outline-offset-0',
        dragOffset ? 'opacity-85' : 'transition-opacity duration-200 ease-out',
        dimmed ? 'pointer-events-none opacity-20' : '',
        preview
          ? 'cursor-default'
          : adjusting
            ? 'cursor-grab'
            : selected
              ? 'cursor-move'
              : 'cursor-grab',
        flash === 'split' ? 'animate-cut-open' : flash === 'join' ? 'animate-cut-close' : '',
      ].join(' ')}
    >
      {/* The photo's full extent while adjusting: what lies outside the frame, faded. */}
      {adjusting && photo && (
        <img
          src={image!.url}
          alt=""
          draggable={false}
          style={photo}
          className="pointer-events-none absolute max-w-none opacity-30"
        />
      )}

      <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: block.color }}>
        {photo && (
          <img
            src={image!.url}
            alt=""
            draggable={false}
            style={photo}
            className="pointer-events-none absolute max-w-none"
          />
        )}

        {/* Cell seams: where the export will cut this block into posts. */}
        {multiCell &&
          Array.from({ length: block.colSpan - 1 }, (_, i) => (
            <span
              key={`v${i}`}
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 ${preview ? 'bg-preview' : 'bg-white/75'}`}
              style={{
                left: (i + 1) * pitch.width - GRID_GAP / 2 - (preview ? GRID_GAP / 2 : 0.5),
                width: preview ? GRID_GAP : 1,
              }}
            />
          ))}
        {multiCell &&
          Array.from({ length: block.rowSpan - 1 }, (_, i) => (
            <span
              key={`h${i}`}
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 ${preview ? 'bg-preview' : 'bg-white/75'}`}
              style={{
                top: (i + 1) * pitch.height - GRID_GAP / 2 - (preview ? GRID_GAP / 2 : 0.5),
                height: preview ? GRID_GAP : 1,
              }}
            />
          ))}
      </div>

      {!preview && (
        <>
          {numbers.map((n) => (
            <span
              key={`${n.col},${n.row}`}
              className="pointer-events-none absolute grid h-5 min-w-6 place-items-center rounded-chip bg-accent px-1 text-sm leading-none font-bold text-on-accent"
              style={{
                left: (n.col - block.col) * pitch.width + 6,
                top: (n.row - block.row) * pitch.height + 6,
              }}
            >
              {orderLabel(n.number)}
            </span>
          ))}

          {lowRes && !adjusting && (
            <span className="pointer-events-none absolute top-1.5 right-1.5 inline-flex h-[18px] items-center gap-1 rounded-chip bg-warn-bg pr-1.5 pl-1 text-xs font-semibold text-warn-ink">
              <TriangleAlert aria-hidden className="size-3" strokeWidth={2} />
              {box.width > 110 ? 'Low res' : <span className="sr-only">Low resolution</span>}
            </span>
          )}

          {block.kind === 'color' && box.height > 60 && (
            <span className="pointer-events-none absolute bottom-1.5 left-1.5 text-xs font-medium text-black/70 mix-blend-luminosity">
              Color cell
            </span>
          )}

          {!selected && !adjusting && (
            <span className="pointer-events-none absolute inset-0 hidden outline-1 outline-ink/55 group-hover:block [@media(hover:none)]:hidden!" />
          )}

          {(selected || adjusting) && (
            <span
              aria-hidden
              className={
                adjusting
                  ? 'pointer-events-none absolute -inset-px border border-ink shadow-[0_0_0_1px_var(--on-ink)]'
                  : 'pointer-events-none absolute -inset-0.5 border-2 border-ink shadow-[inset_0_0_0_1px_var(--on-ink)]'
              }
            />
          )}

          {showHandles &&
            CORNERS.map((corner) => (
              <span
                key={corner}
                data-handle={corner}
                aria-hidden
                className={`absolute z-3 grid size-5 touch-none place-items-center pointer-coarse:size-11 ${HANDLE_POSITION[corner]}`}
              >
                <span className="size-[11px] rounded-[2px] border-[1.5px] border-ink bg-on-ink" />
              </span>
            ))}
        </>
      )}
    </div>
  )
}
