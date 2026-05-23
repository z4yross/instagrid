import { useState } from 'react'
import Sidebar from '@/components/Sidebar/Sidebar'
import CanvasArea from '@/components/Canvas/CanvasArea'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import RightToolbar from '@/components/Toolbar/RightToolbar'
import useKeyboard from '@/hooks/useKeyboard'

export default function App() {
  useKeyboard()

  const [showPreview, setShowPreview] = useState(false)
  const [lowResWarning, setLowResWarning] = useState<string[]>([])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      <Sidebar onLowRes={setLowResWarning} onPreview={() => setShowPreview(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: 64 }}>
        {lowResWarning.length > 0 && (
          <div style={{
            padding: '6px 12px',
            background: 'rgba(251,191,36,0.12)',
            borderBottom: '1px solid rgba(251,191,36,0.3)',
            fontSize: 12, color: 'var(--color-warning)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            ⚠ Low resolution: {lowResWarning.join(', ')} — may look blurry at export
            <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
              onClick={() => setLowResWarning([])}>✕</button>
          </div>
        )}

        <CanvasArea onLowRes={setLowResWarning} />
      </div>

      <RightToolbar />

      {showPreview && <PreviewPanel onClose={() => setShowPreview(false)} />}
    </div>
  )
}
