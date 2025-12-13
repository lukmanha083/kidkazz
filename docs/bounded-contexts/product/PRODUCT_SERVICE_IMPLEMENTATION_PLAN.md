# Product Service Implementation Plan

## Overview
Refactor existing product-service from basic implementation to full hexagonal architecture with DDD patterns, then wire frontend to use it via API Gateway.

## Current State
- `services/product-service/` exists with basic scaffolding
- Frontend uses mock data in `apps/admin-dashboard`
- Monolithic `apps/backend` has product logic we need to migrate

## Goal
- Full DDD/hexagonal architecture product service
- Frontend calls API Gateway → routes to product-service
- Test end-to-end before moving to next service

---

## Phase 1: Product Service Backend (Steps 1-8)

### Step 1: Review Existing Product Service Structure
**Task:** Examine what's already there
```bash
ls -la services/product-service/
cat services/product-service/src/index.ts
```
**Deliverable:** Understanding of current implementation

---

### Step 2: Design Domain Model
**Task:** Define product domain entities and value objects

**Entities:**
```typescript
// Product Aggregate Root
class Product {
  id: string
  name: string
  description: string
  brand: string
  category: string
  status: 'Active' | 'Inactive' | 'Discontinued'
  variants: ProductVariant[]  // Aggregate member

  // Domain methods
  addVariant(variant: ProductVariant): void
  removeVariant(variantId: string): void
  discontinue(): void
}

class ProductVariant {
  id: string
  productId: string
  sku: string  // Unique identifier
  name: string

  // Pricing
  retailPrice: Money
  wholesalePrice: Money
  costPrice: Money

  // Attributes
  attributes: Record<string, string>  // e.g., {color: 'Red', size: 'M'}

  // Images
  images: string[]

  // UOM
  uom: string
  conversionFactor: number

  status: 'Active' | 'Inactive'
}
```

**Value Objects:**
```typescript
class Money {
  amount: number
  currency: string
}

class SKU {
  value: string  // Format: PROD-CAT-001
  validate(): boolean
}
```

**Deliverable:** TypeScript interfaces in `src/domain/entities/`

---

### Step 3: Create Repository Interfaces (Ports)
**Task:** Define data access contracts

```typescript
// src/domain/repositories/product.repository.ts
interface IProductRepository {
  findAll(): Promise<Product[]>
  findById(id: string): Promise<Product | null>
  findBySKU(sku: string): Promise<ProductVariant | null>
  findByCategory(category: string): Promise<Product[]>
  save(product: Product): Promise<Product>
  update(product: Product): Promise<Product>
  delete(id: string): Promise<void>
}
```

**Deliverable:** Interface files in `src/domain/repositories/`

---

### Step 4: Implement Database Schema
**Task:** Create Drizzle schema for products and variants

```typescript
// src/infrastructure/database/schema.ts
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  brand: text('brand'),
  category: text('category'),
  status: text('status'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  sku: text('sku').unique().notNull(),
  name: text('name').notNull(),
  retailPrice: real('retail_price').notNull(),
  wholesalePrice: real('wholesale_price').notNull(),
  costPrice: real('cost_price').notNull(),
  attributes: text('attributes'),  // JSON
  images: text('images'),  // JSON array
  uom: text('uom').notNull(),
  conversionFactor: real('conversion_factor').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
```

**Deliverable:** Schema file + migration

---

### Step 5: Implement Repository (Adapter)
**Task:** Create concrete repository implementation

```typescript
// src/infrastructure/database/product.repository.impl.ts
export class ProductRepositoryImpl implements IProductRepository {
  constructor(private db: DrizzleD1Database) {}

  async findAll(): Promise<Product[]> {
    const rows = await this.db
      .select()
      .from(products)
      .leftJoin(productVariants, eq(products.id, productVariants.productId))
      .all();

    return this.groupAndMapToDomain(rows);
  }

  async findBySKU(sku: string): Promise<ProductVariant | null> {
    // Implementation
  }

  // ... other methods

  private toDomain(row: any): Product {
    // Map database row to domain entity
  }

  private toDatabase(product: Product): any {
    // Map domain entity to database row
  }
}
```

**Deliverable:** Repository implementation

---

### Step 6: Implement Application Commands & Queries
**Task:** Create use case handlers

