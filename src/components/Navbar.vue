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
  <header
    class="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6"
  >
    <div>
      <h2 class="text-white font-semibold">
        Rowad CRM
      </h2>
    </div>

    <button
      @click="logout"
      class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
    >
      Logout
    </button>
  </header>
</template>