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
      return 'Dashboard'
  }
})

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <header
    class="h-20 px-8 flex items-center justify-between"
  >

    <div>
      <h2
        class="text-3xl font-bold text-white"
      >
        {{ pageTitle }}
      </h2>
    </div>

    <button
      @click="logout"
      class="px-5 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white transition"
    >
      Logout
    </button>

  </header>
</template>