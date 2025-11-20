-- Migration: Add Product Videos Table
-- Description: Support for multiple videos per product with two storage modes (R2 and Cloudflare Stream)
-- Date: 2025-11-20

-- Drop table if exists (for development)
DROP TABLE IF EXISTS product_videos;

-- Create product_videos table
CREATE TABLE IF NOT EXISTS product_videos (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,

  -- File information
  filename TEXT, -- R2 filename (for R2 mode)
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,

  -- Video dimensions and duration
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- Duration in seconds

  -- Video organization
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Storage mode: 'r2' or 'stream'
  storage_mode TEXT NOT NULL DEFAULT 'r2', -- 'r2' | 'stream'

  -- Cloudflare Stream specific (for Stream mode)
  stream_id TEXT, -- Cloudflare Stream video UID
  stream_status TEXT, -- 'queued' | 'inprogress' | 'ready' | 'error'

  -- URLs for different modes
  -- R2 mode: original_url only
  -- Stream mode: hls_url, dash_url, thumbnail_url, download_url
  original_url TEXT, -- R2 original video URL
  hls_url TEXT, -- Stream HLS manifest URL
  dash_url TEXT, -- Stream DASH manifest URL
  thumbnail_url TEXT, -- Stream thumbnail URL
  download_url TEXT, -- Download URL (both modes)

  -- Timestamps
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraint
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_videos_product_id ON product_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_is_primary ON product_videos(is_primary);
CREATE INDEX IF NOT EXISTS idx_product_videos_sort_order ON product_videos(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_videos_storage_mode ON product_videos(storage_mode);
CREATE INDEX IF NOT EXISTS idx_product_videos_stream_id ON product_videos(stream_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_stream_status ON product_videos(stream_status);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_product_videos_timestamp
AFTER UPDATE ON product_videos
FOR EACH ROW
BEGIN
  UPDATE product_videos SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Ensure only one primary video per product
CREATE TRIGGER IF NOT EXISTS enforce_single_primary_video
BEFORE INSERT ON product_videos
FOR EACH ROW
WHEN NEW.is_primary = TRUE
BEGIN
  UPDATE product_videos SET is_primary = FALSE WHERE product_id = NEW.product_id;
END;

-- Update primary video on update
CREATE TRIGGER IF NOT EXISTS update_single_primary_video
BEFORE UPDATE ON product_videos
FOR EACH ROW
WHEN NEW.is_primary = TRUE AND OLD.is_primary = FALSE
BEGIN
  UPDATE product_videos SET is_primary = FALSE WHERE product_id = NEW.product_id AND id != NEW.id;
END;

-- Comments (for documentation)
-- Table: product_videos
--   Stores video information for products
--   Supports two modes:
--     1. R2 Mode: Basic storage with simple video playback
--        - Uses filename and original_url
--        - Cost-effective for simple use cases
--     2. Stream Mode: Optimized streaming with Cloudflare Stream
--        - Uses stream_id, hls_url, dash_url, thumbnail_url
--        - Automatic encoding to multiple qualities
--        - Adaptive bitrate streaming
--        - Thumbnail generation
--        - Analytics support
--
-- Usage Examples:
--   1. Get all videos for a product:
--      SELECT * FROM product_videos WHERE product_id = ? ORDER BY sort_order;
--
--   2. Get primary video:
--      SELECT * FROM product_videos WHERE product_id = ? AND is_primary = TRUE;
--
--   3. Get Stream videos only:
--      SELECT * FROM product_videos WHERE storage_mode = 'stream';
--
--   4. Check Stream encoding status:
--      SELECT * FROM product_videos WHERE storage_mode = 'stream' AND stream_status = 'ready';
