/**
 * Image Gallery Component
 *
 * Features:
 * - Multiple images per product (up to 10)
 * - Fetch images from database
 * - Upload with compression
 * - View image in modal
 * - Delete images
 * - Set primary image
 * - Drag & drop upload
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  Star,
  Trash2,
  Eye,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  readOnly?: boolean; // New: Read-only mode disables upload/delete actions
}

/**
 * Renders an image gallery for a product with upload, preview, delete, and primary-image support.
 *
 * Displays fetched product images in a responsive grid, provides a drag-and-drop / click-to-upload area
 * (including client-side validation and compression), an image preview modal, informational badges, and
 * a delete confirmation flow. Upload and delete actions refresh the gallery after success.
 *
 * @param productId - The product identifier whose images are displayed and managed
 * @param maxImages - Maximum number of images allowed for the product (default: 10)
 * @param readOnly - When true, hides upload controls and delete actions while still allowing image preview
 * @returns The ImageGallery React element containing the UI and interaction handlers described above
 */
export function ImageGallery({ productId, maxImages = 10, readOnly = false }: ImageGalleryProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewImage, setPreviewImage] = useState<ProductImage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

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

  // Validate file
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPEG, PNG, WebP, or GIF.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return null;
  };

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
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

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file);
              }
            },
            file.type,
            0.85
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Check if max images reached
      if (images.length >= maxImages) {
        toast.error('Maximum images reached', {
          description: `You can only upload up to ${maxImages} images per product.`,
        });
        return;
      }

      // Validate
      const validationError = validateFile(file);
      if (validationError) {
        toast.error('Invalid file', {
          description: validationError,
        });
        return;
      }

      try {
        setIsUploading(true);

        // Compress image
        const compressedBlob = await compressImage(file);

        // Create form data
        const formData = new FormData();
        formData.append('file', compressedBlob, file.name);
        formData.append('productId', productId);
        formData.append('isPrimary', images.length === 0 ? 'true' : 'false');
        formData.append('sortOrder', images.length.toString());

        // Upload to server
        const response = await fetch(`${PRODUCT_SERVICE_URL}/api/images/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        // Invalidate query to refresh images
        await queryClient.invalidateQueries({ queryKey: ['product-images', productId] });

        toast.success('Image uploaded successfully', {
          description: 'Image has been uploaded to R2 and saved to database',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        toast.error('Upload failed', {
          description: errorMessage,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [productId, images, maxImages, queryClient]
  );

  // Handle drag events
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

  // Handle click to upload
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

  // Handle delete image
  const handleDeleteImage = (imageId: string) => {
    setImageToDelete(imageId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete image
  const confirmDeleteImage = () => {
    if (imageToDelete) {
      deleteImageMutation.mutate(imageToDelete);
      setDeleteDialogOpen(false);
      setImageToDelete(null);
    }
  };

  // Handle view image
  const handleViewImage = (image: ProductImage) => {
    setPreviewImage(image);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading images...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Area - Hidden in read-only mode */}
      {!readOnly && (
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
                ${isUploading || images.length >= maxImages ? 'pointer-events-none opacity-50' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={!isUploading && images.length < maxImages ? handleClick : undefined}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Uploading to R2 and saving to database...</p>
                </div>
              ) : images.length >= maxImages ? (
                <div className="flex flex-col items-center gap-3">
                  <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  <p className="text-lg font-medium text-foreground">
                    Maximum images reached ({maxImages})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Delete an image to upload a new one
                  </p>
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
                      JPEG, PNG, WebP, or GIF (max {MAX_FILE_SIZE / (1024 * 1024)}MB) • {images.length}/{maxImages} images
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className={`relative group ${
                image.isPrimary ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-2">
                {/* Image */}
                <div className="aspect-square relative overflow-hidden rounded-md bg-muted">
                  <img
                    src={`${PRODUCT_SERVICE_URL}${image.urls.thumbnail}`}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                  />

                  {/* Primary Badge */}
                  {image.isPrimary && (
                    <Badge
                      variant="default"
                      className="absolute top-1 left-1 gap-1"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      Primary
                    </Badge>
                  )}

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleViewImage(image);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {/* Delete button - Hidden in read-only mode */}
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="rounded-full"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleDeleteImage(image.id);
                        }}
                        disabled={deleteImageMutation.isPending}
                      >
                        {deleteImageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* File name */}
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {image.originalName}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-foreground font-medium">No images uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload up to {maxImages} images for this product
            </p>
          </CardContent>
        </Card>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewImage?.originalName}</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img
                src={`${PRODUCT_SERVICE_URL}${previewImage.urls.large}`}
                alt={previewImage.originalName}
                className="w-full h-auto rounded-lg"
              />
              {previewImage.isPrimary && (
                <Badge className="absolute top-2 left-2">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Primary Image
                </Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          ✓ Uploaded to R2 bucket
        </Badge>
        <Badge variant="secondary" className="text-xs">
          ✓ Saved to database
        </Badge>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image
              from R2 storage and remove it from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setImageToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}