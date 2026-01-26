/**
 * Video Service
 *
 * Handles video upload, optimization, and serving with Cloudflare R2 + Stream.
 *
 * Two modes:
 * 1. R2 Mode: Basic storage (cost-effective)
 * 2. Stream Mode: Full optimization with encoding and adaptive streaming (recommended)
 *
 * Features:
 * - Video upload to R2 or Stream
 * - Multiple quality encoding (1080p, 720p, 480p, 360p)
 * - Adaptive bitrate streaming (HLS/DASH)
 * - Thumbnail generation
 * - Client-side compression before upload
 * - Multiple videos per product
 */

export interface VideoMetadata {
  productId: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  uploadedAt: string;
  isPrimary?: boolean;
  sortOrder?: number;

  // Stream-specific
  streamId?: string;
  streamStatus?: 'queued' | 'inprogress' | 'ready' | 'error';
}

export interface VideoUrls {
  // R2 mode
  original?: string;

  // Stream mode (HLS/DASH)
  hls?: string;
  dash?: string;

  // Thumbnail
  thumbnail?: string;

  // Download URL
  download?: string;
}

export const VIDEO_CONFIG = {
  // Maximum file size: 500MB
  MAX_FILE_SIZE: 500 * 1024 * 1024,

  // Allowed MIME types
  ALLOWED_TYPES: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
  ] as const,

  // Recommended video settings
  RECOMMENDED: {
    maxWidth: 1920,
    maxHeight: 1080,
    maxBitrate: 5000, // kbps
    maxFPS: 60,
  },

  // Stream encoding presets
  STREAM_QUALITIES: [
    { label: '1080p', width: 1920, height: 1080, bitrate: 5000 },
    { label: '720p', width: 1280, height: 720, bitrate: 2500 },
    { label: '480p', width: 854, height: 480, bitrate: 1000 },
    { label: '360p', width: 640, height: 360, bitrate: 600 },
  ],
} as const;

export class VideoService {
  constructor(
    private r2: R2Bucket,
    private kv: KVNamespace,
    private streamApiToken?: string // Cloudflare Stream API token
  ) {}

  /**
   * Validate video file
   */
  validateVideo(file: File | Blob, mimeType: string): void {
    // Check MIME type
    if (!VIDEO_CONFIG.ALLOWED_TYPES.includes(mimeType as any)) {
      throw new Error(`Invalid video type. Allowed: ${VIDEO_CONFIG.ALLOWED_TYPES.join(', ')}`);
    }

    // Check file size
    if (file.size > VIDEO_CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `File too large. Maximum size: ${VIDEO_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }
  }

  /**
   * Generate unique filename
   */
  generateFilename(productId: string, extension: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `products/${productId}/videos/${timestamp}-${random}.${extension}`;
  }

  /**
   * Get file extension from MIME type
   */
  getExtension(mimeType: string): string {
    const map: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'video/x-msvideo': 'avi',
      'video/x-matroska': 'mkv',
    };
    return map[mimeType] || 'mp4';
  }

  /**
   * Upload video to Cloudflare Stream (recommended)
   *
   * Benefits:
   * - Automatic encoding to multiple qualities
   * - Adaptive bitrate streaming (HLS/DASH)
   * - Thumbnail generation
   * - Global CDN delivery
   * - Analytics
   */
  async uploadToStream(
    productId: string,
    file: Blob,
    mimeType: string,
    originalName: string,
    options?: {
      isPrimary?: boolean;
      sortOrder?: number;
    }
  ): Promise<{ urls: VideoUrls; metadata: VideoMetadata; videoId: string }> {
    if (!this.streamApiToken) {
      throw new Error('Cloudflare Stream API token not configured');
    }

    // Validate video
    this.validateVideo(file, mimeType);

    // Upload to Stream via TUS (resumable upload)
    const streamResponse = await this.uploadToStreamAPI(file, originalName);

    // Generate metadata
    const metadata: VideoMetadata = {
      productId,
      originalName,
      mimeType,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      isPrimary: options?.isPrimary,
      sortOrder: options?.sortOrder || 0,
      streamId: streamResponse.uid,
      streamStatus: 'queued',
    };

    // Generate URLs
    const urls: VideoUrls = {
      hls: `https://customer-${streamResponse.uid}.cloudflarestream.com/${streamResponse.uid}/manifest/video.m3u8`,
      dash: `https://customer-${streamResponse.uid}.cloudflarestream.com/${streamResponse.uid}/manifest/video.mpd`,
      thumbnail: `https://customer-${streamResponse.uid}.cloudflarestream.com/${streamResponse.uid}/thumbnails/thumbnail.jpg`,
      download: `https://customer-${streamResponse.uid}.cloudflarestream.com/${streamResponse.uid}/downloads/default.mp4`,
    };

    return {
      urls,
      metadata,
      videoId: streamResponse.uid,
    };
  }

