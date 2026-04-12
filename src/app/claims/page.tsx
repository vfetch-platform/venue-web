'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { Claim, ClaimStatus } from '@/types';
import { CLAIM_STATUSES } from '@/constants/claims';
import { api } from '@/services/api';
import {
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  KeyIcon,
  ClockIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { cardStyles } from '@/utils/styles';


export default function ClaimsPage() {
  const { venue } = useAuthStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ClaimStatus>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    claimId: string;
    itemTitle: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const claimsPerPage = 10;

  useEffect(() => {
    if (venue) {
      void loadClaims();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

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

  const filteredClaims = claims.filter(claim => {
    return selectedStatuses.size === 0 || selectedStatuses.has(claim.status as ClaimStatus);
  });

  // Paginated claims
  const totalPages = Math.ceil(filteredClaims.length / claimsPerPage);
  const pagedClaims = filteredClaims.slice((currentPage - 1) * claimsPerPage, currentPage * claimsPerPage);

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Open confirmation modal instead of directly acting
  const requestApproval = (claimId: string, itemTitle: string) => {
    setConfirmAction({ type: 'approve', claimId, itemTitle });
  };

  const requestRejection = (claimId: string, itemTitle: string) => {
    setRejectionReason('');
    setConfirmAction({ type: 'reject', claimId, itemTitle });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === 'reject' && !rejectionReason.trim()) return;

    await handleUpdateClaimStatus(
      confirmAction.claimId,
      confirmAction.type === 'approve' ? 'approved' : 'rejected',
      confirmAction.type === 'reject' ? rejectionReason.trim() : undefined
    );

    setConfirmAction(null);
    setRejectionReason('');
  };

  const handleUpdateClaimStatus = async (claimId: string, status: 'approved' | 'rejected', reason?: string) => {
    setIsLoading(true);
    try {
      const response = await api.claims.updateStatus(claimId, status, reason);
      if (response.success && response.data) {
        setClaims(prev => prev.map(claim => {
          if (claim.id !== claimId) return claim;
          const updated = response.data as Claim;
          return {
            ...claim,
            ...updated,
            item: updated.item || claim.item,
            claimant: updated.claimant || claim.claimant,
          } as Claim;
        }));
        setSelectedClaim(prev => {
          if (!prev || prev.id !== claimId) return prev;
          const updated = response.data as Claim;
          return {
            ...prev,
            ...updated,
            item: updated.item || prev.item,
            claimant: updated.claimant || prev.claimant,
          };
        });
      }
    } catch (error) {
      console.error('Error updating claim:', error);
      alert(`Failed to ${status} claim`);
    } finally {
      setIsLoading(false);
    }
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

  const toggleStatusCard = (status: ClaimStatus) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) { newSet.delete(status); } else { newSet.add(status); }
      return newSet;
    });
    setCurrentPage(1);
  };

  const getCardAccent = (status: ClaimStatus) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 border-yellow-200';
      case 'approved': return 'text-green-600 border-green-200';
      case 'rejected': return 'text-red-600 border-red-200';
      default: return 'text-gray-600 border-gray-200';
    }
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

        {/* Status Filters */}
        <div className={`${cardStyles} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900 flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filter by Status
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CLAIM_STATUSES.map((status) => {
              const isSelected = selectedStatuses.has(status);
              const count = claims.filter(c => c.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => toggleStatusCard(status)}
                  aria-pressed={isSelected}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-center w-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400 ${
                    isSelected
                      ? `${getCardAccent(status)} bg-white shadow-sm`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`text-lg sm:text-xl font-bold ${isSelected ? '' : 'text-slate-700'}`}>
                    {count}
                  </div>
                  <div className={`text-xs sm:text-sm capitalize ${isSelected ? '' : 'text-slate-500'}`}>
                    {status}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Claims List */}
        <div className={cardStyles}>
          <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-medium text-slate-900">Claims ({filteredClaims.length})</h3>
            {filteredClaims.length > 0 && (
              <span className="text-xs text-slate-500">Showing {(currentPage - 1) * claimsPerPage + 1}–{Math.min(currentPage * claimsPerPage, filteredClaims.length)} of {filteredClaims.length}</span>
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

          {!isLoading && !error && filteredClaims.length === 0 && claims.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              <p>No claims yet. Claims will appear here when customers claim items.</p>
            </div>
          )}

          {!isLoading && !error && filteredClaims.length === 0 && claims.length > 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              No claims found matching your criteria.
            </div>
          )}

          {!isLoading && !error && filteredClaims.length > 0 && (
            <>
              <div className="p-4 space-y-3">
                {pagedClaims.map((claim) => {
                  const firstImage = claim.item?.images?.[0];
                  return (
                    <div
                      key={claim.id}
                      className="flex items-center gap-3 sm:gap-5 p-3 sm:p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md hover:border-slate-300 transition-all duration-200"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        {firstImage ? (
                          <Image src={firstImage} alt={claim.item?.title || 'Item'} fill sizes="80px" quality={60} className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">No image</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                          {claim.item?.title || 'Unknown Item'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </span>
                          {claim.user?.first_name && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              {[claim.user.first_name, claim.user.last_name].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(claim.created_at)}</div>
                      </div>

                      {/* Action */}
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="shrink-0 inline-flex items-center px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                      >
                        Review
                      </button>
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
              className="relative mx-auto p-5 border w-full max-w-lg shadow-lg rounded-xl bg-white max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 id="claim-modal-title" className="text-lg font-semibold text-slate-900">Claim Details</h3>
                <button
                  onClick={() => setSelectedClaim(null)}
                  aria-label="Close"
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

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
                {/* Item name + status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 text-base">{selectedClaim.item?.title}</span>
                  <span className={`shrink-0 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedClaim.status)}`}>
                    {selectedClaim.status}
                  </span>
                </div>

                {/* Claimant details */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Claimant Details</p>
                  {selectedClaim.user?.first_name && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <UserIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-medium">{[selectedClaim.user.first_name, selectedClaim.user.last_name].filter(Boolean).join(' ')}</span>
                    </div>
                  )}
                  {selectedClaim.user?.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <EnvelopeIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <a href={`mailto:${selectedClaim.user.email}`} className="text-blue-600 hover:underline">
                        {selectedClaim.user.email}
                      </a>
                    </div>
                  )}
                  {selectedClaim.user?.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <PhoneIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      <a href={`tel:${selectedClaim.user.phone_number}`} className="text-blue-600 hover:underline">
                        {selectedClaim.user.phone_number}
                      </a>
                    </div>
                  )}
                </div>

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

                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <CreditCardIcon className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>Payment: <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedClaim.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      selectedClaim.payment_status === 'awaiting_payment' ? 'bg-yellow-100 text-yellow-700' :
                      selectedClaim.payment_status === 'refunded' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>{selectedClaim.payment_status}</span></span>
                  </div>
                </div>

                {/* Item description */}
                {selectedClaim.item?.description && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Item Description</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedClaim.item.description}</p>
                  </div>
                )}

                {/* Customer's description */}
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

              </div>

              {/* Modal Actions */}
              {selectedClaim.status === 'pending' && (
                <div className="mt-6 flex gap-3">
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
            </div>
          </div>
        , document.body)}
      </div>

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
                confirmAction.type === 'approve' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <ExclamationTriangleIcon className={`h-5 w-5 ${
                  confirmAction.type === 'approve' ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-900">
                  {confirmAction.type === 'approve' ? 'Approve this claim?' : 'Reject this claim?'}
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  {confirmAction.type === 'approve' ? (
                    <>You are about to approve the claim for <strong>{confirmAction.itemTitle}</strong>. The customer will be notified.</>
                  ) : (
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
                  confirmAction.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction.type === 'approve' ? 'Yes, Approve' : 'Reject Claim'}
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
    </Layout>
  );
}
