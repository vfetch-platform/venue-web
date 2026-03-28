'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import AIImageAnalysis from '@/components/AIImageAnalysis';
import { CreateItemForm, ItemCategory } from '@/types';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { buttonStyles, cardStyles, inputStyles } from '@/utils/styles';

import { apiClient } from '@/lib/api';

const categories: ItemCategory[] = [
  'phones', 'wallets', 'keys', 'bags', 'clothing', 
  'jewelry', 'electronics', 'cards', 'documents', 'other'
];

export default function AddItemPage() {
  const router = useRouter();
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
    locationFound: '',
    images: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [useAI, setUseAI] = useState(false);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // TODO: Validate file types and sizes
    setFormData(prev => ({
      ...prev,
      images: files,
    }));

    // Create preview URLs
    const previewUrls = files.map(file => URL.createObjectURL(file));
    setPreviewImages(previewUrls);
  };

  interface GeneratedFeatures {
    title?: string;
    description?: string;
    category?: string; // raw string from AI, validated against ItemCategory list when applying
    color?: string;
    brand?: string;
    model?: string;
    tags?: string[];
    locationFound?: string;
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
      locationFound: features.locationFound || prev.locationFound,
    }));
  };

  const handleAIImagesSelected = (images: File[]) => {
    setFormData(prev => ({
      ...prev,
      images,
    }));

    // Create preview URLs
    const previewUrls = images.map(file => URL.createObjectURL(file));
    setPreviewImages(previewUrls);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images?.filter((_, i) => i !== index) || [];
    const newPreviews = previewImages.filter((_, i) => i !== index);
    
    setFormData(prev => ({
      ...prev,
      images: newImages,
    }));
    setPreviewImages(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiClient.createItem(formData);
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
          {/* Photos (moved to top so AI can prefill description) */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Photos
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="imageMethod"
                    checked={useAI}
                    onChange={() => setUseAI(true)}
                    className="mr-2"
                  />
                  <span className="text-sm">AI-Assisted</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="imageMethod"
                    checked={!useAI}
                    onChange={() => setUseAI(false)}
                    className="mr-2"
                  />
                  <span className="text-sm">Manual Upload</span>
                </label>
              </div>
            </div>

            {useAI ? (
              <AIImageAnalysis
                onDescriptionGenerated={handleAIDescriptionGenerated}
                onImagesSelected={handleAIImagesSelected}
              />
            ) : (
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    accept="image/*,.heic,.heif"
                    onChange={handleImageChange}
                    className="hidden"
                    id="images"
                  />
                  <label htmlFor="images" className="cursor-pointer">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Upload photos
                    </span>
                    <span className="mt-1 block text-sm text-gray-500">
                      PNG, JPG, GIF, HEIC up to 10MB each
                    </span>
                  </label>
                </div>

                {/* Manual Image Previews */}
                {previewImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {previewImages.map((url, index) => (
                      <div key={index} className="relative">
                        <Image
                          src={url}
                          alt={`Preview ${index + 1}`}
                          width={200}
                          height={200}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

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

          {/* Date and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label htmlFor="locationFound" className="block text-sm font-medium text-gray-700 mb-1">
                Location Found
              </label>
              <input
                type="text"
                id="locationFound"
                name="locationFound"
                className={inputStyles}
                placeholder="e.g., Table 5, Near bar counter"
                value={formData.locationFound}
                onChange={handleInputChange}
              />
            </div>
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