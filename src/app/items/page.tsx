'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ArrowDownTrayIcon,
  XMarkIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  TagIcon,
  ClockIcon,
  CurrencyPoundIcon,
} from '@heroicons/react/24/outline';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import Link from 'next/link';
import { inputStyles } from '@/utils/styles';

// ── Helpers ─────────────────────────────────────────────────────────
function daysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function downloadCSV(items: Item[], startDate: string, endDate: string) {
  const filtered = items.filter(item => {
    const d = new Date(item.date_found);
    return d >= new Date(startDate) && d <= new Date(endDate + 'T23:59:59');
  });

  const headers = ['ID', 'Title', 'Description', 'Category', 'Status', 'Date Found', 'Location', 'Color', 'Brand', 'Claims', 'Created At'];
  const rows = filtered.map(item => [
    item.id,
    `"${(item.title || '').replace(/"/g, '""')}"`,
    `"${(item.description || '').replace(/"/g, '""')}"`,
    item.category,
    item.status,
    new Date(item.date_found).toLocaleDateString('en-GB'),
    `"${(item.location_found || '').replace(/"/g, '""')}"`,
    item.color || '',
    item.brand || '',
    item.claim_count,
    new Date(item.created_at).toLocaleDateString('en-GB'),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `items-${startDate}-to-${endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}


export default function ItemsPage() {
  const { user, venue, isInitialized, isAuthenticated } = useAuthStore();
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<ItemStatus | ''>('');
  const [viewingItem, setViewingItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ itemId: string; reason: string } | null>(null);

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [exportEndDate, setExportEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadItems = useCallback(async (explicitVenueId?: string): Promise<void> => {
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
  }, [venue?.id, user?.venue_id]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated) return;

    const attemptLoad = async () => {
      const currentState = useAuthStore.getState();
      const vid = currentState.venue?.id || currentState.user?.venue_id;

      if (vid) {
        await loadItems(vid);
        return;
      }

      if (currentState.user && !currentState.venue) {
        try {
          const vResp = await api.venues.getMyVenue();
          if (vResp.success && vResp.data?.id) {
            currentState.setVenue(vResp.data);
            await loadItems(vResp.data.id);
            return;
          }
        } catch { /* swallow */ }
      }

      setTimeout(() => {
        const retryState = useAuthStore.getState();
        const retryVid = retryState.venue?.id || retryState.user?.venue_id;
        if (retryVid) loadItems(retryVid);
      }, 600);
    };

    void attemptLoad();
  }, [isInitialized, isAuthenticated, venue, user, loadItems]);

  const filteredItems = items.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
    const matchesStatus = selectedStatus === '' || item.status === selectedStatus ||
      (selectedStatus === 'collected' && COLLECTED_STATUSES.has(item.status));

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 text-white border-green-600';
      case 'claimed':
        return 'bg-yellow-500 text-white border-yellow-600';
      case 'paid':
        return 'bg-purple-500 text-white border-purple-600';
      case 'collected_code':
      case 'collected_nocode':
      case 'collected_courier':
      case 'collected':
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

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const pagedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats - count from items list
  const availableCount = items.filter(i => i.status === 'available').length;
  const claimedCount = items.filter(i => i.status === 'claimed').length;
  const paidCount = items.filter(i => i.status === 'paid').length;
  const collectedCount = items.filter(i => COLLECTED_STATUSES.has(i.status)).length;
  const expiredCount = items.filter(i => i.status === 'expired').length;

  const statusCards: {
    label: string; count: number; status: ItemStatus | '';
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; iconColor: string; iconBg: string;
    badge?: string; badgeColor?: string;
    subtitle: string; subtitleColor?: string;
  }[] = [
    {
      label: 'Available', count: availableCount, status: 'available',
      icon: ClipboardDocumentListIcon, iconColor: 'text-blue-500', iconBg: 'bg-blue-50',
      badge: 'Live', badgeColor: 'text-green-600 bg-green-100',
      subtitle: availableCount > 0 ? `${availableCount} items in storage` : 'No items in storage',
    },
    {
      label: 'Claimed', count: claimedCount, status: 'claimed',
      icon: CheckCircleIcon, iconColor: 'text-blue-500', iconBg: 'bg-blue-50',
      subtitle: claimedCount > 0 ? `${claimedCount} pending review` : 'No pending claims',
    },
    {
      label: 'Paid', count: paidCount, status: 'paid',
      icon: CurrencyPoundIcon, iconColor: 'text-purple-500', iconBg: 'bg-purple-50',
      subtitle: paidCount > 0 ? `${paidCount} awaiting collection` : 'No paid claims',
    },
    {
      label: 'Collected', count: collectedCount, status: 'collected',
      icon: TagIcon, iconColor: 'text-purple-500', iconBg: 'bg-purple-50',
      subtitle: collectedCount > 0 ? `${collectedCount} returned` : 'All clear for today',
    },
    {
      label: 'Expired', count: expiredCount, status: 'expired',
      icon: ClockIcon, iconColor: 'text-red-400', iconBg: 'bg-red-50',
      subtitle: expiredCount > 0
        ? `Avg ${Math.round(items.filter(i => i.status === 'expired').reduce((s, i) => s + daysAgo(i.date_found), 0) / expiredCount)} days`
        : 'Well within retention limits',
    },
  ];

  const formatStatusLabel = (status: string) => {
    if (status.startsWith('collected_')) return 'COLLECTED';
    return status.toUpperCase();
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Item Management</h1>
            <p className="text-slate-500 mt-1 text-sm">Manage and track lost items at your venue in real-time.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2 text-slate-500" />
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

        {/* Stats cards - clickable to filter */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusCards.map(card => {
            const isActive = selectedStatus === card.status;
            return (
              <button
                key={card.label}
                onClick={() => {
                  setSelectedStatus(isActive ? '' : card.status as ItemStatus);
                  setCurrentPage(1);
                }}
                className={`bg-white rounded-xl border p-4 text-left transition-all relative ${
                  isActive ? 'border-slate-900 shadow-sm ring-1 ring-slate-900' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Icon + badge row */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                  {card.badge && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${card.badgeColor}`}>
                      {card.badge}
                    </span>
                  )}
                </div>
                {/* Label */}
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{card.label}</div>
                {/* Count */}
                <div className="text-3xl font-bold text-gray-900">{card.count}</div>
                {/* Subtitle */}
                <div className={`text-xs mt-1 ${card.subtitleColor || 'text-gray-400'}`}>{card.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Search + Filters bar */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by item name, ID, or tags..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-300"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {/* Category dropdown */}
          <select
            className="py-2 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 appearance-none"
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
          {/* Active filter chips */}
          {(selectedStatus || selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStatus('');
                setSelectedCategory('');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              <XMarkIcon className="h-3 w-3 mr-1" />
              Clear filters
            </button>
          )}
        </div>

        {/* Items table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {error && (
            <div className="p-6 bg-red-50 border-l-4 border-red-400">
              <p className="text-red-700">{error}</p>
              <button onClick={() => loadItems()} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
                Try again
              </button>
            </div>
          )}

          {isLoading && (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto"></div>
              <p className="mt-3 text-sm text-slate-500">Loading items...</p>
            </div>
          )}

          {!isLoading && !error && isInitialized && isAuthenticated && user && !venue && !user.venue_id && (
            <div className="p-12 text-center text-slate-500">
              <p>Your account is not linked to a venue yet.</p>
              <p className="text-xs mt-2">Ask an admin to associate you with a venue.</p>
            </div>
          )}

          {!isLoading && !error && filteredItems.length === 0 && items.length === 0 && (venue || user?.venue_id) && (
            <div className="p-12 text-center text-slate-500">
              <p>No items found. Add your first lost item to get started.</p>
              <Link href="/items/add" className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Item
              </Link>
            </div>
          )}

          {!isLoading && !error && filteredItems.length === 0 && items.length > 0 && (
            <div className="p-12 text-center text-slate-500 text-sm">
              No items found matching your criteria.
            </div>
          )}

          {!isLoading && !error && filteredItems.length > 0 && (
            <>
              {/* Mobile cards */}
              <ul className="divide-y divide-gray-100 md:hidden">
                {pagedItems.map(item => (
                  <li key={item.id} className="p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      {item.images?.[0] ? (
                        <Image src={item.images[0]} alt={item.title} width={40} height={40} sizes="40px" quality={60} loading="lazy" className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">{item.title}</div>
                        <div className="text-xs text-slate-400">#{item.id?.slice(-5)} &middot; {item.description}</div>
                      </div>
                      <span className={`shrink-0 inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {formatStatusLabel(item.status)}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleViewItem(item)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="View"><EyeIcon className="h-4 w-4" /></button>
                      <button onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Item Details</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Date Found</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Claims</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pagedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {item.images?.[0] ? (
                              <Image src={item.images[0]} alt={item.title} width={40} height={40} sizes="40px" quality={60} loading="lazy" className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">{item.title}</div>
                              <div className="text-xs text-slate-400">#{item.id?.slice(-5)} &middot; {item.description?.slice(0, 30)}{(item.description?.length ?? 0) > 30 ? '…' : ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 uppercase tracking-wide">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                            {item.status === 'available' && <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />}
                            {formatStatusLabel(item.status)}
                          </span>
                          {item.status === 'expired' && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{daysAgo(item.date_found)} days</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(item.date_found).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                            {item.claim_count}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleViewItem(item)} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded transition-colors" title="View"><EyeIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleEditItem(item)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Edit"><PencilIcon className="h-4 w-4" /></button>
                            <button onClick={() => handleDeleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
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
                    if (totalPages <= 7) {
                      page = i + 1;
                    } else if (currentPage <= 4) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      page = totalPages - 6 + i;
                    } else {
                      page = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          page === currentPage
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
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

        {/* Export CSV Modal */}
        <Dialog open={showExportModal} onClose={() => setShowExportModal(false)} className="relative z-50">
          <DialogBackdrop className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="mx-auto max-w-sm w-full rounded-xl bg-white p-6 shadow-xl">
              <DialogTitle className="text-lg font-semibold text-slate-900 mb-1">
                Export Items as CSV
              </DialogTitle>
              <p className="text-sm text-slate-500 mb-4">Select a date range for the export.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className={`${inputStyles} pl-9`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className={`${inputStyles} pl-9`}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    downloadCSV(items, exportStartDate, exportEndDate);
                    setShowExportModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
                  Download CSV
                </button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      </div>
    </Layout>
  );
}
