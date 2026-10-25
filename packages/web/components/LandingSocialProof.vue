<script setup lang="ts">
const props = defineProps<{
  serverCount: number;
  featuredShops: { id: string; name: string; slug: string; logoUrl?: string | null; gameType: string; customDomain?: string | null; }[];
  platformDomain: string;
}>();
function shopUrl(shop: { slug: string; customDomain?: string | null }): string {
  if (shop.customDomain) return `https://${shop.customDomain}`;
  return `https://${shop.slug}.${props.platformDomain}`;
}
</script>

<template>
  <section>
    <div style="text-align:center; margin:40px 0 20px;">
      <div class="text-5xl font-extrabold neon-cyan mb-2">
        {{ serverCount.toLocaleString() }}
      </div>
      <p style="color:#777799; font-size:15px; font-weight:500;">активных магазинов</p>
    </div>
    <div v-if="featuredShops.length > 0">
      <p style="text-align:center; font-size:14px; color:#777799; margin-bottom:20px;">Некоторые из них</p>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <a
          v-for="shop in featuredShops"
          :key="shop.id"
          :href="shopUrl(shop)"
          target="_blank"
          class="cyber-card" style="padding:15px 10px; text-decoration:none;"
        >
          <div style="width:50px; height:50px; border-radius:50%; margin:0 auto 8px; background:rgba(200,50,200,0.1); overflow:hidden; display:flex; align-items:center; justify-content:center;">
            <img v-if="shop.logoUrl" :src="shop.logoUrl" :alt="`Логотип ${shop.name}`" width="50" height="50" loading="lazy" style="width:100%; height:100%; object-fit:cover;" />
            <span v-else style="color:#d43bd4; font-weight:800; font-size:18px;">{{ shop.name.charAt(0) }}</span>
          </div>
          <h3 style="font-size:14px; margin:0;">{{ shop.name }}</h3>
        </a>
      </div>
    </div>
  </section>
</template>
