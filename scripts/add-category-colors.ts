/**
 * Script to add colors to existing categories
 * Run this script to populate category colors for better visual distinction
 */

// Default color mappings for common categories
const categoryColorMapping: Record<string, string> = {
  // Baby & Kids
  baby: 'pink',
  bayi: 'pink',
  'baby bottle': 'cyan',
  baterai: 'orange',
  'operated b/o': 'orange',

  // Electronics & Toys
  'plastic toys': 'purple',
  toys: 'purple',
  elektronik: 'blue',
  gadget: 'blue',

  // Food & Beverage
  food: 'green',
  beverage: 'teal',
  'bubur bayi': 'green',

  // Other
  uncategorized: 'gray',
  lainnya: 'yellow',
  accessories: 'indigo',
  clothing: 'red',
  books: 'orange',
  sports: 'red',
  beauty: 'pink',
  health: 'green',
  home: 'cyan',
  kitchen: 'orange',
};

// Color cycle for categories without specific mapping
const defaultColors = [
  'blue',
  'green',
  'purple',
  'orange',
  'pink',
  'teal',
  'indigo',
  'cyan',
  'red',
  'yellow',
];

export function assignColorToCategory(categoryName: string): string {
  // Normalize category name to lowercase for matching
  const normalizedName = categoryName.toLowerCase().trim();

  // Try exact match first
  if (categoryColorMapping[normalizedName]) {
    return categoryColorMapping[normalizedName];
  }

  // Try partial match
  for (const [key, color] of Object.entries(categoryColorMapping)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return color;
    }
  }

  // Use hash-based color assignment for consistent coloring
  const hash = normalizedName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return defaultColors[Math.abs(hash) % defaultColors.length];
}

// SQL update statements for Cloudflare D1
export function generateCategoryColorUpdates(
  categories: Array<{ id: string; name: string; color?: string | null }>
) {
  const updates: string[] = [];

  for (const category of categories) {
    // Skip if category already has a color
    if (category.color) continue;

    const color = assignColorToCategory(category.name);
    updates.push(`UPDATE categories SET color = '${color}' WHERE id = '${category.id}';`);
  }

  return updates;
}

// Example usage for D1 Console or Wrangler CLI:
/*
-- First, fetch all categories:
SELECT id, name, color FROM categories;

-- Then run the generated UPDATE statements:
UPDATE categories SET color = 'pink' WHERE id = 'cat-1';
UPDATE categories SET color = 'cyan' WHERE id = 'cat-2';
-- ... etc

-- Or update all at once with a transaction:
BEGIN TRANSACTION;
UPDATE categories SET color = 'pink' WHERE name LIKE '%baby%' OR name LIKE '%bayi%';
UPDATE categories SET color = 'cyan' WHERE name LIKE '%bottle%';
UPDATE categories SET color = 'orange' WHERE name LIKE '%baterai%';
UPDATE categories SET color = 'purple' WHERE name LIKE '%toy%' OR name LIKE '%mainan%';
UPDATE categories SET color = 'blue' WHERE name LIKE '%elektronik%';
UPDATE categories SET color = 'green' WHERE name LIKE '%food%' OR name LIKE '%makanan%' OR name LIKE '%bubur%';
UPDATE categories SET color = 'teal' WHERE name LIKE '%beverage%' OR name LIKE '%minuman%';
COMMIT;
*/

console.log('Category color assignment script ready.');
console.log('Use assignColorToCategory(name) to get a color for a category.');
console.log('Use generateCategoryColorUpdates(categories) to generate SQL updates.');
