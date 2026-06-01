<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'
import Navbar from '../components/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-950 p-2 sm:p-4">

    <div class="flex gap-2 sm:gap-4 h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)]">

      <div class="hidden lg:block">
        <Sidebar />
      </div>

      <div
        class="flex-1 bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col min-w-0"
      >
        <Navbar />

        <main class="flex-1 p-4 sm:p-8 overflow-auto no-scrollbar">
          <slot />
        </main>
      </div>

    </div>

  </div>
</template>
