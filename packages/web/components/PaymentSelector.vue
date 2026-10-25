<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    @click.self="cancel"
  >
    <div
      class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
    >
      <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-1">{{ title }}</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">{{ description }}</p>
      <div class="space-y-2">
        <button
          v-for="m in methods"
          :key="m.provider"
          @click="select(m.provider)"
          :disabled="loading"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition text-left disabled:opacity-50"
        >
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0" :class="providerBadge(m.provider)">
            {{ providerInitial(m.provider) }}
          </div>
          <div>
            <div class="text-sm font-semibold text-slate-900 dark:text-white">{{ m.label }}</div>
            <div class="text-xs text-slate-400">{{ providerDesc(m.provider) }}</div>
          </div>
        </button>
      </div>
      <button
        @click="cancel"
        class="w-full mt-3 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-2 transition"
      >
        Отмена
      </button>
      <p v-if="error" class="text-sm text-red-500 mt-2 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PaymentMethod {
  provider: string;
  label: string;
}

const props = defineProps<{
  visible: boolean;
  title: string;
  description: string;
  methods: PaymentMethod[];
  loading?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  select: [provider: string];
  cancel: [];
}>();

function select(provider: string) {
  emit('select', provider);
}

function cancel() {
  emit('cancel');
}

const PROVIDER_BADGES: Record<string, string> = {
  mock: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  yookassa: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  anypay: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  enot: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  yoomoney: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const PROVIDER_INITIALS: Record<string, string> = {
  mock: 'T',
  yookassa: 'ЮК',
  anypay: 'AP',
  enot: 'EN',
  yoomoney: 'ЮМ',
};

const PROVIDER_DESCS: Record<string, string> = {
  mock: 'Без реального списания',
  yookassa: 'Банковские карты, СБП',
  anypay: 'Карты, криптовалюты',
  enot: 'Карты, криптовалюты',
  yoomoney: 'Кошелёк ЮMoney, банковские карты',
};

function providerBadge(p: string): string {
  return PROVIDER_BADGES[p] || 'bg-slate-100 text-slate-600';
}

function providerInitial(p: string): string {
  return PROVIDER_INITIALS[p] || '?';
}

function providerDesc(p: string): string {
  return PROVIDER_DESCS[p] || '';
}
</script>
