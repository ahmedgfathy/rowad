<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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

type ConfirmActionType = 'remove-one' | 'remove-selected' | 'remove-duplicates'

const properties = ref<Property[]>([])
const loading = ref(false)
const processing = ref(false)
const search = ref('')
const currentPage = ref(1)
const pageSize = 12
const selectedIds = ref<number[]>([])
const sectionTopRef = ref<HTMLElement | null>(null)
const viewingProperty = ref<Property | null>(null)
const editingProperty = ref<Property | null>(null)
const showScrollTop = ref(false)
const importProgress = ref({
  active: false,
  totalFiles: 0,
  processedFiles: 0,
  totalRowsImported: 0,
  currentFileName: '',
})
const resultNotice = ref<{
  type: 'success' | 'info' | 'error'
  message: string
} | null>(null)
const confirmAction = ref<{
  open: boolean
  type: ConfirmActionType
  count: number
  expectedRemaining: number
  ids: number[]
}>({
  open: false,
  type: 'remove-selected',
  count: 0,
  expectedRemaining: 0,
  ids: [],
})
const editForm = ref({
  sender_name: '',
  sender_mobile: '',
  raw_message: '',
  message_date: '',
})

const fileInput = ref<HTMLInputElement | null>(null)
const FETCH_BATCH_SIZE = 1000

const openFilePicker = () => {
  fileInput.value?.click()
}

const getScrollContainer = () => {
  return sectionTopRef.value?.closest('main') as HTMLElement | null
}

const scrollToTop = (behavior: ScrollBehavior = 'smooth') => {
  const container = getScrollContainer()

  if (container) {
    container.scrollTo({ top: 0, behavior })
    return
  }

  window.scrollTo({ top: 0, behavior })
}

const handleScroll = () => {
  const container = getScrollContainer()

  if (container) {
    showScrollTop.value = container.scrollTop > 240
    return
  }

  showScrollTop.value = window.scrollY > 240
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

      const rows = parseWhatsAppFile(
        content,
        file.name
      )

      if (!rows.length) {
        importProgress.value.processedFiles += 1
        continue
      }

      const { error } = await supabase
        .from('properties')
        .insert(rows)

      if (error) {
        console.error(error)
        alert(error.message)
        return
      }

      importProgress.value.totalRowsImported += rows.length
      importProgress.value.processedFiles += 1
    }

    await fetchProperties()
    selectedIds.value = []
    currentPage.value = 1

    alert(`Import completed successfully. Files: ${importProgress.value.processedFiles}/${importProgress.value.totalFiles}. Rows imported: ${importProgress.value.totalRowsImported}.`)
  } finally {
    loading.value = false
    importProgress.value.active = false
    importProgress.value.currentFileName = ''
    target.value = ''
  }
}

const fetchProperties = async () => {
  loading.value = true

  try {
    const allRows: Property[] = []
    let from = 0

    while (true) {
      const to = from + FETCH_BATCH_SIZE - 1

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('id', { ascending: false })
        .range(from, to)

      if (error) {
        console.error(error)
        break
      }

      const rows = data || []
      allRows.push(...rows)

      if (rows.length < FETCH_BATCH_SIZE) {
        break
      }

      from += FETCH_BATCH_SIZE
    }

    properties.value = allRows
  } finally {
    loading.value = false
  }
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

const importPercentage = computed(() => {
  if (!importProgress.value.totalFiles) return 0

  return Math.round((importProgress.value.processedFiles / importProgress.value.totalFiles) * 100)
})

const getMessageTimestamp = (value: string) => {
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? 0 : parsed
}

const sortedFilteredProperties = computed(() => {
  return [...filteredProperties.value].sort((a, b) => b.id - a.id)
})

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(sortedFilteredProperties.value.length / pageSize))
})

const paginatedProperties = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return sortedFilteredProperties.value.slice(start, end)
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

const clearSearch = () => {
  search.value = ''
}

const closeConfirmAction = () => {
  if (processing.value) return

  confirmAction.value = {
    open: false,
    type: 'remove-selected',
    count: 0,
    expectedRemaining: properties.value.length,
    ids: [],
  }
}

const openConfirmAction = (type: ConfirmActionType, ids: number[]) => {
  const uniqueIds = Array.from(new Set(ids))

  confirmAction.value = {
    open: true,
    type,
    count: uniqueIds.length,
    expectedRemaining: Math.max(0, properties.value.length - uniqueIds.length),
    ids: uniqueIds,
  }
}

