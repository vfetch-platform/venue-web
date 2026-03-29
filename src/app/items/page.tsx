'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Layout from '@/components/Layout';
import ItemModal from '@/components/ItemModal';
import { useAuthStore } from '@/store/auth';
import { Item, ItemStatus } from '@/types';
import { api } from '@/services/api';
import { ITEM_CATEGORIES, COLLECTED_STATUSES } from '@/constants/items';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import Link from 'next/link';
import { inputStyles } from '@/utils/styles';


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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const pagedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats
  const availableCount = items.filter(i => i.status === 'available').length;
  const claimedCount = items.filter(i => i.status === 'claimed').length;
  const collectedCount = items.filter(i => COLLECTED_STATUSES.has(i.status)).length;
  const expiredCount = items.filter(i => i.status === 'expired').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Item Management</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage and track lost items at your venue in real-time.</p>
          </div>
          <div className="flex gap-3">
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Data
            </button>
            <Link
              href="/items/add"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Item
            </Link>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Available */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 relative">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded uppercase tracking-wide">Live</span>
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Available</div>
            <div className="text-3xl font-bold text-gray-900">{availableCount}</div>
            <div className="text-xs text-green-600 mt-1 font-medium">↑ +2 since yesterday</div>
          </div>
          {/* Claimed */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-3">
              <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Claimed</div>
            <div className="text-3xl font-bold text-gray-900">{claimedCount}</div>
            <div className="text-xs text-gray-400 mt-1">No pending claims</div>
          </div>
          {/* Collected */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3">
              <svg className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Collected</div>
            <div className="text-3xl font-bold text-gray-900">{collectedCount}</div>
            <div className="text-xs text-gray-400 mt-1">All clear for today</div>
          </div>
          {/* Expired */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-3">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Expired</div>
            <div className="text-3xl font-bold text-gray-900">{expiredCount}</div>
            <div className="text-xs text-gray-400 mt-1">Well within retention limits</div>
          </div>
        </div>

        {/* Search + Filters bar */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by item name, ID, or notes..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-teal-300"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {/* Filter icon button */}
          <button className="p-2 border border-gray-200 rounded-lg bg-white text-gray-500 hover:bg-gray-50 transition-colors" title="More filters">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
          {/* Category dropdown */}
          <select
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 appearance-none"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
          >
            <option value="">All Categories</option>
            {ITEM_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          {/* Status dropdown */}
          <select
            className="py-2 pl-3 pr-8 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-500 appearance-none"
            value={selectedStatuses.size === 0 ? '' : Array.from(selectedStatuses)[0]}
            onChange={(e) => {
              setCurrentPage(1);
              if (!e.target.value) {
                setSelectedStatuses(new Set());
              } else {
                setSelectedStatuses(new Set([e.target.value as ItemStatus]));
              }
            }}
          >
            <option value="">Active Only</option>
            <option value="available">Available</option>
            <option value="claimed">Claimed</option>
            <option value="collected_code">Collected</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {/* Items table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Error State */}
          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
              <button onClick={() => loadItems()} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
                Try again
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-500">Loading items...</p>
            </div>
          )}

          {/* Empty State - no venue linked */}
          {!isLoading && !error && isInitialized && isAuthenticated && user && !venue && !user.venue_id && (
            <div className="p-12 text-center text-gray-500">
              <p>Your account is not linked to a venue yet.</p>
              <p className="text-xs mt-2">Ask an admin to associate you with a venue.</p>
            </div>
          )}

          {/* Empty State - no items */}
          {!isLoading && !error && filteredItems.length === 0 && items.length === 0 && (venue || user?.venue_id) && (
            <div className="p-12 text-center text-gray-500">
              <p>No items found. Add your first lost item to get started.</p>
              <Link href="/items/add" className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Item
              </Link>
            </div>
          )}

          {/* Filter empty */}
          {!isLoading && !error && filteredItems.length === 0 && items.length > 0 && (
            <div className="p-12 text-center text-gray-500 text-sm">
              No items found matching your criteria.
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && filteredItems.length > 0 && (
            <>
              {/* Mobile cards */}
              <ul className="divide-y divide-gray-100 md:hidden">
                {pagedItems.map(item => (
                  <li key={item.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      {item.images?.[0] ? (
                        <Image src={item.images[0]} alt={item.title} width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                        <div className="text-xs text-gray-400">#{item.id?.slice(-5)} • {item.description}</div>
                      </div>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status === 'available' ? '● AVAILABLE' : item.status.replace('collected_', 'collected ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleViewItem(item)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="View"><EyeIcon className="h-4 w-4" /></button>
                      <button onClick={() => handleEditItem(item)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Item Details</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Found</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Claims</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.images?.[0] ? (
                              <Image src={item.images[0]} alt={item.title} width={40} height={40} className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                              <div className="text-xs text-gray-400">#{item.id?.slice(-5)} • {item.description?.slice(0, 30)}{item.description?.length > 30 ? '…' : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 text-gray-700 uppercase tracking-wide">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status === 'available' && <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />}
                            {item.status === 'available' ? 'AVAILABLE' : item.status.replace('collected_', 'collected ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(item.date_found).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <div className="text-xs text-gray-400">{new Date(item.date_found).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {item.claim_count}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleViewItem(item)} className="p-1.5 text-gray-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors" title="View"><EyeIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleEditItem(item)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                        page === currentPage
                          ? 'bg-slate-900 text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </>
          )}
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
          <DialogBackdrop className="fixed inset-0 bg-black/30" />
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