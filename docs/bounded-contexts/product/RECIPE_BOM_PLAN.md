# Recipe/BOM Feature Plan

**Status**: Planned (Phase 9+)
**Service**: Product Service
**Dependencies**: Inventory Service (minor changes)

---

## Overview

Extend the product bundle feature to support restaurant recipes/Bill of Materials (BOM) for food preparation. This enables:
- Recipe management with ingredients and yield
- Food cost calculation per portion
- Automatic ingredient stock deduction on sale

---

## Business Requirements

### Use Case: Bumbu Masakan (Spice Mix)

```text
Recipe: Bumbu Base
Yield: 20 portions

Ingredients:
├── Cabai Merah: 500g     @ Rp 50,000/kg = Rp 25,000
├── Bawang Merah: 300g    @ Rp 50,000/kg = Rp 15,000
├── Bawang Putih: 200g    @ Rp 50,000/kg = Rp 10,000
├── Jahe: 100g            @ Rp 50,000/kg = Rp 5,000
└── Minyak Goreng: 200ml  @ Rp 20,000/L  = Rp 4,000

Total Cost: Rp 59,000
Food Cost per Portion: Rp 2,950
```

### Use Case: Menu Item (Nasi Goreng)

```text
Recipe: Nasi Goreng Spesial
Yield: 1 portion

Ingredients:
├── Nasi Putih: 200g
├── Telur: 1 butir
├── Bumbu Base: 1 portion (from recipe above)
├── Sayuran: 50g
└── Kecap Manis: 10ml

Food Cost: Rp 8,500
Selling Price: Rp 25,000
Gross Margin: 66%
```

---

## Implementation Options

### Option 1: Extend Bundle (Recommended for MVP)

Add recipe support to existing bundle infrastructure:

```typescript
// Extend Bundle entity
interface Bundle {
  id: string;
  name: string;
  bundleType: 'virtual' | 'physical' | 'recipe';  // NEW

  // For recipe type
  yield?: number;           // How many portions produced
  yieldUomId?: string;      // Portion UOM
  wasteFactor?: number;     // Expected waste % (e.g., 0.05 = 5%)

  components: BundleComponent[];
}

interface BundleComponent {
  productId: string;
  quantity: number;
  uomId: string;           // Ingredient UOM (kg, ml, pcs)
}
```

**Pros:**
- Reuse existing bundle infrastructure
- Faster to implement
- Simpler codebase

**Cons:**
- Bundle entity becomes more complex
- Limited production tracking

### Option 2: Separate Recipe Module (Future)

Create dedicated recipe management:

```typescript
// Recipe entity
interface Recipe {
  id: string;
  name: string;
  description?: string;
  yield: number;
  yieldUomId: string;
  wasteFactor: number;
  instructions?: string;

  ingredients: RecipeIngredient[];

  // Calculated
  foodCostPerPortion: number;

  status: 'draft' | 'active' | 'archived';
  version: number;
}

interface RecipeIngredient {
  productId: string;
  quantity: number;
  uomId: string;
  cost?: number;  // Calculated from product price
}

// Production Order (for batch cooking)
interface ProductionOrder {
  id: string;
  recipeId: string;
  batchMultiplier: number;  // 2x = double batch
  expectedYield: number;
  actualYield?: number;
  wasteAmount?: number;

  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  producedAt?: Date;
  producedBy?: string;
}
```

**Pros:**
- Clean separation of concerns
- Full production tracking
- Recipe versioning
- Actual vs theoretical cost analysis

**Cons:**
- More development effort
- Additional entities and APIs

---

## Recommended Approach

### Phase 1: MVP (Option 1)
1. Add `bundleType: 'recipe'` to Bundle entity
2. Add `yield` and `yieldUomId` fields
3. Calculate food cost = sum(component costs) / yield
4. POS sale deducts ingredient stocks

### Phase 2: Enhanced (Option 2)
1. Create Recipe entity (migrate from bundle recipes)
2. Add Production Order for batch cooking
3. Waste tracking and reporting
4. Food cost variance analysis

---

## Service Impact

### Product Service (Main Changes)
- Bundle entity: Add bundleType, yield, yieldUomId
- New endpoints: Recipe CRUD, food cost calculation
- Recipe validation (ingredients exist, UOM compatible)

### Inventory Service (Minor Changes)
- Stock deduction: Support recipe-based deduction
- When menu item sold → deduct all ingredient stocks
- Similar to existing bundle stock logic

### Accounting Service (NO Changes)
COA already supports restaurant operations:
- `1370` Persediaan Bahan Makanan (Food Inventory)
- `1371` Persediaan Bahan Minuman (Beverage Inventory)
- `5410` Biaya Bahan Makanan (Food Cost)
- `5420` Biaya Bahan Minuman (Beverage Cost)
- `5440` Bahan Terbuang/Waste (Food Waste)

Journal entry flow remains unchanged:
- Purchase → Dr. Inventory, Cr. AP
- Sale → Dr. COGS, Cr. Inventory
- Waste → Dr. Waste, Cr. Inventory

### Order Service (Minor Changes)
- When processing restaurant order, resolve recipe ingredients
- Pass ingredient list to inventory for deduction

---

## API Endpoints (Phase 1)

```text
# Recipe Bundles
GET    /api/bundles?type=recipe       # List recipes
POST   /api/bundles                    # Create recipe (bundleType: 'recipe')
GET    /api/bundles/:id/food-cost      # Calculate food cost

# Food Cost Report
GET    /api/reports/food-cost          # Food cost analysis
GET    /api/reports/menu-profitability # Menu item margins
```

---

## Database Schema Changes

### Product Service

```sql
-- Extend bundles table
ALTER TABLE bundles ADD COLUMN bundle_type TEXT DEFAULT 'virtual';
ALTER TABLE bundles ADD COLUMN yield REAL;
ALTER TABLE bundles ADD COLUMN yield_uom_id TEXT;
ALTER TABLE bundles ADD COLUMN waste_factor REAL DEFAULT 0;

-- Index for recipe queries
CREATE INDEX idx_bundles_type ON bundles(bundle_type);
```

---

## Food Cost Calculation

```typescript
async function calculateFoodCost(recipe: Bundle): Promise<FoodCostResult> {
  let totalCost = 0;

  for (const ingredient of recipe.components) {
    const product = await productService.getById(ingredient.productId);
    const unitCost = convertToBaseUom(product.price, ingredient.uomId);
    totalCost += unitCost * ingredient.quantity;
  }

  // Apply waste factor
  const adjustedCost = totalCost * (1 + recipe.wasteFactor);

  return {
    totalCost: adjustedCost,
    costPerPortion: adjustedCost / recipe.yield,
    ingredients: recipe.components.map(c => ({
      ...c,
      cost: calculateIngredientCost(c)
    }))
  };
}
```

---

## Related Documents

- [Product Service README](../../../services/product-service/README.md)
- [Inventory Service Integration](../inventory/INTEGRATION_GUIDE.md)
- [Restaurant COA](../accounting/RESTAURANT_COA.md)

---

**Last Updated**: 2026-02-04