**Commands (Write Operations):**
```typescript
// src/application/commands/create-product.command.ts
export class CreateProductCommand {
  constructor(private productRepo: IProductRepository) {}

  async execute(dto: CreateProductDTO): Promise<Product> {
    // Validation
    // Create entity
    const product = new Product(/* ... */);

    // Persist
    await this.productRepo.save(product);

    // Publish event
    await eventBus.publish(new ProductCreatedEvent(product));

    return product;
  }
}

// src/application/commands/add-variant.command.ts
export class AddVariantCommand {
  async execute(productId: string, dto: AddVariantDTO): Promise<ProductVariant> {
    // Implementation
  }
}
```

**Queries (Read Operations):**
```typescript
// src/application/queries/get-product.query.ts
export class GetProductQuery {
  constructor(private productRepo: IProductRepository) {}

  async execute(id: string): Promise<Product | null> {
    return await this.productRepo.findById(id);
  }
}

// src/application/queries/search-products.query.ts
export class SearchProductsQuery {
  async execute(filters: SearchFilters): Promise<Product[]> {
    // Implementation with filtering, pagination
  }
}
```

**Deliverable:** Command and query handlers

---

### Step 7: Implement HTTP Controllers & Routes
**Task:** Create REST API endpoints

```typescript
// src/infrastructure/http/controllers/product.controller.ts
export class ProductController {
  constructor(
    private createProductCmd: CreateProductCommand,
    private getProductQuery: GetProductQuery
  ) {}

  async createProduct(c: Context) {
    const body = await c.req.json();
    const product = await this.createProductCmd.execute(body);
    return c.json({ product }, 201);
  }

  async getProduct(c: Context) {
    const id = c.req.param('id');
    const product = await this.getProductQuery.execute(id);
    if (!product) return c.json({ error: 'Not found' }, 404);
    return c.json({ product });
  }
}

// src/infrastructure/http/routes.ts
app.get('/api/products', productController.listProducts);
app.get('/api/products/:id', productController.getProduct);
app.post('/api/products', productController.createProduct);
app.put('/api/products/:id', productController.updateProduct);
app.delete('/api/products/:id', productController.deleteProduct);

// Variants
app.get('/api/products/:productId/variants', variantController.listVariants);
app.post('/api/products/:productId/variants', variantController.addVariant);
app.put('/api/products/:productId/variants/:variantId', variantController.updateVariant);
app.delete('/api/products/:productId/variants/:variantId', variantController.deleteVariant);

// Search
app.get('/api/products/search', productController.searchProducts);
app.get('/api/products/sku/:sku', productController.getProductBySKU);
```

**Deliverable:** Controllers and routes

---

### Step 8: Wire Everything Together (Dependency Injection)
**Task:** Create entry point with DI container

```typescript
// src/index.ts
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import routes from './infrastructure/http/routes';

type Bindings = {
  DB: D1Database;
  PRODUCT_EVENTS_QUEUE: Queue;
};

const app = new Hono<{ Bindings: Bindings }>();

// Dependency injection middleware
app.use('*', async (c, next) => {
  const db = drizzle(c.env.DB);

  // Create repositories
  const productRepo = new ProductRepositoryImpl(db);

  // Create commands
  const createProductCmd = new CreateProductCommand(productRepo);
  const addVariantCmd = new AddVariantCommand(productRepo);

  // Create queries
  const getProductQuery = new GetProductQuery(productRepo);
  const searchProductsQuery = new SearchProductsQuery(productRepo);

  // Attach to context
  c.set('productRepo', productRepo);
  c.set('createProductCmd', createProductCmd);
  c.set('getProductQuery', getProductQuery);
  // ... etc

  await next();
});

// Mount routes
app.route('/', routes);

export default app;
```

**Deliverable:** Working product service with DI

---

## Phase 2: API Gateway Integration (Steps 9-10)

### Step 9: Configure API Gateway Service Bindings
**Task:** Update API Gateway to route to product-service

```toml
# services/api-gateway/wrangler.toml
[[services]]
binding = "PRODUCT_SERVICE"
service = "product-service"
environment = "production"
```

```typescript
// services/api-gateway/src/index.ts
// Already exists, just verify routing:
app.all('/api/products/*', async (c) => {
  return c.env.PRODUCT_SERVICE.fetch(c.req.raw);
});
```

