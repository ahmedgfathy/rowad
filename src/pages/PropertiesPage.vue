<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import DashboardLayout from '../layouts/DashboardLayout.vue'
import { supabase } from '../lib/supabase'

interface Property {
  id: number
  message_date: string
  sender_name: string
  sender_mobile: string
  raw_message: string
}

const properties = ref<Property[]>([])
const loading = ref(true)
const search = ref('')

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

  return properties.value.filter((item) =>
    item.sender_name?.toLowerCase().includes(term) ||
    item.sender_mobile?.toLowerCase().includes(term) ||
    item.raw_message?.toLowerCase().includes(term)
  )
})

onMounted(() => {
  fetchProperties()
})
</script>

<template>
  <DashboardLayout>

    <div class="flex items-center justify-between mb-8">

      <h1 class="text-4xl text-white font-bold">
        Properties
      </h1>

      <input
        v-model="search"
        type="text"
        placeholder="Search..."
        class="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white w-72"
      />

    </div>

    <div
      class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
    >

      <table class="w-full">

        <thead class="bg-slate-800">
          <tr>

            <th class="text-left p-4 text-slate-300">
              Date
            </th>

            <th class="text-left p-4 text-slate-300">
              Sender
            </th>

            <th class="text-left p-4 text-slate-300">
              Mobile
            </th>

            <th class="text-left p-4 text-slate-300">
              Message
            </th>

            <th class="text-left p-4 text-slate-300">
              Actions
            </th>

          </tr>
        </thead>

        <tbody>

          <tr v-if="loading">
            <td
              colspan="5"
              class="p-8 text-center text-slate-400"
            >
              Loading...
            </td>
          </tr>

          <tr
            v-else-if="filteredProperties.length === 0"
          >
            <td
              colspan="5"
              class="p-8 text-center text-slate-400"
            >
              No properties found
            </td>
          </tr>

          <tr
            v-for="property in filteredProperties"
            :key="property.id"
            class="border-t border-slate-800"
          >

            <td class="p-4 text-slate-300">
              {{ new Date(property.message_date).toLocaleString() }}
            </td>

            <td class="p-4 text-white">
              {{ property.sender_name }}
            </td>

            <td class="p-4 text-slate-300">
              {{ property.sender_mobile }}
            </td>

            <td class="p-4 text-slate-300 max-w-xl">
              {{ property.raw_message }}
            </td>

            <td class="p-4">
              <button
                class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white"
              >
                View
              </button>
            </td>

          </tr>

        </tbody>

      </table>

    </div>

    <div class="mt-4 text-slate-400">
      Total Records: {{ filteredProperties.length }}
    </div>

  </DashboardLayout>
</template>