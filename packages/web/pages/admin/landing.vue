<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'], ssr: false });
useHead({ title: 'Лендинг' });

interface RoadmapItem {
  status: 'done' | 'in_progress' | 'planned';
  text: string;
  date?: string;
  note?: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

interface TestimonialItem {
  avatar?: string;
  name: string;
  role: string;
  text: string;
}

interface FooterLink {
  text: string;
  url: string;
}

interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  bgImage?: string;
}
interface FeaturesContent {
  items: FeatureItem[];
}
interface TestimonialsContent {
  items: TestimonialItem[];
}
interface CtaContent {
  title: string;
  subtitle: string;
  btnText: string;
  btnLink: string;
}
interface FooterContent {
  copyright: string;
  links: FooterLink[];
}
interface RoadmapContent {
  title: string;
  items: RoadmapItem[];
}

type SectionContent =
  | HeroContent
  | FeaturesContent
  | TestimonialsContent
  | CtaContent
  | FooterContent
  | RoadmapContent;

const $api = useApi();
const loading = ref(true);
const saving = ref(false);
const error = ref('');
const activeTab = ref('hero');

const sections = ref<Record<string, SectionContent>>({
  hero: { title: '', subtitle: '', ctaText: '', ctaLink: '', bgImage: '' },
  features: { items: [] },
  testimonials: { items: [] },
  cta: { title: '', subtitle: '', btnText: '', btnLink: '' },
  footer: { copyright: '', links: [] },
  roadmap: { title: 'План развития', items: [] },
});

const TABS = [
  { key: 'hero', label: 'Шапка' },
  { key: 'features', label: 'Возможности' },
  { key: 'testimonials', label: 'Отзывы' },
  { key: 'cta', label: 'CTA' },
  { key: 'footer', label: 'Подвал' },
  { key: 'roadmap', label: 'Roadmap' },
];

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await $api<{ sections: Record<string, unknown> }>('/landing');
    for (const key of Object.keys(sections.value)) {
      if (data.sections[key]) {
        (sections.value as Record<string, unknown>)[key] = data.sections[key];
      }
    }
    if (!sections.value.features || !(sections.value.features as FeaturesContent).items) {
      (sections.value.features as FeaturesContent).items = [];
    }
    if (!sections.value.testimonials || !(sections.value.testimonials as TestimonialsContent).items) {
      (sections.value.testimonials as TestimonialsContent).items = [];
    }
    if (!sections.value.footer || !(sections.value.footer as FooterContent).links) {
      (sections.value.footer as FooterContent).links = [];
    }
    if (!sections.value.roadmap || !(sections.value.roadmap as RoadmapContent).items) {
      (sections.value.roadmap as RoadmapContent).items = [];
    }
  } catch {
    error.value = 'Не удалось загрузить данные лендинга';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  error.value = '';
  try {
    await $api(`/admin/landing/${activeTab.value}`, {
      method: 'PUT',
      body: { content: (sections.value as Record<string, unknown>)[activeTab.value] },
    });
  } catch {
    error.value = 'Ошибка сохранения';
  } finally {
    saving.value = false;
  }
}

async function uploadImage(file: File) {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await $api<{ url: string }>('/admin/landing/upload', { method: 'POST', body: fd });
    return res.url;
  } catch {
    error.value = 'Ошибка загрузки изображения';
    return null;
  }
}

function addFeature() {
  (sections.value.features as FeaturesContent).items.push({ icon: '⭐', title: '', desc: '' });
}

function removeFeature(idx: number) {
  (sections.value.features as FeaturesContent).items.splice(idx, 1);
}

function addTestimonial() {
  (sections.value.testimonials as TestimonialsContent).items.push({ name: '', role: '', text: '' });
}

function removeTestimonial(idx: number) {
  (sections.value.testimonials as TestimonialsContent).items.splice(idx, 1);
}

function addLink() {
  (sections.value.footer as FooterContent).links.push({ text: '', url: '' });
}

function removeLink(idx: number) {
  (sections.value.footer as FooterContent).links.splice(idx, 1);
}

function addRoadmapItem() {
  (sections.value.roadmap as RoadmapContent).items.push({ status: 'planned', text: '', date: '', note: '' });
}

function removeRoadmapItem(idx: number) {
  (sections.value.roadmap as RoadmapContent).items.splice(idx, 1);
}

async function onFileUpload(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const url = await uploadImage(input.files[0]);
  if (url) {
    (sections.value.hero as HeroContent).bgImage = url;
  }
  input.value = '';
}

async function onAvatarUpload(e: Event, idx: number) {
  const input = e.target as HTMLInputElement;
  if (!input.files?.length) return;
  const url = await uploadImage(input.files[0]);
  if (url) {
    (sections.value.testimonials as TestimonialsContent).items[idx].avatar = url;
  }
  input.value = '';
}

onMounted(load);
</script>

