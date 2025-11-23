/**
 * Video Upload Component
 *
 * Features:
 * - Drag & drop or click to upload
 * - Video preview before upload
 * - File validation (size, type)
 * - Progress indicator with percentage
 * - Mode selection (R2 or Stream)
 * - Upload cancellation
 * - Shadcn UI components with dark mode support
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
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
      setUploadSuccess(false);

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
          setUploadSuccess(true);
          onUploadSuccess?.(result.video);

          // Reset form after short delay
          setTimeout(() => {
            setPreview(null);
            setSelectedFile(null);
            setVideoInfo(null);
            setUploadProgress(0);
            setUploadSuccess(false);
          }, 2000);
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
    setUploadSuccess(false);
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
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Upload Mode:</span>
            <div className="flex gap-2">
              <Button
                variant={uploadMode === 'stream' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('stream')}
                disabled={isUploading}
                className="gap-2"
              >
                <Cloud className="w-4 h-4" />
                Stream (Optimized)
              </Button>
              <Button
                variant={uploadMode === 'r2' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUploadMode('r2')}
                disabled={isUploading}
                className="gap-2"
              >
                <HardDrive className="w-4 h-4" />
                R2 (Basic)
              </Button>
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
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isUploading && !preview ? handleClick : undefined}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Uploading video... {uploadProgress}%
                </p>
                <Progress value={uploadProgress} className="w-full max-w-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    cancelUpload();
                  }}
                >
                  Cancel Upload
                </Button>
              </div>
            ) : preview ? (
              <div className="relative">
                <video
                  ref={videoPreviewRef}
                  src={preview}
                  className="max-w-full max-h-64 mx-auto rounded-lg"
                  controls
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>

                {/* Video Info */}
                {videoInfo && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="secondary">
                        {videoInfo.width} × {videoInfo.height}
                      </Badge>
                      <Badge variant="secondary">
                        {formatDuration(videoInfo.duration)}
                      </Badge>
                      {selectedFile && (
                        <Badge variant="secondary">
                          {formatFileSize(selectedFile.size)}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Button or Success Message */}
                {uploadSuccess ? (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-500">
                      Upload successful
                      {uploadMode === 'stream' && ' - Video is encoding'}
                    </span>
                  </div>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      uploadVideo();
                    }}
                    className="mt-4 gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Video
                  </Button>
                )}
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
                    MP4, WebM, MOV, AVI, or MKV (max {maxSizeMB}MB)
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mode Info */}
      <div className="flex flex-wrap gap-2">
        {uploadMode === 'stream' ? (
          <>
            <Badge variant="secondary" className="text-xs">
              ✓ Multi-quality encoding
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✓ Adaptive streaming
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✓ Auto thumbnails
            </Badge>
            <Badge variant="secondary" className="text-xs">
              ✓ Global CDN
            </Badge>
          </>
        ) : (
          <>
            <Badge variant="secondary" className="text-xs">
              • Basic storage
            </Badge>
            <Badge variant="secondary" className="text-xs">
              • HTML5 playback
            </Badge>
            <Badge variant="secondary" className="text-xs">
              • Cost-effective
            </Badge>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
