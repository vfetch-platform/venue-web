'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ItemModal from '@/components/ItemModal';
import { useAuthStore } from '@/store/auth';
import { Item, ItemStatus } from '@/types';
import { api } from '@/services/api';
import { ITEM_CATEGORIES, ITEM_STATUSES, COLLECTED_STATUSES } from '@/constants/items';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import Link from 'next/link';
import { buttonStyles, cardStyles, inputStyles } from '@/utils/styles';


export default function ItemsPage() {
  const { user, venue, isInitialized, isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<ItemStatus>>(new Set());
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ itemId: string; reason: string } | null>(null);

  // Load items when auth initialized & we have a venue id (from venue object or user.venue_id)
  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return; // wait for auth to finish

    const attemptLoad = async () => {
      const currentState = useAuthStore.getState();
      const vid = currentState.venue?.id || currentState.user?.venue_id;

      // If venue id available, load (always refresh on mount)
      if (vid) {
        await loadItems(vid);
        return;
      }

      // If user exists but venue not yet fetched, try fetching venue directly
      if (currentState.user && !currentState.venue) {
        try {
          const vResp = await api.venues.getMyVenue();
          if (vResp.success && vResp.data?.id) {
            currentState.setVenue(vResp.data);
            const newVid = vResp.data.id;
            await loadItems(newVid);
            return;
          }
        } catch {
          // swallow; store already logs a warning in initial fetch path
        }
      }

      // Retry shortly if still nothing
      setTimeout(() => {
        const retryState = useAuthStore.getState();
        const retryVid = retryState.venue?.id || retryState.user?.venue_id;
        if (retryVid) loadItems(retryVid);
      }, 600);
    };

    void attemptLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isAuthenticated, venue, user]);

  const loadItems = async (explicitVenueId?: string): Promise<void> => {
    const venueId = explicitVenueId || venue?.id || user?.venue_id;
    if (!venueId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.items.getByVenue(venueId);
      if (response.success && response.data) {
        setItems(response.data.data);

      }
    } catch (error) {
      console.error('Error loading items:', error);
      setError('Failed to load items');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    const matchesStatus = selectedStatuses.size === 0 || selectedStatuses.has(item.status);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white border-green-600';
      case 'claimed':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'collected_code':
      case 'collected_nocode':
      case 'collected_courier':
        return 'bg-blue-500 text-white border-blue-600';
      case 'expired':
        return 'bg-red-500 text-white border-red-600';
      default:
        return 'bg-slate-500 text-white border-slate-600';
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setDeleteModal({ itemId, reason: '' });
  };

  const confirmDelete = async () => {
    if (!deleteModal || !deleteModal.reason.trim()) return;

    try {
      await api.items.delete(deleteModal.itemId, deleteModal.reason.trim());
      setItems(items.filter(item => item.id !== deleteModal.itemId));
      setDeleteModal(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const toggleStatusFilter = (status: ItemStatus) => {
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

  const handleViewItem = (item: Item) => {
    setViewingItem(item);
    setModalMode('view');
    setEditingItem(null);
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
    setModalMode('edit');
    setViewingItem(null);
  };

  const handleSaveItem = async (updatedItem: Item) => {
    try {
      const response = await api.items.update(updatedItem.id, updatedItem);
      if (response.success && response.data) {
        setItems(prev => 
          prev.map(item => 
            item.id === updatedItem.id ? response.data : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setViewingItem(null);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="px-6 py-6 border-b border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-[220px] flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Lost Items</h1>
              <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage your venue&apos;s lost and found items</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  className={`${inputStyles} pl-10`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Category Filter */}
              <select
                className={inputStyles}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {ITEM_CATEGORIES.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Active Filters Display */}
            {selectedStatuses.size > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-slate-600 mr-2">Filtered by status:</span>
                  {Array.from(selectedStatuses).map(status => (
                    <span
                      key={status}
                      className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}
                    >
                      {status}
                      <button
                        onClick={() => toggleStatusFilter(status)}
                        className="ml-1 text-current hover:text-slate-600"
                        title={`Remove ${status} filter`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setSelectedStatuses(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
        </div>

        {/* Clickable Status Filter Cards */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {ITEM_STATUSES.map(status => {
              const isGroup = status === 'collected';
              const count = isGroup
                ? items.filter(item => COLLECTED_STATUSES.has(item.status)).length
                : items.filter(item => item.status === status).length;
              const isSelected = isGroup
                ? Array.from(COLLECTED_STATUSES).every(s => selectedStatuses.has(s))
                : selectedStatuses.has(status as ItemStatus);
              const toggle = () => {
                if (isGroup) {
                  const variants = Array.from(COLLECTED_STATUSES) as ItemStatus[];
                  setSelectedStatuses(prev => {
                    const next = new Set(prev);
                    const allIncluded = variants.every(v => next.has(v));
                    if (allIncluded) {
                      variants.forEach(v => next.delete(v));
                    } else {
                      variants.forEach(v => next.add(v));
                    }
                    return next;
                  });
                } else {
                  toggleStatusFilter(status as ItemStatus);
                }
              };
              const getStatusStyle = (statusType: string) => {
                switch (statusType) {
                  case 'available':
                    return 'text-green-600 border-green-200 bg-green-50';
                  case 'claimed':
                    return 'text-yellow-600 border-yellow-200 bg-yellow-50';
                  case 'collected':
                    return 'text-blue-600 border-blue-200 bg-blue-50';
                  case 'expired':
                    return 'text-red-600 border-red-200 bg-red-50';
                  default:
                    return 'text-slate-600 border-slate-200 bg-slate-50';
                }
              };
              const displayLabel = isGroup ? 'Collected' : (status as string).charAt(0).toUpperCase() + (status as string).slice(1).replace('_', ' ');
              return (
                <button
                  key={status}
                  onClick={toggle}
                  className={`${cardStyles} p-4 text-center transition-all duration-200 hover:shadow-md border-2 ${
                    isSelected 
                      ? `ring-2 ring-offset-2 ring-slate-300 ${getStatusStyle(status as string)}` 
                      : `hover:bg-slate-50 border-slate-200 bg-white text-slate-700`
                  }`}
                  title={`Click to filter by ${displayLabel}`}
                >
                  <div className="text-xl font-bold">{count}</div>
                  <div className="text-xs mt-1">{displayLabel}</div>
                  {isSelected && (
                    <div className="mt-2">
                      <span className="inline-block w-2 h-2 bg-slate-600 rounded-full"></span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items List */}
        <div className="px-6 pb-6">
          <div className={cardStyles}>
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-base sm:text-lg font-medium text-slate-900">Items ({filteredItems.length})</h3>
              {filteredItems.length > 0 && (
                <span className="text-xs text-slate-500">Showing {filteredItems.length} of {items.length}</span>
              )}
            </div>
          
          {/* Error State */}
          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => loadItems()}
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
              <p className="mt-2 text-gray-600">Loading items...</p>
            </div>
          )}
          
          {/* Empty State - no venue linked */}
          {!isLoading && !error && isInitialized && isAuthenticated && user && !venue && !user.venue_id && (
            <div className="p-6 text-center text-gray-500">
              <p>Your account is not linked to a venue yet. Items cannot be loaded.</p>
              <p className="text-xs mt-2">Ask an admin to associate you with a venue.</p>
            </div>
          )}

          {/* Empty State - no items */}
          {!isLoading && !error && filteredItems.length === 0 && items.length === 0 && (venue || user?.venue_id) && (
            <div className="p-6 text-center text-gray-500">
              <p>No items found. Add your first lost item to get started.</p>
              <Link
                href="/items/add"
                className={`${buttonStyles.primary} mt-4 inline-flex items-center`}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Item
              </Link>
            </div>
          )}
          
          {/* Filter Results Empty State */}
          {!isLoading && !error && filteredItems.length === 0 && items.length > 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">
              No items found matching your criteria.
            </div>
          )}
          
          {/* Items List */}
          {!isLoading && !error && filteredItems.length > 0 && (
            <>
              {/* Mobile list (cards) */}
              <ul className="divide-y divide-slate-200 md:hidden">
                {filteredItems.map(item => (
                  <li key={item.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="shrink-0">
                        <span className={`inline-flex px-1.5 py-0.5 text-[6px] rounded uppercase tracking-wide ${getStatusColor(item.status)}`}>
                          {item.status.replace('collected_', 'collected ')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span className="capitalize">{item.category}</span>
                      <span>{new Date(item.date_found).toLocaleDateString()}</span>
                      <span>{item.claim_count} claim{item.claim_count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleViewItem(item)}
                        className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
                      >
                        <EyeIcon className="h-3 w-3 mr-1" /> View
                      </button>
                      <button
                        onClick={() => handleEditItem(item)}
                        className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200"
                      >
                        <PencilIcon className="h-3 w-3 mr-1" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded text-red-600 bg-red-100 hover:bg-red-200"
                      >
                        <TrashIcon className="h-3 w-3 mr-1" /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date Found</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Claims</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{item.title}</div>
                            <div className="text-sm text-slate-500 truncate max-w-xs">{item.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-slate-900 capitalize">{item.category}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-md uppercase tracking-wide ${getStatusColor(item.status)}`}>
                            {item.status.replace('collected_', 'collected ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(item.date_found).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.claim_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleViewItem(item)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200"
                              title="View item details"
                            >
                              <EyeIcon className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                            <button
                              onClick={() => handleEditItem(item)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-gray-600 bg-gray-100 hover:bg-gray-200"
                              title="Edit item information"
                            >
                              <PencilIcon className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-600 bg-red-100 hover:bg-red-200"
                              title="Delete this item permanently"
                            >
                              <TrashIcon className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

        {/* Item View/Edit Modal */}
        <ItemModal
          item={modalMode === 'view' ? viewingItem : editingItem}
          isOpen={modalMode === 'view' ? !!viewingItem : !!editingItem}
          mode={modalMode}
          onClose={handleCloseModal}
          onSave={handleSaveItem}
        />

        {/* Delete Confirmation Modal */}
        <Dialog open={!!deleteModal} onClose={() => setDeleteModal(null)} className="relative z-50">
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="mx-auto max-w-md w-full rounded-xl bg-white p-6 shadow-xl">
              <DialogTitle className="text-lg font-semibold text-slate-900 mb-2">
                Delete Item
              </DialogTitle>
              <p className="text-sm text-slate-600 mb-4">
                Please provide a reason for deleting this item. This will be recorded in the audit log.
              </p>
              <textarea
                value={deleteModal?.reason || ''}
                onChange={(e) => setDeleteModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                placeholder="Reason for deletion (required)"
                rows={3}
                className={`${inputStyles} mb-4`}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={!deleteModal?.reason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
}