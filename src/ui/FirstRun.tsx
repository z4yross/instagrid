import { ImagePlus, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { orderLabel } from '@/core/numbering'
import { ICON } from './classes'
import { Button } from './kit'
import { useOverlays } from './overlays'

// Posting order of a 3×2 grid: right to left, bottom to top.
const ORDER = [6, 5, 4, 3, 2, 1]

/**
 * Empty project (SPEC V40). The sample grid plays the posting order instead of
 * describing it; nothing here is exported.
 */
export function FirstRun() {
  const pickFiles = useOverlays((s) => s.pickFiles)
  const [run, setRun] = useState(0)

  return (
    <div className="h-full overflow-y-auto bg-ground px-4 pt-8 pb-16 desk:px-6 desk:pt-12">
      <div className="mx-auto w-full max-w-[432px]">
        <h1 className="text-lg font-semibold tracking-[-0.015em] text-balance">
          Plan your Instagram grid before you post
        </h1>
        <p className="mt-2 max-w-[46ch] text-md text-pretty text-ink-2">
          Lay your photos out on the grid, let one span several posts or split it into pieces, then
          export every post numbered in the order to upload.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            variant="primary"
            className="h-10 flex-1 basis-full px-4 text-md pointer-coarse:h-12 desk:flex-none desk:basis-auto"
            onClick={pickFiles}
          >
            <ImagePlus {...ICON} />
            Add photos
          </Button>
          <span className="text-ink-3">or drop them anywhere. Nothing leaves this device.</span>
        </div>

        <div key={run} className="mt-8 grid grid-cols-3 gap-[3px]" aria-hidden>
          {ORDER.map((n) => (
            <div
              key={n}
              className="relative aspect-[3/4] animate-order-cell border border-dashed border-dash bg-cell-empty"
              style={{ animationDelay: `${500 + (n - 1) * 260}ms` }}
            >
              <span
                className="absolute top-1.5 left-1.5 grid h-5 min-w-6 animate-order-chip place-items-center rounded-chip bg-accent px-1 text-sm leading-none font-bold text-on-accent"
                style={{ animationDelay: `${500 + (n - 1) * 260}ms` }}
              >
                {orderLabel(n)}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-3 text-pretty text-ink-2">
          The numbers are the posting order. Upload <b className="font-semibold text-ink">01</b>{' '}
          first, from the bottom right, and the grid builds up to the top left.
        </p>
        <Button
          variant="ghost"
          className="mt-1 -ml-2 px-2 text-ink-2 motion-reduce:hidden"
          onClick={() => setRun(run + 1)}
        >
          <RotateCcw {...ICON} />
          Play again
        </Button>
      </div>
    </div>
  )
}
