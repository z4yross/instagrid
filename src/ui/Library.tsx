import { Check, ImagePlus, Plus, SquareDashed, X } from 'lucide-react'
import { deleteImage } from '@/db/session'
import { useLibrary } from '@/store/library'
import type { LibraryImage } from '@/store/library'
import { blocksUsingImage, useProject } from '@/store/project'
import { addColorCell, placeImages } from './actions'
import { cx, ICON } from './classes'
import { Button } from './kit'
import { IMAGE_DRAG_TYPE } from './dragTypes'
import { confirm, toast, useOverlays } from './overlays'

async function removeImage(image: LibraryImage) {
  const used = blocksUsingImage(useProject.getState().blocks, image.id)
  const ok = await confirm({
    title: `Delete ${image.name}?`,
    body:
      used > 0
        ? `It is on this grid ${used === 1 ? 'once' : `${used} times`}. Those blocks are removed too, here and in your other grids. This cannot be undone.`
        : 'It is removed from the library, and from any other grid that uses it. This cannot be undone.',
    confirmLabel: 'Delete photo',
  })
  if (!ok) return
  try {
    await deleteImage(image.id)
  } catch (error) {
    console.error('Deleting the photo failed', error)
    toast('The photo could not be deleted from storage.', 'error')
  }
}

interface ThumbsProps {
  /** Tailwind grid-cols class. */
  columns: string
  onPlaced?: () => void
}

/** Library thumbnails. Click or Enter places a photo; a placed photo carries a check. */
export function Thumbs({ columns, onPlaced }: ThumbsProps) {
  const images = useLibrary((s) => s.images)
  const loading = useLibrary((s) => s.loading)
  const expected = useLibrary((s) => s.expected)
  const blocks = useProject((s) => s.blocks)

  if (loading) {
    return (
      <div className={cx('grid gap-2', columns)}>
        {Array.from({ length: Math.max(2, Math.min(expected, 12)) }, (_, i) => (
          <div
            key={i}
            aria-hidden
            className="aspect-[3/4] animate-skeleton rounded-chip bg-cell-empty"
          />
        ))}
      </div>
    )
  }

  return (
    <ul className={cx('grid gap-2', columns)}>
      {images.map((image) => {
        const placed = blocks.some((b) => b.imageId === image.id)
        return (
          <li key={image.id} className="group relative">
            <button
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData(IMAGE_DRAG_TYPE, image.id)
                event.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => {
                placeImages([image.id])
                onPlaced?.()
              }}
              title={`Add ${image.name} to the grid`}
              aria-label={`Add ${image.name} to the grid${placed ? ' (already placed)' : ''}`}
              className="relative block aspect-[3/4] w-full cursor-grab overflow-hidden rounded-chip bg-cell-empty hover:outline-1 hover:outline-offset-1 hover:outline-ink-2"
            >
              <img
                src={image.url}
                alt=""
                loading="lazy"
                draggable={false}
                className="size-full object-cover"
              />
              {placed && (
                <span className="absolute bottom-1 left-1 grid size-[18px] place-items-center rounded-chip bg-black/80 text-white">
                  <Check aria-hidden className="size-3" strokeWidth={2.2} />
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label={`Delete ${image.name}`}
              title="Delete photo"
              onClick={() => void removeImage(image)}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-chip bg-black/80 text-white opacity-0 transition-opacity duration-150 ease-out group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:size-8 pointer-coarse:opacity-100"
            >
              <X aria-hidden className="size-3.5" strokeWidth={2} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Desktop left panel (SPEC V30). */
export function Library() {
  const count = useLibrary((s) => s.images.length)
  const loading = useLibrary((s) => s.loading)
  const pickFiles = useOverlays((s) => s.pickFiles)

  return (
    <aside aria-label="Photos" className="flex min-h-0 flex-col border-r border-line bg-panel">
      <div className="flex h-11 flex-none items-center gap-2 pr-2 pl-4">
        <h2 className="font-semibold">
          Photos {count > 0 && <span className="font-normal text-ink-3">{count}</span>}
        </h2>
        <Button className="ml-auto h-7 px-2" onClick={pickFiles}>
          <Plus {...ICON} />
          Add
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
        {!loading && count === 0 ? (
          <button
            type="button"
            onClick={pickFiles}
            className="grid w-full place-items-center gap-2 rounded-control border border-dashed border-dash px-3 py-6 text-center text-ink-2 transition-colors duration-150 ease-out hover:border-line-strong hover:bg-hover"
          >
            <ImagePlus aria-hidden className="size-[22px] text-ink-3" strokeWidth={1.6} />
            <span>
              Add photos
              <small className="block text-sm text-ink-3">
                or drop them anywhere. JPG, PNG, WEBP.
              </small>
            </span>
          </button>
        ) : (
          <Thumbs columns="grid-cols-2" />
        )}
      </div>

      <div className="flex-none border-t border-line-soft px-4 py-3">
        <Button className="w-full justify-start" onClick={addColorCell}>
          <SquareDashed {...ICON} />
          Add color cell
        </Button>
        <p className="mt-2 text-sm text-ink-3">
          Click a photo to place it, or drag it onto a cell. A checked photo is already on the grid.
        </p>
      </div>
    </aside>
  )
}
