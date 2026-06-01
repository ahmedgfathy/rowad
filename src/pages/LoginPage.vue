<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
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
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <img
            src="/logo.png"
            alt="Rowad CRM logo"
            class="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border border-slate-700 object-cover"
          >

          <div>
            <h1
              class="text-3xl sm:text-4xl font-bold text-white"
            >
              Rowad CRM
            </h1>

            <p
              class="text-slate-400 mt-1"
            >
              Sign in to your account
            </p>
          </div>
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
            Email
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
            Password
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
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>