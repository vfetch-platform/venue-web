'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/auth';
import { Claim, ClaimStatus } from '@/types';
import { api } from '@/services/api';
import {
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {cardStyles } from '@/utils/styles';

// Status arrays used in filtering & stats
const statStatuses: ClaimStatus[] = ['pending','approved','collected','rejected'];

export default function ClaimsPage() {
  const { venue } = useAuthStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ClaimStatus>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [collectingClaim, setCollectingClaim] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Load claims on component mount
  // Memoized loadClaims avoids eslint missing dependency warning
  useEffect(() => {
    if (venue) {
      void loadClaims();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

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
    const matchesStatus = selectedStatuses.size === 0 || selectedStatuses.has(claim.status as ClaimStatus);
    return matchesStatus;
  });

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'collected':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateClaimStatus = async (claimId: string, status: 'approved' | 'rejected') => {
    setIsLoading(true);
    try {
      const response = await api.claims.updateStatus(claimId, status);
      if (response.success && response.data) {
        setClaims(prev => prev.map(claim => {
          if (claim.id !== claimId) return claim;
          const updated = response.data as Claim;
          return {
            ...claim, // keep existing nested relations
            ...updated, // apply new primitive fields from API
            item: updated.item || claim.item, // preserve item if API returns partial object
            user: updated.user || claim.user,
          } as Claim;
        }));
        // Update modal view if the claim is currently selected
        setSelectedClaim(prev => {
          if (!prev || prev.id !== claimId) return prev;
          const updated = response.data as Claim;
          return {
            ...prev,
            ...updated,
            item: updated.item || prev.item,
            user: updated.user || prev.user,
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

  const handleMarkItemCollected = async (claimId: string) => {
    setCollectingClaim(claimId);
    try {
      const response = await api.claims.markCollected(claimId, 'collected_code');
      if (response.success && response.data) {
        setClaims(prev => prev.map(claim => {
          if (claim.id !== claimId) return claim;
          const updated = response.data as Claim;
          return {
            ...claim,
            ...updated,
            item: updated.item || claim.item,
            user: updated.user || claim.user,
          } as Claim;
        }));
        setSelectedClaim(prev => {
          if (!prev || prev.id !== claimId) return prev;
            const updated = response.data as Claim;
            return {
              ...prev,
              ...updated,
              item: updated.item || prev.item,
              user: updated.user || prev.user,
            };
        });
      }
    } catch (error) {
      console.error('Error marking item as collected:', error);
      alert('Failed to mark item as collected');
    } finally {
      setCollectingClaim(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleStatusCard = (status: ClaimStatus) => {
    setSelectedStatuses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(status)) {
        newSet.delete(status);
      } else {
        newSet.add(status);
      }
      return newSet;
    });
  };

  const getCardAccent = (status: ClaimStatus) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 border-yellow-200';
      case 'approved': return 'text-green-600 border-green-200';
      case 'collected': return 'text-blue-600 border-blue-200';
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
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filter by Status
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statStatuses.map((status) => {
              const isSelected = selectedStatuses.has(status);
              const count = claims.filter(c => c.status === status).length;
              return (
                <div
                  key={status}
                  onClick={() => toggleStatusCard(status)}
                  className={`cursor-pointer p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                    isSelected 
                      ? `${getCardAccent(status)} bg-opacity-10 border-opacity-50` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`text-lg sm:text-xl font-bold ${isSelected ? '' : 'text-gray-700'}`}>
                    {count}
                  </div>
                  <div className={`text-xs sm:text-sm capitalize ${isSelected ? '' : 'text-gray-500'}`}>
                    {status}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Claims List */}
        <div className={cardStyles}>
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Claims ({filteredClaims.length})</h3>
            {filteredClaims.length > 0 && (
              <span className="text-xs text-gray-500">Showing {filteredClaims.length} of {claims.length}</span>
            )}
          </div>
          
          {/* Error State */}
          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
              <button
                onClick={loadClaims}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try again
              </button>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading && (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading claims...</p>
            </div>
          )}
          
          {/* Empty State */}
          {!isLoading && !error && filteredClaims.length === 0 && claims.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              <p>No claims yet. Claims will appear here when customers claim items.</p>
            </div>
          )}
          
          {/* Filter Results Empty State */}
          {!isLoading && !error && filteredClaims.length === 0 && claims.length > 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">
              No claims found matching your criteria.
            </div>
          )}
          
          {/* Claims List */}
          {!isLoading && !error && filteredClaims.length > 0 && (
            <ul className="divide-y divide-gray-200">
              {filteredClaims.map((claim) => (
                <li key={claim.id} className="p-4 sm:p-6 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900 truncate">
                              {claim.item?.title || 'Unknown Item'}
                            </h4>
                            <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                              {claim.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {claim.item?.description || 'No description available'}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 space-x-4">
                            <span className="flex items-center">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              {formatDate(claim.created_at)}
                            </span>
                            <span>Code: {claim.pickup_code}</span>
                          </div>
                          {claim.search_description && (
                            <p className="mt-2 text-xs text-gray-600">
                              <span className="font-medium">Lost item:</span> {claim.search_description}
                            </p>
                          )}
                          {claim.notes && !claim.search_description && (
                            <p className="mt-2 text-xs text-gray-600 italic">
                              &quot;{claim.notes}&quot;
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary-600 hover:bg-primary-700"
                      >
                        Take Action
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Claim Detail Modal */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Claim Details</h3>
                  <button
                    onClick={() => setSelectedClaim(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                {/* Item Images */}
                {selectedClaim.item?.images && selectedClaim.item.images.length > 0 ? (
                  <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {selectedClaim.item.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setLightboxImage(img)}
                        className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <Image
                          src={img}
                          alt={`${selectedClaim.item?.title} ${i + 1}`}
                          fill
                          className="object-cover hover:opacity-90 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 rounded-lg bg-gray-100 h-24 flex items-center justify-center text-gray-400 text-sm">
                    No image available
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Item:</span> {selectedClaim.item?.title}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedClaim.status)}`}>
                      {selectedClaim.status}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Pickup Code:</span> {selectedClaim.pickup_code}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(selectedClaim.created_at)}
                  </div>
                  {selectedClaim.search_description && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Customer&apos;s Description</p>
                      <p className="text-sm text-amber-900 leading-relaxed">{selectedClaim.search_description}</p>
                    </div>
                  )}
                  {selectedClaim.notes && !selectedClaim.search_description && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-amber-900 leading-relaxed italic">&quot;{selectedClaim.notes}&quot;</p>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                {selectedClaim.status === 'pending' && (
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleUpdateClaimStatus(selectedClaim.id, 'approved')}
                      disabled={isLoading}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckIcon className="w-4 h-4 mr-1.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateClaimStatus(selectedClaim.id, 'rejected')}
                      disabled={isLoading}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4 mr-1.5" /> Reject
                    </button>
                  </div>
                )}
                {selectedClaim.status === 'approved' && (
                  <div className="mt-6">
                    <button
                      onClick={() => handleMarkItemCollected(selectedClaim.id)}
                      disabled={collectingClaim === selectedClaim.id}
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CheckIcon className="w-4 h-4 mr-1.5" />
                      {collectingClaim === selectedClaim.id ? 'Processing...' : 'Mark as Collected'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-[60] flex items-center justify-center"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxImage(null)}
          >
            <XMarkIcon className="h-8 w-8" />
          </button>
          <div
            className="relative w-full h-full"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={lightboxImage}
              alt="Full size"
              fill
              className="object-contain rounded"
            />
          </div>
        </div>
      )}
    </Layout>
  );
}