-- Migration: Add parent_id to categories
-- Date: 2025-11-27
-- Description: Add parentId field to categories table to support hierarchical/nested categories (subcategories)

-- Add parent_id column to categories table
ALTER TABLE categories ADD COLUMN parent_id TEXT;

-- Note: parent_id is a self-referential foreign key that references another category
-- NULL parent_id means it's a top-level category
-- Non-NULL parent_id means it's a subcategory of another category
