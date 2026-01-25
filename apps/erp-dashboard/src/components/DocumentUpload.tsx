/**
 * Document Upload Component
 *
 * Features:
 * - Drag & drop or click to upload
 * - Image cropping before upload
 * - Document preview (image or PDF icon)
 * - File validation (size, type)
 * - Progress indicator
 * - Upload to R2 via business-partner service
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { type CropArea, ImageCropper } from './ImageCropper';

const BUSINESS_PARTNER_SERVICE_URL =
  import.meta.env.VITE_BUSINESS_PARTNER_SERVICE_URL || 'http://localhost:8793';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

export interface DocumentUploadResult {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

interface DocumentUploadProps {
  employeeId?: string;
  documentType: 'ktp' | 'npwp' | 'other';
  label?: string;
  currentDocument?: string;
  onUploadSuccess?: (result: DocumentUploadResult) => void;
  onUploadError?: (error: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

/**
 * Document upload component for employee documents (KTP, NPWP, etc.)
 * Supports images (JPEG, PNG) and PDF files up to 5MB
 */
export function DocumentUpload({
  employeeId,
  documentType,
  label = 'Upload Document',
  currentDocument,
  onUploadSuccess,
  onUploadError,
  onFileSelect,
  disabled = false,
}: DocumentUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentDocument || null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [_fileType, setFileType] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  /**
   * Validate file
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload JPEG, PNG, or PDF.';
    }

    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`;
    }

    return null;
  }, []);

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

      // Store file info
      setFileName(file.name);
      setFileType(file.type);

      // For images, show cropper first
      if (file.type.startsWith('image/')) {
        setOriginalFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
          setCropImageUrl(e.target?.result as string);
          setShowCropper(true);
        };
        reader.readAsDataURL(file);
      } else {
        // PDF - proceed directly without cropping
        setPendingFile(file);
        setPreview(null);

        // Notify parent about file selection
        onFileSelect?.(file);

        // If employeeId is provided, upload immediately
        if (employeeId) {
          await uploadFile(file);
        }
      }
    },
    [employeeId, validateFile, onUploadError, onFileSelect]
  );

  /**
   * Handle crop complete - create cropped image and proceed
   */
  const handleCropComplete = useCallback(
    async (cropArea: CropArea) => {
      if (!cropImageUrl || !originalFile) return;

      setShowCropper(false);

      try {
        // Create canvas to crop the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = async () => {
          // Set canvas size to crop dimensions
          canvas.width = cropArea.width;
          canvas.height = cropArea.height;

          // Draw cropped portion
          ctx?.drawImage(
            img,
            cropArea.x,
            cropArea.y,
            cropArea.width,
            cropArea.height,
            0,
            0,
            cropArea.width,
            cropArea.height
          );

          // Convert to blob
          canvas.toBlob(
            async (blob) => {
              if (!blob) {
                setError('Failed to process cropped image');
                return;
              }

              // Create new file from cropped blob
              const croppedFile = new File([blob], originalFile.name, {
                type: originalFile.type,
              });

              setPendingFile(croppedFile);
              setPreview(canvas.toDataURL(originalFile.type));

              // Notify parent about file selection
              onFileSelect?.(croppedFile);

              // If employeeId is provided, upload immediately
              if (employeeId) {
                await uploadFile(croppedFile);
              }
            },
            originalFile.type,
            0.9
          );
        };

        img.src = cropImageUrl;
      } catch (err) {
        setError('Failed to crop image');
        console.error('Crop error:', err);
      } finally {
        setCropImageUrl(null);
        setOriginalFile(null);
      }
    },
    [cropImageUrl, originalFile, employeeId, onFileSelect]
  );

  /**
   * Handle crop cancel
   */
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setCropImageUrl(null);
    setOriginalFile(null);
    setFileName(null);
    setFileType(null);
  }, []);

  /**
   * Upload file to R2
   */
  const uploadFile = async (file: File) => {
    if (!employeeId) {
      return;
    }

    try {
      setIsUploading(true);

      // Create form data
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('employeeId', employeeId);
      formData.append('documentType', documentType);

      // Upload to server
      const response = await fetch(
        `${BUSINESS_PARTNER_SERVICE_URL}/api/employees/documents/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      // Success
      setUploadSuccess(true);
      setPendingFile(null);
      onUploadSuccess?.(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Upload pending file (called after employee is created)
   */
  const uploadPendingFile = async (newEmployeeId: string) => {
    if (!pendingFile) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', pendingFile, pendingFile.name);
      formData.append('employeeId', newEmployeeId);
      formData.append('documentType', documentType);

      const response = await fetch(
        `${BUSINESS_PARTNER_SERVICE_URL}/api/employees/documents/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadSuccess(true);
      setPendingFile(null);
      onUploadSuccess?.(result);
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

      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [disabled, isUploading, handleFileSelect]
  );

  /**
   * Handle click to upload
   */
  const handleClick = () => {
    if (disabled || isUploading) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ALLOWED_TYPES.join(',');
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    };
    input.click();
  };

  /**
   * Clear document
   */
  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    setFileType(null);
    setPendingFile(null);
    setError(null);
    setUploadSuccess(false);
  };

  // Expose uploadPendingFile for parent component
  (DocumentUpload as any).uploadPendingFile = uploadPendingFile;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {/* Upload Area */}
      <Card>
        <CardContent className="p-0">
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-border hover:border-primary/50 dark:border-border dark:hover:border-primary/50'
              }
              ${isUploading || disabled ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled && !isUploading) {
                handleClick();
              }
            }}
            // biome-ignore lint/a11y/useSemanticElements lint/a11y/noNoninteractiveTabindex: drag-drop area
            role="button"
            tabIndex={0}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading to R2...</p>
              </div>
            ) : preview || fileName ? (
              <div className="relative">
                {preview ? (
                  <img
                    src={preview}
                    alt="Document preview"
                    className="max-w-full max-h-32 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-12 h-12 text-muted-foreground" />
                    <p className="text-sm font-medium truncate max-w-full">{fileName}</p>
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 rounded-full h-6 w-6"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
                {uploadSuccess && (
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-500">
                      Uploaded
                    </span>
                  </div>
                )}
                {pendingFile && !uploadSuccess && !employeeId && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Will upload after saving
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                {isDragging ? (
                  <Upload className="w-8 h-8 text-primary" />
                ) : (
                  <FileText className="w-8 h-8 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isDragging ? 'Drop file here' : 'Click to upload or drag & drop'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, or PDF (max 5MB)</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Image Cropper Modal */}
      {showCropper && cropImageUrl && (
        <ImageCropper
          imageUrl={cropImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={documentType === 'ktp' ? 1.586 : undefined} // KTP aspect ratio ~85.6mm x 53.98mm
        />
      )}
    </div>
  );
}