  /**
   * Upload video to R2 (basic mode)
   *
   * Use when:
   * - Cost is a concern (Stream has per-minute pricing)
   * - Simple video playback is sufficient
   * - No need for adaptive streaming
   */
  async uploadToR2(
    productId: string,
    file: Blob,
    mimeType: string,
    originalName: string,
    options?: {
      isPrimary?: boolean;
      sortOrder?: number;
    }
  ): Promise<{ urls: VideoUrls; metadata: VideoMetadata; filename: string }> {
    // Validate video
    this.validateVideo(file, mimeType);

    // Generate filename
    const extension = this.getExtension(mimeType);
    const filename = this.generateFilename(productId, extension);

    // Convert to ArrayBuffer for R2
    const arrayBuffer = await file.arrayBuffer();

    // Upload to R2
    await this.r2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: mimeType,
      },
      customMetadata: {
        productId,
        originalName,
        uploadedAt: new Date().toISOString(),
        isPrimary: options?.isPrimary ? 'true' : 'false',
        sortOrder: options?.sortOrder?.toString() || '0',
      },
    });

    // Generate metadata
    const metadata: VideoMetadata = {
      productId,
      originalName,
      mimeType,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      isPrimary: options?.isPrimary,
      sortOrder: options?.sortOrder || 0,
    };

    // Generate URLs
    const baseUrl = `/api/videos/${filename}`;
    const urls: VideoUrls = {
      original: baseUrl,
      download: baseUrl,
    };

    return {
      urls,
      metadata,
      filename,
    };
  }

  /**
   * Upload to Cloudflare Stream API
   */
  private async uploadToStreamAPI(
    file: Blob,
    originalName: string
  ): Promise<{ uid: string; playback: any }> {
    if (!this.streamApiToken) {
      throw new Error('Stream API token not configured');
    }

    // Upload using direct creator upload
    const formData = new FormData();
    formData.append('file', file, originalName);

    const response = await fetch(
      'https://api.cloudflare.com/client/v4/accounts/{account_id}/stream',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.streamApiToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to upload to Cloudflare Stream');
    }

    const result = (await response.json()) as {
      result?: any;
    };

    if (!result.result) {
      throw new Error('Invalid response from Cloudflare Stream: missing result field');
    }

    return result.result;
  }

  /**
   * Get video from R2
   */
  async getVideo(filename: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
    const object = await this.r2.get(filename);
    if (!object) {
      return null;
    }

    return {
      data: await object.arrayBuffer(),
      contentType: object.httpMetadata?.contentType || 'video/mp4',
    };
  }

  /**
   * Delete video from R2
   */
  async deleteVideoR2(filename: string): Promise<void> {
    await this.r2.delete(filename);
  }

  /**
   * Delete video from Stream
   */
  async deleteVideoStream(videoId: string): Promise<void> {
    if (!this.streamApiToken) {
      throw new Error('Stream API token not configured');
    }

    await fetch(`https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/${videoId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.streamApiToken}`,
      },
    });
  }

  /**
   * Delete all videos for a product
   * Handles R2 pagination to ensure all objects are deleted
   */
  async deleteProductVideos(productId: string): Promise<void> {
    const prefix = `products/${productId}/videos/`;
    let cursor: string | undefined;

    // Iterate through all pages of results
    do {
      const listed = await this.r2.list({
        prefix,
        cursor,
      });

      // Delete all videos in this page
      if (listed.objects.length > 0) {
        await Promise.all(listed.objects.map((object) => this.deleteVideoR2(object.key)));
      }

      // Get cursor for next page if truncated
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
  }

  /**
   * Get video metadata from Stream
   */
  async getStreamMetadata(videoId: string): Promise<any> {
    if (!this.streamApiToken) {
      throw new Error('Stream API token not configured');
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/{account_id}/stream/${videoId}`,
      {
        headers: {
          Authorization: `Bearer ${this.streamApiToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Stream metadata');
    }

    const result = (await response.json()) as {
      result?: any;
    };

    if (!result.result) {
      throw new Error('Invalid response from Cloudflare Stream: missing result field');
    }

    return result.result;
  }
}
