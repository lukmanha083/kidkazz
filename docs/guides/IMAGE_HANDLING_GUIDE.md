# Image Handling Guide

**KidKazz - Product Image Management with R2 + KV + CDN**

Complete guide for uploading, optimizing, and serving product images using Cloudflare R2, KV, and CDN.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup](#setup)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [API Reference](#api-reference)
7. [Performance Optimization](#performance-optimization)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## Overview

### What Was Implemented

1. **R2 Bucket Storage**: Durable, cost-effective image storage
2. **KV Cache**: Edge caching for fast image delivery via CDN
3. **Multi-Size Generation**: Automatic thumbnail, medium, large variants
4. **Image Optimization**: Client-side compression before upload
5. **CDN Delivery**: Cloudflare CDN for global fast loading

### Key Features

- ✅ **Automatic image optimization** (resize, compress)
- ✅ **Multiple size variants** (thumbnail: 150x150, medium: 500x500, large: 1200x1200, original)
- ✅ **CDN caching** with KV (7-day browser cache, 30-day CDN cache)
- ✅ **Client-side compression** before upload
- ✅ **Drag & drop upload** with preview
- ✅ **File validation** (size, type, dimensions)
- ✅ **Automatic cleanup** when products are deleted

---

## Architecture

### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├──────────────────────────────────────────────────────────────┤
│  1. User selects image (drag & drop or click)                │
│  2. Client-side compression (max 2000x2000, 85% quality)     │
│  3. Upload to Product Service                                │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│               Product Service (Cloudflare Worker)            │
├──────────────────────────────────────────────────────────────┤
│  4. Validate image (type, size)                              │
│  5. Generate unique filename (products/{id}/{timestamp}.jpg) │
│  6. Store in R2 bucket                                       │
│  7. Return URLs for different sizes                          │
└──────────────────┬───────────────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
┌─────────────┐         ┌──────────────┐
│  R2 Bucket  │         │  KV Cache    │
│  (Storage)  │         │  (CDN Edge)  │
└─────────────┘         └──────────────┘
      │                         │
      └────────────┬────────────┘
                   ▼
┌──────────────────────────────────────────────────────────────┐
│               Image Serving (GET /api/images/...)            │
├──────────────────────────────────────────────────────────────┤
│  8. Check KV cache first (cache hit: instant)                │
│  9. If miss, fetch from R2 bucket                            │
│ 10. Store in KV cache for next request                       │
│ 11. Serve via Cloudflare CDN (global edge network)          │
└──────────────────────────────────────────────────────────────┘
```

### Storage Strategy

| Layer | Purpose | TTL | Cost |
|-------|---------|-----|------|
| **R2 Bucket** | Persistent storage | Permanent | $0.015/GB/month |
| **KV Cache** | Edge caching | 7 days | $0.50/GB/month |
| **Browser Cache** | Client caching | 7 days | Free |
| **CDN Cache** | CDN edge caching | 30 days | Free |

---

## Setup

### 1. Create R2 Bucket

```bash
# Create R2 bucket
wrangler r2 bucket create kidkazz-product-images

# The bucket will be automatically created with your Cloudflare account
# No additional configuration needed for local development
```

### 2. Create KV Namespace

```bash
# Create KV namespace for production
wrangler kv:namespace create IMAGE_CACHE

# Create KV namespace for preview (local development)
wrangler kv:namespace create IMAGE_CACHE --preview

# Note the IDs returned and update wrangler.jsonc
```

### 3. Update wrangler.jsonc

The configuration is already set up in `services/product-service/wrangler.jsonc`:

```jsonc
{
  // R2 bucket for product images
  "r2_buckets": [
    {
      "binding": "PRODUCT_IMAGES",
      "bucket_name": "kidkazz-product-images"
    }
  ],

  // KV namespace for image CDN cache
  "kv_namespaces": [
    {
      "binding": "IMAGE_CACHE",
      "id": "<your-production-id>",      // From step 2
      "preview_id": "<your-preview-id>"  // From step 2
    }
  ]
}
```

### 4. Install Dependencies

No additional dependencies needed! Uses standard Cloudflare Workers APIs.

---

## Backend Implementation

### Image Service

**File**: `services/product-service/src/infrastructure/image-service.ts`

Key methods:

```typescript
class ImageService {
  // Upload image to R2 and generate multiple sizes
  async uploadImage(
    productId: string,
    file: Blob,
    mimeType: string,
    originalName: string
  ): Promise<{ sizes: ImageSizes; metadata: ImageMetadata }>

  // Get image from R2 with KV cache
  async getImage(
    filename: string,
    size?: 'thumbnail' | 'medium' | 'large'
  ): Promise<{ data: ArrayBuffer; contentType: string; cacheHit: boolean }>

  // Delete image and clear cache
  async deleteImage(filename: string): Promise<void>

  // Delete all images for a product
  async deleteProductImages(productId: string): Promise<void>
}
```

### API Endpoints

**File**: `services/product-service/src/routes/images.ts`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/images/upload` | POST | Upload product image |
| `/api/images/:filename` | GET | Serve image (with optional `?size=` param) |
| `/api/images/:filename` | DELETE | Delete image |
| `/api/images/product/:productId` | DELETE | Delete all product images |
| `/api/images/metadata/:filename` | GET | Get image metadata |

---

## Frontend Implementation

### ImageUpload Component

**File**: `apps/erp-dashboard/src/components/ImageUpload.tsx`

Features:
- Drag & drop or click to upload
- Image preview before upload
- Client-side compression (max 2000x2000, 85% quality)
- File validation (type, size)
- Progress indicator
- Error handling

Usage:

```typescript
import { ImageUpload } from '@/components/ImageUpload';

function ProductForm() {
  const [productId] = useState('product-123');

  const handleUploadSuccess = (result) => {
    console.log('Upload successful!');
    console.log('Thumbnail:', result.urls.thumbnail);
    console.log('Medium:', result.urls.medium);
    console.log('Large:', result.urls.large);
    console.log('Original:', result.urls.original);

    // Update product with image URL
    // Usually save the 'original' or 'large' URL to database
  };

  const handleUploadError = (error) => {
    console.error('Upload failed:', error);
  };

  return (
    <ImageUpload
      productId={productId}
      onUploadSuccess={handleUploadSuccess}
      onUploadError={handleUploadError}
      maxSizeMB={5}
    />
  );
}
```

---

## API Reference

### Upload Image

**POST** `/api/images/upload`

**Body** (multipart/form-data):
```typescript
{
  file: File,        // Image file (required)
  productId: string  // Product ID (required)
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "image": {
    "urls": {
      "thumbnail": "/api/images/products/prod-123/1732060800-abc123.jpg?size=thumbnail",
      "medium": "/api/images/products/prod-123/1732060800-abc123.jpg?size=medium",
      "large": "/api/images/products/prod-123/1732060800-abc123.jpg?size=large",
      "original": "/api/images/products/prod-123/1732060800-abc123.jpg"
    },
    "metadata": {
      "productId": "prod-123",
      "originalName": "product-photo.jpg",
      "mimeType": "image/jpeg",
      "size": 1048576,
      "uploadedAt": "2025-11-20T12:00:00.000Z"
    }
  }
}
```

**Errors**:
- `400 Bad Request`: Invalid file, missing productId, or file too large
- `500 Internal Server Error`: Server error

### Serve Image

**GET** `/api/images/:filename`

**Query Parameters**:
- `size` (optional): `thumbnail` | `medium` | `large`

**Response** (200 OK):
- Body: Image binary data
- Headers:
  - `Content-Type`: `image/jpeg` | `image/png` | etc.
  - `Cache-Control`: `public, max-age=604800` (7 days)
  - `CDN-Cache-Control`: `max-age=2592000` (30 days)
  - `X-Cache-Hit`: `true` | `false` (from KV cache)

**Example**:
```bash
# Get original image
curl http://localhost:8788/api/images/products/prod-123/1732060800-abc123.jpg

# Get thumbnail (150x150)
curl http://localhost:8788/api/images/products/prod-123/1732060800-abc123.jpg?size=thumbnail

# Get medium (500x500)
curl http://localhost:8788/api/images/products/prod-123/1732060800-abc123.jpg?size=medium

# Get large (1200x1200)
curl http://localhost:8788/api/images/products/prod-123/1732060800-abc123.jpg?size=large
```

### Delete Image

**DELETE** `/api/images/:filename`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### Delete Product Images

**DELETE** `/api/images/product/:productId`

Deletes all images for a product.

**Response** (200 OK):
```json
{
  "success": true,
  "message": "All product images deleted successfully"
}
```

### Get Image Metadata

**GET** `/api/images/metadata/:filename`

**Response** (200 OK):
```json
{
  "productId": "prod-123",
  "originalName": "product-photo.jpg",
  "mimeType": "image/jpeg",
  "size": 1048576,
  "uploadedAt": "2025-11-20T12:00:00.000Z"
}
```

---

## Performance Optimization

### Client-Side Optimization

**Before Upload**:
1. Resize large images (max 2000x2000 pixels)
2. Compress with 85% quality
3. Convert to appropriate format

**Impact**:
- Original image: 5MB
- After compression: ~500KB
- **10x reduction** in upload time and storage

### Server-Side Caching

**KV Cache Strategy**:
```typescript
// 1st request: R2 fetch (~100-200ms)
GET /api/images/products/prod-123/image.jpg
X-Cache-Hit: false
Response time: 150ms

// 2nd+ requests: KV cache (<10ms)
GET /api/images/products/prod-123/image.jpg
X-Cache-Hit: true
Response time: 8ms

// 15-20x faster!
```

### CDN Caching

- **Browser Cache**: 7 days (`Cache-Control: public, max-age=604800`)
- **CDN Cache**: 30 days (`CDN-Cache-Control: max-age=2592000`)
- **Global Edge Network**: Served from nearest Cloudflare edge location

**Result**:
- First load: ~150ms (from R2)
- Second load: ~8ms (from KV)
- Third+ load: < 1ms (from browser cache or CDN)

### Multiple Size Variants

Use appropriate size for each use case:

| Use Case | Size | Dimensions | When to Use |
|----------|------|------------|-------------|
| **Thumbnail** | ~10-20KB | 150x150 | Product lists, search results |
| **Medium** | ~50-100KB | 500x500 | Product cards, mobile view |
| **Large** | ~200-400KB | 1200x1200 | Product detail page, desktop |
| **Original** | Variable | Original | Admin editing, high-res viewing |

**Example**:
```html
<!-- Product list (use thumbnail) -->
<img src="/api/images/product.jpg?size=thumbnail" />

<!-- Product card (use medium) -->
<img src="/api/images/product.jpg?size=medium" />

<!-- Product detail (use large) -->
<img src="/api/images/product.jpg?size=large" />

<!-- Responsive images -->
<img
  src="/api/images/product.jpg?size=medium"
  srcset="
    /api/images/product.jpg?size=thumbnail 150w,
    /api/images/product.jpg?size=medium 500w,
    /api/images/product.jpg?size=large 1200w
  "
  sizes="(max-width: 640px) 150px, (max-width: 1024px) 500px, 1200px"
  alt="Product"
/>
```

---

## Testing

### Manual Testing

#### 1. Upload Image via API

```bash
curl -X POST http://localhost:8788/api/images/upload \
  -F "file=@/path/to/image.jpg" \
  -F "productId=test-product-123"
```

#### 2. Serve Image

```bash
# Original
curl http://localhost:8788/api/images/products/test-product-123/1732060800-abc123.jpg \
  -o original.jpg

# Thumbnail
curl "http://localhost:8788/api/images/products/test-product-123/1732060800-abc123.jpg?size=thumbnail" \
  -o thumbnail.jpg

# Check cache hit
curl -I "http://localhost:8788/api/images/products/test-product-123/1732060800-abc123.jpg" \
  | grep X-Cache-Hit
```

#### 3. Test Cache Performance

```bash
# First request (cache miss)
time curl -s http://localhost:8788/api/images/test.jpg > /dev/null
# Expected: ~150ms

# Second request (cache hit)
time curl -s http://localhost:8788/api/images/test.jpg > /dev/null
# Expected: ~8ms
```

### Frontend Testing

1. **Start Product Service**:
   ```bash
   cd services/product-service
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd apps/erp-dashboard
   npm run dev
   ```

3. **Test Upload**:
   - Open `http://localhost:5173`
   - Navigate to product form
   - Drag & drop an image or click to upload
   - Verify preview appears
   - Check browser Network tab for upload request
   - Verify image is served with correct URLs

4. **Test Caching**:
   - Open browser DevTools → Network tab
   - Upload an image
   - Reload page
   - Second load should be from cache (check `X-Cache-Hit` header)

---

## Troubleshooting

### Common Issues

#### 1. R2 Bucket Not Found

**Error**: `R2 bucket not found` or `PRODUCT_IMAGES is undefined`

**Solution**:
```bash
# Create R2 bucket
wrangler r2 bucket create kidkazz-product-images

# Verify it was created
wrangler r2 bucket list

# Make sure wrangler.jsonc has correct binding
```

#### 2. KV Namespace Not Found

**Error**: `IMAGE_CACHE is undefined`

**Solution**:
```bash
# Create KV namespace
wrangler kv:namespace create IMAGE_CACHE
wrangler kv:namespace create IMAGE_CACHE --preview

# Update wrangler.jsonc with the IDs returned
```

#### 3. Image Upload Fails

**Error**: `Failed to upload image` or `File too large`

**Possible causes**:
1. File exceeds 5MB limit
2. Invalid file type
3. Network error

**Solution**:
```typescript
// Check file size
if (file.size > 5 * 1024 * 1024) {
  console.error('File too large');
}

// Check file type
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
if (!allowedTypes.includes(file.type)) {
  console.error('Invalid file type');
}
```

#### 4. Image Not Serving

**Error**: `Image not found` (404)

**Possible causes**:
1. Image was deleted
2. Wrong filename
3. R2 bucket not accessible

**Solution**:
```bash
# List images in R2 bucket
wrangler r2 object list kidkazz-product-images --prefix products/

# Check if image exists
wrangler r2 object get kidkazz-product-images/products/test-123/image.jpg
```

#### 5. Cache Not Working

**Issue**: Every request shows `X-Cache-Hit: false`

**Solution**:
```bash
# Check KV namespace is bound correctly
wrangler kv:namespace list

# Verify KV is working
wrangler kv:key put --namespace-id=<your-id> test-key test-value
wrangler kv:key get --namespace-id=<your-id> test-key
```

---

## Production Deployment

### Prerequisites

1. Cloudflare account with R2 enabled
2. Cloudflare account with KV enabled
3. Wrangler authenticated: `wrangler login`

### Deploy Steps

#### 1. Create Production R2 Bucket

```bash
wrangler r2 bucket create kidkazz-product-images
```

#### 2. Create Production KV Namespace

```bash
# Create production KV namespace
wrangler kv:namespace create IMAGE_CACHE

# Note the ID returned
```

#### 3. Update wrangler.jsonc

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "IMAGE_CACHE",
      "id": "<production-id-from-step-2>",
      "preview_id": "<preview-id>"
    }
  ]
}
```

#### 4. Deploy Product Service

```bash
cd services/product-service
wrangler deploy
```

#### 5. Update Frontend URLs

Update `.env` in `apps/erp-dashboard`:

```env
VITE_PRODUCT_SERVICE_URL=https://product-service.your-domain.workers.dev
```

#### 6. Verify Deployment

```bash
# Test upload
curl -X POST https://product-service.your-domain.workers.dev/api/images/upload \
  -F "file=@test-image.jpg" \
  -F "productId=test-123"

