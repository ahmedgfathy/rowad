<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()

const pageTitle = computed(() => {
  switch (route.path) {
    case '/dashboard':
      return 'Dashboard'

    case '/properties':
      return 'Properties'

    case '/users':
      return 'Users'

    case '/settings':
      return 'Settings'

    default:
      return 'Rowad CRM'
  }
})

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <header
    class="h-16 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-6"
  >
    <h2
      class="text-xl font-semibold text-white"
    >
      {{ pageTitle }}
    </h2>

    <button
      @click="logout"
      class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
    >
      Logout
    </button>
  </header>
</template>