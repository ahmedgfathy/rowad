<script setup lang="ts">
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white flex">
    
    <!-- Sidebar -->
    <aside
      class="w-72 border-r border-slate-800 bg-slate-900 flex flex-col"
    >
      <div
        class="p-6 border-b border-slate-800"
      >
        <h1
          class="text-2xl font-bold"
        >
          Rowad CRM
        </h1>

        <p
          class="text-slate-400 text-sm mt-1"
        >
          Real Estate Platform
        </p>
      </div>

      <nav class="p-4 space-y-2">
        <button
          class="w-full text-left px-4 py-3 rounded-xl bg-blue-600"
        >
          Dashboard
        </button>

        <button
          class="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition"
        >
          Properties
        </button>

        <button
          class="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition"
        >
          Leads
        </button>

        <button
          class="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition"
        >
          Users
        </button>

        <button
          class="w-full text-left px-4 py-3 rounded-xl hover:bg-slate-800 transition"
        >
          Settings
        </button>
      </nav>

      <div class="mt-auto p-4">
        <button
          @click="logout"
          class="w-full rounded-xl bg-red-600 py-3 hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
    </aside>

    <!-- Content -->
    <main class="flex-1 p-8">

      <div
        class="flex items-center justify-between mb-8"
      >
        <div>
          <h2
            class="text-4xl font-bold"
          >
            Dashboard
          </h2>

          <p
            class="text-slate-400 mt-2"
          >
            Welcome back to Rowad CRM
          </p>
        </div>
      </div>

      <!-- Stats -->

      <div
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8"
      >
        <div
          class="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <p class="text-slate-400">
            Properties
          </p>

          <h3
            class="text-4xl font-bold mt-4"
          >
            0
          </h3>
        </div>

        <div
          class="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <p class="text-slate-400">
            Leads
          </p>

          <h3
            class="text-4xl font-bold mt-4"
          >
            0
          </h3>
        </div>

        <div
          class="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <p class="text-slate-400">
            Agents
          </p>

          <h3
            class="text-4xl font-bold mt-4"
          >
            1
          </h3>
        </div>

        <div
          class="rounded-3xl border border-slate-800 bg-slate-900 p-6"
        >
          <p class="text-slate-400">
            Messages
          </p>

          <h3
            class="text-4xl font-bold mt-4"
          >
            0
          </h3>
        </div>
      </div>

      <!-- Activity -->

      <div
        class="rounded-3xl border border-slate-800 bg-slate-900 p-6"
      >
        <h3
          class="text-xl font-semibold mb-4"
        >
          Recent Activity
        </h3>

        <div
          class="rounded-2xl bg-slate-950 border border-slate-800 p-4"
        >
          <p class="text-slate-400">
            No activity yet.
          </p>
        </div>
      </div>

    </main>

  </div>
</template>