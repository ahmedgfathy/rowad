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
  is_starred?: boolean | null
  follow_up_status?: string | null
  follow_up_at?: string | null
  follow_up_tags?: string[] | null
  follow_up_notes?: string | null
}

type ConfirmActionType = 'remove-one' | 'remove-selected'

const properties = ref<Property[]>([])
const loading = ref(false)
const processing = ref(false)
const search = ref('')
const filterStarred = ref(false)
const filterDueToday = ref(false)
const debouncedSearch = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const currentPage = ref(1)
const pageSize = 12
const totalRecords = ref(0)
const selectedIds = ref<number[]>([])
const sectionTopRef = ref<HTMLElement | null>(null)
const viewingProperty = ref<Property | null>(null)
const editingProperty = ref<Property | null>(null)
const showScrollTop = ref(false)
const resultNotice = ref<{
  type: 'success' | 'info' | 'error'
  message: string
} | null>(null)
const noticeTimer = ref<ReturnType<typeof setTimeout> | null>(null)
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
const followUpForm = ref({
  is_starred: false,
  follow_up_status: 'new',
  follow_up_at_local: '',
  follow_up_tags_input: '',
  follow_up_notes: '',
})

const FETCH_BATCH_SIZE = 1000
const DELETE_BATCH_SIZE = 200
const FOLLOW_UP_STATUSES = ['new', 'in_progress', 'waiting_client', 'follow_up', 'closed', 'lost']

