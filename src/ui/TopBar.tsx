import {
  Check,
  ChevronDown,
  CircleAlert,
  Download,
  Eye,
  LoaderCircle,
  Redo2,
  Undo2,
} from 'lucide-react'
import { useStore } from 'zustand'
import { numberedCells } from '@/core/numbering'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import { toggleTheme, useTheme } from '@/theme/theme'
import { redo, undo } from './actions'
import { ICON } from './classes'
import { Button, IconButton } from './kit'
import { useIsDesktop } from './useIsDesktop'
import { useOverlays } from './overlays'

function GridMark() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-5 flex-none fill-current">
      {[0, 1, 2].flatMap((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`${col}${row}`}
            x={1 + col * 6.5}
            y={1 + row * 6.5}
            width="5"
            height="5"
            rx="1"
          />
        ))
      )}
    </svg>
  )
}

function ThemeIcon() {
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

const SAVE_LABEL = {
  saved: 'Saved on this device',
  saving: 'Saving',
  error: 'Not saved: storage problem',
} as const

/** Top bar: project, saved state, theme, history, preview, export (SPEC V30, V31). */
export function TopBar() {
  const name = useProject((s) => s.name)
  const blocks = useProject((s) => s.blocks)
  const mode = useUi((s) => s.mode)
  const saveStatus = useUi((s) => s.saveStatus)
  const togglePreview = useUi((s) => s.togglePreview)
  const openDialog = useOverlays((s) => s.openDialog)
  const canUndo = useStore(useProject.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useProject.temporal, (s) => s.futureStates.length > 0)
  const theme = useTheme()
  const desktop = useIsDesktop()

  const files = numberedCells(blocks).length
  const preview = mode === 'preview'
  const SaveIcon =
    saveStatus === 'saved' ? Check : saveStatus === 'saving' ? LoaderCircle : CircleAlert

  return (
    <header className="col-span-full flex h-(--topbar-h) items-center gap-0.5 border-b border-line bg-panel pr-2 pl-3 desk:gap-2 desk:px-3">
      <span className="hidden items-center gap-2 text-md font-semibold tracking-[-0.01em] desk:flex">
        <GridMark />
        InstaGrid
      </span>
      <span aria-hidden className="mx-1 hidden h-5 w-px bg-line desk:block" />

      <Button
        variant="ghost"
        className="min-w-11 gap-1 px-1.5 desk:px-2"
        onClick={() => openDialog('projects')}
        aria-haspopup="dialog"
        title="Your grids"
        aria-label={`${name}, your grids`}
      >
        <span className="truncate">{name}</span>
        <ChevronDown aria-hidden className="size-3.5 flex-none text-ink-3" strokeWidth={1.6} />
      </Button>

      <span
        role="status"
        className={`hidden items-center gap-1 text-sm wide:inline-flex ${saveStatus === 'error' ? 'text-warn-ink' : 'text-ink-3'}`}
      >
        <SaveIcon
          aria-hidden
          className={`size-3.5 ${saveStatus === 'saving' ? 'animate-spin motion-reduce:animate-none' : ''}`}
          strokeWidth={1.8}
        />
        {SAVE_LABEL[saveStatus]}
      </span>

      <span className="flex-1" />

      <IconButton
        label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        onClick={toggleTheme}
      >
        <ThemeIcon />
      </IconButton>
      <IconButton label="Undo" disabled={!canUndo || preview} onClick={undo}>
        <Undo2 {...ICON} />
      </IconButton>
      <IconButton label="Redo" disabled={!canRedo || preview} onClick={redo}>
        <Redo2 {...ICON} />
      </IconButton>

      {desktop ? (
        <Button
          variant="ghost"
          pressed={preview}
          onClick={togglePreview}
          title="See the grid as it lands on your profile"
        >
          <Eye {...ICON} />
          Preview
        </Button>
      ) : (
        <IconButton label="Preview" pressed={preview} onClick={togglePreview}>
          <Eye {...ICON} />
        </IconButton>
      )}

      <span className="mx-1 hidden text-sm text-ink-3 desk:inline">
        {files} {files === 1 ? 'file' : 'files'}
      </span>

      <Button
        variant="primary"
        className="ml-1.5 px-3.5 desk:ml-0 desk:px-3"
        disabled={files === 0}
        onClick={() => openDialog('export')}
      >
        {desktop && <Download {...ICON} />}
        Export
      </Button>
    </header>
  )
}
