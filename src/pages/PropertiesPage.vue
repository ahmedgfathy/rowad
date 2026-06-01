<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../lib/supabase'

interface Property {
  id: number
  source_file: string
  message_date: string
  sender_name: string
  sender_mobile: string
  raw_message: string
}

const properties = ref<Property[]>([])
const loading = ref(false)
const processing = ref(false)
const search = ref('')
const currentPage = ref(1)
const pageSize = 12
const selectedIds = ref<number[]>([])
const viewingProperty = ref<Property | null>(null)
const editingProperty = ref<Property | null>(null)
const editForm = ref({
  sender_name: '',
  sender_mobile: '',
  raw_message: '',
  message_date: '',
})

const fileInput = ref<HTMLInputElement | null>(null)

const openFilePicker = () => {
  fileInput.value?.click()
}

const parseWhatsAppFile = (content: string, fileName: string) => {
  const rows: any[] = []

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

    rows.push({
      source_file: fileName,
      message_date: date.toISOString(),
      sender_name: sender,
      sender_mobile: '',
      raw_message: message,
    })
  }

  return rows
}

const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement

  const files = Array.from(target.files || [])

  if (!files.length) return

  loading.value = true

  try {
    for (const file of files) {
      const content = await file.text()

      const rows = parseWhatsAppFile(
        content,
        file.name
      )

      if (!rows.length) continue

      const { error } = await supabase
        .from('properties')
        .insert(rows)

      if (error) {
        console.error(error)
        alert(error.message)
        return
      }
    }

    await fetchProperties()
    selectedIds.value = []
    currentPage.value = 1

    alert('Import completed successfully')
  } finally {
    loading.value = false
  }
}

const fetchProperties = async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('id', { ascending: false })

  if (error) {
    console.error(error)
  } else {
    properties.value = data || []
  }

  loading.value = false
}

const filteredProperties = computed(() => {
  if (!search.value) {
    return properties.value
  }

  const term = search.value.toLowerCase()

  return properties.value.filter((row) => {
    return (
      row.sender_name?.toLowerCase().includes(term) ||
      row.sender_mobile?.toLowerCase().includes(term) ||
      row.raw_message?.toLowerCase().includes(term) ||
      row.source_file?.toLowerCase().includes(term)
    )
  })
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredProperties.value.length / pageSize))
})

const paginatedProperties = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredProperties.value.slice(start, end)
})

const selectedCount = computed(() => selectedIds.value.length)

const allCurrentPageSelected = computed(() => {
  if (!paginatedProperties.value.length) return false

  return paginatedProperties.value.every((row) => {
    return selectedIds.value.includes(row.id)
  })
})

const toggleSelectAllCurrentPage = () => {
  if (allCurrentPageSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => {
      return !paginatedProperties.value.some((row) => row.id === id)
    })
    return
  }

  const currentIds = paginatedProperties.value.map((row) => row.id)
  selectedIds.value = Array.from(new Set([...selectedIds.value, ...currentIds]))
}

const toggleRowSelection = (id: number) => {
  if (selectedIds.value.includes(id)) {
    selectedIds.value = selectedIds.value.filter((value) => value !== id)
    return
  }

  selectedIds.value = [...selectedIds.value, id]
}

const clearSelection = () => {
  selectedIds.value = []
}

const viewProperty = (property: Property) => {
  viewingProperty.value = property
}

const closeView = () => {
  viewingProperty.value = null
}

const openEdit = (property: Property) => {
  editingProperty.value = property
  editForm.value = {
    sender_name: property.sender_name || '',
    sender_mobile: property.sender_mobile || '',
    raw_message: property.raw_message || '',
    message_date: property.message_date || '',
  }
}

const closeEdit = () => {
  editingProperty.value = null
}

const saveEdit = async () => {
  if (!editingProperty.value) return

  processing.value = true

  try {
    const { error } = await supabase
      .from('properties')
      .update({
        sender_name: editForm.value.sender_name,
        sender_mobile: editForm.value.sender_mobile,
        raw_message: editForm.value.raw_message,
        message_date: editForm.value.message_date,
      })
      .eq('id', editingProperty.value.id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchProperties()
    closeEdit()
  } finally {
    processing.value = false
  }
}

const removeOne = async (id: number) => {
  if (!confirm('Remove this property?')) return

  processing.value = true

  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    await fetchProperties()
    selectedIds.value = selectedIds.value.filter((value) => value !== id)
  } finally {
    processing.value = false
  }
}

const removeSelected = async () => {
  if (!selectedIds.value.length) return

  if (!confirm(`Remove ${selectedIds.value.length} selected rows?`)) return

  processing.value = true

  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .in('id', selectedIds.value)

    if (error) {
      alert(error.message)
      return
    }

    await fetchProperties()
    clearSelection()
  } finally {
    processing.value = false
  }
}

