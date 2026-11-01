import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { isNative } from './native'
import { applyTheme, getPrefs } from './prefs'
import { StoreProvider } from './store'
import './styles.css'

applyTheme(getPrefs().theme ?? 'system')

// The native app ships its files in the bundle; the service worker is only for the web build.
if (!isNative) registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
