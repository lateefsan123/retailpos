import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ttsService } from './lib/ttsService'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose ttsService for debugging in devtools
// @ts-expect-error
;(window as any).ttsService = ttsService
