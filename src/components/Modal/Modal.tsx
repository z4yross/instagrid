import { useEffect, useRef } from 'react'

export type ModalType = 'alert' | 'confirm' | 'prompt'

interface Props {
  type: ModalType
  title?: string
  message: string
  onConfirm: (value?: string) => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  placeholder?: string
}

export default function Modal({
  type,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  placeholder = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (type === 'prompt' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [type])

  function handleConfirm() {
    if (type === 'prompt') {
      onConfirm(inputRef.current?.value || '')
    } else {
      onConfirm()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 107, 53, 0.2)',
          minWidth: 320,
          maxWidth: 480,
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {title && (
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 12,
            }}
          >
            {title}
          </div>
        )}

        <div
          style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            marginBottom: type === 'prompt' ? 16 : 20,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>

        {type === 'prompt' && (
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              color: 'var(--color-text-primary)',
              marginBottom: 16,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-accent)'
              e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
              e.target.style.boxShadow = 'none'
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
          }}
        >
          {type !== 'alert' && (
            <button
              className="ig-btn"
              onClick={onCancel}
              style={{ padding: '8px 16px', fontSize: 13 }}
            >
              {cancelText}
            </button>
          )}
          <button
            className="ig-btn ig-btn-accent"
            onClick={handleConfirm}
            style={{ padding: '8px 16px', fontSize: 13 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
