<script setup lang="ts">
interface TestimonialItem { avatar?: string; name: string; role: string; text: string; }
defineProps<{ items: TestimonialItem[] }>();
</script>

<template>
  <section v-if="items.length > 0">
    <h2 class="text-2xl md:text-4xl font-extrabold text-center mt-16 mb-8">
      <span class="neon-gold">Отзывы</span>
    </h2>
    <p style="text-align:center; color:#777799; font-size:15px; margin-bottom:30px;">Что говорят владельцы серверов</p>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="(item, idx) in items" :key="idx" class="cyber-card" style="text-align:left;">
        <div class="scan-line"></div>
        <p style="font-size:14px; color:#555577; line-height:1.6; margin-bottom:20px; font-style:italic;">"{{ item.text }}"</p>
        <div style="display:flex; align-items:center; gap:12px;">
          <div style="width:40px; height:40px; border-radius:50%; background:rgba(200,50,200,0.1); overflow:hidden; flex-shrink:0;">
            <img v-if="item.avatar" :src="item.avatar" alt="" width="40" height="40" loading="lazy" style="width:100%; height:100%; object-fit:cover;" />
          </div>
          <div>
            <p style="font-size:14px; font-weight:700; color:#1a1a2e;">{{ item.name }}</p>
            <p style="font-size:12px; color:#777799;">{{ item.role }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
