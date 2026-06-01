<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
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
const search = ref('')

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
      row.raw_message?.toLowerCase().includes(term) ||
      row.source_file?.toLowerCase().includes(term)
    )
  })
})

onMounted(() => {
  fetchProperties()
})
</script>

<template>
  <DashboardLayout>

    <section class="h-full flex flex-col min-h-0">

      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-5 sm:mb-6">

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
          >
            Import TXT
          </button>

        </div>
      </div>

      <div
        class="bg-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden flex-1 min-h-0"
      >
        <div class="h-full overflow-auto">

          <table class="w-full min-w-[720px]">

            <thead class="bg-slate-700 sticky top-0 z-10">

              <tr>

                <th class="text-left p-4 text-white">
                  Date
                </th>

                <th class="text-left p-4 text-white">
                  Sender
                </th>

                <th class="text-left p-4 text-white">
                  Source File
                </th>

                <th class="text-left p-4 text-white">
                  Message
                </th>

              </tr>

            </thead>

            <tbody>

              <tr v-if="loading">

                <td
                  colspan="4"
                  class="p-6 text-center text-slate-300"
                >
                  Loading...
                </td>

              </tr>

              <tr
                v-for="property in filteredProperties"
                :key="property.id"
                class="border-t border-slate-700"
              >

                <td class="p-4 text-slate-200 whitespace-nowrap">
                  {{ new Date(property.message_date).toLocaleString() }}
                </td>

                <td class="p-4 text-white whitespace-nowrap">
                  {{ property.sender_name }}
                </td>

                <td class="p-4 text-slate-300 whitespace-nowrap">
                  {{ property.source_file }}
                </td>

                <td class="p-4 text-slate-300">
                  {{ property.raw_message }}
                </td>

              </tr>

            </tbody>

          </table>

        </div>

      </div>

      <div
        class="mt-4 text-slate-400"
      >
        Total Records: {{ filteredProperties.length }}
      </div>

    </section>

  </DashboardLayout>
</template>