const setResultNotice = (type: 'success' | 'info' | 'error', message: string, autoHideMs = 5000) => {
  resultNotice.value = { type, message }

  if (noticeTimer.value) {
    clearTimeout(noticeTimer.value)
  }

  if (autoHideMs > 0) {
    noticeTimer.value = setTimeout(() => {
      resultNotice.value = null
      noticeTimer.value = null
    }, autoHideMs)
  }
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

const fetchProperties = async () => {
  loading.value = true

  try {
    const from = (currentPage.value - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('properties')
      .select('*', { count: 'exact' })
      .order('id', { ascending: false })
      .range(from, to)

    if (filterStarred.value) {
      query = query.eq('is_starred', true)
    }

    if (filterDueToday.value) {
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date()
      end.setHours(23, 59, 59, 999)

      query = query
        .gte('follow_up_at', start.toISOString())
        .lte('follow_up_at', end.toISOString())
    }

    const term = debouncedSearch.value.trim().replace(/,/g, '')
    if (term) {
      query = query.or(`sender_name.ilike.%${term}%,sender_mobile.ilike.%${term}%,raw_message.ilike.%${term}%,source_file.ilike.%${term}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error(error)
      setResultNotice('error', error.message)
      return
    }

    properties.value = data || []
    totalRecords.value = count || 0
  } finally {
    loading.value = false
  }
}

const getMessageTimestamp = (value: string) => {
  const parsed = Date.parse(value || '')
  return Number.isNaN(parsed) ? 0 : parsed
}

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(totalRecords.value / pageSize))
})

const paginatedProperties = computed(() => {
  return properties.value
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

const isDueToday = (value?: string | null) => {
  if (!value) return false

  const ts = Date.parse(value)
  if (Number.isNaN(ts)) return false

  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  return ts >= start.getTime() && ts <= end.getTime()
}

const toLocalDatetimeInput = (isoValue?: string | null) => {
  if (!isoValue) return ''

  const date = new Date(isoValue)
  if (Number.isNaN(date.getTime())) return ''

  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const fromLocalDatetimeInput = (localValue: string) => {
  if (!localValue) return null

  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

const syncFollowUpForm = (property: Property) => {
  followUpForm.value = {
    is_starred: Boolean(property.is_starred),
    follow_up_status: property.follow_up_status || 'new',
    follow_up_at_local: toLocalDatetimeInput(property.follow_up_at || null),
    follow_up_tags_input: (property.follow_up_tags || []).join(', '),
    follow_up_notes: property.follow_up_notes || '',
  }
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
  if (confirmAction.value.type === 'remove-one') {
    return 'Confirm Property Deletion'
  }
  return 'Confirm Selected Deletion'
}

const getConfirmDescription = () => {
  return 'Selected properties will be permanently deleted from your database.'
}

const requestRemoveOne = (id: number) => {
  openConfirmAction('remove-one', [id])
}

const viewProperty = (property: Property) => {
  viewingProperty.value = property
  syncFollowUpForm(property)
}

const closeView = () => {
  viewingProperty.value = null
}

const saveFollowUp = async () => {
  if (!viewingProperty.value) return

  const tags = followUpForm.value.follow_up_tags_input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  processing.value = true

  try {
    const payload = {
      is_starred: followUpForm.value.is_starred,
      follow_up_status: followUpForm.value.follow_up_status,
      follow_up_at: fromLocalDatetimeInput(followUpForm.value.follow_up_at_local),
      follow_up_tags: tags,
      follow_up_notes: followUpForm.value.follow_up_notes.trim(),
    }

    const { error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', viewingProperty.value.id)

    if (error) {
      setResultNotice('error', error.message)
      return
    }

    const id = viewingProperty.value.id
    properties.value = properties.value.map((row) => {
      if (row.id !== id) return row
      return { ...row, ...payload }
    })

    viewingProperty.value = { ...viewingProperty.value, ...payload }
    setResultNotice('success', 'Follow-up details saved.', 3500)
  } finally {
    processing.value = false
  }
}

const toggleStar = async (property: Property, event?: Event) => {
  if (event) event.stopPropagation()

  const nextStarred = !property.is_starred

  const { error } = await supabase
    .from('properties')
    .update({ is_starred: nextStarred })
    .eq('id', property.id)

  if (error) {
    setResultNotice('error', error.message)
    return
  }

  properties.value = properties.value.map((row) => {
    if (row.id !== property.id) return row
    return { ...row, is_starred: nextStarred }
  })

  if (viewingProperty.value?.id === property.id) {
    viewingProperty.value = { ...viewingProperty.value, is_starred: nextStarred }
    followUpForm.value.is_starred = nextStarred
  }
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
  const messageText = (property.raw_message || '').trim() || 'لا توجد رسالة'

  return [
    'يرجى ارسال مزيد من التفاصيل عن الوحدة',
    `كانت عن: ${messageText}`,
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

const deleteInChunks = async (ids: number[]) => {
  for (let index = 0; index < ids.length; index += DELETE_BATCH_SIZE) {
    const chunk = ids.slice(index, index + DELETE_BATCH_SIZE)

    const { error } = await supabase
      .from('properties')
      .delete()
      .in('id', chunk)

    if (error) {
      throw error
    }
  }
}

const confirmDeleteAction = async () => {
  if (!confirmAction.value.ids.length) return

  processing.value = true

  try {
    const idsToDelete = [...confirmAction.value.ids]
    await deleteInChunks(idsToDelete)

    await fetchProperties()
    selectedIds.value = selectedIds.value.filter((id) => !idsToDelete.includes(id))

    setResultNotice('info', `${idsToDelete.length} row(s) deleted.`, 3500)

    closeConfirmAction()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed. Please try again.'
    setResultNotice('error', message)
    closeConfirmAction()
  } finally {
    processing.value = false
  }
}

watch(search, () => {
  currentPage.value = 1

  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    debouncedSearch.value = search.value
  }, 300)

  scrollToTop('auto')
})

watch([filterStarred, filterDueToday], () => {
  currentPage.value = 1
  scrollToTop('auto')
})

watch(totalPages, (value) => {
  if (currentPage.value > value) {
    currentPage.value = value
  }
})

watch(paginatedProperties, (rows) => {
  const ids = new Set(rows.map((row) => row.id))
  selectedIds.value = selectedIds.value.filter((id) => ids.has(id))
})

watch([currentPage, debouncedSearch, filterStarred, filterDueToday], () => {
  fetchProperties()
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
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  if (noticeTimer.value) {
    clearTimeout(noticeTimer.value)
  }

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

      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-2 rounded-xl border text-sm"
              :class="filterStarred ? 'border-amber-500 text-amber-300 bg-amber-900/20' : 'border-slate-700 text-slate-300'"
              @click="filterStarred = !filterStarred"
            >
              Starred
            </button>

            <button
              type="button"
              class="px-3 py-2 rounded-xl border text-sm"
              :class="filterDueToday ? 'border-blue-500 text-blue-300 bg-blue-900/20' : 'border-slate-700 text-slate-300'"
              @click="filterDueToday = !filterDueToday"
            >
              Follow-up Today
            </button>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="search"
              type="text"
              placeholder="Search..."
              class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white w-full sm:w-72"
            />

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
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="text-amber-400/90 hover:text-amber-300"
                      @click.stop="toggleStar(property, $event)"
                      :title="property.is_starred ? 'Unstar' : 'Star'"
                    >
                      {{ property.is_starred ? '★' : '☆' }}
                    </button>
                    <span>{{ property.sender_name }}</span>
                  </div>
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

        <div class="md:hidden px-2 py-3 space-y-2.5">
          <div
            v-if="loading"
            class="rounded-xl border border-slate-700 p-4 text-slate-300"
          >
            Loading...
          </div>

          <div
            v-for="property in paginatedProperties"
            :key="property.id"
            class="rounded-xl border border-slate-700 p-3 space-y-2.5 cursor-pointer hover:border-blue-500/60 transition"
            @click="viewProperty(property)"
          >
            <img
              :src="getPropertyImageUrl(property, 480, 320)"
              alt="Property preview"
              class="w-full h-32 rounded-xl border border-slate-700 object-cover"
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
              <span class="text-amber-400 mr-1">{{ property.is_starred ? '★' : '' }}</span>
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

            <div class="flex flex-wrap gap-2">
              <button
                class="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                @click.stop="toggleStar(property, $event)"
              >
                {{ property.is_starred ? 'Unstar' : 'Star' }}
              </button>

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
        Total Records: {{ totalRecords }}
      </div>

      <Transition name="fade">
        <div
          v-if="viewingProperty"
          class="fixed inset-0 z-50 bg-slate-950/70 flex items-start sm:items-center justify-center p-4 pt-6 sm:pt-4"
          @click.self="closeView"
        >
          <div class="w-full max-w-2xl max-h-full overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 space-y-4">
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
              </div>

              <div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                <div class="flex items-center justify-between gap-3">
                  <h4 class="text-white font-semibold text-sm sm:text-base">
                    Follow-up
                  </h4>

                  <button
                    type="button"
                    class="px-3 py-1 rounded-lg border text-sm"
                    :class="followUpForm.is_starred ? 'border-amber-500 text-amber-300 bg-amber-900/20' : 'border-slate-600 text-slate-300'"
                    @click="followUpForm.is_starred = !followUpForm.is_starred"
                  >
                    {{ followUpForm.is_starred ? '★ Starred' : '☆ Star' }}
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left" dir="ltr">
                  <label class="text-slate-300 text-sm">
                    Status
                    <select
                      v-model="followUpForm.follow_up_status"
                      class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option
                        v-for="status in FOLLOW_UP_STATUSES"
                        :key="status"
                        :value="status"
                      >
                        {{ status }}
                      </option>
                    </select>
                  </label>

                  <label class="text-slate-300 text-sm">
                    Follow-up Date & Time
                    <input
                      v-model="followUpForm.follow_up_at_local"
                      type="datetime-local"
                      class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                  </label>

                  <label class="text-slate-300 text-sm sm:col-span-2">
                    Tags (comma separated)
                    <input
                      v-model="followUpForm.follow_up_tags_input"
                      type="text"
                      placeholder="hot lead, urgent, call back"
                      class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                  </label>

                  <label class="text-slate-300 text-sm sm:col-span-2">
                    Notes
                    <textarea
                      v-model="followUpForm.follow_up_notes"
                      rows="3"
                      class="mt-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </label>
                </div>

                <div class="flex justify-end">
                  <button
                    type="button"
                    class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    :disabled="processing"
                    @click="saveFollowUp"
                  >
                    {{ processing ? 'Saving...' : 'Save Follow-up' }}
                  </button>
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