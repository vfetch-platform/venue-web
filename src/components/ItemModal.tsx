'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { Item } from '@/types';
import {
  XMarkIcon,
  PhotoIcon,
  CalendarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { buttonStyles, inputStyles } from '@/utils/styles';
import { ITEM_CATEGORIES, COLLECTED_STATUSES } from '@/constants/items';

interface ItemModalProps {
  item: Item | null;
  isOpen: boolean;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSave?: (updatedItem: Item) => void;
}


export default function ItemModal({ item, isOpen, mode, onClose, onSave }: ItemModalProps) {
  const [editData, setEditData] = useState<Item | null>(item);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [markReleased, setMarkReleased] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  // Reset collection selection whenever a new item is opened or mode switches
  if (editData?.id !== item?.id && item) {
    setEditData(item);
    setMarkReleased(COLLECTED_STATUSES.has(item.status));
  }


  if (!isOpen || !item) {
    return null;
  }

  const isViewMode = mode === 'view';
  const currentData = isViewMode ? item : editData || item;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (isViewMode) return;

    const { name, value } = e.target;
    setEditData(prev => prev ? {
      ...prev,
      [name]: value,
    } : null);
  };


  const handleSave = async () => {
    if (!editData || !onSave) return;
    setIsLoading(true);
    try {
      const finalData: Item = markReleased
        ? { ...editData, status: 'released' }
        : editData;
      await new Promise(resolve => setTimeout(resolve, 1000));
      onSave(finalData);
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800';
      case 'released':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-slate-600 bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-hidden="true"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-modal-title"
        className="relative w-full max-w-2xl p-5 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 id="item-modal-title" className="text-lg font-medium text-slate-900">
            {isViewMode ? 'Item Details' : 'Edit Item'}
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Status Badge (View only) */}
          {isViewMode && (
            <div className="flex justify-between items-start">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(currentData.status)}`}>
                {currentData.status.replace('_', ' ').toUpperCase()}
              </span>
              <div className="text-sm text-slate-500">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Found: {new Date(currentData.date_found).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="flex items-center mt-1">
                  <TagIcon className="h-4 w-4 mr-1" />
                  Claims: {currentData.claim_count}
                </div>
              </div>
            </div>
          )}

          {/* Collection Section (Edit mode when reserved/claimed) */}
          {!isViewMode && item.status === 'reserved' && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={markReleased}
                  onChange={e => setMarkReleased(e.target.checked)}
                />
                Mark as released (item collected by owner)
              </label>
            </div>
          )}
          {/* Images */}
          {currentData.images && currentData.images.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                <PhotoIcon className="h-4 w-4 inline mr-1" />
                Photos ({currentData.images.length})
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentData.images.map((imageUrl, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const newTab = window.open(imageUrl, '_blank', 'noopener,noreferrer');
                        if (!newTab) {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      } catch (error) {
                        console.error('Failed to open image:', error);
                        window.location.href = imageUrl;
                      }
                    }}
                  >
                    <Image
                      src={imageUrl}
                      alt={`${currentData.title} - Photo ${index + 1}`}
                      width={300}
                      height={200}
                      sizes="(min-width: 1024px) 200px, (min-width: 768px) 250px, 100vw"
                      quality={60}
                      className="w-full h-32 object-cover rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const errorDiv = parent.querySelector('.error-fallback') as HTMLElement;
                          if (errorDiv) errorDiv.classList.remove('hidden');
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all duration-200 pointer-events-none"></div>
                    <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 rounded-full px-2 py-1 text-xs font-medium text-slate-600">
                      {index + 1}/{currentData.images.length}
                    </div>
                    {/* Error fallback */}
                    <div className="error-fallback hidden absolute inset-0 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                      <div className="text-center text-slate-500">
                        <PhotoIcon className="h-8 w-8 mx-auto mb-1" />
                        <p className="text-xs">Image unavailable</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Click on any image to view full size</p>
            </div>
          )}

          {/* No images placeholder */}
          {(!currentData.images || currentData.images.length === 0) && (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
              <PhotoIcon className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm font-medium">No photos available</p>
              <p className="text-xs text-slate-400 mt-1">Images help identify items more easily</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Item Title
              </label>
              {isViewMode ? (
                <p className="text-sm text-slate-900 font-medium">{currentData.title}</p>
              ) : (
                <input
                  type="text"
                  name="title"
                  className={inputStyles}
                  value={currentData.title}
                  onChange={handleInputChange}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              {isViewMode ? (
                <p className="text-sm text-slate-900 capitalize">{currentData.category}</p>
              ) : (
                <select
                  name="category"
                  className={inputStyles}
                  value={currentData.category}
                  onChange={handleInputChange}
                >
                  {ITEM_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            {isViewMode ? (
              <p className="text-sm text-slate-900">{currentData.description}</p>
            ) : (
              <textarea
                name="description"
                rows={3}
                className={inputStyles}
                value={currentData.description}
                onChange={handleInputChange}
              />
            )}
          </div>

          {/* Location Found */}
          {(currentData.location_found || !isViewMode) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Room / Location Found
              </label>
              {isViewMode ? (
                <p className="text-sm text-slate-900">{currentData.location_found}</p>
              ) : (
                <input
                  type="text"
                  name="location_found"
                  className={inputStyles}
                  value={currentData.location_found || ''}
                  onChange={handleInputChange}
                />
              )}
            </div>
          )}

          {/* Item Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(currentData.color || !isViewMode) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Color
                </label>
                {isViewMode ? (
                  <p className="text-sm text-slate-900">{currentData.color}</p>
                ) : (
                  <input
                    type="text"
                    name="color"
                    className={inputStyles}
                    value={currentData.color || ''}
                    onChange={handleInputChange}
                  />
                )}
              </div>
            )}

            {(currentData.brand || !isViewMode) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Brand
                </label>
                {isViewMode ? (
                  <p className="text-sm text-slate-900">{currentData.brand}</p>
                ) : (
                  <input
                    type="text"
                    name="brand"
                    className={inputStyles}
                    value={currentData.brand || ''}
                    onChange={handleInputChange}
                  />
                )}
              </div>
            )}

            {(currentData.model || !isViewMode) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Model
                </label>
                {isViewMode ? (
                  <p className="text-sm text-slate-900">{currentData.model}</p>
                ) : (
                  <input
                    type="text"
                    name="model"
                    className={inputStyles}
                    value={currentData.model || ''}
                    onChange={handleInputChange}
                  />
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {currentData.tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {currentData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className={buttonStyles.secondary}
          >
            {isViewMode ? 'Close' : 'Cancel'}
          </button>
          {!isViewMode && (
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={buttonStyles.primary}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
