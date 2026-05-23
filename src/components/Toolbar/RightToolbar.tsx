import { useStore } from '@/store/useStore'
import ColorPicker from '@/components/ColorPicker/ColorPicker'

export default function RightToolbar() {
  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const blocks = useStore((s) => s.blocks)
  const updateBlock = useStore((s) => s.updateBlock)
  const removeBlock = useStore((s) => s.removeBlock)
  const setSelectedBlock = useStore((s) => s.setSelectedBlock)

  const block = blocks.find((b) => b.id === selectedBlockId)
  const disabled = !block

  function rotate() {
    if (!block) return
    const next = ((block.transform.rotation + 90) % 360) as 0 | 90 | 180 | 270
    updateBlock(block.id, { transform: { ...block.transform, rotation: next } })
  }

  function adjustPan(dx: number, dy: number) {
    if (!block) return
    updateBlock(block.id, { transform: { ...block.transform, panX: block.transform.panX + dx, panY: block.transform.panY + dy } })
  }

  function adjustZoom(delta: number) {
    if (!block) return
    const zoom = Math.max(0.1, Math.min(10, block.transform.zoom + delta))
    updateBlock(block.id, { transform: { ...block.transform, zoom } })
  }

  function del() {
    if (!block) return
    removeBlock(block.id)
    setSelectedBlock(null)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 240,
        height: '100vh',
        background: 'linear-gradient(180deg, #13131e 0%, #0d0d14 100%)',
        borderLeft: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: 16,
        zIndex: 100,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Transform
      </div>

      <Section label="Rotate">
        <Btn onClick={rotate} disabled={disabled}>↻ 90°</Btn>
      </Section>

      <Section label="Pan">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <div />
          <Btn onClick={() => adjustPan(0, -10)} disabled={disabled}>↑</Btn>
          <div />
          <Btn onClick={() => adjustPan(-10, 0)} disabled={disabled}>←</Btn>
          <Btn onClick={() => adjustPan(0, 10)} disabled={disabled}>↓</Btn>
          <Btn onClick={() => adjustPan(10, 0)} disabled={disabled}>→</Btn>
        </div>
      </Section>

      <Section label="Zoom">
        <div style={{ display: 'flex', gap: 4 }}>
          <Btn onClick={() => adjustZoom(-0.1)} disabled={disabled}>－</Btn>
          <Btn onClick={() => adjustZoom(0.1)} disabled={disabled}>＋</Btn>
        </div>
      </Section>

      <Section label="Bars Color">
        <ColorPicker
          value={block?.barsColor ?? '#000000'}
          onChange={(color) => block && updateBlock(block.id, { barsColor: color })}
          disabled={disabled}
        />
      </Section>

      <div style={{ flex: 1 }} />

      <button
        onClick={del}
        disabled={disabled}
        style={{
          padding: '10px 14px',
          fontSize: 12,
          fontWeight: 600,
          background: disabled ? 'rgba(248,113,113,0.05)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${disabled ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.3)'}`,
          color: disabled ? 'var(--color-text-muted)' : 'var(--color-danger)',
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          opacity: disabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = 'rgba(248,113,113,0.18)')}
        onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = 'rgba(248,113,113,0.1)')}
      >
        ✕ Delete Block
      </button>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 12px',
        fontSize: 12,
        fontWeight: 500,
        background: disabled ? 'var(--color-bg-base)' : 'var(--color-bg-elevated)',
        border: `1px solid ${disabled ? 'var(--color-border-subtle)' : 'var(--color-border)'}`,
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.12s, box-shadow 0.12s, border-color 0.12s',
        lineHeight: 1.4,
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = 'var(--color-bg-hover)')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
    >
      {children}
    </button>
  )
}
