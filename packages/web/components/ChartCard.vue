<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts';
import type { ApexOptions } from 'apexcharts';

const props = defineProps<{
  title: string;
  type: 'area' | 'bar' | 'donut';
  series: ApexOptions['series'];
  categories?: string[];
  colors?: string[];
}>();

const isDark = ref(false);

function checkTheme() {
  if (!import.meta.client) return;
  isDark.value = document.documentElement.classList.contains('dark');
}

let observer: MutationObserver | null = null;

onMounted(() => {
  checkTheme();
  if (import.meta.client) {
    observer = new MutationObserver(() => checkTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
});

onUnmounted(() => {
  observer?.disconnect();
});

const chartOptions = computed<ApexOptions>(() => {
  const textColor = isDark.value ? '#94a3b8' : '#64748b';
  const gridColor = isDark.value ? '#334155' : '#e2e8f0';
  const tooltipTheme = isDark.value ? 'dark' : 'light';

  const base: ApexOptions = {
    chart: {
      type: props.type,
      toolbar: { show: false },
      foreColor: textColor,
      background: 'transparent',
      sparkline: { enabled: props.type !== 'donut' },
    },
    tooltip: { theme: tooltipTheme },
    colors: props.colors,
    dataLabels: { enabled: false },
    grid: { borderColor: gridColor },
    stroke: { curve: 'smooth', width: 2 },
  };

  if (props.type === 'donut') {
    return {
      ...base,
      chart: { ...base.chart, sparkline: { enabled: false } },
      labels: props.categories,
      legend: {
        position: 'bottom',
        labels: { colors: textColor },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { width: '100%' },
            legend: { position: 'bottom' },
          },
        },
      ],
    } as ApexOptions;
  }

  return {
    ...base,
    xaxis: {
      categories: props.categories,
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { show: false },
  } as ApexOptions;
});
</script>

<template>
  <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
    <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
      {{ title }}
    </div>
    <ClientOnly>
      <VueApexCharts v-if="series" :type="type" height="180" :options="chartOptions" :series="series" />
      <template #fallback>
        <div class="h-[180px] flex items-center justify-center text-xs text-slate-400">Загрузка...</div>
      </template>
    </ClientOnly>
  </div>
</template>