const removeDuplicates = async () => {
  if (!properties.value.length) return

  processing.value = true

  try {
    const seen = new Set<string>()
    const duplicates: number[] = []

    for (const row of properties.value) {
      const key = [
        row.raw_message || '',
        row.sender_name || '',
        row.sender_mobile || '',
        row.message_date || '',
      ].join('|')

      if (seen.has(key)) {
        duplicates.push(row.id)
      } else {
        seen.add(key)
      }
    }

    if (!duplicates.length) {
      alert('No duplicated rows found.')
      return
    }

    if (!confirm(`Remove ${duplicates.length} duplicated rows?`)) return

    const { error } = await supabase
      .from('properties')
      .delete()
      .in('id', duplicates)

    if (error) {
      alert(error.message)
      return
    }

    await fetchProperties()
    selectedIds.value = selectedIds.value.filter((id) => !duplicates.includes(id))
    alert(`${duplicates.length} duplicated rows removed.`)
  } finally {
    processing.value = false
  }
}

watch(search, () => {
  currentPage.value = 1
})

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})

watch(filteredProperties, (rows) => {
  const ids = new Set(rows.map((row) => row.id))
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
})

onMounted(() => {
  fetchProperties()
})
</script>

<template>
  <DashboardLayout>

    <section class="flex flex-col gap-4">

      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">

        <h1
          class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white"
        >
          Properties
        </h1>

        <div class="flex flex-col sm:flex-row gap-3">

          <input
            v-model="search"
            type="text"
            placeholder="Search..."
            class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white w-full sm:w-72"
          />

          <input
            ref="fileInput"
            type="file"
            multiple
            accept=".txt"
            class="hidden"
            @change="handleFileUpload"
          />

          <button
            @click="openFilePicker"
            class="bg-emerald-600 hover:bg-emerald-700 px-5 py-3 rounded-xl text-white whitespace-nowrap"
            :disabled="processing"
          >
            Import TXT
          </button>

          <button
            @click="removeDuplicates"
            class="bg-amber-600 hover:bg-amber-700 px-5 py-3 rounded-xl text-white whitespace-nowrap disabled:opacity-60"
            :disabled="processing || loading"
          >
            Remove Duplicates
          </button>

        </div>
      </div>

      <div
        class="bg-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div class="text-slate-300">
          Selected: {{ selectedCount }}
        </div>

        <div class="flex gap-2">
          <button
            @click="clearSelection"
            class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-60"
            :disabled="!selectedCount"
          >
            Clear
          </button>

          <button
            @click="removeSelected"
            class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
            :disabled="!selectedCount || processing"
          >
            Remove Selected
          </button>
        </div>
      </div>

      <div
        class="bg-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden"
      >
        <div class="hidden md:block">
          <table class="w-full table-fixed">

            <thead class="bg-slate-700 sticky top-0 z-10">

              <tr>

                <th class="text-left p-4 text-white w-14">
                  <input
                    type="checkbox"
                    :checked="allCurrentPageSelected"
                    @change="toggleSelectAllCurrentPage"
                  >
                </th>

                <th class="text-left p-4 text-white w-44">
                  Date
                </th>

                <th class="text-left p-4 text-white w-36">
                  Sender
                </th>

                <th class="text-left p-4 text-white w-32">
                  Mobile
                </th>

                <th class="text-left p-4 text-white">
                  Message
                </th>

                <th class="text-left p-4 text-white w-40">
                  Source File
                </th>

                <th class="text-left p-4 text-white w-56">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              <tr v-if="loading">

                <td
                  colspan="7"
                  class="p-6 text-center text-slate-300"
                >
                  Loading...
                </td>

              </tr>

              <tr
                v-if="!loading && !paginatedProperties.length"
                class="border-t border-slate-700"
              >
                <td
                  colspan="7"
                  class="p-6 text-center text-slate-300"
                >
                  No data found.
                </td>
              </tr>

              <tr
                v-for="property in paginatedProperties"
                :key="property.id"
                class="border-t border-slate-700"
              >

                <td class="p-4 text-slate-200">
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(property.id)"
                    @change="toggleRowSelection(property.id)"
                  >
                </td>

                <td class="p-4 text-slate-200 whitespace-nowrap">
                  {{ new Date(property.message_date).toLocaleString() }}
                </td>

                <td class="p-4 text-white whitespace-nowrap">
                  {{ property.sender_name }}
                </td>

                <td class="p-4 text-slate-300 whitespace-nowrap">
                  {{ property.sender_mobile || '-' }}
                </td>

                <td class="p-4 text-slate-300 break-words">
                  {{ property.raw_message }}
                </td>

                <td class="p-4 text-slate-300 break-words">
                  {{ property.source_file }}
                </td>

                <td class="p-4">
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                      @click="viewProperty(property)"
                    >
                      View
                    </button>

                    <button
                      class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                      @click="openEdit(property)"
                    >
                      Edit
                    </button>

                    <button
                      class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                      @click="removeOne(property.id)"
                    >
                      Remove
                    </button>
                  </div>
                </td>

              </tr>

            </tbody>

          </table>
        </div>

        <div class="md:hidden p-3 space-y-3">
          <div
            v-if="loading"
            class="rounded-xl border border-slate-700 p-4 text-slate-300"
          >
            Loading...
          </div>

          <div
            v-for="property in paginatedProperties"
            :key="property.id"
            class="rounded-xl border border-slate-700 p-4 space-y-3"
          >
            <div class="flex items-center justify-between gap-3">
              <label class="text-slate-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(property.id)"
                  @change="toggleRowSelection(property.id)"
                >
                Select
              </label>

              <span class="text-slate-400 text-sm">
                {{ new Date(property.message_date).toLocaleString() }}
              </span>
            </div>

            <div class="text-white font-semibold">
              {{ property.sender_name }}
            </div>

            <div class="text-slate-300 text-sm">
              Mobile: {{ property.sender_mobile || '-' }}
            </div>

            <div class="text-slate-300 text-sm break-words">
              {{ property.raw_message }}
            </div>

            <div class="text-slate-400 text-sm break-words">
              File: {{ property.source_file }}
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                @click="viewProperty(property)"
              >
                View
              </button>

              <button
                class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                @click="openEdit(property)"
              >
                Edit
              </button>

              <button
                class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                @click="removeOne(property.id)"
              >
                Remove
              </button>
            </div>
          </div>

          <div
            v-if="!loading && !paginatedProperties.length"
            class="rounded-xl border border-slate-700 p-4 text-slate-300"
          >
            No data found.
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="text-slate-400 text-sm sm:text-base">
          Page {{ currentPage }} of {{ totalPages }}
        </div>

        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            :disabled="currentPage <= 1"
            @click="currentPage -= 1"
          >
            Previous
          </button>

          <button
            class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800 disabled:opacity-60"
            :disabled="currentPage >= totalPages"
            @click="currentPage += 1"
          >
            Next
          </button>
        </div>
      </div>

      <div
        class="text-slate-400"
      >
        Total Records: {{ filteredProperties.length }}
      </div>

      <Transition name="fade">
        <div
          v-if="viewingProperty"
          class="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          @click.self="closeView"
        >
          <div class="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-xl font-semibold text-white">
                Property Details
              </h3>

              <button
                class="h-9 w-9 rounded-lg border border-slate-700 text-slate-200"
                @click="closeView"
              >
                ×
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div class="text-slate-300">
                Sender: <span class="text-white">{{ viewingProperty.sender_name }}</span>
              </div>
              <div class="text-slate-300">
                Mobile: <span class="text-white">{{ viewingProperty.sender_mobile || '-' }}</span>
              </div>
              <div class="text-slate-300 sm:col-span-2">
                Date: <span class="text-white">{{ new Date(viewingProperty.message_date).toLocaleString() }}</span>
              </div>
              <div class="text-slate-300 sm:col-span-2">
                File: <span class="text-white break-words">{{ viewingProperty.source_file }}</span>
              </div>
              <div class="text-slate-300 sm:col-span-2">
                Message:
                <div class="mt-1 text-white break-words">{{ viewingProperty.raw_message }}</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="editingProperty"
          class="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4"
          @click.self="closeEdit"
        >
          <div class="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <h3 class="text-xl font-semibold text-white">
                Edit Property
              </h3>

              <button
                class="h-9 w-9 rounded-lg border border-slate-700 text-slate-200"
                @click="closeEdit"
              >
                ×
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="text-slate-300 text-sm">
                Sender
                <input
                  v-model="editForm.sender_name"
                  class="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
              </label>

              <label class="text-slate-300 text-sm">
                Mobile
                <input
                  v-model="editForm.sender_mobile"
                  class="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
              </label>

              <label class="text-slate-300 text-sm sm:col-span-2">
                Date Time
                <input
                  v-model="editForm.message_date"
                  class="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                >
              </label>

              <label class="text-slate-300 text-sm sm:col-span-2">
                Message
                <textarea
                  v-model="editForm.raw_message"
                  rows="4"
                  class="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </label>
            </div>

            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800"
                @click="closeEdit"
              >
                Cancel
              </button>

              <button
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                :disabled="processing"
                @click="saveEdit"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Transition>

    </section>

  </DashboardLayout>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity .2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>