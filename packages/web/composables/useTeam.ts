import type { ServerMember } from '~/types';

export function useTeam(serverId: string) {
  const $api = useApi();
  const members = ref<ServerMember[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function loadMembers() {
    try {
      members.value = await $api<ServerMember[]>(`/servers/${serverId}/members`);
    } catch (e: unknown) {
      console.error(e);
    }
  }

  async function addMember(email: string, role: string) {
    error.value = '';
    try {
      await $api(`/servers/${serverId}/members`, {
        method: 'POST',
        body: { email, role },
      });
      await loadMembers();
      return true;
    } catch (e: unknown) {
      const err = e as { data?: { error?: string }; message?: string };
      error.value = err?.data?.error || 'Failed to add member';
      return false;
    }
  }

  async function updateRole(memberId: string, role: string) {
    await $api(`/servers/${serverId}/members/${memberId}`, {
      method: 'PUT',
      body: { role },
    });
    await loadMembers();
  }

  async function removeMember(memberId: string) {
    await $api(`/servers/${serverId}/members/${memberId}`, {
      method: 'DELETE',
    });
    await loadMembers();
  }

  return { members, loading, error, loadMembers, addMember, updateRole, removeMember };
}
