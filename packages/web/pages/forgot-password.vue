<template>
  <div
    class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center py-12 px-6 transition-colors duration-200"
  >
    <div
      class="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-8 space-y-6"
    >
      <div class="text-center">
        <NuxtLink to="/" class="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          <span v-if="brandName">{{ brandName }}</span>
          <span v-else>Donate<span class="text-slate-900 dark:text-white">Platform</span></span>
        </NuxtLink>
        <h2 class="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Восстановление пароля</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Мы отправим ссылку для сброса на ваш email</p>
      </div>

      <div
        v-if="sent"
        class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300"
      >
        Если аккаунт существует, на email отправлена ссылка для сброса пароля.
      </div>

      <form v-else @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Электронная почта</label
          >
          <input
            v-model="email"
            type="email"
            data-testid="input-email"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
            placeholder="name@example.com"
          />
        </div>
        <p v-if="error" class="text-red-500 text-sm font-medium">{{ error }}</p>

        <div v-show="siteKey" id="captcha-container" class="flex justify-center min-h-[78px]" />

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:scale-95"
        >
          {{ loading ? 'Отправка...' : 'Отправить ссылку' }}
        </button>
        <p class="text-sm text-slate-500 dark:text-slate-400 text-center">
          <NuxtLink to="/login" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >Вернуться ко входу</NuxtLink
          >
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const email = ref('');
const error = ref('');
const loading = ref(false);
const sent = ref(false);
const siteKey = ref('');
const brandName = ref('');
const captchaWidgetId = ref<string | null>(null);
const turnstileReady = ref(false);

async function submit() {
  loading.value = true;
  error.value = '';
  let captchaToken: string | undefined;
  if (siteKey.value && typeof window !== 'undefined' && window.turnstile) {
    captchaToken = window.turnstile.getResponse(captchaWidgetId.value ?? '');
    if (!captchaToken) {
      error.value = 'Пожалуйста, пройдите капчу';
      loading.value = false;
      return;
    }
  }
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value, captchaToken },
    });
    sent.value = true;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Ошибка отправки';
  } finally {
    loading.value = false;
  }
}

async function loadCaptcha() {
  try {
    const cfg = await $fetch<{ siteKey: string | null; brandName?: string | null }>('/api/auth/public-config');
    if (cfg.brandName) brandName.value = cfg.brandName;
    if (!cfg.siteKey) return;
    siteKey.value = cfg.siteKey;
    await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstile');
  } catch {
  }
}

function onloadTurnstile() {
  turnstileReady.value = true;
}

watch([siteKey, turnstileReady], () => {
  if (siteKey.value && turnstileReady.value && typeof window !== 'undefined' && window.turnstile) {
    const el = document.getElementById('captcha-container');
    if (el) {
      const id = window.turnstile.render(el, { sitekey: siteKey.value });
      captchaWidgetId.value = id;
    }
  }
});

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

onMounted(() => {
  if (!auth.user && !auth.loading) {
    auth.initialize().then(() => {
      if (auth.user) navigateTo('/dashboard');
    });
  } else if (auth.user) {
    navigateTo('/dashboard');
  }
  (window as unknown as Record<string, unknown>).onloadTurnstile = onloadTurnstile;
  loadCaptcha();
});

definePageMeta({ layout: 'default' });

useSeoHead({ title: 'Восстановление пароля', description: 'Восстановите доступ к аккаунту DonatePlatform. Мы отправим ссылку для сброса пароля на вашу электронную почту.', canonical: 'https://example.com/forgot-password' });
</script>
