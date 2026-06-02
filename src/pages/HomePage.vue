<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { supabase } from '../lib/supabase'

interface PublicProperty {
  id: number
  sender_name: string | null
  sender_mobile: string | null
  raw_message: string | null
  message_date: string | null
  is_starred?: boolean | null
}

const search = ref('')
const loading = ref(false)
const featuredProperties = ref<PublicProperty[]>([])

const parseNumber = (message: string) => {
  const match = message.match(/(\d[\d,\.]*)/)
  if (!match) return null
  const parsed = Number((match[1] ?? '').replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

const inferType = (message: string) => {
  const normalized = message.toLowerCase()

  if (normalized.includes('villa') || normalized.includes('فيلا')) return 'فيلا'
  if (normalized.includes('apartment') || normalized.includes('شقة')) return 'شقة'
  if (normalized.includes('office') || normalized.includes('مكتب') || normalized.includes('اداري')) return 'مكتب'
  if (normalized.includes('land') || normalized.includes('ارض') || normalized.includes('أرض')) return 'أرض'
  if (normalized.includes('commercial') || normalized.includes('محل') || normalized.includes('store')) return 'تجاري'

  return 'عقار'
}

const inferUse = (message: string) => {
  const normalized = message.toLowerCase()
  if (normalized.includes('rent') || normalized.includes('ايجار') || normalized.includes('إيجار')) return 'إيجار'
  if (normalized.includes('resell') || normalized.includes('resale') || normalized.includes('sell') || normalized.includes('بيع')) return 'إعادة بيع'
  return 'أساسي'
}

const inferArea = (message: string) => {
  const match = message.match(/(\d{2,4})\s?(m|sqm|م)/i)
  return match ? `${match[1]} م²` : 'المساحة عند الطلب'
}

const formatDate = (value: string | null) => {
  if (!value) return 'حديثًا'
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return 'حديثًا'
  return new Date(parsed).toLocaleDateString('ar-EG')
}

const cleanMessage = (value: string | null) => {
  return (value || '').replace(/\s+/g, ' ').trim()
}

const getImage = (id: number) => {
  const images = [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7f34b5f8d89?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  ]

  return images[id % images.length]
}

const normalizedProperties = computed(() => {
  return featuredProperties.value.map((property) => {
    const message = cleanMessage(property.raw_message)
    const price = parseNumber(message)

    return {
      id: property.id,
      title: inferType(message),
      use: inferUse(message),
      location: property.sender_name?.trim() || 'موقع مميز',
      area: inferArea(message),
      price: price
        ? price.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' })
        : 'السعر عند الطلب',
      description: message || 'وحدة مختارة ومنشورة من نظام إدارة العقارات.',
      date: formatDate(property.message_date),
      contact: property.sender_mobile?.trim() || 'التواصل متاح بعد الاستفسار',
      image: getImage(property.id),
    }
  })
})

const latestProperties = computed(() => normalizedProperties.value.slice(0, 6))
const primaryProperties = computed(() => normalizedProperties.value.filter((property) => property.use === 'أساسي').slice(0, 6))
const resellProperties = computed(() => normalizedProperties.value.filter((property) => property.use === 'إعادة بيع').slice(0, 6))
const rentProperties = computed(() => normalizedProperties.value.filter((property) => property.use === 'إيجار').slice(0, 6))
const commercialProperties = computed(() => normalizedProperties.value.filter((property) => property.title === 'تجاري' || property.title === 'مكتب').slice(0, 6))

const mostSeemingProperties = computed(() => {
  return [...normalizedProperties.value]
    .sort((a, b) => b.description.length - a.description.length)
    .slice(0, 6)
})

const searchResults = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return latestProperties.value

  return normalizedProperties.value.filter((property) => {
    return [
      property.title,
      property.use,
      property.location,
      property.description,
      property.area,
      property.price,
    ]
      .join(' ')
      .toLowerCase()
      .includes(term)
  })
})

