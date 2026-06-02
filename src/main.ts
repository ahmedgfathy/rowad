import './style.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import { registerSW } from 'virtual:pwa-register'

const RECOVERY_FLAG_KEY = 'rowad-pwa-recovery-attempted'

const shouldRecoverFromError = (message: string) => {
  const value = message.toLowerCase()

  return (
    value.includes('failed to fetch dynamically imported module') ||
    value.includes('importing a module script failed') ||
    value.includes('chunk')
  )
}

const recoverFromStalePWA = async () => {
  if (sessionStorage.getItem(RECOVERY_FLAG_KEY) === '1') {
    window.location.reload()
    return
  }

  sessionStorage.setItem(RECOVERY_FLAG_KEY, '1')

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }

    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      await Promise.all(cacheKeys.map((key) => caches.delete(key)))
    }
  } catch (error) {
    console.error('PWA recovery failed:', error)
  }

  window.location.replace(`${window.location.pathname}?reloaded=${Date.now()}${window.location.hash}`)
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  void recoverFromStalePWA()
})

window.addEventListener('error', (event) => {
  if (!event.message || !shouldRecoverFromError(event.message)) return
  void recoverFromStalePWA()
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = typeof reason === 'string'
    ? reason
    : reason instanceof Error
      ? reason.message
      : ''

  if (!message || !shouldRecoverFromError(message)) return
  void recoverFromStalePWA()
})

const updateSW = registerSW({
  immediate: true,

  onNeedRefresh() {
    updateSW(true)
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')