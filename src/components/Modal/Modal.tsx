import { useEffect, useRef } from 'react'

export type ModalType = 'alert' | 'confirm' | 'prompt' | 'choice'

interface Props {
  type: ModalType
  title?: string
  message: string
  onConfirm: (value?: string) => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  placeholder?: string
  options?: Array<{ label: string; value: string }>
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
  options = [],
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
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(124, 58, 237, 0.2)',
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
              color: '#000000',
              marginBottom: 12,
            }}
          >
            {title}
          </div>
        )}

        <div
          style={{
            fontSize: 14,
            color: '#222222',
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
              background: '#f9f9f9',
              border: '1px solid #cccccc',
              borderRadius: 4,
              color: '#000000',
              marginBottom: 16,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-accent)'
              e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.1)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#cccccc'
              e.target.style.boxShadow = 'none'
            }}
          />
        )}

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: type === 'choice' ? 'center' : 'flex-end',
            flexDirection: type === 'choice' ? 'column' : 'row',
          }}
        >
          {type === 'choice' ? (
            <>
              {options.map((opt) => (
                <button
                  key={opt.value}
                  className="ig-btn ig-btn-accent"
                  onClick={() => onConfirm(opt.value)}
                  style={{ padding: '12px 16px', fontSize: 14 }}
                >
                  {opt.label}
                </button>
              ))}
              <button
                className="ig-btn"
                onClick={onCancel}
                style={{ padding: '8px 16px', fontSize: 13, marginTop: 4 }}
              >
                {cancelText}
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