const topAgents = computed(() => {
  const grouped = new Map<string, { name: string; phone: string; count: number }>()

  for (const property of featuredProperties.value) {
    const phone = property.sender_mobile?.trim() || ''
    if (!phone) continue

    const name = property.sender_name?.trim() || 'وسيط مميز'
    const key = `${name}::${phone}`
    const current = grouped.get(key)

    if (!current) {
      grouped.set(key, { name, phone, count: 1 })
      continue
    }

    current.count += 1
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
})

const fetchPublicProperties = async () => {
  loading.value = true

  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, sender_name, sender_mobile, raw_message, message_date, is_starred')
      .eq('is_starred', true)
      .order('message_date', { ascending: false })
      .limit(36)

    if (error) {
      console.error(error)
      featuredProperties.value = []
      return
    }

    featuredProperties.value = data || []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPublicProperties)
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-white">
    <header class="sticky top-0 z-20 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex h-20 items-center justify-between gap-4">
          <a
            href="#home"
            class="flex items-center gap-3"
          >
            <img
              src="/logo.png"
              alt="شعار رواد"
              class="h-11 w-11 rounded-xl border border-slate-700 object-cover"
            >
            <span class="text-xl font-semibold tracking-wide">رواد العقارية</span>
          </a>

          <nav class="hidden lg:flex items-center gap-2 text-sm font-medium text-slate-200">
            <a href="#home" class="rounded-xl px-4 py-2 hover:bg-slate-800 transition">الرئيسية</a>
            <a href="#resell" class="rounded-xl px-4 py-2 hover:bg-slate-800 transition">إعادة البيع</a>
            <a href="#rent" class="rounded-xl px-4 py-2 hover:bg-slate-800 transition">الإيجار</a>
            <a href="#commercial" class="rounded-xl px-4 py-2 hover:bg-slate-800 transition">التجاري</a>
            <a href="#primary" class="rounded-xl px-4 py-2 hover:bg-slate-800 transition">الأساسي</a>
            <a href="#subscription" class="rounded-xl px-4 py-2 hover:bg-slate-800 transition">الاشتراك</a>
          </nav>

          <RouterLink
            to="/login"
            class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition"
          >
            تسجيل الدخول
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-20 px-4 py-10 sm:px-6 lg:px-8">
      <section
        id="home"
        class="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8 md:p-12"
      >
        <div class="max-w-3xl space-y-5">
          <p class="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
            عقارات مختارة من النظام
          </p>
          <h1 class="text-4xl font-bold leading-tight sm:text-5xl">
            اكتشف فرصتك العقارية القادمة بثقة.
          </h1>
          <p class="text-slate-300 sm:text-lg">
            تصفّح أحدث العقارات والعقارات المميزة. يتم نشر العقارات هنا بعد تمييزها بعلامة النجمة داخل النظام.
          </p>

          <form
            class="mt-7 grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 sm:grid-cols-[1fr_auto]"
            @submit.prevent
          >
            <input
              v-model="search"
              type="search"
              placeholder="ابحث بالنوع أو الموقع أو السعر..."
              class="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-slate-100 outline-none focus:border-blue-500"
            >
            <button
              type="submit"
              class="h-12 rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-700 transition"
            >
              بحث
            </button>
          </form>
        </div>
      </section>

      <section>
        <div class="mb-6 flex items-end justify-between">
          <div>
            <h2 class="text-2xl font-bold">أحدث العقارات</h2>
            <p class="mt-2 text-slate-400">
              عقارات منشورة حديثًا من العقارات المميزة في النظام.
            </p>
          </div>
        </div>

        <p
          v-if="!loading && !searchResults.length"
          class="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-300"
        >
          لا توجد عقارات منشورة حتى الآن. قم بتمييز العقار بنجمة في النظام ليظهر هنا.
        </p>

        <div
          v-else
          class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article
            v-for="property in searchResults"
            :key="`latest-${property.id}`"
            class="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
          >
            <img
              :src="property.image"
              :alt="property.title"
              class="h-48 w-full object-cover"
              loading="lazy"
            >
            <div class="space-y-3 p-5">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-lg font-semibold">{{ property.title }}</h3>
                <span class="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">{{ property.use }}</span>
              </div>
              <p class="text-sm text-slate-300 line-clamp-2">{{ property.description }}</p>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <span class="text-slate-400">📍 {{ property.location }}</span>
                <span class="text-slate-400">📐 {{ property.area }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="font-semibold text-blue-300">{{ property.price }}</span>
                <span class="text-xs text-slate-400">{{ property.date }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="primary" class="space-y-6">
        <h2 class="text-2xl font-bold">العقارات المميزة</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="property in (primaryProperties.length ? primaryProperties : latestProperties).slice(0, 3)"
            :key="`featured-${property.id}`"
            class="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p class="text-sm text-blue-300">{{ property.title }}</p>
            <h3 class="mt-1 text-lg font-semibold">{{ property.price }}</h3>
            <p class="mt-2 line-clamp-2 text-slate-300">{{ property.description }}</p>
          </div>
        </div>
      </section>

      <section class="space-y-6">
        <h2 class="text-2xl font-bold">عقارات مقترحة</h2>
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="property in mostSeemingProperties"
            :key="`seeming-${property.id}`"
            class="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <h3 class="text-lg font-semibold">{{ property.title }} · {{ property.use }}</h3>
            <p class="mt-2 text-slate-300 line-clamp-3">{{ property.description }}</p>
            <p class="mt-3 text-sm text-slate-400">{{ property.contact }}</p>
          </div>
        </div>
      </section>

      <section id="resell" class="grid gap-4 md:grid-cols-3">
        <div class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 class="text-lg font-semibold">إعادة البيع</h3>
          <p class="mt-2 text-slate-300">{{ resellProperties.length }} فرصة منشورة</p>
        </div>
        <div id="rent" class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 class="text-lg font-semibold">الإيجار</h3>
          <p class="mt-2 text-slate-300">{{ rentProperties.length }} فرصة منشورة</p>
        </div>
        <div id="commercial" class="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 class="text-lg font-semibold">التجاري</h3>
          <p class="mt-2 text-slate-300">{{ commercialProperties.length }} فرصة منشورة</p>
        </div>
      </section>

      <section>
        <h2 class="text-2xl font-bold">أفضل الوسطاء</h2>
        <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="agent in topAgents"
            :key="`${agent.name}-${agent.phone}`"
            class="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <h3 class="text-lg font-semibold">{{ agent.name }}</h3>
            <p class="mt-2 text-slate-300">{{ agent.phone }}</p>
            <p class="mt-3 text-sm text-blue-300">{{ agent.count }} عقار مميز</p>
          </article>

          <article
            v-if="!topAgents.length"
            class="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-300 md:col-span-2 xl:col-span-4"
          >
            يظهر أفضل الوسطاء تلقائيًا عند توفر عقارات مميزة.
          </article>
        </div>
      </section>
    </main>

    <footer
      id="subscription"
      class="border-t border-slate-800 bg-slate-950"
    >
      <div class="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="rounded-2xl border border-slate-800 bg-slate-900 p-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 class="text-xl font-semibold">الاشتراك الأساسي</h2>
            <p class="mt-2 text-slate-300">
              احصل على وحدات حصرية وفرص عالية الأولوية من خلال اشتراكنا المميز.
            </p>
          </div>
          <RouterLink
            to="/login"
            class="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 transition md:mt-0"
          >
            الدخول إلى النظام
          </RouterLink>
        </div>

        <p class="mt-6 text-sm text-slate-500">
          © {{ new Date().getFullYear() }} رواد العقارية · موقع العقارات المنشورة من نظام الإدارة.
        </p>
      </div>
    </footer>
  </div>
</template>
