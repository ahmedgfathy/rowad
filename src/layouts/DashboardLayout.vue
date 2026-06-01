<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import Navbar from '../components/Navbar.vue'

const route = useRoute()
const sidebarOpen = ref(false)

const openSidebar = () => {
  sidebarOpen.value = true
}

const closeSidebar = () => {
  sidebarOpen.value = false
}

watch(
  () => route.fullPath,
  () => {
    closeSidebar()
  }
)
</script>

<template>
  <div class="min-h-screen bg-slate-950 p-2 sm:p-4">

    <div class="flex gap-2 sm:gap-4 h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]">

      <div class="hidden lg:block">
        <Sidebar />
      </div>

      <Transition name="mobile-sidebar">
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 z-50 lg:hidden"
        >
          <button
            class="absolute inset-0 bg-slate-950/70"
            @click="closeSidebar"
            aria-label="Close navigation menu"
          />

          <div class="absolute left-2 top-2 bottom-2 w-72 max-w-[calc(100vw-1rem)]">
            <Sidebar @navigate="closeSidebar" />
          </div>
        </div>
      </Transition>

      <div
        class="flex-1 bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col min-w-0"
      >
        <Navbar @toggle-sidebar="openSidebar" />

        <main class="flex-1 p-4 sm:p-8 overflow-auto">
          <slot />
        </main>
      </div>

    </div>

  </div>
</template>

<style scoped>
.mobile-sidebar-enter-active,
.mobile-sidebar-leave-active {
  transition: opacity .2s ease;
}

.mobile-sidebar-enter-from,
.mobile-sidebar-leave-to {
  opacity: 0;
}
</style>