import { CircleAlert, X } from 'lucide-react'
import { Button, Dialog } from './kit'
import { dismissToast, useOverlays } from './overlays'

/** Renders the confirmation dialog and the toasts (SPEC V27). */
export function OverlayHost() {
  const request = useOverlays((s) => s.confirm)
  const toasts = useOverlays((s) => s.toasts)

  return (
    <>
      <Dialog
        open={Boolean(request)}
        title={request?.title ?? ''}
        onClose={() => request?.resolve(false)}
        width="desk:w-[420px]"
        footer={
          <>
            <Button onClick={() => request?.resolve(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => request?.resolve(true)}>
              {request?.confirmLabel}
            </Button>
          </>
        }
      >
        <p className="text-pretty text-ink-2">{request?.body}</p>
      </Dialog>

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-(--z-toast) grid justify-items-center gap-2 desk:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-[min(100%,28rem)] items-start gap-2 rounded-control border py-2 pr-1.5 pl-3 shadow-dialog ${
              t.tone === 'error'
                ? 'border-warn-line bg-warn-bg text-warn-ink'
                : 'border-line bg-raised text-ink'
            }`}
          >
            {t.tone === 'error' && (
              <CircleAlert aria-hidden className="mt-0.5 size-4 flex-none" strokeWidth={1.8} />
            )}
            <span className="py-0.5 text-pretty">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismissToast(t.id)}
              className="grid size-6 flex-none place-items-center rounded-chip hover:bg-hover pointer-coarse:size-11"
            >
              <X aria-hidden className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
