<script setup lang="ts">
import { computed } from 'vue'
import { usePWAInstall } from '@/composables/usePWAInstall'

const { isInstallable, showIosInstructions, install } = usePWAInstall()

const shouldShowBanner = computed(() => {
  return isInstallable.value || showIosInstructions.value
})
</script>

<template>
  <Transition name="slide">
    <div
      v-if="shouldShowBanner"
      class="fixed bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4 z-[9999]"
    >
      <div
        class="rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 p-3 sm:p-4"
      >
        <div class="flex items-start gap-3">
          <img
            src="/pwa-192x192.png"
            class="h-9 w-9 sm:h-11 sm:w-11 rounded-xl"
          />

          <div class="flex-1">
            <h3 class="font-semibold">
              Install Rowad CRM
            </h3>

            <p
              v-if="isInstallable"
              class="text-sm text-slate-300"
            >
              Faster access and full screen experience.
            </p>

            <p
              v-else
              class="text-sm text-slate-300"
            >
              On iPhone: tap Share, then Add to Home Screen.
            </p>
          </div>

          <button
            v-if="isInstallable"
            @click="install"
            class="px-4 py-2 rounded-xl bg-blue-600 font-medium"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all .3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
</style>