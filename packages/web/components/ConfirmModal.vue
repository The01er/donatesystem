<template>
  <Teleport to="body">
    <div
      v-if="visible"
      data-testid="modal-confirm"
      class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      @click.self="onNo"
    >
      <div class="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 data-testid="modal-title" class="text-lg font-bold text-slate-900 dark:text-white mb-2">{{ title }}</h3>
        <p data-testid="modal-message" class="text-sm text-slate-600 dark:text-slate-400 mb-6">{{ message }}</p>
        <div class="flex gap-3">
          <button
            data-testid="btn-confirm-yes"
            @click="onYes"
            class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5"
            :style="{ backgroundColor: confirmColor }"
          >
            {{ confirmText }}
          </button>
          <button
            data-testid="btn-confirm-no"
            @click="onNo"
            class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 hover:-translate-y-0.5"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const visible = ref(false);
const title = ref('Подтверждение');
const message = ref('Вы уверены?');
const confirmText = ref('Да');
const confirmColor = ref('#6366f1');
let resolveFn: ((value: boolean) => void) | null = null;

function show(opts: {
  title?: string;
  message?: string;
  confirmText?: string;
  confirmColor?: string;
}): Promise<boolean> {
  title.value = opts.title || 'Подтверждение';
  message.value = opts.message || 'Вы уверены?';
  confirmText.value = opts.confirmText || 'Да';
  confirmColor.value = opts.confirmColor || '#6366f1';
  visible.value = true;
  return new Promise((resolve) => {
    resolveFn = resolve;
  });
}

function onYes() {
  visible.value = false;
  resolveFn?.(true);
  resolveFn = null;
}

function onNo() {
  visible.value = false;
  resolveFn?.(false);
  resolveFn = null;
}

defineExpose({ show });
</script>
