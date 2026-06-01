<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const isActive = (path: string) => {
  return route.path === path
}
</script>

<template>
  <aside
    class="w-72 bg-slate-900 border-r border-slate-800 flex flex-col"
  >
    <div class="p-6 border-b border-slate-800">
      <h1 class="text-2xl font-bold text-white">
        Rowad CRM
      </h1>

      <p class="text-slate-400 text-sm mt-1">
        Real Estate Platform
      </p>
    </div>

    <nav class="p-4 space-y-2">

      <router-link
        to="/dashboard"
        class="block px-4 py-3 rounded-xl text-white"
        :class="isActive('/dashboard')
          ? 'bg-blue-600'
          : 'hover:bg-slate-800'"
      >
        Dashboard
      </router-link>

      <router-link
        to="/properties"
        class="block px-4 py-3 rounded-xl text-white"
        :class="isActive('/properties')
          ? 'bg-blue-600'
          : 'hover:bg-slate-800'"
      >
        Properties
      </router-link>

      <router-link
        to="/users"
        class="block px-4 py-3 rounded-xl text-white"
        :class="isActive('/users')
          ? 'bg-blue-600'
          : 'hover:bg-slate-800'"
      >
        Users
      </router-link>

      <router-link
        to="/settings"
        class="block px-4 py-3 rounded-xl text-white"
        :class="isActive('/settings')
          ? 'bg-blue-600'
          : 'hover:bg-slate-800'"
      >
        Settings
      </router-link>

    </nav>
  </aside>
</template>