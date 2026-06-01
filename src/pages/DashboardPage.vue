<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../lib/supabase'

interface PropertyRow {
  id: number
  sender_name: string | null
  sender_mobile: string | null
  message_date: string | null
  raw_message: string | null
  follow_up_at: string | null
  follow_up_status: string | null
}

const rows = ref<PropertyRow[]>([])
const loading = ref(false)
const FETCH_BATCH_SIZE = 1000

const CATEGORY_COLORS = ['#38bdf8', '#34d399', '#fbbf24', '#fb7185', '#a78bfa']

const includesAny = (text: string, keywords: string[]) => {
  return keywords.some((keyword) => text.includes(keyword))
}

const inferCategory = (message: string) => {
  if (includesAny(message, ['rent', 'for rent', 'ايجار', 'إيجار'])) return 'Rent'
  if (includesAny(message, ['sale', 'sell', 'للبيع', 'بيع'])) return 'Sale'
  if (includesAny(message, ['wanted', 'need', 'required', 'مطلوب', 'عايز'])) return 'Wanted'
  if (includesAny(message, ['price', 'budget', 'سعر', 'ميزانية'])) return 'Price Inquiry'
  return 'Other'
}

const inferPropertyType = (message: string) => {
  if (includesAny(message, ['apartment', 'flat', 'شقة'])) return 'Apartment'
  if (includesAny(message, ['villa', 'فيلا'])) return 'Villa'
  if (includesAny(message, ['office', 'اداري', 'إداري', 'مكتب'])) return 'Office'
  if (includesAny(message, ['shop', 'store', 'محل'])) return 'Shop'
  if (includesAny(message, ['land', 'plot', 'ارض', 'أرض'])) return 'Land'
  if (includesAny(message, ['studio', 'ستوديو'])) return 'Studio'
  if (includesAny(message, ['building', 'عمارة', 'برج'])) return 'Building'
  return 'Unclear'
}

const normalizeSenderKey = (row: PropertyRow) => {
  const mobile = (row.sender_mobile || '').replace(/\D/g, '')

  if (mobile) return `m:${mobile}`

  return `n:${(row.sender_name || '').trim().toLowerCase()}`
}

const senderLabel = (row: PropertyRow) => {
  return (row.sender_name || '').trim() || (row.sender_mobile || '').trim() || 'Unknown Sender'
}

const messageTimestamp = (value: string | null) => {
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? 0 : parsed
}

const loadDashboard = async () => {
  loading.value = true

  try {
    const allRows: PropertyRow[] = []
    let from = 0

    while (true) {
      const to = from + FETCH_BATCH_SIZE - 1

      const { data, error } = await supabase
        .from('properties')
        .select('id,sender_name,sender_mobile,message_date,raw_message,follow_up_at,follow_up_status')
        .order('id', { ascending: false })
        .range(from, to)

      if (error) {
        console.error(error)
        break
      }

      const batch = data || []
      allRows.push(...batch)

      if (batch.length < FETCH_BATCH_SIZE) {
        break
      }

      from += FETCH_BATCH_SIZE
    }

    rows.value = allRows
  } finally {
    loading.value = false
  }
}

const totalProperties = computed(() => rows.value.length)

const uniqueSenders = computed(() => {
  const senders = new Set<string>()

  for (const row of rows.value) {
    const key = normalizeSenderKey(row)
    if (key !== 'n:') senders.add(key)
  }

  return senders.size
})

const todayMessages = computed(() => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()

  return rows.value.filter((row) => messageTimestamp(row.message_date) >= startMs).length
})

const dueTodayCount = computed(() => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return rows.value.filter((row) => {
    const ts = messageTimestamp(row.follow_up_at)
    const status = (row.follow_up_status || '').toLowerCase()
    return ts >= start.getTime() && ts <= end.getTime() && status !== 'closed' && status !== 'lost'
  }).length
})

const overdueCount = computed(() => {
  const now = Date.now()

  return rows.value.filter((row) => {
    const ts = messageTimestamp(row.follow_up_at)
    const status = (row.follow_up_status || '').toLowerCase()
    return ts > 0 && ts < now && status !== 'closed' && status !== 'lost'
  }).length
})


const categoryBreakdown = computed(() => {
  const counts = new Map<string, number>()

  for (const row of rows.value) {
    const category = inferCategory((row.raw_message || '').toLowerCase())
    counts.set(category, (counts.get(category) || 0) + 1)
  }

  const values = Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  return values.length
    ? values
    : [{ label: 'No Data', value: 0 }]
})

