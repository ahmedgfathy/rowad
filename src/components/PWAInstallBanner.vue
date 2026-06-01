<script setup lang="ts">
import { usePWAInstall } from '@/composables/usePWAInstall'

const { isInstallable, install } = usePWAInstall()
</script>

<template>
  <Transition name="slide">
    <div
      v-if="isInstallable"
      class="fixed bottom-4 left-4 right-4 z-[9999]"
    >
      <div
        class="rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 p-4"
      >
        <div class="flex items-center gap-3">
            <img
              :src="icon"
              class="h-12 w-12 rounded-xl"
            />

          <div class="flex-1">
            <h3 class="font-semibold">
              Install Rowad CRM
            </h3>

            <p class="text-sm text-slate-300">
              Faster access and full screen experience.
            </p>
          </div>

          <button
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