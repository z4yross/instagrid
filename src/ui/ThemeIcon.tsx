/** Half-filled circle: the light / dark theme switch. */
export function ThemeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-[18px] fill-none stroke-current"
      strokeWidth={1.6}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" className="fill-current stroke-none" />
    </svg>
  )
}
