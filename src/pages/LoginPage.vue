<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const login = async () => {
  errorMessage.value = ''
  loading.value = true

  const { error } =
    await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  router.push('/dashboard')
}
</script>

<template>
  <div
    class="min-h-screen bg-slate-950 flex items-center justify-center px-6"
  >
    <div
      class="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl"
    >
      <div class="mb-8">
        <div class="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="شعار رواد"
            class="h-16 w-16 sm:h-[4.25rem] sm:w-[4.25rem] rounded-2xl border border-slate-700 object-cover"
          >

          <div>
            <h1
              class="text-3xl sm:text-4xl font-bold text-white"
            >
              رواد العقارية
            </h1>

            <p
              class="text-slate-400 mt-1"
            >
              سجل الدخول إلى حسابك
            </p>
          </div>

          <RouterLink
            to="/"
            class="mt-4 inline-flex text-sm text-blue-300 hover:text-blue-200 transition"
          >
            العودة للرئيسية →
          </RouterLink>
        </div>
      </div>

      <form
        @submit.prevent="login"
        class="space-y-4"
      >
        <div>
          <label
            class="block mb-2 text-slate-300"
          >
            البريد الإلكتروني
          </label>

          <input
            v-model="email"
            type="email"
            required
            class="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label
            class="block mb-2 text-slate-300"
          >
            كلمة المرور
          </label>

          <input
            v-model="password"
            type="password"
            required
            class="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
          />
        </div>

        <div
          v-if="errorMessage"
          class="text-red-400 text-sm"
        >
          {{ errorMessage }}
        </div>

        <button
          :disabled="loading"
          type="submit"
          class="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition"
        >
          {{ loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول' }}
        </button>
      </form>
    </div>
  </div>
</template>