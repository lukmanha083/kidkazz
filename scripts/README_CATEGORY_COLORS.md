# Category Color Migration Guide

## Overview
This directory contains scripts to add colors to existing product categories for better visual distinction in the admin dashboard.

## Problem
Categories without colors display as gray badges, making them visually indistinct. This migration adds colors to improve the user experience.

## Color Scheme
The following color mappings are used:

| Category Type | Color | Example |
|--------------|-------|---------|
| Baby & Kids | Pink / Cyan | Baby products, bottles |
| Electronics | Blue / Orange | Gadgets, batteries |
| Toys | Purple | Plastic toys, games |
| Food & Beverage | Green / Teal | Baby food, drinks |
| Clothing | Red | Fashion, apparel |
| Books | Orange | Books, media |
| Accessories | Indigo | Accessories |
| Sports | Yellow | Sports equipment |
| Beauty | Pink | Beauty products |
| Health | Green | Health products |
| Home | Cyan | Home goods |
| Kitchen | Orange | Kitchen items |

## How to Use

### Option 1: SQL Script (Recommended)
1. Open Cloudflare Dashboard
2. Navigate to Workers & Pages > D1
3. Select your database (e.g., `kidkazz-product-db`)
4. Click on the "Console" tab
5. Copy and paste the contents of `add-category-colors.sql`
6. Click "Execute"
7. Verify results with: `SELECT name, color FROM categories;`

### Option 2: API Endpoint (Future Enhancement)
Create an admin endpoint to update category colors programmatically:
```typescript
// POST /api/admin/migrate/category-colors
// This can be implemented in the admin service
```

### Option 3: Manual Update via Category Management
1. Go to Admin Dashboard > Products > Category
2. Edit each category
3. Select a color from the dropdown
4. Save changes

## Verification
After running the migration, verify in the admin dashboard:
1. Go to Products > All Products
2. Check the Category column
3. Each category should display with its assigned color

## Available Colors
- blue
- green
- red
- yellow
- purple
- pink
- indigo
- orange
- teal
- cyan

## Database Schema Reference
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,  -- New field for badge colors
  status TEXT DEFAULT 'active',
  parent_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## Notes
- Colors are optional; categories without colors will display with gray badges
- The color field accepts lowercase color names as strings
- Colors are mapped to Tailwind CSS color classes in the frontend
- Categories can be updated at any time to change colors
