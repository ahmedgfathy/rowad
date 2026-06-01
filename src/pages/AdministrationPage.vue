<script setup lang="ts">
import { computed, onUnmounted, onMounted, ref } from 'vue'
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

interface PropertyRow {
  id: number
  raw_message?: string | null
  sender_name?: string | null
  sender_mobile?: string | null
  message_date?: string | null
}

const loading = ref(false)
const errorMessage = ref('')
const rows = ref<AdminProfile[]>([])

// Data management state
const importFileInput = ref<HTMLInputElement | null>(null)
const dataLoading = ref(false)
const dataProcessing = ref(false)
const importProgress = ref({
  active: false,
  totalFiles: 0,
  processedFiles: 0,
  totalRowsImported: 0,
  currentFileName: '',
})
const dataNotice = ref<{ type: 'success' | 'info' | 'error'; message: string } | null>(null)
const dataNoticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const showConfirmRemoveDups = ref(false)
const removeDupsCount = ref(0)
const removeDupsIds = ref<number[]>([])

const FETCH_BATCH_SIZE = 1000
const DELETE_BATCH_SIZE = 200

const todayDate = computed(() => {
  return formatTodayDate()
})

const importPercentage = computed(() => {
  if (!importProgress.value.totalFiles) return 0
  return Math.round((importProgress.value.processedFiles / importProgress.value.totalFiles) * 100)
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

const setDataNotice = (type: 'success' | 'info' | 'error', message: string, autoHideMs = 5000) => {
  dataNotice.value = { type, message }
  if (dataNoticeTimer.value) clearTimeout(dataNoticeTimer.value)
  if (autoHideMs > 0) {
    dataNoticeTimer.value = setTimeout(() => {
      dataNotice.value = null
      dataNoticeTimer.value = null
    }, autoHideMs)
  }
}

const openImportFilePicker = () => {
  importFileInput.value?.click()
}

const parseWhatsAppFile = (content: string, fileName: string) => {
  const parsedRows: any[] = []
  const lines = content.split('\n')
  const regex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?:\s?[APMapm]{2})?)\s+-\s+(.*?):\s+(.*)$/

  for (const line of lines) {
    const match = line.trim().match(regex)
    if (!match) continue
    const datePart = match[1]
    const timePart = match[2]
    const sender = match[3]
    const message = match[4]
    const date = new Date(`${datePart} ${timePart}`)
    parsedRows.push({
      source_file: fileName,
      message_date: date.toISOString(),
      sender_name: sender,
      sender_mobile: '',
      raw_message: message,
    })
  }
  return parsedRows
}

const handleImportFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return

  dataLoading.value = true
  importProgress.value = {
    active: true,
    totalFiles: files.length,
    processedFiles: 0,
    totalRowsImported: 0,
    currentFileName: files[0]?.name || '',
  }

  try {
    for (const file of files) {
      importProgress.value.currentFileName = file.name
      const content = await file.text()
      const parsedRows = parseWhatsAppFile(content, file.name)

      if (!parsedRows.length) {
        importProgress.value.processedFiles += 1
        continue
      }

      const { error } = await supabase.from('properties').insert(parsedRows)

      if (error) {
        console.error(error)
        setDataNotice('error', error.message)
        return
      }

      importProgress.value.totalRowsImported += parsedRows.length
      importProgress.value.processedFiles += 1
    }

    setDataNotice(
      'success',
      `Import completed. Files: ${importProgress.value.processedFiles}/${importProgress.value.totalFiles}. Rows imported: ${importProgress.value.totalRowsImported}.`,
      7000,
    )
  } finally {
    dataLoading.value = false
    importProgress.value.active = false
    importProgress.value.currentFileName = ''
    target.value = ''
  }
}

const duplicateIdsFromRows = (propRows: PropertyRow[]) => {
  const seen = new Set<string>()
  const duplicateIds: number[] = []

  for (const row of propRows) {
    const key = [
      row.raw_message || '',
      row.sender_name || '',
      row.sender_mobile || '',
      row.message_date || '',
    ].join('|')

    if (seen.has(key)) {
      duplicateIds.push(row.id)
    } else {
      seen.add(key)
    }
  }
  return duplicateIds
}

const initiateRemoveDuplicates = async () => {
  dataLoading.value = true

  try {
    const allRows: PropertyRow[] = []
    let from = 0

    while (true) {
      const to = from + FETCH_BATCH_SIZE - 1
      const { data, error } = await supabase
        .from('properties')
        .select('id, raw_message, sender_name, sender_mobile, message_date')
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        console.error(error)
        setDataNotice('error', error.message)
        return
      }

      const batch = (data || []) as PropertyRow[]
      allRows.push(...batch)

      if (batch.length < FETCH_BATCH_SIZE) break
      from += FETCH_BATCH_SIZE
    }

    const duplicates = duplicateIdsFromRows(allRows)

    if (!duplicates.length) {
      setDataNotice('info', 'No duplicated rows found. Nothing was deleted.')
      return
    }

    removeDupsIds.value = duplicates
    removeDupsCount.value = duplicates.length
    showConfirmRemoveDups.value = true
  } finally {
    dataLoading.value = false
  }
}

