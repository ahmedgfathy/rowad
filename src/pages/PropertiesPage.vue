<script setup lang="ts">
import DashboardLayout from '../layouts/DashboardLayout.vue'
</script>

<template>
  <DashboardLayout>

    <h1
      class="text-4xl text-white font-bold mb-8"
    >
      Properties
    </h1>

    <div
      class="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden"
    >

      <table class="w-full">

        <thead
          class="bg-slate-800"
        >
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

          <tr
            class="border-t border-slate-800"
          >
            <td class="p-4 text-slate-400">
              -
            </td>

            <td class="p-4 text-slate-400">
              -
            </td>

            <td class="p-4 text-slate-400">
              -
            </td>

            <td class="p-4 text-slate-400">
              No records yet
            </td>

            <td class="p-4">
              <button
                class="bg-blue-600 text-white px-3 py-1 rounded"
              >
                View
              </button>
            </td>

          </tr>

        </tbody>

      </table>

    </div>

  </DashboardLayout>
</template>