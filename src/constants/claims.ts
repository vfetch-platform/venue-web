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

export interface WorkflowStateConfig {
  state: WorkflowState | 'closed';
  /** workflow_states that map to this card (multiple for "Closed") */
  matches: WorkflowState[];
  label: string;
  description: string;
  /** Tailwind classes for the filter card accent colour */
  cardAccent: string;
  /** Tailwind classes for the inline tag */
  tagClasses: string;
}

export const WORKFLOW_STATE_CONFIGS: WorkflowStateConfig[] = [
  {
    state: 'pending_review',
    matches: ['pending_review'],
    label: 'Needs Review',
    description: 'Awaiting your decision',
    cardAccent: 'text-yellow-600 border-yellow-300',
    tagClasses: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  },
  {
    state: 'approved_awaiting_payment',
    matches: ['approved_awaiting_payment'],
    label: 'Awaiting Payment',
    description: 'Customer needs to pay',
    cardAccent: 'text-amber-600 border-amber-300',
    tagClasses: 'bg-amber-100 text-amber-800 border border-amber-300',
  },
  {
    state: 'approved_ready_for_pickup',
    matches: ['approved_ready_for_pickup'],
    label: 'Ready for Pickup',
    description: 'Customer can collect',
    cardAccent: 'text-blue-600 border-blue-300',
    tagClasses: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  {
    state: 'approved_courier_arranged',
    matches: ['approved_courier_arranged'],
    label: 'Courier Arranged',
    description: 'Delivery in progress',
    cardAccent: 'text-purple-600 border-purple-300',
    tagClasses: 'bg-purple-100 text-purple-800 border border-purple-300',
  },
  {
    state: 'rejected',
    matches: ['rejected'],
    label: 'Rejected',
    description: 'Claim was declined',
    cardAccent: 'text-red-600 border-red-300',
    tagClasses: 'bg-red-100 text-red-800 border border-red-300',
  },
  {
    state: 'closed',
    matches: ['approved_collected', 'approved_cancelled', 'approved_expired', 'pending_cancelled'],
    label: 'Closed',
    description: 'Resolved or expired',
    cardAccent: 'text-slate-500 border-slate-300',
    tagClasses: 'bg-slate-100 text-slate-600 border border-slate-300',
  },
];

export function getWorkflowStateConfig(state?: WorkflowState): WorkflowStateConfig {
  if (!state) {
    return WORKFLOW_STATE_CONFIGS[0];
  }
  return (
    WORKFLOW_STATE_CONFIGS.find(c => c.matches.includes(state)) ??
    WORKFLOW_STATE_CONFIGS[0]
  );
}

export const PAYMENT_STATUS_TAGS: Record<string, { label: string; classes: string }> = {
  awaiting_payment: { label: 'Payment Due', classes: 'bg-amber-100 text-amber-800 border border-amber-300' },
  paid: { label: '', classes: '' },
  refunded: { label: 'Refunded', classes: 'bg-slate-100 text-slate-600 border border-slate-300' },
  not_required: { label: '', classes: '' },
};

export const COLLECTION_MODE_TAGS: Record<string, { label: string; classes: string }> = {
  self_pickup: { label: 'Self Pickup', classes: 'bg-sky-100 text-sky-700 border border-sky-300' },
  courier: { label: 'Courier', classes: 'bg-violet-100 text-violet-700 border border-violet-300' },
};
