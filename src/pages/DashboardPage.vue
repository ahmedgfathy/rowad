<script setup lang="ts">
import DashboardLayout from '../layouts/DashboardLayout.vue'
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
          0
        </div>
      </div>

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Leads
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          0
        </div>
      </div>

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Users
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          1
        </div>
      </div>

      <div
        class="bg-slate-900 border border-slate-800 rounded-3xl p-6"
      >
        <div class="text-slate-400">
          Messages
        </div>

        <div
          class="text-white text-4xl font-bold mt-4"
        >
          0
        </div>
      </div>

    </div>

  </DashboardLayout>
</template>