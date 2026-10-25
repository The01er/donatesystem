export const RevokeStatus = {
  PENDING: 'pending',
  REVOKED: 'revoked',
  FAILED: 'failed',
} as const;

export type RevokeStatusType = (typeof RevokeStatus)[keyof typeof RevokeStatus];
