import { useState } from 'react'
import { useStore } from '@/store/useStore'
import Sidebar from '@/components/Sidebar/Sidebar'
import CanvasArea from '@/components/Canvas/CanvasArea'
import PreviewPanel from '@/components/Preview/PreviewPanel'
import BlockToolbar from '@/components/Block/BlockToolbar'
import useKeyboard from '@/hooks/useKeyboard'

export default function App() {
  useKeyboard()

  const [showPreview, setShowPreview] = useState(false)
  const [lowResWarning, setLowResWarning] = useState<string[]>([])

  const selectedBlockId = useStore((s) => s.selectedBlockId)
  const blocks = useStore((s) => s.blocks)
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--color-bg-base)' }}>
      <Sidebar onLowRes={setLowResWarning} onPreview={() => setShowPreview(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedBlock && (
          <BlockToolbar block={selectedBlock} onClose={() => useStore.getState().setSelectedBlock(null)} />
        )}

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

      {showPreview && <PreviewPanel onClose={() => setShowPreview(false)} />}
    </div>
  )
}
