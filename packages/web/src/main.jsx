import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts + icons (bundled by Vite) — no external CDN request, so the
// app renders instantly even when the host can't reach Google Fonts (INC-001).
import '@fontsource/unbounded/700.css'
import '@fontsource/unbounded/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './index.css'
import App from './App.jsx'
import { I18nProvider } from './i18n/index.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
)
