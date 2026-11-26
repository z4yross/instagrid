import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { parseSendHash } from './transfer/protocol'
import { SendPage } from './ui/SendPage'

// A phone that scanned a transfer code only sends photos; it does not open the editor.
const sendTo = parseSendHash(window.location.hash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>{sendTo ? <SendPage transferId={sendTo} /> : <App />}</StrictMode>
)
