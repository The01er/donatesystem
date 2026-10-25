<script setup lang="ts">
defineProps<{
  subscriptionPrice: number;
  currency: string;
  operatingMode: string;
}>();
</script>

<template>
  <section id="pricing">
    <h2 class="text-2xl md:text-4xl font-extrabold text-center mt-16 mb-8">
      <span class="neon-gold">Тарифы</span>
    </h2>

    <div class="flex justify-center">
      <div class="tariff-card">
        <span class="tariff-badge">★ Популярный</span>
        <h3>Подписка</h3>
        <div class="price" v-if="subscriptionPrice > 0">{{ subscriptionPrice }} ₽ <small>/мес</small></div>
        <div class="price" v-else>Бесплатно</div>
        <ul>
          <li>0% комиссии с донатов</li>
          <li>Все деньги сразу на кошелёк</li>
          <li>Приоритетная поддержка</li>
          <li>Собственная платёжная система</li>
        </ul>
        <a href="/register" class="cyber-btn w-full text-center block" style="width:100%;">Выбрать тариф</a>
      </div>
    </div>
  </section>
</template>
