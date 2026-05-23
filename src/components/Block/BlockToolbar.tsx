import { useStore } from '@/store/useStore'
import type { ImageBlock } from '@/store/types'

interface Props {
  block: ImageBlock
  onClose?: () => void
}

export default function BlockToolbar({ block, onClose }: Props) {
  const updateBlock = useStore((s) => s.updateBlock)
  const removeBlock = useStore((s) => s.removeBlock)
  const setSelectedBlock = useStore((s) => s.setSelectedBlock)

  function rotate() {
    const next = ((block.transform.rotation + 90) % 360) as 0 | 90 | 180 | 270
    updateBlock(block.id, { transform: { ...block.transform, rotation: next } })
  }

  function adjustPan(dx: number, dy: number) {
    updateBlock(block.id, { transform: { ...block.transform, panX: block.transform.panX + dx, panY: block.transform.panY + dy } })
  }

  function adjustZoom(delta: number) {
    const zoom = Math.max(0.1, Math.min(10, block.transform.zoom + delta))
    updateBlock(block.id, { transform: { ...block.transform, zoom } })
  }

  function del() {
    removeBlock(block.id)
    setSelectedBlock(null)
    onClose?.()
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      padding: '6px 10px',
      background: 'linear-gradient(90deg, #13131e 0%, #111118 100%)',
      borderBottom: '1px solid var(--color-border)',
      alignItems: 'center',
    }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Group label="Rotate">
        <Btn onClick={rotate}>↻ 90°</Btn>
      </Group>

      <Sep />

      <Group label="Pan">
        <Btn onClick={() => adjustPan(-10, 0)}>←</Btn>
        <Btn onClick={() => adjustPan(0, -10)}>↑</Btn>
        <Btn onClick={() => adjustPan(0, 10)}>↓</Btn>
        <Btn onClick={() => adjustPan(10, 0)}>→</Btn>
      </Group>

      <Sep />

      <Group label="Zoom">
        <Btn onClick={() => adjustZoom(0.1)}>＋</Btn>
        <Btn onClick={() => adjustZoom(-0.1)}>－</Btn>
      </Group>

      <Sep />

      <Group label="Bars">
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <input
            type="color"
            value={block.barsColor}
            onChange={(e) => updateBlock(block.id, { barsColor: e.target.value })}
            style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
          />
          color
        </label>
      </Group>

      <button
        onClick={del}
        style={{
          marginLeft: 'auto',
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 500,
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)',
          color: 'var(--color-danger)',
          borderRadius: 6,
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.16)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
      >
        ✕ Delete
      </button>
    </div>
  )
}

function Btn({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; active?: boolean; style?: React.CSSProperties }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 500,
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
        borderRadius: 5,
        cursor: 'pointer',
        transition: 'background 0.12s, box-shadow 0.12s',
        lineHeight: 1.4,
        ...style,
      }}
      onMouseEnter={(e) => !style && (e.currentTarget.style.background = 'var(--color-bg-hover)')}
      onMouseLeave={(e) => !style && (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 2px' }} />
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingLeft: 1 }}>{label}</div>
      <div style={{ display: 'flex', gap: 3 }}>{children}</div>
    </div>
  )
}
