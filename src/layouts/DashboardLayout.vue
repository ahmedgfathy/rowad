<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'
import Navbar from '../components/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-950 p-4">

    <div class="flex gap-4 h-[calc(100vh-2rem)]">

      <Sidebar />

      <div
        class="flex-1 bg-slate-900 rounded-3xl overflow-hidden flex flex-col"
      >
        <Navbar />

        <main class="flex-1 p-8 overflow-auto">
          <slot />
        </main>
      </div>

    </div>

  </div>
</template>