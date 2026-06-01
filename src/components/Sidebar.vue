<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { SUPER_ADMIN_EMAIL } from '../constants/admin'
import { supabase } from '../lib/supabase'

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()
const userEmail = ref('')
let unsubscribeAuthListener: (() => void) | null = null

const isSuperAdmin = computed(() => {
  return userEmail.value === SUPER_ADMIN_EMAIL
})

const isActive = (path: string) => {
  return route.path === path
}

const handleNavigate = () => {
  emit('navigate')
}

const loadUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  userEmail.value = user?.email ?? ''
}

onMounted(async () => {
  await loadUser()

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    userEmail.value = session?.user?.email ?? ''
  })

  unsubscribeAuthListener = () => {
    data.subscription.unsubscribe()
  }
})

onUnmounted(() => {
  unsubscribeAuthListener?.()
})
</script>

<template>
  <aside
    class="w-72 bg-slate-900 rounded-3xl flex flex-col"
  >

    <div class="p-8">

      <h1
        class="text-4xl font-bold text-white"
      >
        Rowad
      </h1>

      <p
        class="text-slate-400 mt-2"
      >
        Real Estate CRM
      </p>

    </div>

    <nav
      class="px-4 pb-4 space-y-2"
    >

      <router-link
        to="/dashboard"
        @click="handleNavigate"
        class="block px-5 py-4 rounded-2xl transition-all"
        :class="
          isActive('/dashboard')
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        "
      >
        Dashboard
      </router-link>

      <router-link
        to="/properties"
        @click="handleNavigate"
        class="block px-5 py-4 rounded-2xl transition-all"
        :class="
          isActive('/properties')
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        "
      >
        Properties
      </router-link>

      <router-link
        to="/users"
        @click="handleNavigate"
        class="block px-5 py-4 rounded-2xl transition-all"
        :class="
          isActive('/users')
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        "
      >
        Users
      </router-link>

      <router-link
        to="/settings"
        @click="handleNavigate"
        class="block px-5 py-4 rounded-2xl transition-all"
        :class="
          isActive('/settings')
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        "
      >
        Settings
      </router-link>

      <router-link
        v-if="isSuperAdmin"
        to="/administration"
        @click="handleNavigate"
        class="block px-5 py-4 rounded-2xl transition-all"
        :class="
          isActive('/administration')
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800'
        "
      >
        Administration
      </router-link>

    </nav>

  </aside>
</template>