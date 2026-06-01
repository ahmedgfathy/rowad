import { computed, onMounted, onUnmounted, ref } from 'vue'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

export function usePWAInstall() {
  const isInstallable = ref(false)
  const isIos = ref(false)
  const isInStandaloneMode = ref(false)

  const updatePlatformState = () => {
    const ua = window.navigator.userAgent.toLowerCase()

    isIos.value = /iphone|ipad|ipod/.test(ua)

    isInStandaloneMode.value =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  }

  const onBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEvent

    promptEvent.preventDefault()
    deferredPrompt.value = promptEvent
    isInstallable.value = true
  }

  onMounted(() => {
    updatePlatformState()

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null
      isInstallable.value = false
      updatePlatformState()
    })
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  })

  const install = async () => {
    if (!deferredPrompt.value) return

    deferredPrompt.value.prompt()

    await deferredPrompt.value.userChoice

    deferredPrompt.value = null

    isInstallable.value = false
  }

  const showIosInstructions = computed(() => {
    return isIos.value && !isInStandaloneMode.value
  })

  return {
    isInstallable,
    showIosInstructions,
    install
  }
}