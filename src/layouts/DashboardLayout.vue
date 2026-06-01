<script setup lang="ts">
import Sidebar from '../components/Sidebar.vue'
import Navbar from '../components/Navbar.vue'
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex">

    <Sidebar />

    <div class="flex-1 flex flex-col">

      <Navbar />

      <main class="flex-1 p-8">
        <slot />
      </main>

    </div>

  </div>
</template>