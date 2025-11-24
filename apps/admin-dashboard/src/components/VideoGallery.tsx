/**
 * Video Gallery Component
 *
 * Features:
 * - Multiple videos per product (up to 5)
 * - Fetch videos from database
 * - Support R2 and Cloudflare Stream modes
 * - View video in modal with player
 * - Delete videos
 * - Set primary video
 * - Drag & drop upload
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  X,
  Star,
  Trash2,
  Play,
  Loader2,
  Film,
  CloudUpload,
  HardDrive,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export interface ProductVideo {
  id: string;
  productId: string;
  filename: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  isPrimary: boolean;
  sortOrder: number;
  storageMode: 'r2' | 'stream';
  streamId: string | null;
  streamStatus: string | null;
  urls: {
    original: string | null;
    hls: string | null;
    dash: string | null;
    thumbnail: string | null;
    download: string | null;
  };
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface VideoGalleryProps {
  productId: string;
  maxVideos?: number;
  defaultMode?: 'r2' | 'stream';
}

export function VideoGallery({
  productId,
  maxVideos = 5,
  defaultMode = 'r2' // Default to R2 mode since Stream requires API token
}: VideoGalleryProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<ProductVideo | null>(null);
  const [uploadMode, setUploadMode] = useState<'r2' | 'stream'>(defaultMode);

  // Fetch videos for this product
  const { data: videosData, isLoading } = useQuery({
    queryKey: ['product-videos', productId],
    queryFn: async () => {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/videos/product/${productId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      return data.videos as ProductVideo[];
    },
    enabled: !!productId,
  });

  const videos = videosData || [];

  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: string) => {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/videos/video/${videoId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete video');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-videos', productId] });
      toast.success('Video deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete video', {
        description: error.message,
      });
    },
  });

  // Validate file
  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ];
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload MP4, WebM, MOV, AVI, or MKV.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return null;
  };

  // Handle file upload
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Check if max videos reached
      if (videos.length >= maxVideos) {
        toast.error('Maximum videos reached', {
          description: `You can only upload up to ${maxVideos} videos per product.`,
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

        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', productId);
        formData.append('mode', uploadMode);
        formData.append('isPrimary', videos.length === 0 ? 'true' : 'false');
        formData.append('sortOrder', videos.length.toString());

        // Upload to server
        const response = await fetch(`${PRODUCT_SERVICE_URL}/api/videos/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        // Invalidate query to refresh videos
        await queryClient.invalidateQueries({ queryKey: ['product-videos', productId] });

        toast.success('Video uploaded successfully', {
          description: uploadMode === 'stream'
            ? 'Video uploaded to Cloudflare Stream and saved to database'
            : 'Video uploaded to R2 and saved to database',
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
    [productId, videos, maxVideos, uploadMode, queryClient]
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
    input.accept = 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    };
    input.click();
  };

  // Handle delete video
  const handleDeleteVideo = (videoId: string) => {
    if (confirm('Are you sure you want to delete this video?')) {
      deleteVideoMutation.mutate(videoId);
    }
  };

  // Handle view video
  const handleViewVideo = (video: ProductVideo) => {
    setPreviewVideo(video);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading videos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Upload Mode</label>
              <Select value={uploadMode} onValueChange={(value: 'r2' | 'stream') => setUploadMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="r2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      <span>R2 Basic Storage (Cost-effective)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="stream">
                    <div className="flex items-center gap-2">
                      <CloudUpload className="w-4 h-4" />
                      <span>Cloudflare Stream (Optimized)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-xs text-muted-foreground">
              {uploadMode === 'r2' ? (
                <>Basic storage without transcoding. Direct playback only.</>
              ) : (
                <>Adaptive streaming with automatic transcoding to multiple qualities.</>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
              ${isUploading || videos.length >= maxVideos ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isUploading && videos.length < maxVideos ? handleClick : undefined}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Uploading to {uploadMode === 'stream' ? 'Cloudflare Stream' : 'R2'} and saving to database...
                </p>
              </div>
            ) : videos.length >= maxVideos ? (
              <div className="flex flex-col items-center gap-3">
                <Film className="w-12 h-12 text-muted-foreground" />
                <p className="text-lg font-medium text-foreground">
                  Maximum videos reached ({maxVideos})
                </p>
                <p className="text-sm text-muted-foreground">
                  Delete a video to upload a new one
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {isDragging ? (
                  <Upload className="w-12 h-12 text-primary" />
                ) : (
                  <Film className="w-12 h-12 text-muted-foreground" />
                )}
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {isDragging ? 'Drop video here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    MP4, WebM, MOV, AVI, or MKV (max {MAX_FILE_SIZE / (1024 * 1024)}MB) • {videos.length}/{maxVideos} videos
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Videos Grid */}
      {videos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {videos.map((video) => (
            <Card
              key={video.id}
              className={`relative group ${
                video.isPrimary ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-2">
                {/* Video Thumbnail */}
                <div className="aspect-video relative overflow-hidden rounded-md bg-muted flex items-center justify-center">
                  {video.urls.thumbnail ? (
                    <img
                      src={video.urls.thumbnail}
                      alt={video.originalName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Film className="w-12 h-12 text-muted-foreground" />
                  )}

                  {/* Primary Badge */}
                  {video.isPrimary && (
                    <Badge
                      variant="default"
                      className="absolute top-1 left-1 gap-1"
                    >
                      <Star className="w-3 h-3 fill-current" />
                      Primary
                    </Badge>
                  )}

                  {/* Mode Badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-1 right-1 gap-1"
                  >
                    {video.storageMode === 'stream' ? (
                      <>
                        <CloudUpload className="w-3 h-3" />
                        Stream
                      </>
                    ) : (
                      <>
                        <HardDrive className="w-3 h-3" />
                        R2
                      </>
                    )}
                  </Badge>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewVideo(video);
                      }}
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVideo(video.id);
                      }}
                      disabled={deleteVideoMutation.isPending}
                    >
                      {deleteVideoMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* File name and info */}
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {video.originalName}
                  </p>
                  {video.duration && (
                    <p className="text-xs text-muted-foreground">
                      {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-foreground font-medium">No videos uploaded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Upload up to {maxVideos} videos for this product
            </p>
          </CardContent>
        </Card>
      )}

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.originalName}</DialogTitle>
          </DialogHeader>
          {previewVideo && (
            <div className="relative">
              {previewVideo.storageMode === 'stream' && previewVideo.urls.hls ? (
                <video
                  className="w-full rounded-lg"
                  controls
                  src={previewVideo.urls.hls}
                />
              ) : previewVideo.urls.original ? (
                <video
                  className="w-full rounded-lg"
                  controls
                  src={`${PRODUCT_SERVICE_URL}${previewVideo.urls.original}`}
                />
              ) : (
                <div className="flex items-center justify-center p-12 bg-muted rounded-lg">
                  <p className="text-muted-foreground">Video not available</p>
                </div>
              )}
              {previewVideo.isPrimary && (
                <Badge className="absolute top-2 left-2">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Primary Video
                </Badge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Info */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          ✓ Uploaded to {uploadMode === 'stream' ? 'Stream' : 'R2'}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          ✓ Saved to database
        </Badge>
        {uploadMode === 'stream' && (
          <Badge variant="secondary" className="text-xs">
            ✓ Adaptive streaming
          </Badge>
        )}
      </div>
    </div>
  );
}
