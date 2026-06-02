<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { SUPER_ADMIN_EMAIL } from '../constants/admin'
import { supabase } from '../lib/supabase'

const route = useRoute()
const router = useRouter()
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const userEmail = ref('')
let unsubscribeAuthListener: (() => void) | null = null

const isSuperAdmin = computed(() => {
  return userEmail.value === SUPER_ADMIN_EMAIL
})

const pageTitle = computed(() => {
  switch (route.path) {
    case '/dashboard':
      return 'لوحة التحكم'

    case '/properties':
      return 'العقارات'

    case '/users':
      return 'الملف الشخصي'

    case '/settings':
      return 'الإعدادات'

    case '/administration':
      return 'الإدارة'

    default:
      return 'لوحة التحكم'
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

  document.addEventListener('click', onClickOutside)
})

onUnmounted(() => {
  unsubscribeAuthListener?.()
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
      <img
        src="/logo.png"
        alt="شعار رواد"
        class="lg:hidden h-10 w-10 rounded-xl border border-slate-700 object-cover"
      >

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
        aria-label="فتح القائمة السريعة"
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
          class="absolute left-0 mt-2 w-52 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl z-40 p-2"
        >
          <button
            class="w-full text-right px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/dashboard')"
          >
            لوحة التحكم
          </button>

          <button
            class="w-full text-right px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/properties')"
          >
            العقارات
          </button>

          <button
            class="w-full text-right px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/users')"
          >
            الملف الشخصي
          </button>

          <button
            class="w-full text-right px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/settings')"
          >
            الإعدادات
          </button>

          <button
            v-if="isSuperAdmin"
            class="w-full text-right px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 transition"
            @click="navigateTo('/administration')"
          >
            الإدارة
          </button>

          <div class="h-px bg-slate-700 my-2" />

          <button
            class="w-full text-right px-3 py-2 rounded-xl text-red-300 hover:bg-red-900/30 transition"
            @click="logout"
          >
            تسجيل الخروج
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