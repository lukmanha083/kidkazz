/**
 * Image Routes
 *
 * Handles product image upload, serving, and deletion.
 * Uses R2 for storage and KV for CDN caching.
 */

import { Hono } from 'hono';
import { ImageService } from '../infrastructure/image-service';
import { drizzle } from 'drizzle-orm/d1';
import { productImages } from '../infrastructure/db/schema';
import { eq } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  PRODUCT_IMAGES: R2Bucket;
  IMAGE_CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/images/upload
 *
 * Upload product image with enhanced features
 *
 * Body: FormData with:
 * - file: Image file (required)
 * - productId: Product ID (required)
 * - cropArea: JSON string of crop coordinates (optional)
 * - watermark: JSON string of watermark config (optional)
 * - isPrimary: Boolean if this is the primary image (optional)
 * - sortOrder: Number for gallery ordering (optional)
 */
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;
    const cropAreaStr = formData.get('cropArea') as string | null;
    const watermarkStr = formData.get('watermark') as string | null;
    const isPrimaryStr = formData.get('isPrimary') as string | null;
    const sortOrderStr = formData.get('sortOrder') as string | null;

    // Validation
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!productId) {
      return c.json({ error: 'Product ID is required' }, 400);
    }

    // Parse optional parameters
    const cropArea = cropAreaStr ? JSON.parse(cropAreaStr) : undefined;
    const watermark = watermarkStr ? JSON.parse(watermarkStr) : undefined;
    const isPrimary = isPrimaryStr === 'true';
    const sortOrder = sortOrderStr ? parseInt(sortOrderStr, 10) : undefined;

    // Initialize database
    const db = drizzle(c.env.DB);

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Upload image to R2
    const result = await imageService.uploadImage(
      productId,
      file,
      file.type,
      file.name,
      {
        cropArea,
        watermark,
        isPrimary,
        sortOrder,
      }
    );

    // If this is set as primary, unset all other primary images for this product
    if (isPrimary) {
      await db.update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, productId));
    }

    // Get the next sort order if not provided
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const existingImages = await db.select()
        .from(productImages)
        .where(eq(productImages.productId, productId));
      finalSortOrder = existingImages.length;
    }

    // Save image metadata to database
    const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date();

    await db.insert(productImages).values({
      id: imageId,
      productId,
      filename: result.filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      isPrimary,
      sortOrder: finalSortOrder,
      cropArea: cropArea ? JSON.stringify(cropArea) : null,
      thumbnailUrl: result.sizes.thumbnail,
      mediumUrl: result.sizes.medium,
      largeUrl: result.sizes.large,
      originalUrl: result.sizes.original,
      uploadedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return c.json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
        id: imageId,
        filename: result.filename,
        urls: result.sizes,
        metadata: result.metadata,
      },
    }, 201);
  } catch (error) {
    console.error('Image upload error:', error);

    if (error instanceof Error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

/**
 * GET /api/images/product/:productId
 *
 * Get all images for a product
 */
app.get('/product/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const db = drizzle(c.env.DB);

    // Fetch all images for the product, ordered by sortOrder
    const images = await db.select()
      .from(productImages)
      .where(eq(productImages.productId, productId))
      .orderBy(productImages.sortOrder);

    return c.json({
      success: true,
      images: images.map(img => ({
        id: img.id,
        productId: img.productId,
        filename: img.filename,
        originalName: img.originalName,
        mimeType: img.mimeType,
        size: img.size,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
        cropArea: img.cropArea ? JSON.parse(img.cropArea as string) : null,
        urls: {
          thumbnail: img.thumbnailUrl,
          medium: img.mediumUrl,
          large: img.largeUrl,
          original: img.originalUrl,
        },
        uploadedAt: img.uploadedAt,
        createdAt: img.createdAt,
        updatedAt: img.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Fetch product images error:', error);
    return c.json({ error: 'Failed to fetch product images' }, 500);
  }
});

/**
 * GET /api/images/:filename
 *
 * Serve image with optional size parameter
 *
 * Query params:
 * - size: thumbnail | medium | large (optional)
 *
 * Headers:
 * - Cache-Control: public, max-age=604800 (7 days)
 * - CDN-Cache-Control: max-age=2592000 (30 days)
 */
app.get('/:filename{.+}', async (c) => {
  try {
    const filename = c.req.param('filename');
    const size = c.req.query('size') as 'thumbnail' | 'medium' | 'large' | undefined;

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Get image
    const result = await imageService.getImage(filename, size);

    if (!result) {
      return c.json({ error: 'Image not found' }, 404);
    }

    // Set cache headers
    const headers = new Headers();
    headers.set('Content-Type', result.contentType);
    headers.set('Cache-Control', 'public, max-age=604800'); // 7 days
    headers.set('CDN-Cache-Control', 'max-age=2592000'); // 30 days for CDN
    headers.set('X-Cache-Hit', result.cacheHit ? 'true' : 'false');

    // Return image
    return new Response(result.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Image serve error:', error);
    return c.json({ error: 'Failed to serve image' }, 500);
  }
});

/**
 * DELETE /api/images/image/:imageId
 *
 * Delete image by ID (from database and R2)
 */
app.delete('/image/:imageId', async (c) => {
  try {
    const imageId = c.req.param('imageId');
    const db = drizzle(c.env.DB);

    // Get image metadata from database
    const images = await db.select()
      .from(productImages)
      .where(eq(productImages.id, imageId));

    if (images.length === 0) {
      return c.json({ error: 'Image not found' }, 404);
    }

    const image = images[0];

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Delete image from R2 and cache
    await imageService.deleteImage(image.filename);

    // Delete from database
    await db.delete(productImages)
      .where(eq(productImages.id, imageId));

    return c.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Image delete error:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

/**
 * DELETE /api/images/product/:productId
 *
 * Delete all images for a product
 */
app.delete('/product/delete/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');
    const db = drizzle(c.env.DB);

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Delete all product images from R2
    await imageService.deleteProductImages(productId);

    // Delete all product images from database
    await db.delete(productImages)
      .where(eq(productImages.productId, productId));

    return c.json({
      success: true,
      message: 'All product images deleted successfully',
    });
  } catch (error) {
    console.error('Product images delete error:', error);
    return c.json({ error: 'Failed to delete product images' }, 500);
  }
});

/**
 * GET /api/images/metadata/:filename
 *
 * Get image metadata
 */
app.get('/metadata/:filename{.+}', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Get metadata
    const metadata = await imageService.getImageMetadata(filename);

    if (!metadata) {
      return c.json({ error: 'Image not found' }, 404);
    }

    return c.json(metadata);
  } catch (error) {
    console.error('Image metadata error:', error);
    return c.json({ error: 'Failed to get image metadata' }, 500);
  }
});

export default app;
