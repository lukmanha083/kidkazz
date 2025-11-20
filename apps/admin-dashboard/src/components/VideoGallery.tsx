/**
 * Video Gallery Component
 *
 * Features:
 * - Multiple videos per product
 * - Drag & drop reordering
 * - Primary video selection
 * - Video preview modal with player
 * - Mode selection (R2 or Stream)
 * - Delete confirmation
 * - Video thumbnails
 */

import { useState, useCallback } from 'react';
import {
  Upload,
  X,
  Star,
  Trash2,
  GripVertical,
  Play,
  Film,
  CloudUpload,
  HardDrive,
} from 'lucide-react';
import { VideoPlayer, type VideoUrls } from './VideoPlayer';

export interface ProductVideo {
  id: string;
  filename?: string;
  streamId?: string;
  urls: VideoUrls;
  mode: 'r2' | 'stream';
  isPrimary: boolean;
  sortOrder: number;
  duration?: number;
  size: number;
  streamStatus?: 'queued' | 'inprogress' | 'ready' | 'error';
}

interface VideoGalleryProps {
  productId: string;
  videos: ProductVideo[];
  onVideosChange: (videos: ProductVideo[]) => void;
  maxVideos?: number;
}

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

export function VideoGallery({
  productId,
  videos,
  onVideosChange,
  maxVideos = 5,
}: VideoGalleryProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<ProductVideo | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'r2' | 'stream'>('stream');

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (videos.length >= maxVideos) {
        setUploadError(`Maximum ${maxVideos} videos allowed`);
        return;
      }

      // Validate file size (500MB max)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError('Video file too large. Maximum size is 500MB.');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
      ];
      if (!allowedTypes.includes(file.type)) {
        setUploadError(
          'Invalid video format. Supported: MP4, WebM, MOV, AVI, MKV.'
        );
        return;
      }

      setUploadError(null);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', productId);
        formData.append('mode', uploadMode);
        formData.append('isPrimary', videos.length === 0 ? 'true' : 'false');
        formData.append('sortOrder', videos.length.toString());

        const response = await fetch(`${PRODUCT_SERVICE_URL}/api/videos/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();

        // Add to videos array
        const newVideo: ProductVideo = {
          id: result.video.videoId || result.video.filename,
          filename: result.video.filename,
          streamId: result.video.videoId,
          urls: result.video.urls,
          mode: result.mode,
          isPrimary: videos.length === 0,
          sortOrder: videos.length,
          size: file.size,
          streamStatus: result.mode === 'stream' ? 'queued' : undefined,
        };

        onVideosChange([...videos, newVideo]);

        // Show info message for Stream mode
        if (result.mode === 'stream') {
          alert(
            'Video uploaded to Cloudflare Stream. Encoding in progress. This may take a few minutes.'
          );
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed';
        setUploadError(errorMessage);
      } finally {
        setIsUploading(false);
      }
    },
    [productId, videos, onVideosChange, maxVideos, uploadMode]
  );

  /**
   * Set primary video
   */
  const handleSetPrimary = (index: number) => {
    const updatedVideos = videos.map((video, i) => ({
      ...video,
      isPrimary: i === index,
    }));
    onVideosChange(updatedVideos);
  };

  /**
   * Delete video
   */
  const handleDelete = async (index: number) => {
    if (!confirm('Are you sure you want to delete this video?')) {
      return;
    }

    const videoToDelete = videos[index];

    try {
      // Delete from server
      if (videoToDelete.mode === 'stream' && videoToDelete.streamId) {
        await fetch(
          `${PRODUCT_SERVICE_URL}/api/videos/stream/${videoToDelete.streamId}`,
          {
            method: 'DELETE',
          }
        );
      } else if (videoToDelete.mode === 'r2' && videoToDelete.filename) {
        await fetch(
          `${PRODUCT_SERVICE_URL}/api/videos/${videoToDelete.filename}`,
          {
            method: 'DELETE',
          }
        );
      }

      // Remove from array and reorder
      const updatedVideos = videos
        .filter((_, i) => i !== index)
        .map((video, i) => ({
          ...video,
          sortOrder: i,
          // If deleted video was primary, make first video primary
          isPrimary: videoToDelete.isPrimary && i === 0 ? true : video.isPrimary,
        }));

      onVideosChange(updatedVideos);
    } catch (err) {
      setUploadError('Failed to delete video');
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

    const updatedVideos = [...videos];
    const [draggedVideo] = updatedVideos.splice(draggedIndex, 1);
    updatedVideos.splice(index, 0, draggedVideo);

    // Update sort order
    const reordered = updatedVideos.map((video, i) => ({
      ...video,
      sortOrder: i,
    }));

    onVideosChange(reordered);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Mode Selector */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Upload Mode:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setUploadMode('stream')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              uploadMode === 'stream'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span className="text-sm">Stream (Optimized)</span>
          </button>
          <button
            onClick={() => setUploadMode('r2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              uploadMode === 'r2'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span className="text-sm">R2 (Basic)</span>
          </button>
        </div>
      </div>

      {/* Mode Info */}
      <div className="text-xs text-gray-600 space-y-1">
        {uploadMode === 'stream' ? (
          <>
            <p>✓ Automatic encoding to multiple qualities (1080p, 720p, 480p, 360p)</p>
            <p>✓ Adaptive bitrate streaming for best viewing experience</p>
            <p>✓ Automatic thumbnail generation</p>
            <p>✓ Global CDN delivery</p>
          </>
        ) : (
          <>
            <p>• Basic video storage without optimization</p>
            <p>• Simple HTML5 video playback</p>
            <p>• Cost-effective for simple use cases</p>
          </>
        )}
      </div>

      {/* Upload Button */}
      {videos.length < maxVideos && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition">
          <input
            type="file"
            id="video-upload"
            className="hidden"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
              }
            }}
            disabled={isUploading}
          />
          <label
            htmlFor="video-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="font-medium text-gray-700">Uploading video...</p>
                <p className="text-sm text-gray-500">This may take a while</p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700">
                    Click to upload video
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {videos.length} / {maxVideos} videos • Max 500MB • MP4, WebM, MOV
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{uploadError}</p>
        </div>
      )}

      {/* Video Grid */}
      {videos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className={`relative group rounded-lg overflow-hidden border-2 ${
                video.isPrimary
                  ? 'border-yellow-400'
                  : 'border-gray-200 hover:border-gray-300'
              } transition cursor-move`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Video Thumbnail */}
              <div className="relative bg-black aspect-video">
                {video.urls.thumbnail ? (
                  <img
                    src={video.urls.thumbnail}
                    alt={`Video ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-12 h-12 text-gray-500" />
                  </div>
                )}

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black bg-opacity-50 rounded-full p-3">
                    <Play className="w-8 h-8 text-white fill-current" />
                  </div>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-3 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    {formatFileSize(video.size)}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      video.mode === 'stream'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {video.mode === 'stream' ? 'Stream' : 'R2'}
                  </span>
                </div>

                {/* Stream Status */}
                {video.mode === 'stream' && video.streamStatus && (
                  <div className="mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        video.streamStatus === 'ready'
                          ? 'bg-green-100 text-green-700'
                          : video.streamStatus === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {video.streamStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Primary Badge */}
              {video.isPrimary && (
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
                  onClick={() => setPreviewVideo(video)}
                  className="p-2 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition"
                  title="Preview"
                >
                  <Play className="w-4 h-4" />
                </button>

                {/* Set Primary */}
                {!video.isPrimary && (
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
      {videos.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No videos uploaded yet</p>
          <p className="text-sm mt-1">Add up to {maxVideos} videos</p>
        </div>
      )}

      {/* Preview Modal */}
      {previewVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <VideoPlayer
              urls={previewVideo.urls}
              mode={previewVideo.mode}
              controls
              className="w-full"
            />
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute -top-12 right-0 p-2 bg-white rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
