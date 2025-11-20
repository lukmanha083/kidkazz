/**
 * Video Routes
 *
 * Handles product video upload, serving, and deletion.
 * Supports two modes:
 * 1. R2 Mode: Basic storage (cost-effective)
 * 2. Stream Mode: Full optimization with adaptive streaming (recommended)
 */

import { Hono } from 'hono';
import { VideoService } from '../infrastructure/video-service';

type Bindings = {
  PRODUCT_VIDEOS: R2Bucket;
  VIDEO_CACHE: KVNamespace;
  CLOUDFLARE_STREAM_API_TOKEN?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/videos/upload
 *
 * Upload product video with two modes:
 * - Stream Mode (recommended): Automatic optimization with adaptive streaming
 * - R2 Mode (basic): Simple storage for cost-conscious users
 *
 * Body: FormData with:
 * - file: Video file (required, max 500MB)
 * - productId: Product ID (required)
 * - mode: 'stream' | 'r2' (optional, defaults to 'stream' if token available)
 * - isPrimary: Boolean if this is the primary video (optional)
 * - sortOrder: Number for gallery ordering (optional)
 */
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;
    const mode = formData.get('mode') as 'stream' | 'r2' | null;
    const isPrimaryStr = formData.get('isPrimary') as string | null;
    const sortOrderStr = formData.get('sortOrder') as string | null;

    // Validation
    if (!file) {
      return c.json({ error: 'No video file provided' }, 400);
    }

    if (!productId) {
      return c.json({ error: 'Product ID is required' }, 400);
    }

    // Parse optional parameters
    const isPrimary = isPrimaryStr === 'true';
    const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : undefined;

    // Initialize video service
    const videoService = new VideoService(
      c.env.PRODUCT_VIDEOS,
      c.env.VIDEO_CACHE,
      c.env.CLOUDFLARE_STREAM_API_TOKEN
    );

    // Determine upload mode
    const uploadMode = mode || (c.env.CLOUDFLARE_STREAM_API_TOKEN ? 'stream' : 'r2');

    let result;

    if (uploadMode === 'stream') {
      if (!c.env.CLOUDFLARE_STREAM_API_TOKEN) {
        return c.json(
          {
            error: 'Cloudflare Stream is not configured. Use mode=r2 for basic upload.',
          },
          400
        );
      }

      // Upload to Stream (recommended)
      result = await videoService.uploadToStream(
        productId,
        file,
        file.type,
        file.name,
        {
          isPrimary,
          sortOrder,
        }
      );

      return c.json(
        {
          success: true,
          message: 'Video uploaded to Cloudflare Stream successfully',
          mode: 'stream',
          video: {
            videoId: result.videoId,
            urls: result.urls,
            metadata: result.metadata,
          },
          info: {
            encoding: 'Videos are being encoded to multiple qualities (1080p, 720p, 480p, 360p)',
            streaming: 'Adaptive bitrate streaming (HLS/DASH) enabled',
            status: 'Check video status with GET /api/videos/stream/:videoId',
          },
        },
        201
      );
    } else {
      // Upload to R2 (basic)
      result = await videoService.uploadToR2(
        productId,
        file,
        file.type,
        file.name,
        {
          isPrimary,
          sortOrder,
        }
      );

      return c.json(
        {
          success: true,
          message: 'Video uploaded to R2 successfully',
          mode: 'r2',
          video: {
            filename: result.filename,
            urls: result.urls,
            metadata: result.metadata,
          },
          info: {
            note: 'Using basic R2 storage. For optimized streaming, enable Cloudflare Stream.',
          },
        },
        201
      );
    }
  } catch (error) {
    console.error('Video upload error:', error);

    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Failed to upload video' }, 500);
  }
});

/**
 * GET /api/videos/:filename
 *
 * Serve video from R2 (basic mode only)
 *
 * Headers:
 * - Cache-Control: public, max-age=604800 (7 days)
 * - CDN-Cache-Control: max-age=2592000 (30 days)
 * - Accept-Ranges: bytes (for seeking)
 */
app.get('/:filename{.+}', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Initialize video service
    const videoService = new VideoService(
      c.env.PRODUCT_VIDEOS,
      c.env.VIDEO_CACHE,
      c.env.CLOUDFLARE_STREAM_API_TOKEN
    );

    // Get video from R2
    const result = await videoService.getVideo(filename);

    if (!result) {
      return c.json({ error: 'Video not found' }, 404);
    }

    // Set cache headers
    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Cache-Control', 'public, max-age=604800'); // 7 days
    headers.set('CDN-Cache-Control', 'max-age=2592000'); // 30 days for CDN
    headers.set('Accept-Ranges', 'bytes'); // Enable seeking
    headers.set('X-Content-Type-Options', 'nosniff');

    // Return video
    return new Response(result.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Video serve error:', error);
    return c.json({ error: 'Failed to serve video' }, 500);
  }
});

/**
 * GET /api/videos/stream/:videoId
 *
 * Get Cloudflare Stream video status and metadata
 */
app.get('/stream/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');

    // Initialize video service
    const videoService = new VideoService(
      c.env.PRODUCT_VIDEOS,
      c.env.VIDEO_CACHE,
      c.env.CLOUDFLARE_STREAM_API_TOKEN
    );

    // Get Stream metadata
    const metadata = await videoService.getStreamMetadata(videoId);

    return c.json({
      success: true,
      video: metadata,
    });
  } catch (error) {
    console.error('Stream metadata error:', error);

    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Failed to get video metadata' }, 500);
  }
});

/**
 * DELETE /api/videos/:filename
 *
 * Delete video from R2 (basic mode)
 */
app.delete('/:filename{.+}', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Initialize video service
    const videoService = new VideoService(
      c.env.PRODUCT_VIDEOS,
      c.env.VIDEO_CACHE,
      c.env.CLOUDFLARE_STREAM_API_TOKEN
    );

    // Delete video from R2
    await videoService.deleteVideoR2(filename);

    return c.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    console.error('Video delete error:', error);
    return c.json({ error: 'Failed to delete video' }, 500);
  }
});

/**
 * DELETE /api/videos/stream/:videoId
 *
 * Delete video from Cloudflare Stream
 */
app.delete('/stream/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');

    // Initialize video service
    const videoService = new VideoService(
      c.env.PRODUCT_VIDEOS,
      c.env.VIDEO_CACHE,
      c.env.CLOUDFLARE_STREAM_API_TOKEN
    );

    // Delete video from Stream
    await videoService.deleteVideoStream(videoId);

    return c.json({
      success: true,
      message: 'Video deleted from Cloudflare Stream successfully',
    });
  } catch (error) {
    console.error('Stream delete error:', error);

    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Failed to delete video' }, 500);
  }
});

/**
 * DELETE /api/videos/product/:productId
 *
 * Delete all videos for a product (both R2 and Stream)
 */
app.delete('/product/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');

    // Initialize video service
    const videoService = new VideoService(
      c.env.PRODUCT_VIDEOS,
      c.env.VIDEO_CACHE,
      c.env.CLOUDFLARE_STREAM_API_TOKEN
    );

    // Delete all R2 videos for product
    await videoService.deleteProductVideos(productId);

    return c.json({
      success: true,
      message: 'All product videos deleted successfully',
    });
  } catch (error) {
    console.error('Product videos delete error:', error);
    return c.json({ error: 'Failed to delete product videos' }, 500);
  }
});

export default app;
