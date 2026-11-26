import { TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { placeInBlock } from '@/core/geometry'
import { orderLabel } from '@/core/numbering'
import { exportGrid } from '@/export/exportGrid'
import type { ExportFormat, ExportProgress } from '@/export/exportGrid'
import { planExport } from '@/export/plan'
import type { ExportItem } from '@/export/plan'
import { imageById, useLibrary } from '@/store/library'
import type { LibraryImage } from '@/store/library'
import { useProject } from '@/store/project'
import { Button, Dialog } from './kit'
import { toast, useOverlays } from './overlays'

const THUMB = { width: 54, height: 72 }

/** One exported post in miniature: the same placement the export draws (SPEC V4). */
function CellThumb({ item, image }: { item: ExportItem; image: LibraryImage | undefined }) {
  const p = image ? placeInBlock(item.block, image, THUMB) : null
  return (
    <figure className="m-0 w-[54px] flex-none">
      <div
        className="relative h-[72px] overflow-hidden rounded-[2px]"
        style={{ backgroundColor: item.block.color }}
      >
        {p && image && (
          <img
            src={image.url}
            alt=""
            draggable={false}
            className="absolute max-w-none"
            style={{
              left: p.cx - p.width / 2 - item.cellCol * THUMB.width,
              top: p.cy - p.height / 2 - item.cellRow * THUMB.height,
              width: p.width,
              height: p.height,
              transform: `rotate(${p.rotation}deg) scale(${p.flipX ? -1 : 1}, ${p.flipY ? -1 : 1})`,
            }}
          />
        )}
        {item.lowRes && (
          <span className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-chip bg-warn-bg text-warn-ink">
            <TriangleAlert aria-hidden className="size-2.5" strokeWidth={2.2} />
          </span>
        )}
      </div>
      <figcaption className="mt-1 flex justify-center">
        <span className="grid h-[18px] min-w-6 place-items-center rounded-chip bg-accent px-1 text-xs leading-none font-bold text-on-accent">
          {orderLabel(item.number)}
        </span>
      </figcaption>
    </figure>
  )
}

const FORMATS: { value: ExportFormat; title: string; detail: string }[] = [
  {
    value: 'zip',
    title: 'One ZIP file',
    detail: 'All posts in a single download. Best on a computer.',
  },
  {
    value: 'files',
    title: 'Separate images',
    detail:
      'One download per post. Best on a phone; your browser may ask to allow several downloads.',
  },
]

/** Export: numbered strip in posting order, format choice, progress (SPEC V41-V44). */
export function ExportDialog() {
  const open = useOverlays((s) => s.dialog === 'export')
  const close = useOverlays((s) => s.closeDialog)
  const blocks = useProject((s) => s.blocks)
  const projectName = useProject((s) => s.name)
  const images = useLibrary((s) => s.images)
  const [format, setFormat] = useState<ExportFormat>(() =>
    window.matchMedia('(pointer: coarse)').matches ? 'files' : 'zip'
  )
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const abort = useRef<AbortController | null>(null)

  const items = open ? planExport(blocks, (id) => imageById(images, id)) : []
  const lowRes = items.filter((item) => item.lowRes).length
  const busy = progress !== null

  const cancel = () => {
    abort.current?.abort()
    abort.current = null
    setProgress(null)
    close()
  }

  const run = async () => {
    const controller = new AbortController()
    abort.current = controller
    try {
      const result = await exportGrid(
        items,
        (id) => imageById(images, id),
        format,
        projectName,
        setProgress,
        controller.signal
      )
      if (controller.signal.aborted) return
      if (result.failed.length > 0) {
        toast(
          `${result.failed.length} of ${items.length} posts could not be exported: ${result.failed.join(', ')}. The rest were saved.`,
          'error'
        )
      } else {
        toast(
          `Exported ${result.delivered} ${result.delivered === 1 ? 'post' : 'posts'}. Upload them in number order, starting with 01.`
        )
      }
      close()
    } catch (error) {
      console.error('Export failed', error)
      toast('The export could not be completed. Nothing was saved.', 'error')
    } finally {
      abort.current = null
      setProgress(null)
    }
  }

  return (
    <Dialog
      open={open}
      title={`Export ${items.length} ${items.length === 1 ? 'post' : 'posts'}`}
      onClose={cancel}
      footer={
        <>
          <span className="mr-auto hidden text-sm text-ink-3 desk:inline">1080 × 1350 px, JPG</span>
          <Button onClick={cancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={busy || items.length === 0}
            onClick={() => void run()}
          >
            {busy ? `Exporting ${progress.done} of ${progress.total}` : 'Export'}
          </Button>
        </>
      }
    >
      <p className="text-pretty text-ink-2">
        Each grid cell becomes one post. Upload them in number order, starting with{' '}
        <b className="font-semibold text-ink">01</b>, and your profile ends up looking like the
        grid.
      </p>

      <div
        role="group"
        aria-label="Posts in upload order"
        className="mt-4 flex gap-2 overflow-x-auto rounded-control bg-track p-3"
      >
        {items.map((item) => (
          <CellThumb key={item.number} item={item} image={imageById(images, item.block.imageId)} />
        ))}
      </div>

      {lowRes > 0 && (
        <p className="mt-3 flex gap-2 rounded-control border border-warn-line bg-warn-bg p-3 text-sm text-warn-ink">
          <TriangleAlert aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.8} />
          <span>
            <strong className="font-semibold">
              {lowRes} {lowRes === 1 ? 'post is' : 'posts are'} low resolution.
            </strong>{' '}
            They will export, but look soft. Marked in the strip above.
          </span>
        </p>
      )}

      <fieldset className="mt-5 grid gap-2" disabled={busy}>
        <legend className="mb-2 p-0 font-semibold">Save as</legend>
        {FORMATS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-control border border-line bg-raised px-3 py-2 hover:border-line-strong has-checked:border-ink has-checked:shadow-[inset_0_0_0_1px_var(--ink)]"
          >
            <input
              type="radio"
              name="export-format"
              value={option.value}
              checked={format === option.value}
              onChange={() => setFormat(option.value)}
              className="m-0 size-4 flex-none accent-(--ink)"
            />
            <span>
              <b className="block font-semibold">{option.title}</b>
              <span className="text-sm text-ink-3">{option.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {busy && (
        <div
          role="progressbar"
          aria-label="Export progress"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          className="mt-4 h-1 overflow-hidden rounded-full bg-track"
        >
          <div
            className="h-full origin-left bg-ink transition-transform duration-150 ease-out"
            style={{ transform: `scaleX(${progress.total ? progress.done / progress.total : 0})` }}
          />
        </div>
      )}
    </Dialog>
  )
}