const deleteInChunks = async (ids: number[]) => {
  for (let index = 0; index < ids.length; index += DELETE_BATCH_SIZE) {
    const chunk = ids.slice(index, index + DELETE_BATCH_SIZE)
    const { error } = await supabase.from('properties').delete().in('id', chunk)
    if (error) throw error
  }
}

const confirmRemoveDuplicates = async () => {
  dataProcessing.value = true

  try {
    const idsToDelete = [...removeDupsIds.value]
    await deleteInChunks(idsToDelete)
    setDataNotice('info', `${idsToDelete.length} duplicate row(s) deleted.`, 5000)
    showConfirmRemoveDups.value = false
    removeDupsIds.value = []
    removeDupsCount.value = 0
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed. Please try again.'
    setDataNotice('error', message)
    showConfirmRemoveDups.value = false
  } finally {
    dataProcessing.value = false
  }
}

onMounted(async () => {
  await loadRows()
})

onUnmounted(() => {
  if (dataNoticeTimer.value) {
    clearTimeout(dataNoticeTimer.value)
  }
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

      <!-- Data Management -->
      <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 space-y-4">
        <h4 class="text-white text-lg font-semibold">
          Data Management
        </h4>

        <div class="flex flex-wrap gap-3">
          <input
            ref="importFileInput"
            type="file"
            multiple
            accept=".txt"
            class="hidden"
            @change="handleImportFileUpload"
          />

          <button
            @click="openImportFilePicker"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-60"
            :disabled="dataLoading || dataProcessing"
            title="Import TXT"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-4 w-4"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Import TXT
          </button>

          <button
            @click="initiateRemoveDuplicates"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm disabled:opacity-60"
            :disabled="dataLoading || dataProcessing"
            title="Remove Duplicates"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-4 w-4"
            >
              <rect x="9" y="9" width="10" height="10" rx="2" />
              <rect x="5" y="5" width="10" height="10" rx="2" />
            </svg>
            Remove Duplicates
          </button>
        </div>

        <!-- Import progress -->
        <Transition name="fade">
          <div
            v-if="dataLoading && importProgress.active"
            class="rounded-xl border border-blue-700/60 bg-blue-950/30 p-4 space-y-3"
          >
            <div class="flex items-center justify-between gap-3 text-sm">
              <div>
                <p class="text-blue-100 font-medium">
                  Importing TXT files
                </p>
                <p class="text-blue-200/80">
                  {{ importProgress.currentFileName || 'Preparing import...' }}
                </p>
              </div>
              <div class="text-right text-blue-100 font-semibold">
                {{ importPercentage }}%
              </div>
            </div>
            <div class="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                class="h-full rounded-full bg-blue-500 transition-all duration-300"
                :style="{ width: `${importPercentage}%` }"
              />
            </div>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-blue-100/90">
              <span>Files: {{ importProgress.processedFiles }} / {{ importProgress.totalFiles }}</span>
              <span>Rows imported: {{ importProgress.totalRowsImported }}</span>
            </div>
          </div>
        </Transition>

        <!-- Data notice -->
        <Transition name="fade">
          <div
            v-if="dataNotice"
            class="rounded-xl p-3 border"
            :class="{
              'bg-emerald-900/30 border-emerald-700 text-emerald-200': dataNotice.type === 'success',
              'bg-amber-900/30 border-amber-700 text-amber-200': dataNotice.type === 'info',
              'bg-red-900/30 border-red-700 text-red-200': dataNotice.type === 'error'
            }"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm">
                {{ dataNotice.message }}
              </p>
              <button
                class="h-6 w-6 rounded-lg border border-current/30 text-xs"
                @click="dataNotice = null"
              >
                ×
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Confirm remove duplicates dialog -->
      <Transition name="fade">
        <div
          v-if="showConfirmRemoveDups"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div class="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 class="text-white text-lg font-semibold">
              Confirm Duplicate Cleanup
            </h3>
            <p class="text-slate-300 text-sm">
              Duplicated rows will be permanently deleted. The first unique copy of each message is preserved.
            </p>
            <p class="text-slate-400 text-sm">
              {{ removeDupsCount }} duplicate row(s) will be deleted.
            </p>
            <div class="flex justify-end gap-3 pt-2">
              <button
                @click="showConfirmRemoveDups = false"
                class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800"
                :disabled="dataProcessing"
              >
                Cancel
              </button>
              <button
                @click="confirmRemoveDuplicates"
                class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                :disabled="dataProcessing"
              >
                {{ dataProcessing ? 'Deleting…' : 'Delete Duplicates' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
