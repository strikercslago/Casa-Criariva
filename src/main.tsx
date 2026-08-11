import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GlobalErrorBoundary } from './shared/components/feedback/GlobalErrorBoundary'
import { reportWebVitals } from './lib/monitoring/webVitals'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </StrictMode>,
)

reportWebVitals()
