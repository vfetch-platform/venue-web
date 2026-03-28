'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import AIImageAnalysis from '@/components/AIImageAnalysis';
import { CreateItemForm, ItemCategory } from '@/types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { buttonStyles, cardStyles, inputStyles } from '@/utils/styles';

import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth';

const categories: ItemCategory[] = [
  'phones', 'wallets', 'keys', 'bags', 'clothing', 
  'jewelry', 'electronics', 'cards', 'documents', 'other'
];

export default function AddItemPage() {
  const router = useRouter();
  const { venue } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateItemForm>({
    title: '',
    description: '',
    category: 'other',
    dateFound: new Date().toISOString().split('T')[0],
    tags: [],
    color: '',
    brand: '',
    model: '',
    serialNumber: '',
    locationFound: venue?.address || '',
    images: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [formUnlocked, setFormUnlocked] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()],
        }));
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

interface GeneratedFeatures {
    title?: string;
    description?: string;
    category?: string; // raw string from AI, validated against ItemCategory list when applying
    color?: string;
    brand?: string;
    model?: string;
    tags?: string[];
  }

  const handleAIDescriptionGenerated = (features: GeneratedFeatures) => {
    setFormData(prev => ({
      ...prev,
      title: features.title || prev.title,
      description: features.description || prev.description,
      category: (features.category && categories.includes(features.category as ItemCategory)
        ? features.category as ItemCategory
        : prev.category),
      color: features.color || prev.color,
      brand: features.brand || prev.brand,
      model: features.model || prev.model,
      tags: features.tags?.length ? features.tags : prev.tags,
      locationFound: prev.locationFound,
    }));
    setFormUnlocked(true);
  };

  const handleAIImagesSelected = (images: File[]) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.items.create(formData);
      router.push('/items');
    } catch (error) {
      console.error('Error creating item:', error);
      // TODO: Show proper error message to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Found Item</h1>
          <p className="text-gray-600 mt-1">
            Register a new lost item found at your venue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={`${cardStyles} p-6 space-y-6`}>
          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Photos
            </label>
            <AIImageAnalysis
              onDescriptionGenerated={handleAIDescriptionGenerated}
              onImagesSelected={handleAIImagesSelected}
              onSkipToManual={() => setFormUnlocked(true)}
            />
          </div>

          {formUnlocked && <>
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Item Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className={inputStyles}
                placeholder="e.g., iPhone 14 Pro"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                required
                className={inputStyles}
                value={formData.category}
                onChange={handleInputChange}
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              className={inputStyles}
              placeholder="Describe the item in detail..."
              value={formData.description}
              onChange={handleInputChange}
            />
          </div>

          {/* Date Found */}
          <div>
            <label htmlFor="dateFound" className="block text-sm font-medium text-gray-700 mb-1">
              Date Found *
            </label>
            <input
              type="date"
              id="dateFound"
              name="dateFound"
              required
              className={inputStyles}
              value={formData.dateFound}
              onChange={handleInputChange}
            />
          </div>

          {/* Item Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <input
                type="text"
                id="color"
                name="color"
                className={inputStyles}
                placeholder="e.g., Black, Red"
                value={formData.color}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                className={inputStyles}
                placeholder="e.g., Apple, Nike"
                value={formData.brand}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                className={inputStyles}
                placeholder="e.g., iPhone 14 Pro"
                value={formData.model}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {/* Serial Number */}
          <div>
            <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number
            </label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber"
              className={inputStyles}
              placeholder="If visible/accessible"
              value={formData.serialNumber}
              onChange={handleInputChange}
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              placeholder="Type a tag and press Enter"
              className={inputStyles}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-primary-600 hover:text-primary-800"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          </>}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className={buttonStyles.secondary}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={buttonStyles.primary}
            >
              {isLoading ? 'Creating Item...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}