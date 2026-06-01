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
  <div class="min-h-screen bg-slate-100">
    <header
      class="bg-white border-b px-8 py-4 flex items-center justify-between"
    >
      <h1
        class="text-2xl font-bold"
      >
        Rowad CRM
      </h1>

      <button
        @click="logout"
        class="bg-red-500 text-white px-4 py-2 rounded-lg"
      >
        Logout
      </button>
    </header>

    <main class="p-8">
      <h2
        class="text-3xl font-bold mb-8"
      >
        Dashboard
      </h2>

      <div
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
      >
        <div
          class="bg-white rounded-2xl p-6 shadow"
        >
          <div
            class="text-slate-500"
          >
            Properties
          </div>

          <div
            class="text-4xl font-bold mt-2"
          >
            0
          </div>
        </div>

        <div
          class="bg-white rounded-2xl p-6 shadow"
        >
          <div
            class="text-slate-500"
          >
            Leads
          </div>

          <div
            class="text-4xl font-bold mt-2"
          >
            0
          </div>
        </div>

        <div
          class="bg-white rounded-2xl p-6 shadow"
        >
          <div
            class="text-slate-500"
          >
            Users
          </div>

          <div
            class="text-4xl font-bold mt-2"
          >
            1
          </div>
        </div>

        <div
          class="bg-white rounded-2xl p-6 shadow"
        >
          <div
            class="text-slate-500"
          >
            Messages
          </div>

          <div
            class="text-4xl font-bold mt-2"
          >
            0
          </div>
        </div>
      </div>
    </main>
  </div>
</template>