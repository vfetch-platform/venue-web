import { ClaimStatus, PaymentStatus, WorkflowState } from '@/types';

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

export const WORKFLOW_STATES: WorkflowState[] = [
  'pending_review',
  'pending_cancelled',
  'approved_awaiting_payment',
  'approved_ready_for_pickup',
  'approved_courier_arranged',
  'approved_collected',
  'approved_cancelled',
  'approved_expired',
  'rejected',
];

/** Human-readable labels for workflow states. */
export const WORKFLOW_STATE_LABELS: Record<WorkflowState, string> = {
  pending_review: 'Pending Review',
  pending_cancelled: 'Cancelled (Pending)',
  approved_awaiting_payment: 'Awaiting Payment',
  approved_ready_for_pickup: 'Ready for Pickup',
  approved_courier_arranged: 'Courier Arranged',
  approved_collected: 'Collected',
  approved_cancelled: 'Cancelled',
  approved_expired: 'Expired',
  rejected: 'Rejected',
};

/** Map legacy payment status values to new ones for display. */
export function normalizePaymentStatus(status: PaymentStatus): PaymentStatus {
  if (status === 'pending') return 'awaiting_payment';
  if (status === 'completed') return 'paid';
  if (status === 'failed') return 'not_required'; // failed payments are retried
  return status;
}
