'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PhotoIcon, SparklesIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { buttonStyles, inputStyles } from '@/utils/styles';
import { api } from '@/services/api';

interface ExtractedFeaturesPayload {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  color?: string;
  brand?: string;
  model?: string;
  locationFound?: string;
}

interface AIImageAnalysisProps {
  // Sends full extracted feature object so parent can populate multiple fields
  onDescriptionGenerated: (features: ExtractedFeaturesPayload) => void;
  onImagesSelected: (images: File[]) => void;
}

interface AIAnalysisResult {
  description: string;
  suggestedTitle?: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
  confidence?: number;
}

export default function AIImageAnalysis({ onDescriptionGenerated, onImagesSelected }: AIImageAnalysisProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<ExtractedFeaturesPayload>({});

  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      alert('Some files were skipped. Please ensure all files are images under 10MB.');
    }

    setSelectedImages(validFiles);
    onImagesSelected(validFiles);

    // Create preview URLs
    const urls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);

    // Reset analysis state
    setAnalysisResult(null);
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);

    // Revoke the URL to free memory
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedImages(newImages);
    setPreviewUrls(newUrls);
    onImagesSelected(newImages);

    if (newImages.length === 0) {
      setAnalysisResult(null);
    }
  };

  const analyzeImages = async () => {
    if (selectedImages.length === 0) return;

    setIsAnalyzing(true);

    try {
      // Use real backend AI extraction (first image only currently supported by API)
      const response = await api.items.extractFeatures(selectedImages[0]);

      if (!response.success) {
        throw new Error(response.error || 'AI feature extraction failed');
      }

      const analysis = response.data || {};

      setAnalysisResult({
        description: analysis.description || '',
        suggestedTitle: analysis.title,
        suggestedCategory: analysis.category,
        suggestedTags: Array.isArray(analysis.tags) ? analysis.tags : [],
        confidence: undefined,
      });

      // Store extracted features for review modal
      setReviewData({
        title: analysis.title || '',
        description: analysis.description || '',
        category: analysis.category || '',
        tags: Array.isArray(analysis.tags) ? analysis.tags : [],
        color: analysis.color || '',
        brand: analysis.brand || '',
        model: analysis.model || '',
        locationFound: analysis.locationFound || '',
      });
      setShowReviewModal(true);
    } catch (error) {
      console.error('Error analyzing images:', error);
      let message = 'Failed to analyze images. Please try again or enter description manually.';
      if (error instanceof Error && /not available|not configured/i.test(error.message)) {
        message = 'AI analysis is not currently available. You can still enter a description manually.';
      }
      alert(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptReview = () => {
    onDescriptionGenerated(reviewData);
    setShowReviewModal(false);
  };

  const handleDiscardReview = () => {
    setShowReviewModal(false);
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <PhotoIcon className="h-4 w-4 inline mr-1" />
          Upload Images for AI Analysis
        </label>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            multiple
            accept="image/*,.heic,.heif"
            onChange={handleImageSelection}
            className="hidden"
            id="ai-images"
          />
          <label htmlFor="ai-images" className="cursor-pointer">
            <SparklesIcon className="mx-auto h-12 w-12 text-blue-500" />
            <span className="mt-2 block text-sm font-medium text-gray-900">
              Upload photos for AI description
            </span>
            <span className="mt-1 block text-sm text-gray-500">
              PNG, JPG, GIF, HEIC up to 10MB each
            </span>
            <span className="mt-2 block text-xs text-blue-600">
              AI will analyze your images and generate a detailed description
            </span>
          </label>
        </div>
      </div>

      {/* Image Previews */}
      {previewUrls.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Images</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewUrls.map((url, index) => (
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
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Analyze Button */}
          {!analysisResult && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={analyzeImages}
                disabled={isAnalyzing}
                className={`${buttonStyles.primary} inline-flex items-center`}
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                {isAnalyzing ? 'Analyzing Images...' : 'Generate AI Description'}
              </button>
            </div>
          )}

          {/* Re-analyze button if already analyzed */}
          {analysisResult && (
            <div className="mt-4 text-center space-x-3">
              <span className="text-sm text-green-600 font-medium">AI analysis complete</span>
              <button
                type="button"
                onClick={() => setShowReviewModal(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Review results
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Upload Fallback */}
      {selectedImages.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Or continue with manual description entry below
          </p>
        </div>
      )}

      {/* AI Review Modal */}
      <Dialog open={showReviewModal} onClose={() => setShowReviewModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto max-w-lg w-full rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-blue-500" />
              Review AI Results
            </DialogTitle>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={reviewData.title || ''}
                  onChange={(e) => setReviewData(d => ({ ...d, title: e.target.value }))}
                  className={inputStyles}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  value={reviewData.description || ''}
                  onChange={(e) => setReviewData(d => ({ ...d, description: e.target.value }))}
                  rows={3}
                  className={inputStyles}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={reviewData.category || ''}
                    onChange={(e) => setReviewData(d => ({ ...d, category: e.target.value }))}
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input
                    type="text"
                    value={reviewData.color || ''}
                    onChange={(e) => setReviewData(d => ({ ...d, color: e.target.value }))}
                    className={inputStyles}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                  <input
                    type="text"
                    value={reviewData.brand || ''}
                    onChange={(e) => setReviewData(d => ({ ...d, brand: e.target.value }))}
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Model</label>
                  <input
                    type="text"
                    value={reviewData.model || ''}
                    onChange={(e) => setReviewData(d => ({ ...d, model: e.target.value }))}
                    className={inputStyles}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={(reviewData.tags || []).join(', ')}
                  onChange={(e) => setReviewData(d => ({
                    ...d,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean),
                  }))}
                  className={inputStyles}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleDiscardReview}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleAcceptReview}
                className={`${buttonStyles.primary} inline-flex items-center`}
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Accept &amp; Populate Form
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
