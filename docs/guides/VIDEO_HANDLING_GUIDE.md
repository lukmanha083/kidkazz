# Video Handling Guide

Complete guide for handling product videos in KidKazz using Cloudflare R2 and Cloudflare Stream.

## Table of Contents

1. [Overview](#overview)
2. [Two Storage Modes](#two-storage-modes)
3. [Setup](#setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Components](#frontend-components)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Usage Examples](#usage-examples)
9. [Cost Comparison](#cost-comparison)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

KidKazz supports product videos with two storage modes:

1. **R2 Mode (Basic)**: Cost-effective storage with simple video playback
2. **Stream Mode (Recommended)**: Full optimization with adaptive streaming

### Key Features

- ✅ Two storage modes (R2 and Stream)
- ✅ Multiple videos per product (up to 5)
- ✅ Adaptive bitrate streaming (HLS/DASH) for Stream mode
- ✅ Automatic encoding to multiple qualities (1080p, 720p, 480p, 360p)
- ✅ Thumbnail generation (Stream mode)
- ✅ Video gallery with reordering
- ✅ Primary video selection
- ✅ Drag & drop upload
- ✅ Progress tracking
- ✅ Global CDN delivery

## Two Storage Modes

### R2 Mode (Basic)

**When to use:**
- Cost is a primary concern
- Simple video playback is sufficient
- No need for adaptive streaming
- Videos are already optimized

**Features:**
- Direct storage in Cloudflare R2 (S3-compatible)
- Basic HTML5 video playback
- No automatic optimization
- Lower cost (storage only)

**Limitations:**
- Single quality (as uploaded)
- No adaptive bitrate streaming
- No automatic thumbnail generation
- Manual optimization required

### Stream Mode (Recommended)

**When to use:**
- Professional video experience required
- Multiple quality options needed
- Users have varying internet speeds
- Analytics are important

**Features:**
- Automatic encoding to multiple qualities (1080p, 720p, 480p, 360p)
- Adaptive bitrate streaming (HLS/DASH)
- Automatic thumbnail generation
- Global CDN delivery
- Video analytics
- Playback watermarks (optional)

**Cost:**
- Per-minute encoding fee
- Storage and delivery included
- Higher upfront cost, better user experience

## Setup

### 1. Configure Cloudflare Resources

#### Create R2 Bucket (Required)

```bash
# Create R2 bucket for videos
wrangler r2 bucket create kidkazz-product-videos

# Create KV namespace for video cache
wrangler kv:namespace create VIDEO_CACHE
wrangler kv:namespace create VIDEO_CACHE --preview
```

#### Enable Cloudflare Stream (Optional, for Stream Mode)

1. Go to Cloudflare Dashboard
2. Navigate to Stream
3. Enable Stream
4. Generate API token:
   - Go to **My Profile** → **API Tokens**
   - Create token with **Stream:Edit** permissions
   - Copy token

### 2. Update wrangler.jsonc

The configuration is already set up in `services/product-service/wrangler.jsonc`:

```jsonc
{
  "r2_buckets": [
    {
      "binding": "PRODUCT_VIDEOS",
      "bucket_name": "kidkazz-product-videos"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "VIDEO_CACHE",
      "id": "your-kv-namespace-id",
      "preview_id": "your-preview-kv-namespace-id"
    }
  ],
  // Uncomment to enable Stream mode
  // "vars": {
  //   "CLOUDFLARE_STREAM_API_TOKEN": "your-stream-api-token"
  // }
}
```

### 3. Run Database Migration

```bash
cd services/product-service
wrangler d1 migrations apply DB --local  # For local development
wrangler d1 migrations apply DB          # For production
```

### 4. Install Frontend Dependencies

```bash
cd apps/erp-dashboard
npm install hls.js  # For HLS video streaming support
```

## Backend Implementation

### VideoService Class

Located at: `services/product-service/src/infrastructure/video-service.ts`

```typescript
import { VideoService } from '../infrastructure/video-service';

// Initialize service
const videoService = new VideoService(
  env.PRODUCT_VIDEOS,      // R2 bucket
  env.VIDEO_CACHE,         // KV namespace
  env.CLOUDFLARE_STREAM_API_TOKEN  // Optional, for Stream mode
);

// Upload to Stream (recommended)
const streamResult = await videoService.uploadToStream(
  'product-123',
  videoFile,
  'video/mp4',
  'product-demo.mp4',
  {
    isPrimary: true,
    sortOrder: 0,
  }
);

// Upload to R2 (basic)
const r2Result = await videoService.uploadToR2(
  'product-123',
  videoFile,
  'video/mp4',
  'product-demo.mp4',
  {
    isPrimary: true,
    sortOrder: 0,
  }
);
```

### API Routes

Located at: `services/product-service/src/routes/videos.ts`

All routes are prefixed with `/api/videos`

## Frontend Components

### 1. VideoPlayer Component

Full-featured video player with HLS support.

```tsx
import { VideoPlayer } from '@/components/VideoPlayer';

<VideoPlayer
  urls={{
    hls: 'https://customer-xxx.cloudflarestream.com/xxx/manifest/video.m3u8',
    dash: 'https://customer-xxx.cloudflarestream.com/xxx/manifest/video.mpd',
    thumbnail: 'https://customer-xxx.cloudflarestream.com/xxx/thumbnails/thumbnail.jpg',
  }}
  mode="stream"
  autoplay={false}
  muted={false}
  controls={true}
/>
```

**Props:**
- `urls`: Video URLs (hls, dash, original, thumbnail)
- `mode`: 'r2' | 'stream'
- `autoplay`: Boolean
- `muted`: Boolean
- `controls`: Boolean
- `onError`: Error callback

### 2. VideoGallery Component

Manage multiple videos with reordering and preview.

```tsx
import { VideoGallery } from '@/components/VideoGallery';

<VideoGallery
  productId="product-123"
  videos={videos}
  onVideosChange={setVideos}
  maxVideos={5}
/>
```

**Props:**
- `productId`: Product ID
- `videos`: Array of ProductVideo
- `onVideosChange`: Callback when videos change
- `maxVideos`: Maximum number of videos (default: 5)

### 3. VideoUpload Component

Upload videos with progress tracking.

```tsx
import { VideoUpload } from '@/components/VideoUpload';

<VideoUpload
  productId="product-123"
  onUploadSuccess={handleUploadSuccess}
  onUploadError={handleUploadError}
  maxSizeMB={500}
  defaultMode="stream"
/>
```

**Props:**
- `productId`: Product ID
- `onUploadSuccess`: Success callback
- `onUploadError`: Error callback
- `maxSizeMB`: Maximum file size (default: 500)
- `defaultMode`: 'r2' | 'stream' (default: 'stream')

## Database Schema

Located at: `services/product-service/migrations/0003_add_product_videos_table.sql`

```sql
CREATE TABLE product_videos (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,

  -- File information
  filename TEXT,              -- R2 filename (for R2 mode)
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,

  -- Video dimensions and duration
  width INTEGER,
  height INTEGER,
  duration INTEGER,           -- Duration in seconds

  -- Video organization
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Storage mode: 'r2' or 'stream'
  storage_mode TEXT NOT NULL DEFAULT 'r2',

  -- Cloudflare Stream specific
  stream_id TEXT,             -- Stream video UID
  stream_status TEXT,         -- 'queued' | 'inprogress' | 'ready' | 'error'

  -- URLs
  original_url TEXT,          -- R2 URL
  hls_url TEXT,               -- Stream HLS URL
  dash_url TEXT,              -- Stream DASH URL
  thumbnail_url TEXT,         -- Stream thumbnail URL
  download_url TEXT,          -- Download URL

  -- Timestamps
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

## API Reference

### Upload Video

**Endpoint:** `POST /api/videos/upload`

**Request:**
```typescript
// Form Data
{
  file: File,              // Video file (required, max 500MB)
  productId: string,       // Product ID (required)
  mode: 'stream' | 'r2',   // Upload mode (optional, defaults to 'stream' if token available)
  isPrimary: boolean,      // Is primary video (optional)
  sortOrder: number,       // Sort order (optional)
}
```

**Response (Stream Mode):**
```json
{
  "success": true,
  "message": "Video uploaded to Cloudflare Stream successfully",
  "mode": "stream",
  "video": {
    "videoId": "abc123...",
    "urls": {
      "hls": "https://customer-xxx.cloudflarestream.com/xxx/manifest/video.m3u8",
      "dash": "https://customer-xxx.cloudflarestream.com/xxx/manifest/video.mpd",
      "thumbnail": "https://customer-xxx.cloudflarestream.com/xxx/thumbnails/thumbnail.jpg",
      "download": "https://customer-xxx.cloudflarestream.com/xxx/downloads/default.mp4"
    },
    "metadata": {
      "productId": "product-123",
      "originalName": "demo.mp4",
      "mimeType": "video/mp4",
      "size": 10485760,
      "uploadedAt": "2025-11-20T10:00:00Z",
      "streamId": "abc123...",
      "streamStatus": "queued"
    }
  },
  "info": {
    "encoding": "Videos are being encoded to multiple qualities",
    "streaming": "Adaptive bitrate streaming (HLS/DASH) enabled",
    "status": "Check video status with GET /api/videos/stream/:videoId"
  }
}
```

**Response (R2 Mode):**
```json
{
  "success": true,
  "message": "Video uploaded to R2 successfully",
  "mode": "r2",
  "video": {
    "filename": "products/product-123/videos/1234567890-abc.mp4",
    "urls": {
      "original": "/api/videos/products/product-123/videos/1234567890-abc.mp4",
      "download": "/api/videos/products/product-123/videos/1234567890-abc.mp4"
    },
    "metadata": {
      "productId": "product-123",
      "originalName": "demo.mp4",
      "mimeType": "video/mp4",
      "size": 10485760,
      "uploadedAt": "2025-11-20T10:00:00Z"
    }
  },
  "info": {
    "note": "Using basic R2 storage. For optimized streaming, enable Cloudflare Stream."
  }
}
```

### Get Video (R2 Mode)

**Endpoint:** `GET /api/videos/:filename`

**Response:** Video file with headers:
- `Content-Type`: video/mp4
- `Cache-Control`: public, max-age=604800 (7 days)
- `Accept-Ranges`: bytes (for seeking)

### Get Stream Metadata

**Endpoint:** `GET /api/videos/stream/:videoId`

**Response:**
```json
{
  "success": true,
  "video": {
    "uid": "abc123...",
    "status": {
      "state": "ready",
      "pctComplete": "100.0"
    },
    "playback": {
      "hls": "https://customer-xxx.cloudflarestream.com/xxx/manifest/video.m3u8",
      "dash": "https://customer-xxx.cloudflarestream.com/xxx/manifest/video.mpd"
    },
    "thumbnail": "https://customer-xxx.cloudflarestream.com/xxx/thumbnails/thumbnail.jpg",
    "duration": 120.5,
    "width": 1920,
    "height": 1080
  }
}
```

### Delete Video

**R2 Mode:** `DELETE /api/videos/:filename`
**Stream Mode:** `DELETE /api/videos/stream/:videoId`

**Response:**
```json
{
  "success": true,
  "message": "Video deleted successfully"
}
```

### Delete All Product Videos

**Endpoint:** `DELETE /api/videos/product/:productId`

**Response:**
```json
{
  "success": true,
  "message": "All product videos deleted successfully"
}
```

## Usage Examples

### Example 1: Upload Video with Stream Mode

```tsx
import { useState } from 'react';
import { VideoUpload } from '@/components/VideoUpload';

function ProductVideoUpload({ productId }) {
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const handleUploadSuccess = (result) => {
    setUploadStatus('Video uploaded successfully! Encoding in progress...');
    console.log('Video ID:', result.videoId);
    console.log('HLS URL:', result.urls.hls);
  };

  const handleUploadError = (error) => {
    setUploadStatus(`Upload failed: ${error}`);
  };

  return (
    <div>
      <VideoUpload
        productId={productId}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        defaultMode="stream"
      />
      {uploadStatus && <p className="mt-2 text-sm">{uploadStatus}</p>}
    </div>
  );
}
```

### Example 2: Display Video Gallery

```tsx
import { useState, useEffect } from 'react';
import { VideoGallery } from '@/components/VideoGallery';
import type { ProductVideo } from '@/components/VideoGallery';

function ProductVideos({ productId }) {
  const [videos, setVideos] = useState<ProductVideo[]>([]);

  // Load videos from API
  useEffect(() => {
    fetch(`/api/products/${productId}/videos`)
      .then(res => res.json())
      .then(data => setVideos(data.videos));
  }, [productId]);

  return (
    <div>
      <h2>Product Videos</h2>
      <VideoGallery
        productId={productId}
        videos={videos}
        onVideosChange={setVideos}
        maxVideos={5}
      />
    </div>
  );
}
```

### Example 3: Play Video with Custom Player

```tsx
import { VideoPlayer } from '@/components/VideoPlayer';

function ProductVideoPlayer({ video }) {
  return (
    <div className="w-full max-w-4xl">
      <VideoPlayer
        urls={video.urls}
        mode={video.mode}
        autoplay={false}
        controls={true}
        onError={(error) => console.error('Playback error:', error)}
      />

      {video.mode === 'stream' && video.streamStatus !== 'ready' && (
        <div className="mt-2 text-sm text-yellow-600">
          Video is being encoded. Status: {video.streamStatus}
        </div>
      )}
    </div>
  );
}
```

### Example 4: Backend Video Upload

```typescript
import { VideoService } from './infrastructure/video-service';

// In your API handler
app.post('/custom-video-upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const productId = formData.get('productId') as string;

  const videoService = new VideoService(
    c.env.PRODUCT_VIDEOS,
    c.env.VIDEO_CACHE,
    c.env.CLOUDFLARE_STREAM_API_TOKEN
  );

  // Upload to Stream for optimized delivery
  const result = await videoService.uploadToStream(
    productId,
    file,
    file.type,
    file.name,
    {
      isPrimary: true,
      sortOrder: 0,
    }
  );

  return c.json({ success: true, video: result });
});
```

## Cost Comparison

### R2 Mode Costs

**Cloudflare R2 Pricing:**
- Storage: $0.015 per GB per month
- Class A Operations (writes): $4.50 per million
- Class B Operations (reads): $0.36 per million
- Egress: **FREE** (no bandwidth charges)

**Example (100 videos, 100MB each):**
- Storage: 10GB × $0.015 = **$0.15/month**
- Writes: 100 uploads × $4.50/1M = **$0.00045**
- Reads: 10,000 views × $0.36/1M = **$0.0036**
- **Total: ~$0.16/month + one-time upload cost**

### Stream Mode Costs

**Cloudflare Stream Pricing:**
- Encoding: $1.00 per 1,000 minutes encoded
- Storage: Included (unlimited)
- Delivery: $1.00 per 1,000 minutes delivered
- Analytics: Included

**Example (100 videos, 2 minutes each):**
- Encoding: 200 minutes × $1.00/1K = **$0.20 one-time**
- Delivery: 10,000 views × 2 min × $1.00/1K = **$20/month**
- **Total: $0.20 setup + $20/month**

### Which Mode to Choose?

**Choose R2 Mode when:**
- Budget is very limited
- Videos are pre-optimized
- Simple playback is sufficient
- Low view count expected

**Choose Stream Mode when:**
- Professional experience required
- Users have varying internet speeds
- Analytics are important
- High view count expected
- Worth the investment for better UX

## Best Practices

### Video Preparation

1. **Format**: Use MP4 with H.264 codec for best compatibility
2. **Resolution**: Maximum 1920×1080 (1080p) recommended
3. **Bitrate**: 5-8 Mbps for 1080p, 2.5-4 Mbps for 720p
4. **Duration**: Keep videos under 5 minutes for optimal engagement
5. **File Size**: Compress before upload (target < 100MB per minute)

### Upload Best Practices

1. **Use Stream Mode** for customer-facing product videos
2. **Use R2 Mode** for internal documentation or low-priority content
3. **Always set a primary video** to show on product pages
4. **Add multiple videos** showing different angles/features
5. **Use meaningful filenames** for easier management

### Playback Optimization

1. **Enable autoplay with muted** for product page previews
2. **Show loading states** during video buffering
3. **Display thumbnails** for quick visual reference
4. **Provide quality selector** for Stream mode videos
5. **Handle errors gracefully** with fallback messages

### Performance Tips

1. **Lazy load videos** that are below the fold
2. **Preload thumbnails** for gallery views
3. **Use CDN cache** for frequently accessed videos
4. **Monitor Stream encoding status** and update UI
5. **Implement progressive loading** for long videos

### Security Considerations

1. **Validate file types** on both client and server
2. **Limit file sizes** (500MB default)
3. **Use signed URLs** for restricted content (optional)
4. **Enable watermarks** for Stream mode (optional)
5. **Rate limit uploads** to prevent abuse

## Troubleshooting

### Video Upload Fails

**Problem:** Upload returns 400 Bad Request

**Solutions:**
1. Check file size (max 500MB by default)
2. Verify file type is supported (MP4, WebM, MOV, AVI, MKV)
3. Ensure productId is provided
4. Check R2 bucket permissions
5. For Stream mode, verify API token is set

### Stream Encoding Stuck

**Problem:** Video status stays "queued" or "inprogress"

**Solutions:**
1. Check video format compatibility
2. Wait up to 10 minutes for encoding (normal for large files)
3. Check Cloudflare Stream dashboard for errors
4. Verify Stream API token has correct permissions
5. Contact Cloudflare support if issue persists

### HLS Playback Not Working

**Problem:** Video player shows "HLS not supported" error

**Solutions:**
1. Ensure `hls.js` is installed: `npm install hls.js`
2. Check browser compatibility (most modern browsers supported)
3. Safari uses native HLS - no hls.js needed
4. Verify HLS URL is accessible (test in browser)
5. Check CORS headers if cross-origin

### Video Not Playing

**Problem:** Video loads but won't play

**Solutions:**
1. Check video format compatibility
2. Verify video is fully uploaded
3. For Stream mode, check encoding status is "ready"
4. Test with different browsers
5. Check browser console for errors
6. Verify CDN cache is not stale

### Poor Video Quality

**Problem:** Video looks pixelated or blurry

**Solutions:**
1. **R2 Mode**: Upload higher quality video (up to 1080p)
2. **Stream Mode**: Wait for encoding to complete
3. Check source video quality before upload
4. Use recommended bitrate settings
5. For Stream mode, manually select higher quality

### High Bandwidth Costs

**Problem:** Stream delivery costs are high

**Solutions:**
1. Switch to R2 mode for less critical videos
2. Optimize video duration (shorter is better)
3. Use lower resolution for internal videos
4. Enable Cloudflare Cache for repeated views
5. Monitor analytics to identify high-traffic videos

### Database Errors

**Problem:** Failed to save video metadata

**Solutions:**
1. Run database migration: `wrangler d1 migrations apply DB`
2. Check foreign key constraint (product must exist)
3. Verify D1 binding in wrangler.jsonc
4. Check database permissions
5. Review error logs for specific SQL errors

## Advanced Features

### Custom Watermarks (Stream Mode)

```typescript
// Coming soon: Custom watermark support
// Will allow adding brand logos or text to videos
```

### Video Analytics (Stream Mode)

Access video analytics via Cloudflare Stream dashboard:
- View count
- Play rate
- Average watch time
- Geographic distribution
- Device types

### Webhook Integration (Stream Mode)

Set up webhooks to be notified when encoding completes:

```typescript
// Coming soon: Webhook support for encoding notifications
```

## Support

For issues or questions:
1. Check this guide first
2. Review error logs in Cloudflare dashboard
3. Test with example videos
4. Create issue in GitHub repository
5. Contact Cloudflare support for Stream-specific issues

## References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Stream Documentation](https://developers.cloudflare.com/stream/)
- [HLS.js Documentation](https://github.com/video-dev/hls.js/)
- [Video Optimization Best Practices](https://web.dev/fast/#optimize-your-videos)
