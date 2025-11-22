/**
 * Video Upload Component
 *
 * Features:
 * - Drag & drop or click to upload
 * - Video preview before upload
 * - Client-side compression (optional)
 * - File validation (size, type)
 * - Progress indicator
 * - Mode selection (R2 or Stream)
 * - Upload cancellation
 */

import { useCallback, useState, useRef } from 'react';
import {
  Upload,
  X,
  Film,
  Loader2,
  Cloud,
  HardDrive,
  Play,
  AlertCircle,
} from 'lucide-react';

const PRODUCT_SERVICE_URL =
  import.meta.env.VITE_PRODUCT_SERVICE_URL || 'http://localhost:8788';

export interface VideoUploadResult {
  videoId?: string;
  filename?: string;
  urls: {
    original?: string;
    hls?: string;
    dash?: string;
    thumbnail?: string;
    download?: string;
  };
  metadata: {
    productId: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedAt: string;
  };
}

interface VideoUploadProps {
  productId: string;
  onUploadSuccess?: (result: VideoUploadResult) => void;
  onUploadError?: (error: string) => void;
  maxSizeMB?: number;
  defaultMode?: 'r2' | 'stream';
  enableCompression?: boolean;
}

export function VideoUpload({
  productId,
  onUploadSuccess,
  onUploadError,
  maxSizeMB = 500,
  defaultMode = 'stream',
  enableCompression = false,
}: VideoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMode, setUploadMode] = useState<'r2' | 'stream'>(defaultMode);
  const [videoInfo, setVideoInfo] = useState<{
    duration: number;
    width: number;
    height: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  /**
   * Validate file
   */
  const validateFile = (file: File): string | null => {
    // Check file type
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

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  };

  /**
   * Get video metadata
   */
  const getVideoMetadata = (
    file: File
  ): Promise<{ duration: number; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
        });
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video metadata'));
        URL.revokeObjectURL(video.src);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  /**
   * Compress video (basic implementation)
   * Note: Real video compression requires more complex processing
   * For production, consider using a dedicated library or server-side processing
   */
  const compressVideo = async (file: File): Promise<Blob> => {
    // For now, just return the file as-is
    // In production, you could use libraries like:
    // - FFmpeg.wasm for client-side video compression
    // - Or send to a server endpoint for processing
    console.log('Video compression not implemented yet. Uploading original file.');
    return file;
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

      // Get video metadata
      try {
        const metadata = await getVideoMetadata(file);
        setVideoInfo(metadata);
      } catch (err) {
        console.error('Failed to get video metadata:', err);
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      setSelectedFile(file);
    },
    [maxSizeMB, onUploadError]
  );

  /**
   * Upload video to server
   */
  const uploadVideo = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      // Compress video if enabled
      let fileToUpload: Blob = selectedFile;
      if (enableCompression) {
        fileToUpload = await compressVideo(selectedFile);
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', fileToUpload, selectedFile.name);
      formData.append('productId', productId);
      formData.append('mode', uploadMode);

      // Upload with progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          onUploadSuccess?.(result.video);

          // Show success message
          if (uploadMode === 'stream') {
            alert(
              'Video uploaded successfully! Encoding in progress. This may take a few minutes.'
            );
          }

          // Reset form
          setPreview(null);
          setSelectedFile(null);
          setVideoInfo(null);
          setUploadProgress(0);
        } else {
          const errorData = JSON.parse(xhr.responseText);
          throw new Error(errorData.error || 'Upload failed');
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload');
      });

      xhr.addEventListener('abort', () => {
        console.log('Upload cancelled');
      });

      xhr.open('POST', `${PRODUCT_SERVICE_URL}/api/videos/upload`);
      xhr.send(formData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * Cancel upload
   */
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
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
    input.accept = 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska';
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    };
    input.click();
  };

  /**
   * Clear selection
   */
  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    setVideoInfo(null);
    setError(null);
    setUploadProgress(0);
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
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Upload Mode:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setUploadMode('stream')}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              uploadMode === 'stream'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Cloud className="w-4 h-4" />
            <span className="text-sm">Stream (Optimized)</span>
          </button>
          <button
            onClick={() => setUploadMode('r2')}
            disabled={isUploading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
              uploadMode === 'r2'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <HardDrive className="w-4 h-4" />
            <span className="text-sm">R2 (Basic)</span>
          </button>
        </div>
      </div>

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
            <p className="text-sm text-gray-600">
              Uploading video... {uploadProgress}%
            </p>
            <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelUpload();
              }}
              className="mt-2 px-4 py-2 text-sm text-red-600 hover:text-red-700 transition"
            >
              Cancel Upload
            </button>
          </div>
        ) : preview ? (
          <div className="relative">
            <video
              ref={videoPreviewRef}
              src={preview}
              className="max-w-full max-h-64 mx-auto rounded-lg"
              controls
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

            {/* Video Info */}
            {videoInfo && (
              <div className="mt-4 text-sm text-gray-600 space-y-1">
                <p>
                  Resolution: {videoInfo.width} × {videoInfo.height}
                </p>
                <p>Duration: {formatDuration(videoInfo.duration)}</p>
                {selectedFile && (
                  <p>Size: {formatFileSize(selectedFile.size)}</p>
                )}
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                uploadVideo();
              }}
              className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              Upload Video
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {isDragging ? (
              <Upload className="w-12 h-12 text-blue-500" />
            ) : (
              <Film className="w-12 h-12 text-gray-400" />
            )}
            <div>
              <p className="text-lg font-medium text-gray-700">
                {isDragging ? 'Drop video here' : 'Click to upload or drag & drop'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                MP4, WebM, MOV, AVI, or MKV (max {maxSizeMB}MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mode Info */}
      <div className="text-xs text-gray-600 space-y-1">
        {uploadMode === 'stream' ? (
          <>
            <p>✓ Automatic encoding to multiple qualities (1080p, 720p, 480p, 360p)</p>
            <p>✓ Adaptive bitrate streaming for best viewing experience</p>
            <p>✓ Automatic thumbnail generation</p>
            <p>✓ Global CDN delivery with analytics</p>
          </>
        ) : (
          <>
            <p>• Basic video storage without optimization</p>
            <p>• Simple HTML5 video playback</p>
            <p>• Cost-effective for simple use cases</p>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Tips for best results:</p>
        <p>• Use MP4 format with H.264 codec for best compatibility</p>
        <p>• Keep videos under 5 minutes for optimal user experience</p>
        <p>• Use Stream mode for professional quality with adaptive streaming</p>
        {enableCompression && <p>• Client-side compression is enabled (experimental)</p>}
      </div>
    </div>
  );
}