<template>
  <div class="px-6 lg:px-8 py-8 max-w-4xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Лендинг</h1>
    </div>

    <p v-if="error" class="mb-4 text-red-500 text-sm font-medium">{{ error }}</p>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        @click="activeTab = tab.key"
        class="px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200"
        :class="
          activeTab === tab.key
            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        "
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-12 text-slate-400">Загрузка...</div>

    <div
      v-else
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-5"
    >
      <!-- Hero -->
      <div v-if="activeTab === 'hero'" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Заголовок</label
          >
          <input
            v-model="(sections.hero as HeroContent).title"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Подзаголовок</label
          >
          <textarea
            v-model="(sections.hero as HeroContent).subtitle"
            rows="3"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Текст кнопки</label
            >
            <input
              v-model="(sections.hero as HeroContent).ctaText"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Ссылка кнопки</label
            >
            <input
              v-model="(sections.hero as HeroContent).ctaLink"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Фоновое изображение (опционально)</label
          >
          <div class="flex items-center gap-3">
            <input
              v-model="(sections.hero as HeroContent).bgImage"
              placeholder="URL /uploads/..."
              class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <label
              class="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition"
            >
              Загрузить
              <input type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onFileUpload" />
            </label>
          </div>
          <img
            v-if="(sections.hero as HeroContent).bgImage"
            :src="(sections.hero as HeroContent).bgImage"
            class="mt-2 h-24 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
          />
        </div>
      </div>

      <!-- Features -->
      <div v-if="activeTab === 'features'" class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >Элементы ({{ (sections.features as FeaturesContent).items.length }})</span
          >
          <button
            @click="addFeature"
            class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition"
          >
            + Добавить
          </button>
        </div>
        <div
          v-for="(item, idx) in (sections.features as FeaturesContent).items"
          :key="idx"
          class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400">#{{ idx + 1 }}</span>
            <button @click="removeFeature(idx)" class="text-xs text-red-500 hover:text-red-600 transition">
              Удалить
            </button>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Иконка (emoji)</label>
              <input
                v-model="item.icon"
                maxlength="5"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-slate-500 mb-1">Заголовок</label>
              <input
                v-model="item.title"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Описание</label>
            <textarea
              v-model="item.desc"
              rows="2"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Testimonials -->
      <div v-if="activeTab === 'testimonials'" class="space-y-4">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >Отзывы ({{ (sections.testimonials as TestimonialsContent).items.length }})</span
          >
          <button
            @click="addTestimonial"
            class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition"
          >
            + Добавить
          </button>
        </div>
        <div
          v-for="(item, idx) in (sections.testimonials as TestimonialsContent).items"
          :key="idx"
          class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400">#{{ idx + 1 }}</span>
            <button @click="removeTestimonial(idx)" class="text-xs text-red-500 hover:text-red-600 transition">
              Удалить
            </button>
          </div>
          <div class="flex items-center gap-3">
            <div
              class="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400"
            >
              <img v-if="item.avatar" :src="item.avatar" loading="lazy" class="w-full h-full object-cover" />
              <span v-else>?</span>
            </div>
            <label
              class="cursor-pointer bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-slate-300 transition"
            >
              {{ item.avatar ? 'Сменить' : 'Загрузить' }} аватар
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden"
                @change="(e) => onAvatarUpload(e, idx)"
              />
            </label>
            <input
              v-model="item.avatar"
              placeholder="или URL"
              class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 outline-none"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Имя</label>
              <input
                v-model="item.name"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Роль</label>
              <input
                v-model="item.role"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Текст отзыва</label>
            <textarea
              v-model="item.text"
              rows="3"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div v-if="activeTab === 'cta'" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Заголовок</label
          >
          <input
            v-model="(sections.cta as CtaContent).title"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Подзаголовок</label
          >
          <textarea
            v-model="(sections.cta as CtaContent).subtitle"
            rows="2"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Текст кнопки</label
            >
            <input
              v-model="(sections.cta as CtaContent).btnText"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Ссылка кнопки</label
            >
            <input
              v-model="(sections.cta as CtaContent).btnLink"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="activeTab === 'footer'" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Копирайт</label
          >
          <input
            v-model="(sections.footer as FooterContent).copyright"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
              >Ссылки</span
            >
            <button
              @click="addLink"
              class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition"
            >
              + Добавить
            </button>
          </div>
          <div
            v-for="(link, idx) in (sections.footer as FooterContent).links"
            :key="idx"
            class="flex items-center gap-2 mb-2"
          >
            <input
              v-model="link.text"
              placeholder="Текст"
              class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
            />
            <input
              v-model="link.url"
              placeholder="URL"
              class="flex-[2] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
            />
            <button @click="removeLink(idx)" class="text-red-500 hover:text-red-600 text-xs shrink-0">Уд.</button>
          </div>
        </div>
      </div>

      <!-- Roadmap -->
      <div v-if="activeTab === 'roadmap'" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Заголовок секции</label
          >
          <input
            v-model="(sections.roadmap as RoadmapContent).title"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
            >Пункты ({{ (sections.roadmap as RoadmapContent).items.length }})</span
          >
          <button
            @click="addRoadmapItem"
            class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition"
          >
            + Добавить
          </button>
        </div>
        <div
          v-for="(item, idx) in (sections.roadmap as RoadmapContent).items"
          :key="idx"
          class="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-400">#{{ idx + 1 }}</span>
            <button @click="removeRoadmapItem(idx)" class="text-xs text-red-500 hover:text-red-600 transition">
              Удалить
            </button>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Статус</label>
              <select
                v-model="item.status"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
              >
                <option value="done">Готово</option>
                <option value="in_progress">В работе</option>
                <option value="planned">В планах</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="block text-xs text-slate-500 mb-1">Текст</label>
              <input
                v-model="item.text"
                class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Дата (опционально)</label>
            <input
              v-model="item.date"
              placeholder="Июнь 2026"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-1">Заметка (опционально)</label>
            <input
              v-model="item.note"
              placeholder="Скоро вы сможете..."
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm focus:border-indigo-500 outline-none"
            />
            <p class="text-xs text-slate-400 mt-1">Показывается курсивом под описанием. Удобно для анонсов.</p>
          </div>
        </div>
      </div>

      <!-- Save button -->
      <div class="pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          @click="save"
          :disabled="saving"
          class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 shadow-sm transition-all duration-200 hover:-translate-y-0.5"
        >
          {{ saving ? 'Сохранение...' : 'Сохранить секцию' }}
        </button>
      </div>
    </div>
  </div>
</template>
