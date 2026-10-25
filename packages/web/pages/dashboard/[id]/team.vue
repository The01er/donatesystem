<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wider">Участники команды</h2>
      <button
        @click="showInvite = true"
        class="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
      >
        + Пригласить участника
      </button>
    </div>

    <!-- Members table -->
    <div
      class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm"
    >
      <div v-if="members.length === 0" class="text-slate-400 dark:text-slate-500 text-sm text-center py-12">
        В команде пока нет участников. Пригласите кого-нибудь для совместного управления сервером.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead
            class="text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700/60 uppercase tracking-wider text-xs bg-slate-50 dark:bg-slate-900/50"
          >
            <tr>
              <th class="text-left py-3 px-4 font-semibold">Email</th>
              <th class="text-left py-3 px-4 font-semibold">Роль</th>
              <th class="text-left py-3 px-4 font-semibold">Присоединился</th>
              <th class="text-right py-3 px-4 font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in members"
              :key="m.id"
              class="border-b border-slate-100 dark:border-slate-700/40 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <td class="py-3 px-4 font-bold text-slate-900 dark:text-white">
                <div class="flex items-center gap-2">
                  <span>{{ m.user.email }}</span>
                  <span
                    v-if="m.role === 'owner'"
                    class="text-[10px] font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-600 dark:bg-slate-750 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-slate-700"
                  >
                    вы
                  </span>
                </div>
              </td>
              <td class="py-3 px-4">
                <select
                  v-if="m.role !== 'owner'"
                  :value="m.role"
                  @change="(e) => updateRole(m.id, (e.target as HTMLSelectElement).value)"
                  class="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-950 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="admin">Администратор</option>
                  <option value="moderator">Модератор</option>
                </select>
                <span
                  v-else
                  class="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900"
                  >Владелец</span
                >
              </td>
              <td class="py-3 px-4 text-slate-400 dark:text-slate-500 font-medium tabular-nums">
                {{ fmtDate(m.joinedAt) }}
              </td>
              <td class="py-3 px-4 text-right">
                <button
                  v-if="m.role !== 'owner'"
                  @click="removeMember(m.id)"
                  class="text-red-500 hover:text-red-650 font-semibold text-xs transition"
                >
                  Удалить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Invite modal -->
    <div
      v-if="showInvite"
      class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="showInvite = false"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-100 dark:border-slate-700"
      >
        <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Пригласить участника</h2>
        <form @submit.prevent="submitInvite" class="space-y-4">
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Электронная почта</label
            >
            <input
              v-model="inviteEmail"
              type="email"
              placeholder="member@example.com"
              required
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            />
          </div>
          <div>
            <label
              class="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5"
              >Роль</label
            >
            <select
              v-model="inviteRole"
              class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-slate-950 dark:text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
            >
              <option value="admin">Администратор — управление товарами, заказами, доменом</option>
              <option value="moderator">Модератор — просмотр и управление заказами</option>
            </select>
          </div>
          <p v-if="inviteError" class="text-red-500 text-sm font-medium flex items-center gap-1.5">
            <svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ inviteError }}
          </p>
          <div class="flex gap-3">
            <button
              type="submit"
              class="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-500 shadow-sm transition hover:-translate-y-0.5 duration-200"
            >
              Пригласить
            </button>
            <button
              type="button"
              @click="showInvite = false"
              class="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 py-2.5 rounded-lg text-sm transition hover:-translate-y-0.5 duration-200"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fmtDate } from '~/utils/format';
useHead({ title: 'Команда' });
const route = useRoute();
const serverId = route.params.id as string;
const { members, error, loadMembers, addMember, updateRole, removeMember } = useTeam(serverId);

const showInvite = ref(false);
const inviteEmail = ref('');
const inviteRole = ref('admin');
const inviteError = ref('');

async function submitInvite() {
  inviteError.value = '';
  const ok = await addMember(inviteEmail.value, inviteRole.value);
  if (ok) {
    showInvite.value = false;
    inviteEmail.value = '';
    inviteRole.value = 'admin';
  } else {
    inviteError.value = error.value;
  }
}

onMounted(loadMembers);
</script>