**Deliverable:** API Gateway properly configured

---

### Step 10: Test Product Service via API Gateway
**Task:** Manual testing of service integration

```bash
# Terminal 1: Start product-service
cd services/product-service
pnpm dev --port 8789

# Terminal 2: Start API Gateway
cd services/api-gateway
pnpm dev --port 8787

# Terminal 3: Test endpoints
curl http://localhost:8787/api/products
curl http://localhost:8787/api/products/123
curl -X POST http://localhost:8787/api/products -d '{"name":"Test Product"}'
```

**Deliverable:** Verified working service communication

---

## Phase 3: Frontend Integration (Steps 11-14)

### Step 11: Update Frontend API Client
**Task:** Point frontend to API Gateway

```typescript
// apps/admin-dashboard/src/lib/api.ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export const productApi = {
  getAll: async () => {
    return apiRequest('/api/products');
  },

  getById: async (id: string) => {
    return apiRequest(`/api/products/${id}`);
  },

  create: async (data: CreateProductDTO) => {
    return apiRequest('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: string, data: UpdateProductDTO) => {
    return apiRequest(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiRequest(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },

  // Variants
  getVariants: async (productId: string) => {
    return apiRequest(`/api/products/${productId}/variants`);
  },

  addVariant: async (productId: string, data: AddVariantDTO) => {
    return apiRequest(`/api/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Search
  searchBySKU: async (sku: string) => {
    return apiRequest(`/api/products/sku/${sku}`);
  },
};
```

**Deliverable:** Updated API client

---

### Step 12: Replace Mock Data in Product Pages
**Task:** Update product management pages to use real API

**Files to update:**
- `apps/admin-dashboard/src/routes/dashboard/products/index.tsx`
- `apps/admin-dashboard/src/routes/dashboard/products/variant.tsx`

```typescript
// Example: Product list page
function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.getAll();
      setProducts(response.products);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Replace mock CRUD operations with API calls
}
```

**Deliverable:** Frontend using real product service

---

### Step 13: Test End-to-End Product Flow
**Task:** Full integration testing

**Test Scenarios:**
1. Create product with variants
2. Update product details
3. Add/remove variants
4. Search by SKU
5. Delete product
6. Verify data persistence
7. Test error handling (network errors, validation errors)

**Deliverable:** Documented test results

---

### Step 14: Migrate Existing Product Data (Optional)
**Task:** If there's data in monolithic backend, migrate it

```sql
-- Export from apps/backend
SELECT * FROM products;
SELECT * FROM product_variants;

-- Import to product-service
INSERT INTO products (...) VALUES (...);
```

**Deliverable:** Migrated data (if applicable)

---

## Phase 4: Cleanup & Documentation (Steps 15-16)

### Step 15: Remove Product Code from Monolithic Backend
**Task:** Delete product-related code from `apps/backend`

**Files to check:**
- `apps/backend/src/db/schema.ts` (product tables)
- `apps/backend/src/routes/` (product routes)
- Remove product route registration from `apps/backend/src/index.ts`

**Deliverable:** Cleaned up monolithic backend

---

### Step 16: Document Product Service
**Task:** Create/update documentation

**Documents:**
- `services/product-service/README.md` - Service overview
- API documentation (endpoints, request/response examples)
- Deployment guide

**Deliverable:** Complete documentation

---

## Success Criteria
- ✅ Product service running independently
- ✅ API Gateway successfully routing requests
- ✅ Frontend CRUD operations working
- ✅ Data persisting to D1 database
- ✅ No errors in console
- ✅ Clean architecture (hexagonal/DDD)
- ✅ Ready to repeat process for Inventory Service

## Estimated Timeline
- **Phase 1 (Backend):** Steps 1-8 → ~4-5 hours
- **Phase 2 (Gateway):** Steps 9-10 → ~30 minutes
- **Phase 3 (Frontend):** Steps 11-13 → ~2 hours
- **Phase 4 (Cleanup):** Steps 14-16 → ~1 hour

**Total:** ~8 hours of focused implementation

## Next Service
After Product Service is tested and working:
→ Repeat similar process for **Inventory Service**
→ Then **Order Service**
→ Finally **Accounting Service**
