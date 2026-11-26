import { Check, ImagePlus, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import { ACCEPTED_TYPES, MAX_FILES, REJECT_TEXT } from '@/transfer/protocol'
import { sendFiles, TransferError } from '@/transfer/sender'
import type { SendProgress, SendResult } from '@/transfer/sender'
import { ICON } from './classes'
import { Button } from './kit'

type Phase =
  | { name: 'idle' }
  | { name: 'sending'; progress: SendProgress }
  | { name: 'sent'; result: SendResult }
  | { name: 'failed'; message: string }

/**
 * What a phone sees after scanning the code (SPEC V45-V49): choose photos and
 * send them to the device that showed the code. Nothing is stored here.
 */
export function SendPage({ transferId }: { transferId: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })

  const send = async (chosen: File[]) => {
    if (chosen.length === 0) return
    const files = chosen.slice(0, MAX_FILES)
    setPhase({ name: 'sending', progress: { done: 0, total: files.length } })
    try {
      const result = await sendFiles(transferId, files, (progress) =>
        setPhase({ name: 'sending', progress })
      )
      setPhase({ name: 'sent', result })
    } catch (error) {
      console.error('Sending photos failed', error)
      setPhase({
        name: 'failed',
        message:
          error instanceof TransferError
            ? error.message
            : 'The photos could not be sent. Check your connection and try again.',
      })
    }
  }

  const busy = phase.name === 'sending'

  return (
    <main className="grid h-full place-items-center overflow-y-auto bg-ground px-5 py-8 text-ink">
      <div className="w-full max-w-[420px]">
        <h1 className="text-lg font-semibold tracking-[-0.015em] text-balance">
          Send photos to your other device
        </h1>
        <p className="mt-2 text-md text-pretty text-ink-2">
          Choose photos here and they appear in InstaGrid on the device that showed the code. Keep
          that window open until they arrive.
        </p>

        <input
          ref={input}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          hidden
          onChange={(event) => {
            void send([...(event.target.files ?? [])])
            event.target.value = ''
          }}
        />

        <Button
          variant="primary"
          disabled={busy}
          className="mt-6 h-12 w-full text-md"
          onClick={() => input.current?.click()}
        >
          <ImagePlus {...ICON} />
          {phase.name === 'sent' || phase.name === 'failed'
            ? 'Choose more photos'
            : 'Choose photos'}
        </Button>

        <div role="status" className="mt-5 min-h-16">
          {phase.name === 'sending' && (
            <>
              <p className="flex items-center gap-2">
                <LoaderCircle
                  aria-hidden
                  className="size-4 animate-spin motion-reduce:animate-none"
                  strokeWidth={1.8}
                />
                Sending {Math.min(phase.progress.done + 1, phase.progress.total)} of{' '}
                {phase.progress.total}
              </p>
              <div
                role="progressbar"
                aria-label="Sending progress"
                aria-valuemin={0}
                aria-valuemax={phase.progress.total}
                aria-valuenow={phase.progress.done}
                className="mt-3 h-1 overflow-hidden rounded-full bg-track"
              >
                <div
                  className="h-full origin-left bg-ink transition-transform duration-150 ease-out"
                  style={{
                    transform: `scaleX(${phase.progress.total ? phase.progress.done / phase.progress.total : 0})`,
                  }}
                />
              </div>
            </>
          )}

          {phase.name === 'sent' && (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <Check aria-hidden className="size-4" strokeWidth={2.2} />
                {phase.result.accepted} {phase.result.accepted === 1 ? 'photo' : 'photos'} sent
              </p>
              {phase.result.refused.length > 0 && (
                <ul className="mt-2 grid gap-1 text-sm text-warn-ink">
                  {phase.result.refused.map((file) => (
                    <li key={file.name}>
                      {file.name}: {REJECT_TEXT[file.reason]}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {phase.name === 'failed' && (
            <p className="flex gap-2 rounded-control border border-warn-line bg-warn-bg p-3 text-warn-ink">
              <TriangleAlert aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.8} />
              <span>{phase.message}</span>
            </p>
          )}
        </div>

        <p className="mt-4 text-sm text-pretty text-ink-3">
          JPG, PNG or WEBP, up to {MAX_FILES} at a time. Photos travel encrypted between your two
          devices and are not stored online.
        </p>
        <a
          href={window.location.pathname}
          className="mt-6 inline-block text-sm text-ink-2 underline underline-offset-2"
        >
          Open InstaGrid on this device instead
        </a>
      </div>
    </main>
  )
}
