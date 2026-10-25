<template>
  <div
    class="px-6 lg:px-8 py-8 max-w-6xl mx-auto text-slate-900 dark:text-slate-100 transition-colors duration-200"
    v-if="user"
  >
    <NuxtLink
      to="/admin/users"
      class="text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 mb-6 flex items-center gap-1.5 transition"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Назад к списку
    </NuxtLink>

    <p v-if="loadError" class="mb-4 text-red-500 text-sm font-medium">{{ loadError }}</p>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="space-y-6">
        <div
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h2 class="text-xl font-bold text-slate-900 dark:text-white truncate mb-1" :title="user.email">
              {{ user.email }}
            </h2>
            <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Регистрация {{ fmtDate(user.createdAt) }}
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                :class="
                  user.bannedAt
                    ? 'bg-red-50 text-red-655 border border-red-150 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-150 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
                "
                class="px-2.5 py-1 rounded-full text-xs font-bold"
              >
                {{ user.bannedAt ? `Забанен: ${user.banReason}` : 'Активен' }}
              </span>
              <span
                v-if="user.platformStaff?.isActive"
                class="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-150 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
              >
                {{ user.platformStaff.role }}
              </span>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700/60">
            <template v-if="isAdmin()">
              <button
                v-if="!user.bannedAt"
                @click="showBan = true"
                class="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-red-500 transition"
              >
                Забанить
              </button>
              <button
                v-else
                @click="unban"
                class="bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-500 transition"
              >
                Разбанить
              </button>
            </template>

            <template v-if="staffRole && staffRole === 'SUPER_ADMIN'">
              <button
                v-if="!user.platformStaff?.isActive"
                @click="showStaff = true"
                class="bg-indigo-650 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition"
              >
                Назначить роль
              </button>
              <button
                v-else
                @click="removeStaff"
                class="bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-amber-500 transition"
              >
                Снять роль
              </button>
            </template>
          </div>
        </div>

        <!-- Balance card -->
        <div
          class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
        >
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Баланс пользователя
            </h3>
            <button
              v-if="isAdmin()"
              @click="showDeposit = true"
              class="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-500 transition"
            >
              + Пополнить
            </button>
          </div>
          <div class="text-2xl font-bold tabular-nums text-emerald-500 dark:text-emerald-400">
            ₽{{ Number(user.balance ?? 0).toFixed(2) }}
          </div>
        </div>
      </div>

      <div
        class="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm"
      >
        <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
          Серверы пользователя ({{ user.servers?.length ?? 0 }})
        </h3>
        <div v-if="!user.servers?.length" class="text-slate-400 dark:text-slate-500 text-sm py-4">Нет серверов</div>
        <div v-else class="space-y-1">
          <div
            v-for="s in user.servers"
            :key="s.id"
            class="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 px-3 rounded-xl transition"
          >
            <div>
              <NuxtLink
                :to="`/admin/servers/${s.id}`"
                class="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-bold"
                >{{ s.name }}</NuxtLink
              >
              <span class="text-xs text-slate-400 dark:text-slate-500 ml-2 font-mono">{{ s.slug }}</span>
            </div>
            <span class="text-xs text-slate-400 dark:text-slate-500 font-medium tabular-nums">{{
              fmtDate(s.createdAt)
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
      <h3 class="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
        Последние заказы в магазинах
      </h3>
      <div v-if="!user.recentOrders?.length" class="text-slate-400 dark:text-slate-500 text-sm text-center py-8">
        Нет заказов
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs"
            >
              <th class="text-left py-3 font-semibold">Игрок</th>
              <th class="text-left py-3 font-semibold">Товар</th>
              <th class="text-left py-3 font-semibold">Магазин</th>
              <th class="text-right py-3 font-semibold">Сумма</th>
              <th class="text-right py-3 font-semibold">Дата</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="o in user.recentOrders"
              :key="o.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3 font-bold text-slate-900 dark:text-white">{{ o.playerName }}</td>
              <td class="py-3 text-slate-600 dark:text-slate-300">{{ o.product?.name }}</td>
              <td class="py-3 text-slate-600 dark:text-slate-300">{{ o.server?.name }}</td>
              <td class="py-3 text-right text-emerald-500 dark:text-emerald-400 font-bold tabular-nums">
                ₽{{ o.totalAmount?.toFixed(2) ?? '—' }}
              </td>
              <td class="py-3 text-right text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                {{ fmtDate(o.createdAt) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="showBan"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showBan = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Блокировка {{ user.email }}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Укажите причину для бана пользователя.</p>
        <div class="space-y-4">
          <input
            v-model="banReason"
            placeholder="Причина"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          />
          <div class="flex gap-3">
            <button
              @click="submitBan"
              class="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-500 shadow-sm transition"
            >
              Забанить
            </button>
            <button
              @click="showBan = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <p v-if="banError" class="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{{ banError }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="showStaff"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showStaff = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Роль на платформе</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Выберите системную роль для административного доступа.
        </p>
        <div class="space-y-4">
          <select
            v-model="newRole"
            class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
          >
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPPORT">SUPPORT</option>
            <option value="FINANCE">FINANCE</option>
          </select>
          <div class="flex gap-3">
            <button
              @click="submitStaff"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 shadow-sm transition"
            >
              Сохранить
            </button>
            <button
              @click="showStaff = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <p v-if="staffError" class="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{{ staffError }}</p>
        </div>
      </div>
    </div>

    <div
      v-if="showDeposit"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showDeposit = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Пополнение баланса</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Текущий баланс: <strong class="text-emerald-500">₽{{ Number(user?.balance ?? 0).toFixed(2) }}</strong>
        </p>
        <form @submit.prevent="submitDeposit" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Сумма (₽)</label>
            <input
              v-model="depositAmount"
              type="number"
              min="1"
              max="10000"
              step="0.01"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Причина</label>
            <input
              v-model="depositReason"
              placeholder="Например: оплата подписки"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>
          <div class="flex gap-3">
            <button
              type="submit"
              :disabled="depositing"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 disabled:opacity-50 shadow-sm transition"
            >
              {{ depositing ? 'Пополнение...' : 'Пополнить' }}
            </button>
            <button
              type="button"
              @click="showDeposit = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition"
            >
              Отмена
            </button>
          </div>
          <p v-if="depositError" class="text-sm text-red-600 dark:text-red-400 mt-2 font-medium">{{ depositError }}</p>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtDate } from '~/utils/format';
import { useStaffCan } from '~/composables/useStaffCan';
import type { AdminUser } from '~/types/admin';
definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
useHead({ title: 'Пользователь' });

const route = useRoute();
const $admin = useAdmin();
const { isAdmin, staffRole } = useStaffCan();
const user = ref<AdminUser | null>(null);
const showBan = ref(false);
const showDeposit = ref(false);
const depositAmount = ref(100);
const depositReason = ref('');
const depositing = ref(false);
const depositError = ref('');
const showStaff = ref(false);
const banReason = ref('');
const newRole = ref('SUPPORT');
const loadError = ref('');
const banError = ref('');
const staffError = ref('');

async function load() {
  loadError.value = '';
  try {
    user.value = await $admin<AdminUser>(`/users/${route.params.id}`);
  } catch (e: unknown) {
    loadError.value = 'Ошибка загрузки данных пользователя';
    console.error(e);
  }
}

async function submitBan() {
  try {
    await $admin(`/users/${route.params.id}/ban`, { method: 'POST', body: { banReason: banReason.value || 'Banned' } });
    showBan.value = false;
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    banError.value = err?.data?.error || 'Ошибка';
  }
}

async function unban() {
  try {
    await $admin(`/users/${route.params.id}/unban`, { method: 'POST' });
    load();
  } catch (e: unknown) {
    console.error(e);
  }
}

async function submitStaff() {
  try {
    await $admin(`/users/${route.params.id}/staff`, { method: 'POST', body: { role: newRole.value } });
    showStaff.value = false;
    load();
  } catch (e: unknown) {
    const err = e as { data?: { error?: string }; message?: string };
    staffError.value = err?.data?.error || 'Ошибка';
  }
}

async function removeStaff() {
  if (!confirm('Remove staff role?')) return;
  try {
    await $admin(`/users/${route.params.id}/staff`, { method: 'DELETE' });
    load();
  } catch (e: unknown) {
    console.error(e);
  }
}

async function submitDeposit() {
  depositing.value = true;
  depositError.value = '';
  try {
    const res = await $admin<{ balance: number }>('/user/balance/deposit', {
      method: 'POST',
      body: { userId: route.params.id, amount: depositAmount.value, reason: depositReason.value },
    });
    if (user.value) {
      user.value.balance = res.balance;
    }
    showDeposit.value = false;
    depositAmount.value = 100;
    depositReason.value = '';
  } catch (e: unknown) {
    const err = e as { data?: { error?: string | { fieldErrors?: Record<string, string[]> } }; message?: string };
    if (typeof err?.data?.error === 'string') {
      depositError.value = err.data.error;
    } else {
      depositError.value = 'Ошибка пополнения';
    }
  } finally {
    depositing.value = false;
  }
}

onMounted(load);
</script>
