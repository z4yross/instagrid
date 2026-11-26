import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx, ICON } from './classes'

/* Small shared controls. Visual rules live in DESIGN.md. */

type ButtonVariant = 'default' | 'primary' | 'ghost'

const BUTTON_BASE =
  'inline-flex h-(--control-h) items-center justify-center gap-1.5 rounded-control border px-3 font-medium whitespace-nowrap transition-colors duration-150 ease-out disabled:text-disabled'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  default:
    'border-line bg-raised enabled:hover:border-line-strong enabled:hover:bg-raised-hover enabled:active:bg-raised-press',
  primary:
    'border-ink bg-ink text-on-ink enabled:hover:border-primary-hover enabled:hover:bg-primary-hover enabled:active:bg-primary-press disabled:border-line disabled:bg-raised',
  ghost: 'border-transparent bg-transparent enabled:hover:bg-hover enabled:active:bg-press',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  pressed?: boolean
}

export function Button({ variant = 'default', pressed, className, type, ...rest }: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      aria-pressed={pressed}
      className={cx(BUTTON_BASE, BUTTON_VARIANT[pressed ? 'primary' : variant], className)}
      {...rest}
    />
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  pressed?: boolean
}

/** Square icon-only button. `label` is its accessible name and tooltip. */
export function IconButton({ label, pressed, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cx(
        'inline-grid size-(--control-h) flex-none place-items-center rounded-control text-ink-2 transition-colors duration-150 ease-out enabled:hover:bg-hover enabled:hover:text-ink enabled:active:bg-press disabled:text-disabled',
        pressed && 'bg-ink text-on-ink enabled:hover:bg-primary-hover enabled:hover:text-on-ink',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Footer row, usually the buttons. */
  footer?: ReactNode
  /** Width class for desktop. */
  width?: string
}

/**
 * Modal dialog on the native <dialog>: focus is trapped and Esc closes it
 * (SPEC V27). On mobile it docks to the bottom edge.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  width = 'desk:w-[560px]',
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cx(
        'm-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-[14px] bg-panel p-0 text-ink shadow-dialog backdrop:bg-scrim',
        'desk:m-auto desk:max-h-[calc(100dvh-48px)] desk:rounded-[10px]',
        width
      )}
    >
      {open && (
        <div className="flex max-h-[inherit] flex-col pb-[env(safe-area-inset-bottom)]">
          <header className="flex flex-none items-center pt-4 pr-3 pl-5">
            <h2 className="text-lg font-semibold tracking-[-0.015em] text-balance">{title}</h2>
            <IconButton label="Close" className="ml-auto" onClick={onClose}>
              <X {...ICON} />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-5">{children}</div>
          {footer && (
            <footer className="flex flex-none items-center justify-end gap-2 border-t border-line px-5 py-3 [&>button]:flex-1 desk:[&>button]:flex-none">
              {footer}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}
