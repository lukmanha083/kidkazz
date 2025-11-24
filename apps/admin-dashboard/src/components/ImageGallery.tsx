/**
 * Image Gallery Component
 *
 * Features:
 * - Multiple images per product
 * - Fetch images from database
 * - Drag & drop reordering
 * - Primary image selection
 * - Image preview modal
 * - Upload with compression
 * - Delete confirmation
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  X,
  Star,
  Trash2,
  GripVertical,
  Eye,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

export interface ProductImage {
  id: string;
  productId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  urls: {
    thumbnail: string;
    medium: string;
    large: string;
    original: string;
  };
  isPrimary: boolean;
  sortOrder: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ImageGalleryProps {
  productId: string;
  maxImages?: number;
}

export function ImageGallery({
  productId,
  maxImages = 10,
}: ImageGalleryProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch images for this product
  const { data: imagesData, isLoading } = useQuery({
    queryKey: ['product-images', productId],
    queryFn: async () => {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/images/product/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      const data = await response.json();
      return data.images as ProductImage[];
    },
    enabled: !!productId,
  });

  const images = imagesData || [];

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/images/image/${imageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete image');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-images', productId] });
      toast.success('Image deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete image', {
        description: error.message,
      });
    },
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (files: FileList) => {
      if (images.length + files.length > maxImages) {
        setUploadError(`Maximum ${maxImages} images allowed`);
        return;
      }

      setUploadError(null);

      // Show cropper for first image
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setCropImage({
          url: e.target?.result as string,
          file,
          tempId: `temp-${Date.now()}`,
        });
      };
      reader.readAsDataURL(file);
    },
    [images.length, maxImages]
  );

  /**
   * Upload image after cropping
   */
  const handleCropComplete = useCallback(
    async (cropArea: CropArea) => {
      if (!cropImage) return;

      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append('file', cropImage.file);
        formData.append('productId', productId);
        formData.append('cropArea', JSON.stringify(cropArea));
        formData.append('isPrimary', images.length === 0 ? 'true' : 'false');
        formData.append('sortOrder', images.length.toString());

        const response = await fetch(
          'http://localhost:8788/api/images/upload',
          {
            method: 'POST',
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();

        // Add to images array
        const newImage: ProductImage = {
          id: result.image.filename,
          filename: result.image.filename,
          urls: result.image.urls,
          isPrimary: images.length === 0,
          sortOrder: images.length,
        };

        onImagesChange([...images, newImage]);
        setCropImage(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed';
        setUploadError(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [cropImage, productId, images, onImagesChange]
  );

  /**
   * Set primary image
   */
  const handleSetPrimary = (index: number) => {
    const updatedImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(updatedImages);
  };

  /**
   * Delete image
   */
  const handleDelete = async (index: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    const imageToDelete = images[index];

    try {
      // Delete from server
      await fetch(
        `http://localhost:8788/api/images/${imageToDelete.filename}`,
        {
          method: 'DELETE',
        }
      );

      // Remove from array and reorder
      const updatedImages = images
        .filter((_, i) => i !== index)
        .map((img, i) => ({
          ...img,
          sortOrder: i,
          // If deleted image was primary, make first image primary
          isPrimary: imageToDelete.isPrimary && i === 0 ? true : img.isPrimary,
        }));

      onImagesChange(updatedImages);
    } catch (err) {
      setUploadError('Failed to delete image');
    }
  };

  /**
   * Drag & drop reordering
   */
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedImages = [...images];
    const [draggedImage] = updatedImages.splice(draggedIndex, 1);
    updatedImages.splice(index, 0, draggedImage);

    // Update sort order
    const reordered = updatedImages.map((img, i) => ({
      ...img,
      sortOrder: i,
    }));

    onImagesChange(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      {images.length < maxImages && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
          <input
            type="file"
            id="gallery-upload"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple={false}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files);
              }
            }}
          />
          <label
            htmlFor="gallery-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <div>
              <p className="font-medium text-gray-700">
                Click to upload image
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {images.length} / {maxImages} images
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                image.isPrimary
                  ? 'border-yellow-400'
                  : 'border-gray-200 hover:border-gray-300'
              } transition cursor-move`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Image */}
              <img
                src={image.urls.thumbnail}
                alt={`Product image ${index + 1}`}
                className="w-full aspect-square object-cover"
              />

              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Drag Handle */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition">
                <GripVertical className="w-4 h-4" />
              </div>

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {/* Preview */}
                <button
                  onClick={() => setPreviewImage(image)}
                  className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Set Primary */}
                {!image.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(index)}
                    className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition"
                    title="Set as primary"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(index)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sort Order */}
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                #{index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Upload className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No images uploaded yet</p>
          <p className="text-sm mt-1">Add up to {maxImages} images</p>
        </div>
      )}

      {/* Image Cropper Modal */}
      {cropImage && (
        <ImageCropper
          imageUrl={cropImage.url}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropImage(null)}
          aspectRatio={1} // Square crop for product images
        />
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage.urls.large}
              alt="Preview"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
