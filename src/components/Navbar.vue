<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

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
  menuOpen.value = false
  await supabase.auth.signOut()
  router.push('/login')
}

const navigateTo = (path: string) => {
  menuOpen.value = false
  router.push(path)
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const onClickOutside = (event: MouseEvent) => {
  if (!menuRef.value) return

  if (!menuRef.value.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})

watch(
  () => route.fullPath,
  () => {
    closeMenu()
  }
)
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

    <div
      ref="menuRef"
      class="relative"
    >
      <button
        class="h-10 w-10 rounded-xl border border-slate-700 text-slate-200 hover:bg-slate-800 transition"
        aria-label="Open quick menu"
        @click.stop="toggleMenu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="w-5 h-5 mx-auto"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      <Transition name="menu">
        <div
          v-if="menuOpen"
          class="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl z-40 p-2"
        >
          <button
            class="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/dashboard')"
          >
            Dashboard
          </button>

          <button
            class="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/properties')"
          >
            Properties
          </button>

          <button
            class="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/users')"
          >
            Users
          </button>

          <button
            class="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/settings')"
          >
            Settings
          </button>

          <div class="h-px bg-slate-700 my-2" />

          <button
            class="w-full text-left px-3 py-2 rounded-xl text-red-300 hover:bg-red-900/30 transition"
            @click="logout"
          >
            Logout
          </button>
        </div>
      </Transition>
    </div>

  </header>
</template>

<style scoped>
.menu-enter-active,
.menu-leave-active {
  transition: all .18s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(.98);
}
</style>