/**
 * Enhanced Image Upload Component
 *
 * Features:
 * - Drag & drop or click to upload
 * - Image preview before upload
 * - Client-side compression
 * - Image cropping with focal point
 * - Watermark configuration
 * - File validation (size, type)
 * - Progress indicator
 * - Multiple size variants displayed
 */

import { useCallback, useState } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  Crop,
  Droplet,
  Settings,
} from 'lucide-react';
import { ImageCropper, type CropArea } from './ImageCropper';

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

export interface ImageUploadResult {
  filename: string;
  urls: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  metadata: {
    productId: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
}

export interface WatermarkConfig {
  enabled: boolean;
  text?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
}

interface ImageUploadEnhancedProps {
  productId: string;
  currentImage?: string;
  onUploadSuccess?: (result: ImageUploadResult) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  enableCropping?: boolean;
  enableWatermark?: boolean;
  watermarkText?: string;
}

export function ImageUploadEnhanced({
  productId,
  currentImage,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 5,
  enableCropping = true,
  enableWatermark = false,
  watermarkText = '© KidKazz',
}: ImageUploadEnhancedProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [showWatermarkSettings, setShowWatermarkSettings] = useState(false);
  const [cropArea, setCropArea] = useState<CropArea | null>(null);

  // Watermark configuration
  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: enableWatermark,
    text: watermarkText,
    position: 'bottom-right',
    opacity: 0.7,
  });

  /**
   * Validate file
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPEG, PNG, WebP, or GIF.';
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  /**
   * Compress image before upload
   */
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          // Create canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file);
            return;
          }

          // Calculate new dimensions (max 2000x2000)
          let { width, height } = img;
          const maxDimension = 2000;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          // Set canvas size
          canvas.width = width;
          canvas.height = height;

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with compression
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            file.type,
            0.85 // 85% quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      // Validate
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onUploadError?.(validationError);
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);

      // Show cropper if enabled
      if (enableCropping) {
        setShowCropper(true);
      } else {
        // Upload directly without cropping
        await uploadImage(file, null);
      }
    },
    [maxSizeMB, enableCropping, onUploadError]
  );

  /**
   * Handle crop complete
   */
  const handleCropComplete = async (crop: CropArea) => {
    setCropArea(crop);
    setShowCropper(false);

    if (selectedFile) {
      await uploadImage(selectedFile, crop);
    }
  };

  /**
   * Upload image to server
   */
  const uploadImage = async (file: File, crop: CropArea | null) => {
    try {
      setIsUploading(true);

      // Compress image
      const compressedBlob = await compressImage(file);

      // Create form data
      const formData = new FormData();
      formData.append('file', compressedBlob, file.name);
      formData.append('productId', productId);

      if (crop) {
        formData.append('cropArea', JSON.stringify(crop));
      }

      if (watermark.enabled) {
        formData.append('watermark', JSON.stringify(watermark));
      }

      // Upload to server
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // Success
      onUploadSuccess?.(result.image);
      setPreview(result.image.urls.medium); // Show medium size preview
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  /**
   * Handle click to upload
   */
  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/gif';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    };
    input.click();
  };

  /**
   * Clear image
   */
  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    setCropArea(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-600">Uploading and optimizing...</p>
          </div>
        ) : preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-64 mx-auto rounded-lg"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
            {cropArea && (
              <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Crop className="w-3 h-3" />
                Cropped
              </div>
            )}
            {watermark.enabled && (
              <div className="absolute bottom-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                <Droplet className="w-3 h-3" />
                Watermarked
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {isDragging ? (
              <Upload className="w-12 h-12 text-blue-500" />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-400" />
            )}
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                JPEG, PNG, WebP, or GIF (max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Feature Toggles */}
      <div className="flex items-center gap-4">
        {enableCropping && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <Crop className="w-4 h-4" />
            <span>Auto-crop enabled</span>
          </label>
        )}

        {enableWatermark && (
          <button
            onClick={() => setShowWatermarkSettings(!showWatermarkSettings)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition"
          >
            <Settings className="w-4 h-4" />
            <span>Watermark settings</span>
          </button>
        )}
      </div>

      {/* Watermark Settings */}
      {showWatermarkSettings && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={watermark.enabled}
                onChange={(e) =>
                  setWatermark({ ...watermark, enabled: e.target.checked })
                }
                className="rounded"
              />
              Enable Watermark
            </label>
          </div>

          {watermark.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Watermark Text
                </label>
                <input
                  type="text"
                  value={watermark.text || ''}
                  onChange={(e) =>
                    setWatermark({ ...watermark, text: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="© KidKazz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position
                </label>
                <select
                  value={watermark.position || 'bottom-right'}
                  onChange={(e) =>
                    setWatermark({
                      ...watermark,
                      position: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="top-left">Top Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="center">Center</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opacity: {((watermark.opacity || 0.7) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={watermark.opacity || 0.7}
                  onChange={(e) =>
                    setWatermark({
                      ...watermark,
                      opacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>✓ Images are automatically compressed before upload</p>
        <p>✓ Multiple sizes generated (thumbnail, medium, large)</p>
        <p>✓ Converted to WebP format for 30-50% better compression</p>
        <p>✓ Served via Cloudflare CDN for fast loading</p>
        {enableCropping && <p>✓ Auto-cropping enabled for perfect framing</p>}
        {watermark.enabled && <p>✓ Watermark protection enabled</p>}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && preview && (
        <ImageCropper
          imageUrl={preview}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            // Upload without cropping if user cancels
            if (selectedFile) {
              uploadImage(selectedFile, null);
            }
          }}
          aspectRatio={1} // Square crop for product images
        />
      )}
    </div>
  );
}
