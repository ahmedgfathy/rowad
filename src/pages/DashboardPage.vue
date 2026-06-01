<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../lib/supabase'

const stats = ref({
  properties: 0,
  uniqueSenders: 0,
  todayMessages: 0,
  duplicates: 0,
})

const loading = ref(false)

const loadStats = async () => {
  loading.value = true

  try {
    const { count: propertiesCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const { count: todayCount } = await supabase
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .gte('message_date', startOfToday.toISOString())

    const { data: rows } = await supabase
      .from('properties')
      .select('sender_name,sender_mobile,message_date,raw_message')

    const senderSet = new Set<string>()
    const keySet = new Set<string>()
    let duplicatesCount = 0

    for (const row of rows || []) {
      senderSet.add((row.sender_name || '').trim().toLowerCase())

      const key = [
        row.raw_message || '',
        row.sender_name || '',
        row.sender_mobile || '',
        row.message_date || '',
      ].join('|')

      if (keySet.has(key)) {
        duplicatesCount += 1
      } else {
        keySet.add(key)
      }
    }

    stats.value = {
      properties: propertiesCount || 0,
      uniqueSenders: senderSet.size,
      todayMessages: todayCount || 0,
      duplicates: duplicatesCount,
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
})
</script>

<template>
  <DashboardLayout>

    <h1
      class="text-4xl text-white font-bold mb-8"
    >
      Dashboard
    </h1>

    <div
      class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
    >

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Properties
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          {{ loading ? '...' : stats.properties }}
        </div>
      </div>

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Unique Senders
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          {{ loading ? '...' : stats.uniqueSenders }}
        </div>
      </div>

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Messages Today
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          {{ loading ? '...' : stats.todayMessages }}
        </div>
      </div>

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Duplicate Rows
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          {{ loading ? '...' : stats.duplicates }}
        </div>
      </div>

    </div>

  </DashboardLayout>
</template>