<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../lib/supabase'
import { formatRemainingSubscription, formatTodayDate } from '../utils/subscription'

interface AdminProfile {
  id: number
  full_name: string | null
  email: string
  subscription_end_date: string
  subscription_approved: boolean
}

const loading = ref(false)
const errorMessage = ref('')
const rows = ref<AdminProfile[]>([])

const todayDate = computed(() => {
  return formatTodayDate()
})

const loadRows = async () => {
  loading.value = true
  errorMessage.value = ''

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, subscription_end_date, subscription_approved')
    .eq('subscription_approved', true)
    .order('subscription_end_date', { ascending: true })

  loading.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  rows.value = (data ?? []) as AdminProfile[]
}

const remainingLabel = (endDate: string) => {
  const remaining = formatRemainingSubscription(endDate)

  if (remaining.isExpired) {
    return 'Expired'
  }

  return `${remaining.months} months, ${remaining.days} days`
}

onMounted(async () => {
  await loadRows()
})
</script>

<template>
  <DashboardLayout>
    <section class="space-y-6">
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <h3 class="text-white text-xl font-semibold">
          Administration
        </h3>
        <p class="text-slate-400 text-sm mt-1">
          Today: {{ todayDate }}
        </p>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
        <h4 class="text-white text-lg font-semibold">
          Approved Subscribers
        </h4>

        <p
          v-if="loading"
          class="text-slate-300 mt-4"
        >
          Loading approved users...
        </p>

        <p
          v-else-if="errorMessage"
          class="text-red-300 text-sm mt-4"
        >
          {{ errorMessage }}
        </p>

        <div
          v-else-if="rows.length === 0"
          class="text-slate-400 text-sm mt-4"
        >
          No approved subscribers yet.
        </div>

        <div
          v-else
          class="mt-4 overflow-auto"
        >
          <table class="w-full min-w-[640px] text-left">
            <thead>
              <tr class="text-slate-400 text-sm border-b border-slate-800">
                <th class="py-3 pr-4 font-medium">
                  Name
                </th>
                <th class="py-3 pr-4 font-medium">
                  Email
                </th>
                <th class="py-3 pr-4 font-medium">
                  Subscription End
                </th>
                <th class="py-3 font-medium">
                  Time Remaining
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.id"
                class="border-b border-slate-800/70 text-slate-200"
              >
                <td class="py-3 pr-4">
                  {{ row.full_name || '—' }}
                </td>
                <td class="py-3 pr-4">
                  {{ row.email }}
                </td>
                <td class="py-3 pr-4">
                  {{ row.subscription_end_date }}
                </td>
                <td class="py-3">
                  {{ remainingLabel(row.subscription_end_date) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </DashboardLayout>
</template>
