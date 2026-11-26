import { Columns2, Copy, Crop, SquareArrowRightEnter, Trash2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { orderLabel } from '@/core/numbering'
import { useProject } from '@/store/project'
import { useUi } from '@/store/ui'
import { deleteSelection, duplicateSelection, enterAdjust, splitSelection } from './actions'
import { AdjustControls, Swatches } from './AdjustControls'
import { cx, ICON } from './classes'
import { Button } from './kit'
import { runJoin } from './runJoin'
import { useSelection } from './useSelection'

/** Desktop right panel: properties and actions of the selection (SPEC V30). */
export function Inspector() {
  const mode = useUi((s) => s.mode)
  const exitAdjust = useUi((s) => s.exitAdjust)
  const setColor = useProject((s) => s.setColor)
  const info = useSelection()
  const { single, image, blocks } = info

  if (mode === 'preview') {
    return (
      <Panel>
        <Blank title="Preview">
          The grid as it will look on your profile. Numbers and guides are hidden. Press Esc or
          Preview to go back.
        </Blank>
      </Panel>
    )
  }

  if (mode === 'adjust' && single && image) {
    return (
      <Panel>
        <Header title="Adjust photo" subtitle={image.name} thumb={image.url} />
        <Section>
          <AdjustControls block={single} image={image} />
        </Section>
        <div className="mt-auto border-t border-line-soft p-4">
          <Button variant="primary" className="w-full" onClick={exitAdjust}>
            Done
          </Button>
        </div>
      </Panel>
    )
  }

  if (blocks.length === 0) {
    return (
      <Panel>
        <Blank title="Nothing selected">
          Click a photo to select it. Drag it to move it, drag a corner to make it span more cells,
          double-click to adjust the photo inside its frame.
        </Blank>
        <Section title="Keyboard">
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 text-ink-2">
            <Key name="Undo / Redo" keys={['Ctrl Z', 'Ctrl Y']} />
            <Key name="Duplicate" keys={['Ctrl D']} />
            <Key name="Copy / Paste" keys={['Ctrl C', 'Ctrl V']} />
            <Key name="Delete" keys={['Del']} />
            <Key name="Add to selection" keys={['Ctrl click', 'Shift click']} />
            <Key name="Deselect" keys={['Esc']} />
          </dl>
        </Section>
      </Panel>
    )
  }

  const sizeLabel = single
    ? `${single.colSpan} × ${single.rowSpan} ${single.colSpan * single.rowSpan === 1 ? 'cell' : 'cells'}`
    : `${blocks.length} blocks`

  return (
    <Panel>
      {single ? (
        <Header
          title={image ? image.name : 'Color cell'}
          subtitle={image ? `${image.width} × ${image.height} px` : 'Not exported'}
          thumb={image?.url}
          color={image ? undefined : single.color}
        />
      ) : (
        <Header
          title={`${blocks.length} blocks selected`}
          subtitle="Move them together, or join them"
        />
      )}

      <Section>
        <dl className="grid grid-cols-[88px_1fr] items-center gap-y-2">
          <dt className="text-ink-3">Size</dt>
          <dd>{sizeLabel}</dd>
          {info.numbers.length > 0 && (
            <>
              <dt className="text-ink-3">{info.numbers.length === 1 ? 'Post' : 'Posts'}</dt>
              <dd className="flex flex-wrap gap-1">
                {info.numbers.map((n) => (
                  <span
                    key={n}
                    className="grid h-5 min-w-6 place-items-center rounded-chip bg-accent px-1 text-sm leading-none font-bold text-on-accent"
                  >
                    {orderLabel(n)}
                  </span>
                ))}
              </dd>
            </>
          )}
          {single && image && info.exportSize && (
            <>
              <dt className="text-ink-3">Exports at</dt>
              <dd>
                {info.exportSize.width} × {info.exportSize.height} px
              </dd>
            </>
          )}
        </dl>

        {info.lowRes && (
          <p className="mt-4 flex gap-2 rounded-control border border-warn-line bg-warn-bg p-3 text-sm text-warn-ink">
            <TriangleAlert aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.8} />
            <span>
              <strong className="font-semibold">Low resolution.</strong> The photo is smaller than
              this block needs, so it will export soft ({info.upscalePercent}% of its size). Make
              the block smaller or use a larger photo.
            </span>
          </p>
        )}
      </Section>

      {single?.kind === 'color' && (
        <Section title="Color">
          <Swatches
            label="Cell color"
            value={single.color}
            onChange={(color) => setColor([single.id], color)}
          />
        </Section>
      )}

      <Section>
        <div className="-mx-2 grid gap-0.5">
          {info.canAdjust && (
            <Action
              icon={<Crop {...ICON} />}
              label="Adjust"
              hint="Double-click"
              onClick={enterAdjust}
            />
          )}
          <Action
            icon={<Columns2 {...ICON} />}
            label={
              single && !info.splitBlocker
                ? `Split into ${single.colSpan * single.rowSpan} cells`
                : 'Split'
            }
            blocker={info.splitBlocker}
            onClick={splitSelection}
          />
          <Action
            icon={<SquareArrowRightEnter {...ICON} />}
            label="Join"
            blocker={info.joinBlocker}
            onClick={() => void runJoin()}
          />
          <Action
            icon={<Copy {...ICON} />}
            label="Duplicate"
            hint="Ctrl D"
            onClick={duplicateSelection}
          />
          <Action icon={<Trash2 {...ICON} />} label="Delete" hint="Del" onClick={deleteSelection} />
        </div>
      </Section>
    </Panel>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="Selection"
      className="flex min-h-0 flex-col overflow-y-auto border-l border-line bg-panel"
    >
      {children}
    </aside>
  )
}

