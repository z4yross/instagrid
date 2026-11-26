import { Copy, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createProject,
  deleteProject,
  duplicateProject,
  listProjects,
  openProject,
} from '@/db/session'
import type { ProjectSummary } from '@/db/session'
import { useProject } from '@/store/project'
import { ICON } from './classes'
import { Button, Dialog, IconButton } from './kit'
import { confirm, toast, useOverlays } from './overlays'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Your grids: rename the open one, switch, create, duplicate, delete (SPEC V16). */
export function ProjectsDialog() {
  const open = useOverlays((s) => s.dialog === 'projects')
  const close = useOverlays((s) => s.closeDialog)
  const currentId = useProject((s) => s.id)
  const name = useProject((s) => s.name)
  const rename = useProject((s) => s.rename)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [draft, setDraft] = useState(name)

  const refresh = async () => {
    try {
      setProjects(await listProjects())
    } catch (error) {
      console.error('Listing grids failed', error)
      toast('Your saved grids could not be read.', 'error')
    }
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    listProjects()
      .then((list) => {
        if (!cancelled) setProjects(list)
      })
      .catch(() => toast('Your saved grids could not be read.', 'error'))
    return () => {
      cancelled = true
    }
  }, [open, currentId])

  const [syncedName, setSyncedName] = useState(name)
  if (syncedName !== name) {
    setSyncedName(name)
    setDraft(name)
  }

  const commitName = () => {
    const next = draft.trim()
    if (next && next !== name) {
      rename(next)
      setProjects((list) => list.map((p) => (p.id === currentId ? { ...p, name: next } : p)))
    } else {
      setDraft(name)
    }
  }

  const run = async (work: () => Promise<unknown>, failure: string) => {
    try {
      await work()
    } catch (error) {
      console.error(failure, error)
      toast(failure, 'error')
    }
    await refresh()
  }

  const remove = async (project: ProjectSummary) => {
    const ok = await confirm({
      title: `Delete "${project.name}"?`,
      body: 'The grid layout is deleted. Its photos stay in your library. This cannot be undone.',
      confirmLabel: 'Delete grid',
    })
    if (ok) await run(() => deleteProject(project.id), 'The grid could not be deleted.')
  }

  return (
    <Dialog
      open={open}
      title="Your grids"
      onClose={close}
      width="desk:w-[480px]"
      footer={
        <Button
          onClick={() =>
            void run(async () => {
              await createProject()
              close()
            }, 'A new grid could not be created.')
          }
        >
          <Plus {...ICON} />
          New grid
        </Button>
      }
    >
      <div className="grid gap-1.5">
        <label htmlFor="project-name" className="text-sm text-ink-3">
          Name of this grid
        </label>
        <input
          id="project-name"
          value={draft}
          maxLength={60}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
          }}
          className="h-(--control-h) w-full rounded-control border border-line bg-raised px-2.5 hover:border-line-strong"
        />
      </div>

      <h3 className="mt-5 mb-2 font-semibold">Saved on this device</h3>
      <ul className="grid gap-1">
        {projects.map((project) => {
          const current = project.id === currentId
          return (
            <li
              key={project.id}
              className={`flex items-center gap-1 rounded-control border p-1 ${current ? 'border-ink' : 'border-line'}`}
            >
              <button
                type="button"
                aria-current={current}
                onClick={() =>
                  void run(async () => {
                    if (!current) await openProject(project.id)
                    close()
                  }, 'The grid could not be opened.')
                }
                className="min-w-0 flex-1 rounded-chip px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-hover"
              >
                <b className="block truncate font-semibold">{project.name}</b>
                <span className="text-sm text-ink-3">
                  {project.blockCount} {project.blockCount === 1 ? 'block' : 'blocks'}
                  {current ? ', open now' : `, ${dateFormat.format(project.updatedAt)}`}
                </span>
              </button>
              <IconButton
                label={`Duplicate ${project.name}`}
                onClick={() =>
                  void run(() => duplicateProject(project.id), 'The grid could not be duplicated.')
                }
              >
                <Copy {...ICON} />
              </IconButton>
              <IconButton label={`Delete ${project.name}`} onClick={() => void remove(project)}>
                <Trash2 {...ICON} />
              </IconButton>
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}
