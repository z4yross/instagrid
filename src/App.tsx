import { useEffect, useRef, useState } from 'react'
import { boot } from '@/db/session'
import { useLibrary } from '@/store/library'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import { addFiles } from '@/ui/actions'
import { Canvas } from '@/ui/canvas/Canvas'
import { FirstRun } from '@/ui/FirstRun'
import { Inspector } from '@/ui/Inspector'
import { Library } from '@/ui/Library'
import { MobileBottom } from '@/ui/MobileBottom'
import { OverlayHost } from '@/ui/OverlayHost'
import { toast, useOverlays } from '@/ui/overlays'
import { ProjectsDialog } from '@/ui/ProjectsDialog'
import { TopBar } from '@/ui/TopBar'
import { useIsDesktop } from '@/ui/useIsDesktop'
import { useKeyboard } from '@/ui/useKeyboard'

let booted = false

async function importAndReport(files: File[]) {
  if (files.length === 0) return
  try {
    const { rejected } = await addFiles(files)
    if (rejected.length === 1) toast(`${rejected[0]} was skipped. Use JPG, PNG or WEBP.`, 'error')
    else if (rejected.length > 1) {
      toast(`${rejected.length} files were skipped. Use JPG, PNG or WEBP.`, 'error')
    }
  } catch (error) {
    console.error('Adding photos failed', error)
    toast('The photos could not be saved on this device.', 'error')
  }
}

export default function App() {
  const input = useRef<HTMLInputElement>(null)
  const [dropping, setDropping] = useState(false)
  const hasBlocks = useProject((s) => s.blocks.length > 0)
  const hasImages = useLibrary((s) => s.images.length > 0)
  const loading = useLibrary((s) => s.loading)
  const saveStatus = useUi((s) => s.saveStatus)

  const desktop = useIsDesktop()
  useKeyboard()

  useEffect(() => {
    useOverlays.getState().setPickFiles(() => input.current?.click())
    if (booted) return
    booted = true
    void boot(window.localStorage, { width: window.innerWidth, height: window.innerHeight }).then(
      (migration) => {
        if (migration.imported) {
          toast(
            `Brought over ${migration.images} photos and ${migration.projects} grids from the previous version. Photo framing may differ slightly.`
          )
        }
      }
    )
  }, [])

  useEffect(() => {
    if (saveStatus === 'error') {
      toast('Changes are not being saved. Browser storage may be full or blocked.', 'error')
    }
  }, [saveStatus])

  // Photos pasted from the clipboard join the library (SPEC I.fs).
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])].filter((f) =>
        f.type.startsWith('image/')
      )
      if (files.length) {
        event.preventDefault()
        void importAndReport(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const hasFiles = (event: React.DragEvent) => event.dataTransfer.types.includes('Files')
  const firstRun = !loading && !hasBlocks && !hasImages

  return (
    <div
      className="grid h-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] desk:grid-cols-[184px_minmax(0,1fr)_256px] desk:grid-rows-[auto_minmax(0,1fr)] wide:grid-cols-[232px_minmax(0,1fr)_280px]"
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        setDropping(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDropping(false)
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        setDropping(false)
        void importAndReport([...event.dataTransfer.files])
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(event) => {
          void importAndReport([...(event.target.files ?? [])])
          event.target.value = ''
        }}
      />

      <TopBar />

      {desktop && <Library />}

      <main className="relative min-h-0 min-w-0">
        {firstRun ? <FirstRun /> : <Canvas />}
        {dropping && (
          <div className="pointer-events-none absolute inset-3 z-(--z-sticky) grid place-items-center rounded-control border-2 border-dashed border-ink bg-ground/85 text-md font-semibold">
            Drop to add photos
          </div>
        )}
      </main>

      {desktop ? <Inspector /> : <MobileBottom />}

      <ProjectsDialog />
      <OverlayHost />
    </div>
  )
}
