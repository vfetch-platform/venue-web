'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { Claim, WorkflowState } from '@/types';
import {
  WORKFLOW_STATE_CONFIGS,
  WorkflowStateConfig,
  getWorkflowStateConfig,
  PAYMENT_STATUS_TAGS,
  COLLECTION_MODE_TAGS,
} from '@/constants/claims';
import { api } from '@/services/api';
import {
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  KeyIcon,
  ClockIcon,
  CreditCardIcon,
  CheckBadgeIcon,
  TruckIcon,
  MapPinIcon,
  ArrowTopRightOnSquareIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { cardStyles } from '@/utils/styles';
import { useToast } from '@/components/Toast';


export default function ClaimsPage() {
  const showToast = useToast();
  const { venue } = useAuthStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedWorkflowCards, setSelectedWorkflowCards] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject' | 'collect';
    claimId: string;
    itemTitle: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const claimsPerPage = 5;

  useEffect(() => {
    if (venue?.id) {
      void loadClaims();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightboxImage) {
        setLightboxImage(null);
      } else if (confirmAction) {
        setConfirmAction(null);
        setRejectionReason('');
      } else if (selectedClaim) {
        setSelectedClaim(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage, selectedClaim, confirmAction]);

  const loadClaims = async (): Promise<void> => {
    if (!venue) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.claims.getByVenue(venue.id);
      if (response.success && response.data) {
        setClaims(response.data.data);
      }
    } catch (error) {
      console.error('Error loading claims:', error);
      setError('Failed to load claims');
    } finally {
      setIsLoading(false);
    }
  };

  /** Returns the WorkflowStateConfig card key that a claim belongs to. */
  const getClaimCardKey = (claim: Claim): string => {
    const ws = claim.workflow_state;
    if (!ws) return 'pending_review';
    const config = getWorkflowStateConfig(ws);
    return config.state;
  };

  const filteredClaims = claims.filter(claim => {
    const matchesWorkflow = selectedWorkflowCards.size === 0 || selectedWorkflowCards.has(getClaimCardKey(claim));
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === '' ||
      claim.item?.title?.toLowerCase().includes(q) ||
      claim.claimant?.full_name?.toLowerCase().includes(q) ||
      claim.claimant?.email?.toLowerCase().includes(q) ||
      claim.id.toLowerCase().includes(q);
    return matchesWorkflow && matchesSearch;
  });

  const workflowPriority = (state?: WorkflowState): number => {
    if (state === 'pending_review') return 1;
    if (state === 'approved_ready_for_pickup' || state === 'approved_courier_arranged') return 2;
    if (state === 'approved_awaiting_payment') return 3;
    return 4;
  };

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    const diff = workflowPriority(a.workflow_state) - workflowPriority(b.workflow_state);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Paginated claims
  const totalPages = Math.ceil(sortedClaims.length / claimsPerPage);
  const pagedClaims = sortedClaims.slice((currentPage - 1) * claimsPerPage, currentPage * claimsPerPage);

  // Open confirmation modal
  const requestApproval = (claimId: string, itemTitle: string) => {
    setConfirmAction({ type: 'approve', claimId, itemTitle });
  };

  const requestRejection = (claimId: string, itemTitle: string) => {
    setRejectionReason('');
    setConfirmAction({ type: 'reject', claimId, itemTitle });
  };

  const requestCollection = (claimId: string, itemTitle: string) => {
    setConfirmAction({ type: 'collect', claimId, itemTitle });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'reject' && !rejectionReason.trim()) return;

    if (confirmAction.type === 'collect') {
      await handleMarkCollected(confirmAction.claimId);
    } else {
      await handleUpdateClaimStatus(
        confirmAction.claimId,
        confirmAction.type === 'approve' ? 'approved' : 'rejected',
        confirmAction.type === 'reject' ? rejectionReason.trim() : undefined,
      );
    }

    setConfirmAction(null);
    setRejectionReason('');
  };

  const handleUpdateClaimStatus = async (claimId: string, status: 'approved' | 'rejected', reason?: string) => {
    setIsLoading(true);
    try {
      const response = await api.claims.updateStatus(claimId, status, reason);
      if (response.success && response.data) {
        applyClaimUpdate(claimId, response.data as Claim);
      }
    } catch (error) {
      console.error('Error updating claim:', error);
      showToast(`Failed to ${status} claim`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkCollected = async (claimId: string) => {
    const claim = claims.find(c => c.id === claimId);
    if (!claim) return;

    setIsLoading(true);
    try {
      const response = await api.claims.markCollected(claimId, claim.collection_mode ?? undefined, claim.pickup_code ?? undefined);
      if (response.success && response.data) {
        applyClaimUpdate(claimId, response.data as Claim);
      }
    } catch (error) {
      console.error('Error marking collected:', error);
      showToast('Failed to mark claim as collected');
    } finally {
      setIsLoading(false);
    }
  };

  /** Merge an updated claim into local state (list + open modal). */
  const applyClaimUpdate = (claimId: string, updated: Claim) => {
    setClaims(prev => prev.map(c => {
      if (c.id !== claimId) return c;
      return { ...c, ...updated, item: updated.item ?? c.item, claimant: updated.claimant ?? c.claimant };
    }));
    setSelectedClaim(prev => {
      if (!prev || prev.id !== claimId) return prev;
      return { ...prev, ...updated, item: updated.item ?? prev.item, claimant: updated.claimant ?? prev.claimant };
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const toggleWorkflowCard = (cardKey: string) => {
    setSelectedWorkflowCards(prev => {
      const next = new Set(prev);
      if (next.has(cardKey)) { next.delete(cardKey); } else { next.add(cardKey); }
      return next;
    });
    setCurrentPage(1);
  };

  const isTerminalWorkflowState = (state?: WorkflowState): boolean => (
    state === 'rejected' ||
    state === 'approved_collected' ||
    state === 'approved_cancelled' ||
    state === 'approved_expired' ||
    state === 'pending_cancelled'
  );

  const activeRowActionButtonClasses = 'inline-flex min-w-[148px] items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 shadow-sm transition-colors';
  const passiveRowActionButtonClasses = 'inline-flex min-w-[148px] items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 transition-colors';
  const terminalRowActionButtonClasses = 'inline-flex min-w-[148px] items-center justify-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-slate-500 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-600 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 transition-colors';
  const terminalTagClasses = 'bg-slate-100 text-slate-500 border border-slate-300';

  /** Count claims that map to a given WorkflowStateConfig card. */
  const countForCard = (config: WorkflowStateConfig): number => {
    return claims.filter(c => config.matches.includes(c.workflow_state as WorkflowState)).length;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Claims Management</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Review and manage item claims from customers</p>
          </div>
        </div>

        {/* Workflow State Filter Cards */}
        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Filter by stage</h3>
            {selectedWorkflowCards.size > 0 && (
              <button
                onClick={() => { setSelectedWorkflowCards(new Set()); setCurrentPage(1); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {WORKFLOW_STATE_CONFIGS.filter(c => c.showFilter !== false).map((config) => {
              const isSelected = selectedWorkflowCards.has(config.state);
              const count = countForCard(config);
              return (
                <button
                  key={config.state}
                  onClick={() => toggleWorkflowCard(config.state)}
                  aria-pressed={isSelected}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                    isSelected
                      ? `${config.cardAccent} bg-white shadow-sm`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-xl sm:text-2xl font-bold ${isSelected ? '' : 'text-slate-700'}`}>
                    {count}
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${isSelected ? '' : 'text-slate-600'}`}>
                    {config.label}
                  </div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'opacity-70' : 'text-slate-400'}`}>
                    {config.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by item, claimant, email or claim ID…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-300"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Claims List */}
        <div className={cardStyles}>
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-medium text-slate-900">Claims ({sortedClaims.length})</h3>
            {sortedClaims.length > 0 && (
              <span className="text-xs text-slate-500">Showing {(currentPage - 1) * claimsPerPage + 1}–{Math.min(currentPage * claimsPerPage, sortedClaims.length)} of {sortedClaims.length}</span>
            )}
          </div>

          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
              <button onClick={loadClaims} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">Try again</button>
            </div>
          )}

          {isLoading && !claims.length && (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-2 text-slate-600">Loading claims...</p>
            </div>
          )}

          {!isLoading && !error && sortedClaims.length === 0 && claims.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              <p>No claims yet. Claims will appear here when customers claim items.</p>
            </div>
          )}

          {!isLoading && !error && sortedClaims.length === 0 && claims.length > 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              No claims found matching your criteria.
            </div>
          )}

          {!isLoading && !error && sortedClaims.length > 0 && (
            <>
              <div className="p-4 space-y-3">
                {pagedClaims.map((claim) => {
                  const firstImage = claim.item?.images?.[0];
                  const wfConfig = getWorkflowStateConfig(claim.workflow_state);
                  const paymentTag = claim.payment_status ? PAYMENT_STATUS_TAGS[claim.payment_status] : null;
                  const collectionTag = claim.collection_mode ? COLLECTION_MODE_TAGS[claim.collection_mode] : null;
                  const isTerminalClaim = isTerminalWorkflowState(claim.workflow_state);
                  const rowClasses = isTerminalClaim
                    ? 'flex items-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200'
                    : 'flex items-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200';
                  const titleClasses = isTerminalClaim
                    ? 'text-sm sm:text-base font-semibold text-slate-700 truncate'
                    : 'text-sm sm:text-base font-semibold text-slate-900 truncate';
                  const metaTextClasses = isTerminalClaim ? 'text-xs text-slate-400' : 'text-xs text-slate-500';
                  const workflowTagClasses = isTerminalClaim ? terminalTagClasses : wfConfig.tagClasses;
                  const passiveButtonClasses = isTerminalClaim ? terminalRowActionButtonClasses : passiveRowActionButtonClasses;

                  return (
                    <div
                      key={claim.id}
                      className={rowClasses}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {firstImage ? (
                          <Image
                            src={firstImage}
                            alt={claim.item?.title || 'Item'}
                            fill
                            sizes="80px"
                            quality={60}
                            className={isTerminalClaim ? 'object-cover opacity-70' : 'object-cover'}
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs ${isTerminalClaim ? 'text-slate-400' : 'text-slate-300'}`}>No image</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className={titleClasses}>
                          {claim.item?.title || 'Unknown Item'}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Workflow state tag */}
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${workflowTagClasses}`}>
                            {wfConfig.label}
                          </span>
                          {/* Payment status tag — only when actionable */}
                          {/* Payment tag — hidden when workflow state already conveys payment info */}
                          {paymentTag?.label &&
                            claim.workflow_state !== 'approved_awaiting_payment' &&
                            claim.workflow_state !== 'approved_ready_for_pickup' &&
                            claim.workflow_state !== 'approved_courier_arranged' && (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${isTerminalClaim ? terminalTagClasses : paymentTag.classes}`}>
                              {paymentTag.label}
                            </span>
                          )}
                          {/* Collection mode tag — hide self_pickup when workflow already says Ready for Pickup */}
                          {collectionTag &&
                            !(claim.collection_mode === 'self_pickup' && claim.workflow_state === 'approved_ready_for_pickup') && (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${isTerminalClaim ? terminalTagClasses : collectionTag.classes}`}>
                              {collectionTag.label}
                            </span>
                          )}
                          {/* Claimant name */}
                          {claim.claimant?.full_name && (
                            <span className={`${metaTextClasses} flex items-center gap-1`}>
                              <UserIcon className="h-3 w-3" />
                              {claim.claimant.full_name}
                            </span>
                          )}
                        </div>
                        <div className={metaTextClasses}>{formatDate(claim.created_at)}</div>
                      </div>

                      {/* Actions */}
                      <div className="shrink-0">
                        {claim.workflow_state === 'pending_review' && (
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className={activeRowActionButtonClasses}
                          >
                            Review
                          </button>
                        )}
                        {claim.workflow_state === 'approved_ready_for_pickup' && (
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className={activeRowActionButtonClasses}
                          >
                            Process Pick-Up
                          </button>
                        )}
                        {claim.workflow_state === 'approved_courier_arranged' && (
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className={activeRowActionButtonClasses}
                          >
                            Process Courier
                          </button>
                        )}
                        {claim.workflow_state !== 'pending_review' &&
                          claim.workflow_state !== 'approved_ready_for_pickup' &&
                          claim.workflow_state !== 'approved_courier_arranged' && (
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className={passiveButtonClasses}
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) { page = i + 1; }
                      else if (currentPage <= 4) { page = i + 1; }
                      else if (currentPage >= totalPages - 3) { page = totalPages - 6 + i; }
                      else { page = currentPage - 3 + i; }
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                            page === currentPage ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─── Claim Detail Modal ─────────────────────────────────────── */}
        {selectedClaim && createPortal(
          <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedClaim(null); }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="claim-modal-title"
              className="relative mx-auto border w-full max-w-lg shadow-lg rounded-xl bg-white max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex justify-between items-center px-5 pt-5 pb-4 shrink-0">
                <div className="space-y-1.5">
                  <h3 id="claim-modal-title" className="text-lg font-semibold text-slate-900">Claim Details</h3>
                  {/* Workflow state tag */}
                  {(() => {
                    const wfConfig = getWorkflowStateConfig(selectedClaim.workflow_state);
                    const collectionTag = selectedClaim.collection_mode ? COLLECTION_MODE_TAGS[selectedClaim.collection_mode] : null;
                    const paymentTag = selectedClaim.payment_status ? PAYMENT_STATUS_TAGS[selectedClaim.payment_status] : null;
                    return (
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${wfConfig.tagClasses}`}>
                          {wfConfig.label}
                        </span>
                        {paymentTag?.label &&
                          selectedClaim.workflow_state !== 'approved_awaiting_payment' &&
                          selectedClaim.workflow_state !== 'approved_ready_for_pickup' &&
                          selectedClaim.workflow_state !== 'approved_courier_arranged' && (
                          <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${paymentTag.classes}`}>
                            {paymentTag.label}
                          </span>
                        )}
                        {collectionTag &&
                          !(selectedClaim.collection_mode === 'self_pickup' && selectedClaim.workflow_state === 'approved_ready_for_pickup') && (
                          <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${collectionTag.classes}`}>
                            {collectionTag.label}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto px-5 pb-2 flex-1">
                {/* Item Images */}
              {selectedClaim.item?.images && selectedClaim.item.images.length > 0 ? (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {selectedClaim.item.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxImage(img)}
                      className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <Image src={img} alt={`${selectedClaim.item?.title} ${i + 1}`} fill sizes="96px" quality={60} className="object-cover hover:opacity-90 transition-opacity" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mb-4 rounded-lg bg-slate-100 h-24 flex items-center justify-center text-slate-400 text-sm">
                  No image available
                </div>
              )}

              <div className="space-y-4 text-sm">
                {/* Item title */}
                <p className="font-semibold text-slate-900 text-base">{selectedClaim.item?.title}</p>

                {/* Claimant details */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Claimant Details</p>
                  {selectedClaim.claimant?.full_name && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <UserIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium">{selectedClaim.claimant.full_name}</span>
                    </div>
                  )}
                  {selectedClaim.claimant?.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <EnvelopeIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <a href={`mailto:${selectedClaim.claimant.email}`} className="text-blue-600 hover:underline">
                        {selectedClaim.claimant.email}
                      </a>
                    </div>
                  )}
                </div>
                {selectedClaim.venue_interaction_context && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Stay Details</p>
                    {selectedClaim.venue_interaction_context.sub_location && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <MapPinIcon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Room / Location: <span className="font-medium">{selectedClaim.venue_interaction_context.sub_location}</span></span>
                      </div>
                    )}
                    {selectedClaim.venue_interaction_context.started_at && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <ClockIcon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>
                          Check-in: <span className="font-medium">{new Date(selectedClaim.venue_interaction_context.started_at).toLocaleDateString()}</span>
                          {selectedClaim.venue_interaction_context.ended_at && (
                            <> &rarr; Check-out: <span className="font-medium">{new Date(selectedClaim.venue_interaction_context.ended_at).toLocaleDateString()}</span></>
                          )}
                        </span>
                      </div>
                    )}
                    {selectedClaim.venue_interaction_context.reference_value && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <KeyIcon className="h-4 w-4 text-slate-400 shrink-0" />
                        <span>Booking Ref: <span className="font-mono font-medium text-slate-900">{selectedClaim.venue_interaction_context.reference_value}</span></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Pickup & Verification */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pickup & Verification</p>
                  {selectedClaim.pickup_code && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <KeyIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Pickup Code: <span className="font-mono font-bold text-slate-900 bg-slate-200 px-1.5 py-0.5 rounded">{selectedClaim.pickup_code}</span></span>
                    </div>
                  )}
                  {selectedClaim.expires_at && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <ClockIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Expires: {formatDate(selectedClaim.expires_at)}</span>
                    </div>
                  )}
                  {selectedClaim.payment_status && selectedClaim.payment_status !== 'not_required' && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <CreditCardIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="capitalize">{selectedClaim.payment_status.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>

                {/* Courier / Delivery info — shown when relevant */}
                {(selectedClaim.collection_mode === 'courier' || selectedClaim.delivery_address || selectedClaim.delivery_tracking_info) && (
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-lg space-y-1.5">
                    <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide mb-1">Delivery Info</p>
                    {selectedClaim.delivery_address && (
                      <div className="flex items-start gap-2 text-sm text-slate-700">
                        <MapPinIcon className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                        <span>{selectedClaim.delivery_address}</span>
                      </div>
                    )}
                    {selectedClaim.courier_provider && (
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <TruckIcon className="h-4 w-4 text-violet-400 shrink-0" />
                        <span className="capitalize">{selectedClaim.courier_provider}</span>
                        {selectedClaim.delivery_tracking_info?.provider_status && (
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full bg-violet-100 text-violet-700 capitalize">
                            {selectedClaim.delivery_tracking_info.provider_status}
                          </span>
                        )}
                      </div>
                    )}
                    {selectedClaim.delivery_tracking_info?.tracking_url && (
                      <a
                        href={selectedClaim.delivery_tracking_info.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline font-medium"
                      >
                        Track shipment <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Item description */}
                {selectedClaim.item?.description && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Item Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedClaim.item.description}</p>
                  </div>
                )}

                {/* Customer's search description */}
                {selectedClaim.search_description && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Customer&apos;s Description</p>
                    <p className="text-sm text-amber-900 leading-relaxed">{selectedClaim.search_description}</p>
                  </div>
                )}
                {selectedClaim.notes && !selectedClaim.search_description && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-amber-900 leading-relaxed italic">&quot;{selectedClaim.notes}&quot;</p>
                  </div>
                )}

                {/* Rejection reason — info only */}
                {selectedClaim.decision_reason && selectedClaim.status === 'rejected' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
                    <p className="text-sm text-red-800 leading-relaxed">{selectedClaim.decision_reason}</p>
                  </div>
                )}
              </div>
              </div>

              {/* Sticky footer actions */}
              {(selectedClaim.workflow_state === 'pending_review' ||
                selectedClaim.workflow_state === 'approved_ready_for_pickup' ||
                selectedClaim.workflow_state === 'approved_courier_arranged') && (
                <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                  {selectedClaim.workflow_state === 'pending_review' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => requestApproval(selectedClaim.id, selectedClaim.item?.title || 'this item')}
                        disabled={isLoading}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4 mr-1.5" /> Approve
                      </button>
                      <button
                        onClick={() => requestRejection(selectedClaim.id, selectedClaim.item?.title || 'this item')}
                        disabled={isLoading}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 mr-1.5" /> Reject
                      </button>
                    </div>
                  )}

                  {(selectedClaim.workflow_state === 'approved_ready_for_pickup' || selectedClaim.workflow_state === 'approved_courier_arranged') && (
                    <button
                      onClick={() => requestCollection(selectedClaim.id, selectedClaim.item?.title || 'this item')}
                      disabled={isLoading}
                      className="w-full inline-flex justify-center items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                    >
                      <CheckBadgeIcon className="w-4 h-4" />
                      {selectedClaim.workflow_state === 'approved_courier_arranged' ? 'Confirm Delivery' : 'Mark as Collected'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        , document.body)}

        {/* ─── Confirmation Modal ───────────────────────────────────────── */}
        {confirmAction && createPortal(
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setConfirmAction(null); setRejectionReason(''); } }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="relative mx-auto p-6 w-full max-w-md shadow-xl rounded-xl bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className={`p-2 rounded-full shrink-0 ${
                  confirmAction.type === 'approve' ? 'bg-green-100' :
                  confirmAction.type === 'collect' ? 'bg-slate-100' :
                  'bg-red-100'
                }`}>
                  <ExclamationTriangleIcon className={`h-5 w-5 ${
                    confirmAction.type === 'approve' ? 'text-green-600' :
                    confirmAction.type === 'collect' ? 'text-slate-700' :
                    'text-red-600'
                  }`} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-900">
                    {confirmAction.type === 'approve' ? 'Approve this claim?' :
                     confirmAction.type === 'collect' ? 'Confirm collection?' :
                     'Reject this claim?'}
                  </h4>
                  <p className="text-sm text-slate-500 mt-1">
                    {confirmAction.type === 'approve' && (
                      <>You are about to approve the claim for <strong>{confirmAction.itemTitle}</strong>. The customer will be notified.</>
                    )}
                    {confirmAction.type === 'collect' && (
                      <>Mark <strong>{confirmAction.itemTitle}</strong> as collected? This will close the claim and release the item.</>
                    )}
                    {confirmAction.type === 'reject' && (
                      <>Please provide a reason for rejecting the claim for <strong>{confirmAction.itemTitle}</strong>.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Rejection reason text box */}
              {confirmAction.type === 'reject' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Reason for rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g., Description does not match the item, insufficient proof of ownership..."
                    rows={3}
                    className="block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-slate-500 focus:border-slate-500 text-sm"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setConfirmAction(null); setRejectionReason(''); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeConfirmAction}
                  disabled={confirmAction.type === 'reject' && !rejectionReason.trim()}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmAction.type === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    confirmAction.type === 'collect' ? 'bg-slate-900 hover:bg-slate-800' :
                    'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmAction.type === 'approve' ? 'Yes, Approve' :
                   confirmAction.type === 'collect' ? 'Yes, Confirm' :
                   'Reject Claim'}
                </button>
              </div>
            </div>
          </div>
        , document.body)}

        {/* Lightbox */}
        {lightboxImage && createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-[80] flex items-center justify-center"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300"
              onClick={() => setLightboxImage(null)}
            >
              <XMarkIcon className="h-8 w-8" />
            </button>
            <div className="relative w-full h-full" onClick={e => e.stopPropagation()}>
              <Image src={lightboxImage} alt="Full size" fill sizes="100vw" className="object-contain rounded" />
            </div>
          </div>
        , document.body)}
      </div>
    </Layout>
  );
}
