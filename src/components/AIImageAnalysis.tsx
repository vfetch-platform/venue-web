'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { PhotoIcon, SparklesIcon, XMarkIcon, CheckIcon, CameraIcon } from '@heroicons/react/24/outline';
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
  onSkipToManual: () => void;
}

interface AIAnalysisResult {
  description: string;
  suggestedTitle?: string;
  suggestedCategory?: string;
  suggestedTags?: string[];
  confidence?: number;
}

const MAX_RETRIES = 3;

export default function AIImageAnalysis({ onDescriptionGenerated, onImagesSelected, onSkipToManual }: AIImageAnalysisProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState<ExtractedFeaturesPayload>({});

  // Camera state
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopStream = useCallback((s: MediaStream | null) => {
    s?.getTracks().forEach(t => t.stop());
  }, []);

  const openCamera = useCallback(async () => {
    setCameraError(null);
    setShowCameraModal(true);

    // Check permission state first so we can surface a clear error
    // before getUserMedia triggers the browser popup
    if (navigator.permissions) {
      try {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (status.state === 'denied') {
          setCameraError('Camera access is blocked. Please allow camera access in your browser settings and try again.');
          return;
        }
      } catch {
        // permissions.query may not support 'camera' in all browsers — fall through
      }
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access when prompted, or enable it in your browser settings.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Could not start camera. Please try uploading a file instead.');
      }
    }
  }, []);

  const closeCamera = useCallback(() => {
    stopStream(stream);
    setStream(null);
    setCameraError(null);
    setShowCameraModal(false);
  }, [stream, stopStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url = URL.createObjectURL(file);
      const newImages = [...selectedImages, file];
      const newUrls = [...previewUrls, url];
      setSelectedImages(newImages);
      setPreviewUrls(newUrls);
      onImagesSelected(newImages);
      setAnalysisResult(null);
      closeCamera();
    }, 'image/jpeg', 0.92);
  }, [selectedImages, previewUrls, onImagesSelected, closeCamera]);

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
    setAnalysisError(null);

    try {
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
      const message = error instanceof Error && /not available|not configured/i.test(error.message)
        ? 'AI analysis is not currently available.'
        : 'Failed to analyze images. Please try again.';
      setAnalysisError(message);
      setRetryCount(c => c + 1);
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
          <SparklesIcon className="mx-auto h-12 w-12 text-blue-500" />
          <p className="mt-2 text-sm text-gray-500">PNG, JPG, GIF, HEIC up to 10MB each</p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <label
              htmlFor="ai-images"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <PhotoIcon className="h-4 w-4" />
              Upload photos
            </label>
            <button
              type="button"
              onClick={openCamera}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <CameraIcon className="h-4 w-4" />
              Use camera
            </button>
          </div>
          <p className="mt-3 text-xs text-blue-600">AI will analyze your images and generate a detailed description</p>
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

          {/* Analyze / error / success */}
          {!analysisResult && !analysisError && (
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

          {analysisError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-4 text-center space-y-3">
              <p className="text-sm text-red-700">{analysisError}</p>
              <div className="flex items-center justify-center gap-3">
                {retryCount < MAX_RETRIES && (
                  <button
                    type="button"
                    onClick={analyzeImages}
                    disabled={isAnalyzing}
                    className={`${buttonStyles.primary} inline-flex items-center`}
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    {isAnalyzing ? 'Retrying…' : `Retry (${MAX_RETRIES - retryCount} left)`}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSkipToManual}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Fill in manually
                </button>
              </div>
              {retryCount >= MAX_RETRIES && (
                <p className="text-xs text-red-500">Maximum retries reached.</p>
              )}
            </div>
          )}

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

      {/* Camera Modal */}
      <Dialog open={showCameraModal} onClose={closeCamera} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="mx-auto w-full max-w-lg rounded-xl bg-black overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
              <DialogTitle className="text-sm font-medium text-white flex items-center gap-2">
                <CameraIcon className="h-4 w-4" />
                Take photo
              </DialogTitle>
              <button type="button" onClick={closeCamera} className="text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-sm text-red-400">{cameraError}</p>
                <button type="button" onClick={closeCamera} className={buttonStyles.secondary}>
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full aspect-video object-cover bg-black"
                  onCanPlay={e => (e.currentTarget.play())}
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex justify-center py-4 bg-gray-900">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg"
                    aria-label="Capture photo"
                  >
                    <div className="w-11 h-11 rounded-full border-2 border-gray-400" />
                  </button>
                </div>
              </>
            )}
          </DialogPanel>
        </div>
      </Dialog>

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