function Header({
  title,
  subtitle,
  thumb,
  color,
}: {
  title: string
  subtitle: string
  thumb?: string
  color?: string
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line-soft p-4">
      {(thumb || color) && (
        <span
          className="size-11 flex-none overflow-hidden rounded-chip bg-cell-empty"
          style={{ backgroundColor: color }}
        >
          {thumb && <img src={thumb} alt="" className="size-full object-cover" />}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="truncate font-semibold">{title}</h2>
        <p className="truncate text-sm text-ink-3">{subtitle}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line-soft p-4 last:border-b-0">
      {title && <h3 className="mb-3 font-semibold">{title}</h3>}
      {children}
    </section>
  )
}

function Blank({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-line-soft p-4 text-ink-2">
      <h2 className="mb-1 font-semibold text-ink">{title}</h2>
      <p className="text-pretty">{children}</p>
    </div>
  )
}

function Key({ name, keys }: { name: string; keys: string[] }) {
  return (
    <>
      <dt>{name}</dt>
      <dd className="flex justify-end gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="rounded-chip border border-line bg-raised px-1.5 py-px font-sans text-xs font-medium text-ink-2"
          >
            {key}
          </kbd>
        ))}
      </dd>
    </>
  )
}

/** A row action. When blocked it stays in place, dimmed, and says why (SPEC V25). */
function Action({
  icon,
  label,
  hint,
  blocker,
  onClick,
}: {
  icon: ReactNode
  label: string
  hint?: string
  blocker?: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={Boolean(blocker)}
      onClick={onClick}
      className={cx(
        'flex min-h-9 items-center gap-2.5 rounded-control px-2 py-1 text-left font-medium transition-colors duration-150 ease-out',
        'enabled:hover:bg-hover enabled:active:bg-press disabled:text-disabled'
      )}
    >
      {icon}
      <span className="min-w-0">
        {label}
        {blocker && <small className="block text-xs font-normal text-ink-3">{blocker}</small>}
      </span>
      {hint && !blocker && <span className="ml-auto text-sm font-normal text-ink-3">{hint}</span>}
    </button>
  )
}
