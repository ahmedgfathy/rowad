<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../lib/supabase'
import { formatRemainingSubscription, formatTodayDate } from '../utils/subscription'

interface UserProfile {
  user_id: string
  email: string
  full_name: string | null
  phone: string | null
  city: string | null
  subscription_start_date: string
  subscription_end_date: string
  subscription_approved: boolean
}

const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const profile = ref<UserProfile | null>(null)

const form = ref({
  full_name: '',
  phone: '',
  city: '',
})

const todayDate = computed(() => {
  return formatTodayDate()
})

const remainingSubscription = computed(() => {
  if (!profile.value) {
    return { months: 0, days: 0, isExpired: false }
  }

  return formatRemainingSubscription(profile.value.subscription_end_date)
})

const loadProfile = async () => {
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    loading.value = false
    errorMessage.value = userError?.message ?? 'Unable to load current user.'
    return
  }

  const { data: existingProfile, error: fetchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError) {
    loading.value = false
    errorMessage.value = fetchError.message
    return
  }

  if (existingProfile) {
    loading.value = false
    profile.value = existingProfile as UserProfile
    form.value.full_name = existingProfile.full_name ?? ''
    form.value.phone = existingProfile.phone ?? ''
    form.value.city = existingProfile.city ?? ''
    return
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: user.id,
      email: user.email ?? '',
    })
    .select('*')
    .single()

  loading.value = false

  if (createError || !createdProfile) {
    errorMessage.value = createError?.message ?? 'Unable to create user profile.'
    return
  }

  profile.value = createdProfile as UserProfile
  form.value.full_name = createdProfile.full_name ?? ''
  form.value.phone = createdProfile.phone ?? ''
  form.value.city = createdProfile.city ?? ''
  successMessage.value = 'Your profile was created. You can update your details now.'
}

const saveProfile = async () => {
  if (!profile.value) return

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      full_name: form.value.full_name.trim() || null,
      phone: form.value.phone.trim() || null,
      city: form.value.city.trim() || null,
    })
    .eq('user_id', profile.value.user_id)
    .select('*')
    .single()

  saving.value = false

  if (error || !data) {
    errorMessage.value = error?.message ?? 'Unable to save your profile.'
    return
  }

  profile.value = data as UserProfile
  successMessage.value = 'Your information has been saved.'
}

onMounted(async () => {
  await loadProfile()
})
</script>

<template>
  <DashboardLayout>
    <section class="space-y-6">
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
        <p class="text-slate-400 text-sm">
          Today: {{ todayDate }}
        </p>

        <h3 class="text-white text-xl font-semibold mt-2">
          Subscription remaining
        </h3>

        <div class="mt-4 flex items-center justify-center gap-8">
          <div>
            <p class="text-4xl font-bold text-white">
              {{ remainingSubscription.months }}
            </p>
            <p class="text-slate-400 text-sm">
              Months
            </p>
          </div>

          <div class="h-12 w-px bg-slate-700" />

          <div>
            <p class="text-4xl font-bold text-white">
              {{ remainingSubscription.days }}
            </p>
            <p class="text-slate-400 text-sm">
              Days
            </p>
          </div>
        </div>

        <p
          v-if="remainingSubscription.isExpired"
          class="mt-4 text-red-300 text-sm"
        >
          Subscription has expired.
        </p>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <h3 class="text-white text-xl font-semibold">
          Your Information
        </h3>

        <p class="text-slate-400 text-sm mt-1">
          Update your account information here.
        </p>

        <div
          v-if="loading"
          class="text-slate-300 mt-6"
        >
          Loading your profile...
        </div>

        <form
          v-else-if="profile"
          class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4"
          @submit.prevent="saveProfile"
        >
          <label class="block">
            <span class="text-slate-300 text-sm">Email</span>
            <input
              :value="profile.email"
              disabled
              class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-400 px-4 py-3"
            >
          </label>

          <label class="block">
            <span class="text-slate-300 text-sm">Full name</span>
            <input
              v-model="form.full_name"
              class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-100 px-4 py-3 focus:border-blue-500 outline-none"
              placeholder="Enter your full name"
            >
          </label>

          <label class="block">
            <span class="text-slate-300 text-sm">Phone</span>
            <input
              v-model="form.phone"
              class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-100 px-4 py-3 focus:border-blue-500 outline-none"
              placeholder="Enter your phone number"
            >
          </label>

          <label class="block">
            <span class="text-slate-300 text-sm">City</span>
            <input
              v-model="form.city"
              class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-100 px-4 py-3 focus:border-blue-500 outline-none"
              placeholder="Enter your city"
            >
          </label>

          <label class="block">
            <span class="text-slate-300 text-sm">Subscription start</span>
            <input
              :value="profile.subscription_start_date"
              disabled
              class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-400 px-4 py-3"
            >
          </label>

          <label class="block">
            <span class="text-slate-300 text-sm">Subscription end</span>
            <input
              :value="profile.subscription_end_date"
              disabled
              class="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 text-slate-400 px-4 py-3"
            >
          </label>

          <div class="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
            <span
              class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
              :class="profile.subscription_approved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'"
            >
              {{ profile.subscription_approved ? 'Subscription Approved' : 'Subscription Pending Approval' }}
            </span>

            <button
              type="submit"
              :disabled="saving"
              class="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-5 py-2.5 font-medium transition"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </form>

        <p
          v-if="errorMessage"
          class="text-red-300 text-sm mt-4"
        >
          {{ errorMessage }}
        </p>

        <p
          v-if="successMessage"
          class="text-emerald-300 text-sm mt-4"
        >
          {{ successMessage }}
        </p>
      </div>
    </section>
  </DashboardLayout>
</template>