const propertyTypeBreakdown = computed(() => {
  const counts = new Map<string, number>()

  for (const row of rows.value) {
    const type = inferPropertyType((row.raw_message || '').toLowerCase())
    counts.set(type, (counts.get(type) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
})

const topSenders = computed(() => {
  const map = new Map<string, { label: string, count: number }>()

  for (const row of rows.value) {
    const key = normalizeSenderKey(row)
    if (key === 'n:') continue

    const current = map.get(key)
    if (current) {
      current.count += 1
    } else {
      map.set(key, { label: senderLabel(row), count: 1 })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
})

const messagesLast7Days = computed(() => {
  const items = Array.from({ length: 7 }, (_, idx) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - idx))

    return {
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      dayStart: date.getTime(),
      dayEnd: date.getTime() + 86_400_000,
      value: 0,
    }
  })

  for (const row of rows.value) {
    const ts = messageTimestamp(row.message_date)
    if (!ts) continue

    const bucket = items.find((item) => ts >= item.dayStart && ts < item.dayEnd)
    if (bucket) bucket.value += 1
  }

  return items
})

const categoryTotal = computed(() => {
  return categoryBreakdown.value.reduce((sum, item) => sum + item.value, 0)
})

const categoryPieStyle = computed(() => {
  const total = categoryTotal.value

  if (!total) {
    return {
      background: 'conic-gradient(#334155 0deg 360deg)'
    }
  }

  let start = 0
  const segments = categoryBreakdown.value.map((item, index) => {
    const sweep = (item.value / total) * 360
    const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    const segment = `${color} ${start}deg ${start + sweep}deg`
    start += sweep
    return segment
  })

  return {
    background: `conic-gradient(${segments.join(', ')})`
  }
})

const maxTypeCount = computed(() => {
  return Math.max(1, ...propertyTypeBreakdown.value.map((item) => item.value))
})

const maxSenderCount = computed(() => {
  return Math.max(1, ...topSenders.value.map((item) => item.count))
})

const maxDailyCount = computed(() => {
  return Math.max(1, ...messagesLast7Days.value.map((item) => item.value))
})

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <DashboardLayout>
    <section class="space-y-6">
      <h1 class="text-4xl text-white font-bold">
        Dashboard
      </h1>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-5xl">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 col-span-2 lg:col-span-4">
          <p class="text-slate-400 text-sm">
            Total Properties
          </p>
          <p class="text-white text-2xl sm:text-3xl font-bold mt-1.5">
            {{ loading ? '...' : totalProperties }}
          </p>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 min-w-0">
          <p class="text-slate-400 text-sm">
            Unique Senders
          </p>
          <p class="text-white text-2xl sm:text-3xl font-bold mt-1.5">
            {{ loading ? '...' : uniqueSenders }}
          </p>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 min-w-0">
          <p class="text-slate-400 text-sm">
            Messages Today
          </p>
          <p class="text-white text-2xl sm:text-3xl font-bold mt-1.5">
            {{ loading ? '...' : todayMessages }}
          </p>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 min-w-0">
          <p class="text-slate-400 text-sm">
            Due Today
          </p>
          <p class="text-white text-2xl sm:text-3xl font-bold mt-1.5">
            {{ loading ? '...' : dueTodayCount }}
          </p>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 min-w-0">
          <p class="text-slate-400 text-sm">
            Overdue Follow-ups
          </p>
          <p class="text-white text-2xl sm:text-3xl font-bold mt-1.5">
            {{ loading ? '...' : overdueCount }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h2 class="text-white text-lg font-semibold">
            Message Category Breakdown
          </h2>

          <div class="flex items-center gap-5">
            <div
              class="h-36 w-36 rounded-full border border-slate-700"
              :style="categoryPieStyle"
            />

            <div class="space-y-2 flex-1">
              <div
                v-for="(item, index) in categoryBreakdown"
                :key="item.label"
                class="flex items-center justify-between gap-3 text-sm"
              >
                <div class="flex items-center gap-2 text-slate-300">
                  <span
                    class="h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }"
                  />
                  <span>{{ item.label }}</span>
                </div>
                <span class="text-white">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h2 class="text-white text-lg font-semibold">
            Top Property Types
          </h2>

          <div class="space-y-3">
            <div
              v-for="item in propertyTypeBreakdown"
              :key="item.label"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-300">{{ item.label }}</span>
                <span class="text-white">{{ item.value }}</span>
              </div>

              <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-sky-500 rounded-full"
                  :style="{ width: `${Math.max(6, (item.value / maxTypeCount) * 100)}%` }"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
          <h2 class="text-white text-lg font-semibold">
            Top Senders By Messages
          </h2>

          <div class="space-y-3">
            <div
              v-for="item in topSenders"
              :key="item.label"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-sm gap-3">
                <span class="text-slate-300 truncate">{{ item.label }}</span>
                <span class="text-white">{{ item.count }}</span>
              </div>

              <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-emerald-500 rounded-full"
                  :style="{ width: `${Math.max(6, (item.count / maxSenderCount) * 100)}%` }"
                />
              </div>
            </div>

            <p
              v-if="!topSenders.length"
              class="text-slate-400 text-sm"
            >
              No sender data available.
            </p>
          </div>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
        <h2 class="text-white text-lg font-semibold">
          Messages Activity (Last 7 Days)
        </h2>

        <div class="grid grid-cols-7 gap-2 items-end h-40">
          <div
            v-for="day in messagesLast7Days"
            :key="day.label"
            class="flex flex-col items-center justify-end gap-2"
          >
            <div class="text-xs text-slate-300">
              {{ day.value }}
            </div>

            <div class="w-full h-24 bg-slate-800 rounded-lg relative overflow-hidden">
              <div
                class="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-lg"
                :style="{ height: `${Math.max(4, (day.value / maxDailyCount) * 100)}%` }"
              />
            </div>

            <div class="text-[11px] text-slate-400 text-center leading-tight">
              {{ day.label }}
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
        These insights are automatically inferred from message text in your existing properties table (no extra database tables required).
      </div>
    </section>
  </DashboardLayout>
</template>