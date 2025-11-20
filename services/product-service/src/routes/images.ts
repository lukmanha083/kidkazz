/**
 * Image Routes
 *
 * Handles product image upload, serving, and deletion.
 * Uses R2 for storage and KV for CDN caching.
 */

import { Hono } from 'hono';
import { ImageService } from '../infrastructure/image-service';

type Bindings = {
  PRODUCT_IMAGES: R2Bucket;
  IMAGE_CACHE: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/images/upload
 *
 * Upload product image
 *
 * Body: FormData with:
 * - file: Image file (required)
 * - productId: Product ID (required)
 */
app.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const productId = formData.get('productId') as string;

    // Validation
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    if (!productId) {
      return c.json({ error: 'Product ID is required' }, 400);
    }

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Upload image
    const result = await imageService.uploadImage(
      productId,
      file,
      file.type,
      file.name
    );

    return c.json({
      success: true,
      message: 'Image uploaded successfully',
      image: {
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
 * DELETE /api/images/:filename
 *
 * Delete image and clear cache
 */
app.delete('/:filename{.+}', async (c) => {
  try {
    const filename = c.req.param('filename');

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Delete image
    await imageService.deleteImage(filename);

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
app.delete('/product/:productId', async (c) => {
  try {
    const productId = c.req.param('productId');

    // Initialize image service
    const imageService = new ImageService(
      c.env.PRODUCT_IMAGES,
      c.env.IMAGE_CACHE
    );

    // Delete all product images
    await imageService.deleteProductImages(productId);

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
