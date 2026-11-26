import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { startReceiver } from '@/transfer/receiver'
import type { ReceiverState } from '@/transfer/receiver'
import { addFiles } from './actions'
import { Button, Dialog } from './kit'
import { toast, useOverlays } from './overlays'

const isLocalOnly = (hostname: string) =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'

/**
 * Add photos from a phone (SPEC V45-V49): shows a QR code with a one-time
 * link; photos sent from the device that opens it land in the library and on
 * the grid. Listening stops when the dialog closes.
 */
export function ReceiveDialog() {
  const open = useOverlays((s) => s.dialog === 'receive')
  const close = useOverlays((s) => s.closeDialog)
  const [state, setState] = useState<ReceiverState>({ status: 'connecting' })
  const [qr, setQr] = useState<string | null>(null)
  const [received, setReceived] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let stop: (() => void) | null = null
    const base = window.location.origin + window.location.pathname

    void startReceiver(base, {
      onState: (next) => {
        if (!cancelled) setState(next)
      },
      onFile: async (file) => {
        const result = await addFiles([file])
        if (result.added.length === 0) return false
        if (!cancelled) setReceived((count) => count + 1)
        return true
      },
    }).then((receiver) => {
      if (cancelled) receiver.close()
      else stop = receiver.close
    })

    return () => {
      cancelled = true
      stop?.()
      setState({ status: 'connecting' })
      setQr(null)
      setReceived(0)
    }
  }, [open])

  const url = 'url' in state ? state.url : null

  useEffect(() => {
    if (!url) return
    let cancelled = false
    // Always dark on white with a quiet zone, so it scans in either theme.
    QRCode.toDataURL(url, {
      margin: 2,
      width: 440,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl)
      })
      .catch(() => {
        if (!cancelled) setQr(null)
      })
    return () => {
      cancelled = true
    }
  }, [url])

  const copyLink = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast('Link copied. Open it on the other device.')
    } catch {
      toast('The link could not be copied. Select it and copy it by hand.', 'error')
    }
  }

  return (
    <Dialog
      open={open}
      title="Add photos from your phone"
      onClose={close}
      width="desk:w-[440px]"
      footer={
        <Button variant={received > 0 ? 'primary' : 'default'} onClick={close}>
          {received > 0 ? 'Done' : 'Close'}
        </Button>
      }
    >
      {state.status === 'error' ? (
        <p className="flex gap-2 rounded-control border border-warn-line bg-warn-bg p-3 text-warn-ink">
          <TriangleAlert aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.8} />
          <span>{state.message}</span>
        </p>
      ) : (
        <>
          <p className="text-pretty text-ink-2">
            Scan this code with your phone's camera, then choose the photos there. Keep this window
            open while they arrive.
          </p>

          <div className="mx-auto mt-4 grid aspect-square w-full max-w-[220px] place-items-center rounded-control bg-white p-2">
            {qr ? (
              <img src={qr} alt="QR code with the link to send photos" className="size-full" />
            ) : (
              <LoaderCircle
                aria-label="Preparing the code"
                className="size-6 animate-spin text-black/50 motion-reduce:animate-none"
                strokeWidth={1.8}
              />
            )}
          </div>

          <p
            role="status"
            className="mt-4 flex min-h-6 items-center justify-center gap-2 text-center"
          >
            {state.status === 'connecting' && (
              <span className="text-ink-3">Preparing the code</span>
            )}
            {state.status === 'ready' && received === 0 && (
              <span className="text-ink-3">Waiting for your phone</span>
            )}
            {state.status === 'receiving' && (
              <>
                <LoaderCircle
                  aria-hidden
                  className="size-4 animate-spin motion-reduce:animate-none"
                  strokeWidth={1.8}
                />
                <span>
                  Receiving {Math.min(state.done + 1, state.total)} of {state.total}
                </span>
              </>
            )}
            {(state.status === 'finished' || (state.status === 'ready' && received > 0)) && (
              <>
                <Check aria-hidden className="size-4" strokeWidth={2} />
                <span>
                  {received} {received === 1 ? 'photo' : 'photos'} added to the grid
                  {state.status === 'finished' && state.rejected > 0
                    ? `, ${state.rejected} not accepted`
                    : ''}
                </span>
              </>
            )}
          </p>

          {url && (
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={url}
                aria-label="Link to send photos"
                onFocus={(event) => event.currentTarget.select()}
                className="h-(--control-h) min-w-0 flex-1 rounded-control border border-line bg-raised px-2.5 text-sm text-ink-2"
              />
              <Button onClick={() => void copyLink()}>Copy link</Button>
            </div>
          )}

          {isLocalOnly(window.location.hostname) && (
            <p className="mt-3 text-sm text-pretty text-warn-ink">
              You opened InstaGrid at an address that only works on this computer, so a phone cannot
              follow this code. On the published site it works from any phone.
            </p>
          )}

          <p className="mt-4 text-sm text-pretty text-ink-3">
            Photos travel encrypted between your two devices. A connection service helps them find
            each other and cannot read them. Nothing is stored online.
          </p>
        </>
      )}
    </Dialog>
  )
}
