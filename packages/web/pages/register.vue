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
        <h2 class="mt-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Создать аккаунт</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Зарегистрируйтесь, чтобы начать монетизацию</p>
      </div>

      <div
        v-if="registered"
        data-testid="register-success"
        class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300 text-center"
      >
        На ваш email отправлена ссылка для подтверждения.
        <NuxtLink to="/login" class="block mt-2 text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
          >Перейти ко входу</NuxtLink
        >
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
        <div>
          <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >Пароль</label
          >
          <input
            v-model="password"
            type="password"
            data-testid="input-password"
            minlength="6"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            required
            placeholder="Минимум 6 символов"
          />
        </div>
        <p v-if="error" class="text-red-500 text-sm font-medium flex items-center gap-1.5">
          <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          {{ error }}
        </p>
        <label class="flex items-start gap-2.5 cursor-pointer">
          <input
            v-model="consent"
            data-testid="input-consent"
            type="checkbox"
            class="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Я ознакомлен и даю согласие на обработку моих персональных данных в соответствии с
            <NuxtLink to="/legal/privacy" target="_blank" class="text-indigo-600 dark:text-indigo-400 hover:underline"
              >Политикой конфиденциальности</NuxtLink
            >
          </span>
        </label>

        <div v-show="siteKey" id="captcha-container" class="flex justify-center min-h-[78px]" />

        <button
          type="submit"
          data-testid="btn-submit"
          :disabled="loading || !consent"
          class="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5 shadow-sm active:scale-95"
        >
          {{ loading ? 'Регистрация...' : 'Создать аккаунт' }}
        </button>
        <p class="text-sm text-slate-500 dark:text-slate-400 text-center">
          Уже есть аккаунт?
          <NuxtLink to="/login" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >Войти</NuxtLink
          >
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const email = ref('');
const password = ref('');
const consent = ref(false);
const error = ref('');
const loading = ref(false);
const registered = ref(false);
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
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email: email.value, password: password.value, consent: consent.value, captchaToken },
    });
    registered.value = true;
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    error.value = err?.data?.error || 'Ошибка регистрации';
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

useSeoHead({
  title: 'Регистрация',
  description: 'Создайте аккаунт на DonatePlatform и начните монетизацию вашего Minecraft сервера.',
  canonical: 'https://example.com/register',
});
</script>
