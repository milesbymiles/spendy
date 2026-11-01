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
if (!isNative) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      // iOS keeps home-screen apps suspended rather than relaunching them, so also look for a
      // new version each time spendy comes back to the foreground.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration?.update().catch(() => {})
      })
    },
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)
