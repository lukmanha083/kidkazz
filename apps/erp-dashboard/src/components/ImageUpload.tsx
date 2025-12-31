/**
 * Image Upload Component
 *
 * Features:
 * - Drag & drop or click to upload
 * - Image preview before upload
 * - Client-side image compression
 * - File validation (size, type)
 * - Progress indicator
 * - Multiple size variants displayed
 * - Shadcn UI components with dark mode support
 */

import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

export interface ImageUploadResult {
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

interface ImageUploadProps {
  productId: string;
  currentImage?: string;
  onUploadSuccess?: (result: ImageUploadResult) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
}

/**
 * Renders an image upload UI for a product with drag-and-drop, preview, client-side compression, validation, and upload handling.
 *
 * @param productId - The product identifier included with the upload request.
 * @param currentImage - Optional initial image URL used as the preview.
 * @param onUploadSuccess - Optional callback invoked with the uploaded image result on successful upload.
 * @param onUploadError - Optional callback invoked with an error message when upload or validation fails.
 * @param maxSizeMB - Maximum allowed file size in megabytes (default: 5).
 * @returns The React element that provides the upload area, preview, status indicators, and error display.
 */
export function ImageUpload({
  productId,
  currentImage,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  /**
   * Validate file
   */
  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
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
      setUploadSuccess(false);

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

      // Compress and upload
      try {
        setIsUploading(true);

        // Compress image
        const compressedBlob = await compressImage(file);

        // Create form data
        const formData = new FormData();
        formData.append('file', compressedBlob, file.name);
        formData.append('productId', productId);

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
        setUploadSuccess(true);
        onUploadSuccess?.(result.image);
        // Show medium size preview with full URL
        setPreview(`${PRODUCT_SERVICE_URL}${result.image.urls.medium}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        onUploadError?.(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [productId, maxSizeMB, onUploadSuccess, onUploadError]
  );

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
    setError(null);
    setUploadSuccess(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-0">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/50 dark:border-border dark:hover:border-primary/50'
              }
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading and optimizing...</p>
              </div>
            ) : preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
                {uploadSuccess && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-500">
                      Upload successful
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {isDragging ? (
                  <Upload className="w-12 h-12 text-primary" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {isDragging ? 'Drop image here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    JPEG, PNG, WebP, or GIF (max {maxSizeMB}MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          ✓ Auto-compressed
        </Badge>
        <Badge variant="secondary" className="text-xs">
          ✓ Multiple sizes
        </Badge>
        <Badge variant="secondary" className="text-xs">
          ✓ CDN delivery
        </Badge>
      </div>
    </div>
  );
}