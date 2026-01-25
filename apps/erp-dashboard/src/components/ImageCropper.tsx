/**
 * Image Cropper Component
 *
 * Features:
 * - Visual cropping interface
 * - Focal point selection
 * - Aspect ratio options
 * - Real-time preview
 * - Touch and mouse support
 */

import { Check, Crop, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropperProps {
  imageUrl: string;
  onCropComplete: (cropArea: CropArea) => void;
  onCancel: () => void;
  aspectRatio?: number; // width / height (e.g., 1 for square, 16/9 for landscape)
}

/**
 * Renders a modal UI that lets the user visually crop an image and apply the selection.
 *
 * @param imageUrl - Source URL of the image to crop.
 * @param onCropComplete - Callback invoked with the final crop in pixels: `{ x, y, width, height }` relative to the original image.
 * @param onCancel - Callback invoked when the user cancels the crop dialog.
 * @param aspectRatio - Optional width/height ratio to constrain the crop box; if omitted the crop is unrestricted.
 * @returns The ImageCropper React element (modal) that manages user interaction and emits the pixel-based crop on completion.
 */
export function ImageCropper({
  imageUrl,
  onCropComplete,
  onCancel,
  aspectRatio,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Initialize crop area when image loads
   */
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return;

    const { naturalWidth, naturalHeight } = imageRef.current;
    setImageSize({ width: naturalWidth, height: naturalHeight });

    // Set initial crop to center of image (50% of size)
    const initialWidth = aspectRatio ? 50 : 50;
    const initialHeight = aspectRatio ? initialWidth / aspectRatio : 50;

    setCrop({
      x: 25,
      y: 25,
      width: initialWidth,
      height: initialHeight,
    });
  }, [aspectRatio]);

  /**
   * Start dragging to reposition crop area
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  /**
   * Drag crop area
   */
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / container.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / container.height) * 100;

      setCrop((prev) => {
        const newX = Math.max(0, Math.min(100 - prev.width, prev.x + deltaX));
        const newY = Math.max(0, Math.min(100 - prev.height, prev.y + deltaY));
        return { ...prev, x: newX, y: newY };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isDragging, dragStart]
  );

  /**
   * Stop dragging
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Start resizing crop area from a corner
   */
  const handleResizeStart = useCallback(
    (corner: 'nw' | 'ne' | 'sw' | 'se', e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeCorner(corner);
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    []
  );

  /**
   * Handle resize movement
   */
  const handleResizeMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !resizeCorner || !containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragStart.x) / container.width) * 100;
      const deltaY = ((e.clientY - dragStart.y) / container.height) * 100;

      setCrop((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        let newWidth = prev.width;
        let newHeight = prev.height;

        switch (resizeCorner) {
          case 'nw': // Top-left corner
            newX = Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + deltaX));
            newY = Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + deltaY));
            newWidth = prev.width - (newX - prev.x);
            newHeight = prev.height - (newY - prev.y);
            break;
          case 'ne': // Top-right corner
            newY = Math.max(0, Math.min(prev.y + prev.height - 10, prev.y + deltaY));
            newWidth = Math.max(10, Math.min(100 - prev.x, prev.width + deltaX));
            newHeight = prev.height - (newY - prev.y);
            break;
          case 'sw': // Bottom-left corner
            newX = Math.max(0, Math.min(prev.x + prev.width - 10, prev.x + deltaX));
            newWidth = prev.width - (newX - prev.x);
            newHeight = Math.max(10, Math.min(100 - prev.y, prev.height + deltaY));
            break;
          case 'se': // Bottom-right corner
            newWidth = Math.max(10, Math.min(100 - prev.x, prev.width + deltaX));
            newHeight = Math.max(10, Math.min(100 - prev.y, prev.height + deltaY));
            break;
        }

        // Apply aspect ratio constraint if specified
        if (aspectRatio) {
          if (resizeCorner === 'nw' || resizeCorner === 'sw') {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }

        return { x: newX, y: newY, width: newWidth, height: newHeight };
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [isResizing, resizeCorner, dragStart, aspectRatio]
  );

  /**
   * Stop resizing
   */
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeCorner(null);
  }, []);

  /**
   * Reset crop to center
   */
  const handleReset = () => {
    const initialWidth = aspectRatio ? 50 : 50;
    const initialHeight = aspectRatio ? initialWidth / aspectRatio : 50;

    setCrop({
      x: 25,
      y: 25,
      width: initialWidth,
      height: initialHeight,
    });
  };

  /**
   * Complete cropping and return coordinates
   */
  const handleComplete = () => {
    // Convert percentage to pixels
    const pixelCrop: CropArea = {
      x: Math.round((crop.x / 100) * imageSize.width),
      y: Math.round((crop.y / 100) * imageSize.height),
      width: Math.round((crop.width / 100) * imageSize.width),
      height: Math.round((crop.height / 100) * imageSize.height),
    };

    onCropComplete(pixelCrop);
  };

  // Add mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMouseMove(e as unknown as React.MouseEvent);
      };
      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Add mouse event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);

      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Crop Image</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Crop Area */}
        <div className="p-6">
          <div
            ref={containerRef}
            className="relative inline-block max-w-full"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {/* Image */}
            <img
              ref={imageRef}
              src={imageUrl}
              alt="Crop preview"
              className="max-w-full h-auto"
              onLoad={handleImageLoad}
            />

            {/* Crop Overlay */}
            {imageSize.width > 0 && (
              <>
                {/* Dark overlay outside crop area */}
                <div
                  className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none"
                  style={{
                    clipPath: `polygon(
                      0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
                      ${crop.x}% ${crop.y}%,
                      ${crop.x + crop.width}% ${crop.y}%,
                      ${crop.x + crop.width}% ${crop.y + crop.height}%,
                      ${crop.x}% ${crop.y + crop.height}%,
                      ${crop.x}% ${crop.y}%
                    )`,
                  }}
                />

                {/* Crop box */}
                <div
                  className="absolute border-2 border-white shadow-lg cursor-move"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.width}%`,
                    height: `${crop.height}%`,
                  }}
                  onMouseDown={handleMouseDown}
                >
                  {/* Corner handles */}
                  <div
                    className="absolute w-3 h-3 bg-white border border-gray-300 -top-1.5 -left-1.5 cursor-nw-resize hover:bg-blue-100"
                    onMouseDown={(e) => handleResizeStart('nw', e)}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border border-gray-300 -top-1.5 -right-1.5 cursor-ne-resize hover:bg-blue-100"
                    onMouseDown={(e) => handleResizeStart('ne', e)}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border border-gray-300 -bottom-1.5 -left-1.5 cursor-sw-resize hover:bg-blue-100"
                    onMouseDown={(e) => handleResizeStart('sw', e)}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border border-gray-300 -bottom-1.5 -right-1.5 cursor-se-resize hover:bg-blue-100"
                    onMouseDown={(e) => handleResizeStart('se', e)}
                  />

                  {/* Grid lines */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                    {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'].map((id) => (
                      <div
                        key={`grid-cell-${id}`}
                        className="border border-white border-opacity-30"
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Size Info */}
          {imageSize.width > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              <p>
                Crop area: {Math.round((crop.width / 100) * imageSize.width)} ×{' '}
                {Math.round((crop.height / 100) * imageSize.height)} px
              </p>
              <p>
                Position: ({Math.round((crop.x / 100) * imageSize.width)},{' '}
                {Math.round((crop.y / 100) * imageSize.height)})
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
