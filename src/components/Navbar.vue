<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

defineEmits<{
  'toggle-sidebar': []
}>()

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
    class="h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between gap-4"
  >

    <div class="flex items-center gap-3 min-w-0">
      <button
        class="lg:hidden h-10 w-10 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
        @click="$emit('toggle-sidebar')"
        aria-label="Open navigation menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="w-5 h-5 mx-auto"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <h2
        class="text-2xl sm:text-3xl font-bold text-white truncate"
      >
        {{ pageTitle }}
      </h2>
    </div>

    <button
      @click="logout"
      class="px-4 sm:px-5 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white transition whitespace-nowrap"
    >
      Logout
    </button>

  </header>
</template>