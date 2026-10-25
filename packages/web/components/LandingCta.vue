<script setup lang="ts">
defineProps<{ title: string; subtitle: string; btnText: string; btnLink: string; }>();
</script>

<template>
  <section style="text-align:center; margin:48px 0 24px;">
    <div class="tariff-card" style="border-color:#0099cc; margin:0 auto;">
      <h2 style="font-size:28px; font-weight:900; color:#1a1a2e; margin-bottom:10px;">{{ title }}</h2>
      <p style="color:#555577; font-size:16px; margin-bottom:25px;">{{ subtitle }}</p>
      <a :href="btnLink" class="cyber-btn" style="width:100%;">{{ btnText }}</a>
    </div>
  </section>
</template>
