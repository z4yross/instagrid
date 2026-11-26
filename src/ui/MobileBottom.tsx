import {
  Aperture,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Crop,
  Plus,
  SquareArrowRightEnter,
  SquareDashed,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useLibrary } from '@/store/library'
import { useUi } from '@/store/ui'
import {
  addColorCell,
  deleteSelection,
  duplicateSelection,
  enterAdjust,
  splitSelection,
} from './actions'
import { resetAdjust } from './adjust'
import { AdjustControls } from './AdjustControls'
import { runJoin } from './runJoin'
import { ICON } from './classes'
import { Button, IconButton } from './kit'
import { Thumbs } from './Library'
import { toast, useOverlays } from './overlays'
import { openInSymmetry } from './symmetryTarget'
import { useSelection } from './useSelection'

const TAB_ICON = { className: 'size-5', strokeWidth: 1.6, 'aria-hidden': true } as const

/**
 * Mobile bottom area (SPEC V31): the library sheet when nothing is selected,
 * a contextual action bar for the selection, or the adjust controls.
 */
export function MobileBottom() {
  const mode = useUi((s) => s.mode)
  const info = useSelection()

  if (mode === 'preview') return null

  return (
    <div className="border-t border-line bg-panel pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] desk:hidden">
      {mode === 'adjust' && info.single && info.image ? (
        <AdjustBar />
      ) : info.blocks.length > 0 ? (
        <SelectionBar />
      ) : (
        <LibrarySheet />
      )}
    </div>
  )
}

function SelectionBar() {
  const info = useSelection()
  const clearSelection = useUi((s) => s.clearSelection)
  const { single, image, blocks } = info

  const title = single ? (image ? image.name : 'Color cell') : `${blocks.length} blocks`
  const detail = single
    ? `${single.colSpan} × ${single.rowSpan} ${single.colSpan * single.rowSpan === 1 ? 'cell' : 'cells'}`
    : 'Tap blocks to add or remove'

  // A blocked action explains itself when tapped, instead of doing nothing (SPEC V25).
  const explain = (blocker: string | null, run: () => void) => () =>
    blocker ? toast(blocker) : run()

  return (
    <div>
      <div className="flex min-h-11 items-center gap-2 border-b border-line-soft pr-1 pl-4 text-sm text-ink-2">
        <strong className="truncate font-semibold text-ink">{title}</strong>
        <span className="flex-none">{detail}</span>
        {info.lowRes && (
          <span className="inline-flex h-[18px] flex-none items-center gap-1 rounded-chip bg-warn-bg pr-1.5 pl-1 text-xs font-semibold text-warn-ink">
            <TriangleAlert aria-hidden className="size-3" strokeWidth={2} />
            Low res
          </span>
        )}
        <IconButton label="Deselect" className="ml-auto" onClick={clearSelection}>
          <X {...ICON} />
        </IconButton>
      </div>
      <div className="grid grid-flow-col auto-cols-fr">
        <Tab
          label="Adjust"
          dim={!info.canAdjust}
          onClick={explain(info.canAdjust ? null : 'Select one photo to adjust it', enterAdjust)}
        >
          <Crop {...TAB_ICON} />
        </Tab>
        <Tab
          label="Split"
          dim={Boolean(info.splitBlocker)}
          onClick={explain(info.splitBlocker, splitSelection)}
        >
          <Columns2 {...TAB_ICON} />
        </Tab>
        <Tab
          label="Join"
          dim={Boolean(info.joinBlocker)}
          onClick={explain(info.joinBlocker, () => void runJoin())}
        >
          <SquareArrowRightEnter {...TAB_ICON} />
        </Tab>
        <Tab
          label="Symmetry"
          dim={!image}
          onClick={explain(image ? null : 'Select one photo to make a pattern from it', () => {
            if (image) openInSymmetry(image)
          })}
        >
          <Aperture {...TAB_ICON} />
        </Tab>
        <Tab label="Duplicate" onClick={duplicateSelection}>
          <Copy {...TAB_ICON} />
        </Tab>
        <Tab label="Delete" onClick={deleteSelection}>
          <Trash2 {...TAB_ICON} />
        </Tab>
      </div>
    </div>
  )
}

function AdjustBar() {
  const info = useSelection()
  const exitAdjust = useUi((s) => s.exitAdjust)
  if (!info.single || !info.image) return null
  return (
    <div className="px-4 pt-1 pb-2">
      <AdjustControls block={info.single} image={info.image} compact />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={resetAdjust}>Reset</Button>
        <Button variant="primary" onClick={exitAdjust}>
          Done
        </Button>
      </div>
    </div>
  )
}

function LibrarySheet() {
  const images = useLibrary((s) => s.images)
  const open = useOverlays((s) => s.sheetOpen)
  const setOpen = useOverlays((s) => s.setSheetOpen)
  const pickFiles = useOverlays((s) => s.pickFiles)

  return (
    <div>
      <div aria-hidden className="mx-auto mt-1.5 h-1 w-9 rounded-full bg-dash" />
      <div className="flex min-h-14 items-center gap-3 pr-2 pl-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="library-sheet"
          onClick={() => setOpen(!open)}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex-none">
            <b className="font-semibold">Photos</b>{' '}
            {images.length > 0 && <span className="text-ink-3">{images.length}</span>}
          </span>
          {!open && (
            <span className="flex min-w-0 flex-1 gap-1 overflow-hidden">
              {images.slice(0, 8).map((image) => (
                <img
                  key={image.id}
                  src={image.url}
                  alt=""
                  className="h-10 w-[30px] flex-none rounded-[2px] object-cover"
                />
              ))}
            </span>
          )}
          <span className="ml-auto flex-none text-ink-3">
            {open ? <ChevronDown {...ICON} /> : <ChevronUp {...ICON} />}
          </span>
        </button>
        <Button onClick={pickFiles}>
          <Plus {...ICON} />
          Add
        </Button>
      </div>

      {open && (
        <div id="library-sheet" className="px-4 pb-4">
          <div className="max-h-[42dvh] overflow-y-auto">
            {images.length === 0 ? (
              <p className="py-4 text-ink-2">No photos yet. Tap Add to choose some.</p>
            ) : (
              <Thumbs columns="grid-cols-4" onPlaced={() => setOpen(false)} />
            )}
          </div>
          <Button
            className="mt-3 w-full justify-start"
            onClick={() => {
              addColorCell()
              setOpen(false)
            }}
          >
            <SquareDashed {...ICON} />
            Add color cell
          </Button>
        </div>
      )}
    </div>
  )
}

function Tab({
  label,
  dim,
  onClick,
  children,
}: {
  label: string
  dim?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-disabled={dim}
      onClick={onClick}
      className={`grid min-h-14 content-center justify-items-center gap-[3px] px-0.5 py-1.5 text-xs font-medium active:bg-press ${dim ? 'text-disabled' : 'text-ink'}`}
    >
      {children}
      {label}
    </button>
  )
}
