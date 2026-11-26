/** Join class names, skipping falsy parts. */
export const cx = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(' ')

/** Shared size for line icons from lucide-react. */
export const ICON = {
  className: 'size-[18px] flex-none',
  strokeWidth: 1.6,
  'aria-hidden': true,
} as const
