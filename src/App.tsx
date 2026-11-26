import { useEffect, useRef } from 'react'
import { boot } from '@/db/session'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import {
  addColorCell,
  addFiles,
  deleteSelection,
  duplicateSelection,
  enterAdjust,
  joinSelection,
  redo,
  splitSelection,
  undo,
} from '@/ui/actions'
import { Canvas } from '@/ui/canvas/Canvas'

let booted = false

function Action({ label, run }: { label: string; run: () => void }) {
  return (
    <button
      type="button"
      onClick={run}
      className="h-8 rounded-control border border-line bg-raised px-3 font-medium hover:bg-raised-hover"
    >
      {label}
    </button>
  )
}

/** Temporary shell for stage 3. The desktop and mobile shells replace it in stage 4. */
export default function App() {
  const input = useRef<HTMLInputElement>(null)
  const name = useProject((s) => s.name)
  const mode = useUi((s) => s.mode)

  useEffect(() => {
    if (booted) return
    booted = true
    void boot(window.localStorage, { width: window.innerWidth, height: window.innerHeight })
  }, [])

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <strong className="mr-2 text-md font-semibold">{name}</strong>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            void addFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }}
        />
        <Action label="Add photos" run={() => input.current?.click()} />
        <Action label="Add color cell" run={addColorCell} />
        <Action label="Adjust" run={enterAdjust} />
        <Action label="Split" run={splitSelection} />
        <Action label="Join" run={() => void joinSelection()} />
        <Action label="Duplicate" run={duplicateSelection} />
        <Action label="Delete" run={deleteSelection} />
        <Action label="Undo" run={undo} />
        <Action label="Redo" run={redo} />
        <Action
          label={mode === 'preview' ? 'Exit preview' : 'Preview'}
          run={() => useUi.getState().togglePreview()}
        />
        {mode === 'adjust' && <Action label="Done" run={() => useUi.getState().exitAdjust()} />}
      </header>
      <Canvas />
    </div>
  )
}
