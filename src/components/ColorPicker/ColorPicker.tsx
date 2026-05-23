import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#1f2937', '#374151', '#6b7280',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
]

export default function ColorPicker({ value, onChange, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHexInput(value)
  }, [value])

  useEffect(() => {
    if (!isOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  function handleHexChange(hex: string) {
    setHexInput(hex)
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          background: disabled ? 'var(--color-bg-base)' : 'var(--color-bg-elevated)',
          border: `1px solid ${disabled ? 'var(--color-border-subtle)' : 'var(--color-border)'}`,
          borderRadius: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background 0.12s, border-color 0.12s',
          opacity: disabled ? 0.5 : 1,
          width: '100%',
        }}
        onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = 'var(--color-bg-hover)')}
        onMouseLeave={(e) => !disabled && (e.currentTarget.style.background = 'var(--color-bg-elevated)')}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            background: value,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.2)',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
          {value.toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 200,
            width: 220,
          }}
        >
          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Presets
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(11, 1fr)',
              gap: 4,
              marginBottom: 12,
            }}
          >
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => onChange(color)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  background: color,
                  border: value === color ? '2px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: value === color ? '0 0 0 1px var(--color-accent)' : 'inset 0 0 0 1px rgba(0,0,0,0.2)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              />
            ))}
          </div>

          <div style={{ fontSize: 9, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Custom
          </div>
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            placeholder="#000000"
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 11,
              fontFamily: 'monospace',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-primary)',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          />
        </div>
      )}
    </div>
  )
}
