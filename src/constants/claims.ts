import { ClaimStatus, PaymentStatus } from '@/types';

export const CLAIM_STATUSES: ClaimStatus[] = [
  'pending',
  'approved',
  'rejected',
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'not_required',
  'awaiting_payment',
  'paid',
  'refunded',
];

