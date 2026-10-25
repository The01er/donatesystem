import { inject } from 'vue';
import type { Ref } from 'vue';

export function useStaffCan() {
  const staffRole = inject<Ref<string>>('staffRole', ref(''));

  function isStaff() {
    return !!staffRole.value;
  }

  function isAdmin() {
    return ['SUPER_ADMIN', 'ADMIN'].includes(staffRole.value);
  }

  function isFinance() {
    return ['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(staffRole.value);
  }

  return { staffRole, isStaff, isAdmin, isFinance };
}
