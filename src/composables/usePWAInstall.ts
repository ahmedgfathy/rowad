import { ref } from 'vue'

const deferredPrompt = ref<any>(null)

window.addEventListener('beforeinstallprompt', (e: Event) => {
  e.preventDefault()
  deferredPrompt.value = e
})

export function usePWAInstall() {
  const isInstallable = ref(false)

  window.addEventListener('beforeinstallprompt', () => {
    isInstallable.value = true
  })

  const install = async () => {
    if (!deferredPrompt.value) return

    deferredPrompt.value.prompt()

    await deferredPrompt.value.userChoice

    deferredPrompt.value = null

    isInstallable.value = false
  }

  return {
    isInstallable,
    install
  }
}