# Test serving
curl https://product-service.your-domain.workers.dev/api/images/products/test-123/image.jpg
```

### Cost Estimates

For **10,000 products** with **1 image each**:

| Service | Usage | Cost/Month |
|---------|-------|------------|
| **R2 Storage** | 10,000 images × 500KB = 5GB | $0.08 |
| **R2 Operations** | 10,000 uploads + 50,000 downloads | $0.50 |
| **KV Storage** | 5GB cached | $2.50 |
| **KV Operations** | 1M reads/month | $0.50 |
| **Workers Requests** | 1M requests/month | Free (included) |
| **CDN Bandwidth** | Unlimited | Free |
| **Total** | | **~$3.58/month** |

**Comparison**:
- AWS S3 + CloudFront: ~$15-20/month
- Traditional hosting: ~$50-100/month

**Savings**: **80-95% cheaper** than alternatives!

---

## Best Practices

1. **Always compress images client-side** before upload
2. **Use appropriate size** for each use case (thumbnail vs. large)
3. **Set proper cache headers** for optimal CDN performance
4. **Delete old images** when products are updated or deleted
5. **Monitor R2 and KV usage** to optimize costs
6. **Use responsive images** with srcset for different screen sizes
7. **Add image alt text** for SEO and accessibility

---

## Next Steps

- [ ] Add WebP conversion for better compression
- [ ] Implement image cropping UI
- [ ] Add watermark support
- [ ] Create image gallery component
- [ ] Add bulk upload support
- [ ] Implement image analytics (views, downloads)

---

**Last Updated**: 2025-11-20
**Version**: 1.0 - Initial Implementation