const getConfirmTitle = () => {
  switch (confirmAction.value.type) {
    case 'remove-duplicates':
      return 'Confirm Duplicate Cleanup'
    case 'remove-one':
      return 'Confirm Property Deletion'
    default:
      return 'Confirm Selected Deletion'
  }
}

const getConfirmDescription = () => {
  if (confirmAction.value.type === 'remove-duplicates') {
    return 'Duplicated rows will be permanently deleted. The first unique copy of each message is preserved.'
  }

  return 'Selected properties will be permanently deleted from your database.'
}

const duplicateIdsFromRows = (rows: Property[]) => {
  const seen = new Set<string>()
  const duplicateIds: number[] = []

  for (const row of rows) {
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

const requestRemoveOne = (id: number) => {
  openConfirmAction('remove-one', [id])
}

const viewProperty = (property: Property) => {
  viewingProperty.value = property
}

const closeView = () => {
  viewingProperty.value = null
}

const normalizePhone = (value?: string) => {
  if (!value) return ''

  const trimmed = value.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')

  if (!digits) return ''

  return hasPlus ? `+${digits}` : digits
}

const isPhoneLike = (value?: string) => {
  const normalized = normalizePhone(value)
  return normalized.length >= 7
}

const getContactPhone = (property: Property) => {
  if (isPhoneLike(property.sender_mobile)) {
    return normalizePhone(property.sender_mobile)
  }

  if (isPhoneLike(property.sender_name)) {
    return normalizePhone(property.sender_name)
  }

  return ''
}

const getDisplayName = (property: Property) => {
  const sender = property.sender_name?.trim()

  if (!sender) {
    return property.sender_mobile?.trim() || 'Unknown sender'
  }

  if (isPhoneLike(sender)) {
    return property.sender_mobile?.trim() || sender
  }

  return sender
}

const getCleanSourceFileName = (sourceFile?: string) => {
  const raw = (sourceFile || '').trim()

  if (!raw) return 'بدون اسم ملف'

  const leafName = raw.split(/[\\/]/).pop() || raw
  const withoutExt = leafName.replace(/\.[^/.]+$/, '')

  const cleaned = withoutExt
    .replace(/^WhatsApp Chat with\s*/i, '')
    .replace(/^Chat with\s*/i, '')
    .replace(/\(txt\)/gi, '')
    .replace(/\(.*?\)$/g, '')
    .trim()

  return cleaned || withoutExt || leafName
}

const includesAny = (text: string, words: string[]) => {
  return words.some((word) => text.includes(word))
}

const inferPropertyImageType = (property: Property) => {
  const message = (property.raw_message || '').toLowerCase()

  if (includesAny(message, ['شقة', 'apartment', 'flat', 'studio', 'ستوديو'])) return 'apartment'
  if (includesAny(message, ['villa', 'فيلا'])) return 'villa'
  if (includesAny(message, ['land', 'plot', 'ارض', 'أرض'])) return 'land'
  if (includesAny(message, ['office', 'اداري', 'إداري', 'مكتب'])) return 'office'
  if (includesAny(message, ['shop', 'محل', 'store'])) return 'shop'
  if (includesAny(message, ['building', 'عمارة', 'tower', 'برج'])) return 'building'

  return 'house'
}

const PROPERTY_IMAGE_LIBRARY: Record<string, string[]> = {
  apartment: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  ],
  house: [
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
  ],
  shop: [
    'https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1555529771-35a0b24f5a4d?auto=format&fit=crop&w=1200&q=80',
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
  ],
  building: [
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
  ],
}

const pickImageFromLibrary = (library: string[], propertyId: number) => {
  if (!library.length) {
    return 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80'
  }

  const index = propertyId % library.length
  return library[index] || library[0]
}

const getPropertyImageUrl = (property: Property, width = 320, height = 220) => {
  const type = inferPropertyImageType(property)
  const library = PROPERTY_IMAGE_LIBRARY[type] ?? PROPERTY_IMAGE_LIBRARY.house ?? []
  const selectedImage = pickImageFromLibrary(library, property.id)

  return `${selectedImage}&w=${width * 2}&h=${height * 2}`
}

const handleImageError = (event: Event, property: Property, width = 320, height = 220) => {
  const image = event.target as HTMLImageElement

  if (image.dataset.fallbackApplied === '1') {
    return
  }

  image.dataset.fallbackApplied = '1'
  const fallbackLibrary = PROPERTY_IMAGE_LIBRARY.house ?? []
  const fallbackImage = pickImageFromLibrary(fallbackLibrary, property.id)
  image.src = `${fallbackImage}&w=${width * 2}&h=${height * 2}`
}

const getWhatsAppInquiry = (property: Property) => {
  const fileName = getCleanSourceFileName(property.source_file)
  const messageText = (property.raw_message || '').trim() || 'لا توجد رسالة'

  return [
    'يرجى ارسال مزيد من التفاصيل عن الوحدة',
    `كانت عن: ${messageText}`,
    `جروب: ${fileName}`,
  ].join('\n')
}

const openCall = (property: Property) => {
  const phone = getContactPhone(property)

  if (!phone) {
    alert('No valid mobile number found for this sender.')
    return
  }

  window.open(`tel:${phone}`, '_self')
}

const openWhatsApp = (property: Property) => {
  const phone = getContactPhone(property)

  if (!phone) {
    alert('No valid mobile number found for WhatsApp.')
    return
  }

  const digitsOnlyPhone = phone.replace(/\D/g, '')
  const text = encodeURIComponent(getWhatsAppInquiry(property))

  window.open(`https://wa.me/${digitsOnlyPhone}?text=${text}`, '_blank', 'noopener,noreferrer')
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

const removeSelected = async () => {
  if (!selectedIds.value.length) return

  openConfirmAction('remove-selected', selectedIds.value)
}

const removeDuplicates = async () => {
  if (!properties.value.length) return

  const duplicates = duplicateIdsFromRows(properties.value)

  if (!duplicates.length) {
    resultNotice.value = {
      type: 'info',
      message: 'No duplicated rows found. Nothing was deleted.',
    }
    return
  }

  openConfirmAction('remove-duplicates', duplicates)
}

const confirmDeleteAction = async () => {
  if (!confirmAction.value.ids.length) return

  processing.value = true

  try {
    const idsToDelete = [...confirmAction.value.ids]
    const { error } = await supabase
      .from('properties')
      .delete()
      .in('id', idsToDelete)

    if (error) {
      resultNotice.value = {
        type: 'error',
        message: error.message,
      }
      return
    }

    await fetchProperties()
    selectedIds.value = selectedIds.value.filter((id) => !idsToDelete.includes(id))

    closeConfirmAction()
  } finally {
    processing.value = false
  }
}

watch(search, () => {
  currentPage.value = 1
  scrollToTop('auto')
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

watch(currentPage, () => {
  scrollToTop('smooth')
})

onMounted(() => {
  fetchProperties()

  const container = getScrollContainer()

  if (container) {
    container.addEventListener('scroll', handleScroll, { passive: true })
  } else {
    window.addEventListener('scroll', handleScroll, { passive: true })
  }

  handleScroll()
})

onUnmounted(() => {
  const container = getScrollContainer()

  if (container) {
    container.removeEventListener('scroll', handleScroll)
  } else {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <DashboardLayout>

    <section class="flex flex-col gap-4">

      <div ref="sectionTopRef" />

      <div class="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">

        <h1
          class="text-2xl sm:text-3xl lg:text-4xl font-bold text-white"
        >
          Properties
        </h1>

        <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">

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

          <div class="flex items-center gap-2">
            <button
              @click="openFilePicker"
              class="h-12 w-12 inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
              :disabled="processing"
              title="Import TXT"
              aria-label="Import TXT"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-5 w-5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4m0 0 4 4m-4-4-4 4" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </button>

            <button
              @click="removeDuplicates"
              class="h-12 w-12 inline-flex items-center justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60"
              :disabled="processing || loading"
              title="Remove Duplicates"
              aria-label="Remove Duplicates"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-5 w-5"
              >
                <rect x="9" y="9" width="10" height="10" rx="2" />
                <rect x="5" y="5" width="10" height="10" rx="2" />
              </svg>
            </button>

            <button
              @click="clearSearch"
              class="h-12 w-12 inline-flex items-center justify-center rounded-xl bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-60"
              :disabled="!search"
              title="Clear Search"
              aria-label="Clear Search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="h-5 w-5"
              >
                <circle cx="11" cy="11" r="7" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.3-4.3" />
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.5 8.5 5 5m0-5-5 5" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      <Transition name="fade">
        <div
          v-if="loading && importProgress.totalFiles"
          class="rounded-2xl border border-blue-700/60 bg-blue-950/30 p-4 space-y-3"
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

      <Transition name="fade">
        <div
          v-if="selectedCount"
          class="bg-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div class="text-slate-300">
            Selected: {{ selectedCount }}
          </div>

          <div class="flex gap-2">
            <button
              @click="clearSelection"
              class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Clear
            </button>

            <button
              @click="removeSelected"
              class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
              :disabled="processing"
            >
              Remove Selected
            </button>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="resultNotice"
          class="rounded-2xl p-3 sm:p-4 border"
          :class="{
            'bg-emerald-900/30 border-emerald-700 text-emerald-200': resultNotice.type === 'success',
            'bg-amber-900/30 border-amber-700 text-amber-200': resultNotice.type === 'info',
            'bg-red-900/30 border-red-700 text-red-200': resultNotice.type === 'error'
          }"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm sm:text-base">
              {{ resultNotice.message }}
            </p>

            <button
              class="h-7 w-7 rounded-lg border border-current/30"
              @click="resultNotice = null"
            >
              ×
            </button>
          </div>
        </div>
      </Transition>

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
                @click="viewProperty(property)"
              >

                <td class="p-4 text-slate-200">
                  <input
                    type="checkbox"
                    :checked="selectedIds.includes(property.id)"
                    @click.stop
                    @change="toggleRowSelection(property.id)"
                  >
                </td>

                <td class="p-4 text-slate-200 whitespace-nowrap">
                  {{ new Date(property.message_date).toLocaleString() }}
                </td>

                <td class="p-4 text-white whitespace-nowrap" dir="rtl">
                  {{ property.sender_name }}
                </td>

                <td class="p-4 text-slate-300 whitespace-nowrap" dir="rtl">
                  {{ property.sender_mobile || '-' }}
                </td>

                <td class="p-4 text-slate-300 break-words text-right" dir="rtl">
                  <div class="flex items-start gap-3">
                    <img
                      :src="getPropertyImageUrl(property, 96, 72)"
                      alt="Property preview"
                      class="h-16 w-20 rounded-lg border border-slate-700 object-cover shrink-0"
                      loading="lazy"
                      @error="handleImageError($event, property, 96, 72)"
                    >

                    <span>
                      {{ property.raw_message }}
                    </span>
                  </div>
                </td>

                <td class="p-4 text-slate-300 break-words text-right" dir="rtl">
                  {{ property.source_file }}
                </td>

                <td class="p-4">
                  <div class="flex flex-wrap gap-2">
                    <button
                      class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                      @click.stop="viewProperty(property)"
                    >
                      View
                    </button>

                    <button
                      class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                      @click.stop="openEdit(property)"
                    >
                      Edit
                    </button>

                    <button
                      class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                      @click.stop="requestRemoveOne(property.id)"
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
            class="rounded-xl border border-slate-700 p-4 space-y-3 cursor-pointer hover:border-blue-500/60 transition"
            @click="viewProperty(property)"
          >
            <img
              :src="getPropertyImageUrl(property, 480, 320)"
              alt="Property preview"
              class="w-full h-36 rounded-xl border border-slate-700 object-cover"
              loading="lazy"
              @error="handleImageError($event, property, 480, 320)"
            >

            <div class="flex items-center justify-between gap-3">
              <label
                class="text-slate-200 flex items-center gap-2"
                @click.stop
              >
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

            <div
              class="text-white font-semibold text-right"
              dir="rtl"
            >
              {{ property.sender_name }}
            </div>

            <div
              class="text-slate-300 text-sm text-right"
              dir="rtl"
            >
              Mobile: {{ property.sender_mobile || '-' }}
            </div>

            <div
              class="text-slate-300 text-sm break-words text-right"
              dir="rtl"
            >
              {{ property.raw_message }}
            </div>

            <div
              class="text-slate-400 text-sm break-words text-right"
              dir="rtl"
            >
              File: {{ property.source_file }}
            </div>

            <div class="flex flex-wrap gap-2">
              <button
                class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                @click.stop="viewProperty(property)"
              >
                View
              </button>

              <button
                class="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                @click.stop="openEdit(property)"
              >
                Edit
              </button>

              <button
                class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                @click.stop="requestRemoveOne(property.id)"
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

            <div
              dir="rtl"
              class="space-y-4 text-right"
            >
              <div class="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
                <img
                  :src="getPropertyImageUrl(viewingProperty, 960, 520)"
                  alt="Property preview"
                  class="w-full h-52 sm:h-64 rounded-xl border border-slate-700 object-cover mb-3"
                  loading="lazy"
                  @error="handleImageError($event, viewingProperty, 960, 520)"
                >

                <p class="text-slate-300 text-sm mb-2">
                  الرسالة الأولى
                </p>
                <p class="text-white text-lg leading-7 break-words">
                  {{ viewingProperty.raw_message }}
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div class="text-slate-300">
                  Sender: <span class="text-white">{{ getDisplayName(viewingProperty) }}</span>
                </div>
                <div class="text-slate-300">
                  Mobile: <span class="text-white">{{ getContactPhone(viewingProperty) || '-' }}</span>
                </div>
                <div class="text-slate-300 sm:col-span-2">
                  Date: <span class="text-white">{{ new Date(viewingProperty.message_date).toLocaleString() }}</span>
                </div>
                <div class="text-slate-300 sm:col-span-2">
                  File: <span class="text-white break-words">{{ viewingProperty.source_file }}</span>
                </div>
              </div>

              <div
                v-if="getContactPhone(viewingProperty)"
                class="flex flex-wrap gap-2"
              >
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
                  @click="openCall(viewingProperty)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="h-4 w-4"
                  >
                    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 .94-.27c1.03.29 2.12.44 3.24.44a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.45a1 1 0 0 1 1 1c0 1.12.15 2.21.44 3.24a1 1 0 0 1-.27.94l-2 1.61z" />
                  </svg>
                  Call
                </button>

                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                  @click="openWhatsApp(viewingProperty)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    class="h-4 w-4"
                  >
                    <path d="M20.52 3.48A11.85 11.85 0 0 0 12.08 0C5.48 0 .12 5.36.12 11.95c0 2.1.55 4.15 1.59 5.96L0 24l6.27-1.65a11.89 11.89 0 0 0 5.81 1.49h.01c6.59 0 11.95-5.36 11.95-11.95a11.84 11.84 0 0 0-3.52-8.41Zm-8.44 18.33h-.01a9.87 9.87 0 0 1-5.03-1.37l-.36-.21-3.72.98.99-3.63-.23-.37a9.85 9.85 0 0 1-1.51-5.26c0-5.45 4.43-9.88 9.88-9.88 2.64 0 5.12 1.03 6.98 2.89a9.8 9.8 0 0 1 2.9 6.99c0 5.45-4.43 9.87-9.89 9.87Zm5.41-7.4c-.3-.15-1.76-.86-2.03-.95-.27-.1-.47-.15-.66.15-.2.3-.76.95-.94 1.14-.17.2-.35.22-.65.07-.3-.15-1.28-.47-2.43-1.5-.89-.79-1.5-1.77-1.67-2.07-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.66-1.6-.9-2.18-.24-.58-.48-.5-.66-.5h-.56c-.2 0-.52.08-.79.38-.27.3-1.03 1-1.03 2.44s1.05 2.84 1.2 3.03c.15.2 2.05 3.13 4.97 4.39.69.3 1.22.48 1.64.61.69.22 1.31.19 1.8.11.55-.08 1.76-.72 2.01-1.42.25-.69.25-1.28.18-1.42-.07-.13-.27-.2-.57-.35Z" />
                  </svg>
                  WhatsApp Inquiry
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="fade">
        <div
          v-if="confirmAction.open"
          class="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          @click.self="closeConfirmAction"
        >
          <div class="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-xl font-semibold text-white">
                  {{ getConfirmTitle() }}
                </h3>
                <p class="text-slate-300 mt-1 text-sm">
                  {{ getConfirmDescription() }}
                </p>
              </div>

              <button
                class="h-9 w-9 rounded-lg border border-slate-700 text-slate-200"
                :disabled="processing"
                @click="closeConfirmAction"
              >
                ×
              </button>
            </div>

            <div class="rounded-xl border border-slate-700 bg-slate-800/60 p-4 space-y-2 text-sm">
              <p class="text-slate-300">
                Rows to delete: <span class="text-white font-semibold">{{ confirmAction.count }}</span>
              </p>
              <p class="text-slate-300">
                Expected rows after delete: <span class="text-white font-semibold">{{ confirmAction.expectedRemaining }}</span>
              </p>
              <p class="text-red-300 text-xs sm:text-sm">
                This action is permanent and cannot be undone.
              </p>
            </div>

            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 hover:bg-slate-800"
                :disabled="processing"
                @click="closeConfirmAction"
              >
                Cancel
              </button>

              <button
                class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                :disabled="processing"
                @click="confirmDeleteAction"
              >
                {{ processing ? 'Deleting...' : 'Confirm Delete' }}
              </button>
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

      <Transition name="fade">
        <button
          v-if="showScrollTop"
          type="button"
          class="fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg border border-blue-400/40"
          aria-label="Scroll to top"
          title="Back to top"
          @click="scrollToTop('smooth')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="h-5 w-5 mx-auto"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m6 15 6-6 6 6" />
          </svg>
        </button>
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