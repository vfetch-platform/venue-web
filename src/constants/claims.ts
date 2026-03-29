import { ClaimStatus, PaymentStatus } from '@/types';

export const CLAIM_STATUSES: ClaimStatus[] = [
  'pending',
  'approved',
  'collected',
  'rejected',
  'expired',
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'completed',
  'failed',
  'refunded',
];
