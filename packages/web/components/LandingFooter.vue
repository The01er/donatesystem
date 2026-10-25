<script setup lang="ts">
interface FooterLink { text: string; url: string; }
defineProps<{
  copyright: string;
  links: FooterLink[];
  email?: string | null;
  phone?: string | null;
  inn?: string | null;
  address?: string | null;
  name?: string | null;
}>();
const auth = useAuthStore();
onMounted(() => {
  if (!auth.user && !auth.loading) auth.initialize();
});
</script>

<template>
  <footer class="mt-12 pt-6 flex flex-wrap justify-between items-center gap-4 text-sm" style="border-top:2px solid rgba(212,59,212,0.1); color:#777799;">
    <span>© 2026 <a href="/" class="neon-pink font-bold" style="text-decoration:none;">{{ name || 'DonatePlatform' }}</a></span>
    <div>
      <a v-for="(link, idx) in links" :key="idx" :href="link.url" style="color:#8888aa; text-decoration:none; margin:0 8px;">{{ link.text }}</a>
      <a href="/guides" style="color:#8888aa; text-decoration:none; margin:0 8px;">Гайды</a>
      <a href="/legal/privacy" style="color:#8888aa; text-decoration:none; margin:0 8px;">Политика</a>
      <a href="/legal/terms" style="color:#8888aa; text-decoration:none; margin:0 8px;">Соглашение</a>
      <a href="/legal/offer" style="color:#8888aa; text-decoration:none; margin:0 8px;">Оферта</a>
      <ClientOnly fallback-tag="span">
        <template v-if="auth.user">
          <NuxtLink to="/dashboard" style="color:#8888aa; text-decoration:none; margin:0 8px;">Панель управления</NuxtLink>
        </template>
        <template v-else>
          <a href="/login" style="color:#8888aa; text-decoration:none; margin:0 8px;">Войти</a>
          <a href="/register" style="color:#8888aa; text-decoration:none; margin:0 8px;">Регистрация</a>
        </template>
      </ClientOnly>
    </div>
  </footer>
</template>
