# 🧪 Comprehensive Testing Roadmap - Backend & Frontend

## 📊 Current Status

### ✅ Completed
- [x] Product Service database migrations
- [x] Inventory Service database migrations
- [x] Durable Objects RPC fix
- [x] Physical attributes schema
- [x] E2E backend integration tests (10/10 passing)
- [x] Negative stock business rules tests (6/6 passing)

### ⚠️ Issues Found
- [ ] Frontend product edit not persisting (needs investigation)
- [ ] Frontend TypeScript configuration errors
- [ ] Image/video upload components missing

---

## 🎯 Phase 1: Backend API Testing (Priority: HIGH)

### Product Service Tests

#### 1.1 Product CRUD Operations
- [ ] **Create Product** - Test product creation with all fields
  - Test with minimal required fields
  - Test with physical attributes (weight, length, width, height)
  - Test validation (missing required fields, invalid data types)
  - Verify response structure and status code (201)

- [ ] **Read Product**
  - Get all products (with filters: status, category, search)
  - Get product by ID (including variants and UOMs)
  - Get product by SKU
  - Test non-existent product (404 error)

- [ ] **Update Product**
  - Update product details (name, description, price)
  - Update physical attributes
  - Update price only (PATCH /api/products/:id/price)
  - Update stock only (PATCH /api/products/:id/stock)
  - Test partial updates
  - Test validation errors

- [ ] **Delete Product**
  - Delete existing product
  - Verify cascade delete (variants, UOMs)
  - Test delete non-existent product

#### 1.2 Category Management
- [ ] Create, read, update, delete categories
- [ ] Filter products by category
- [ ] Handle category deletion with associated products

#### 1.3 Product Variants
- [ ] Create variants for a product
- [ ] Update variant stock
- [ ] Update variant price
- [ ] Delete variants
- [ ] Get all variants for a product

#### 1.4 UOM (Unit of Measure)
- [ ] Create master UOMs
- [ ] Add product-specific UOMs
- [ ] Test barcode uniqueness
- [ ] Test conversion factors
- [ ] Update product UOM stock

### Inventory Service Tests

#### 2.1 Warehouse Management
- [ ] Create warehouse
- [ ] Update warehouse details
- [ ] Get active/inactive warehouses
- [ ] Delete warehouse (verify cascade behavior)

#### 2.2 Inventory Operations
- [ ] **Stock Adjustments (IN)**
  - Add initial stock
  - Restock operations
  - Verify quantity updates

- [ ] **Stock Adjustments (OUT)**
  - Warehouse transfers (prevent negative)
  - POS sales (allow negative)
  - Test source field tracking

- [ ] **Inventory Queries**
  - Get inventory by product (all warehouses)
  - Get inventory by product and warehouse
  - Get all inventory records with filters

#### 2.3 Movement History
- [ ] Track all inventory movements
- [ ] Filter by product, warehouse, date range
- [ ] Verify source field (warehouse vs POS)
- [ ] Test pagination

#### 2.4 Business Rules
- [ ] ✅ Negative stock prevention (warehouse operations) - TESTED
- [ ] ✅ Negative stock allowed (POS operations) - TESTED
- [ ] ✅ Default source behavior - TESTED
- [ ] Minimum stock alerts
- [ ] Reserved quantity handling

### User Service Tests (If Implemented)

#### 3.1 Authentication
- [ ] User registration
- [ ] Login (JWT token)
- [ ] Logout
- [ ] Token refresh

#### 3.2 Authorization (RBAC)
- [ ] Role-based access control
- [ ] Permission checks
- [ ] Admin vs User vs Warehouse Manager

---

## 🎨 Phase 2: Frontend Testing (Priority: MEDIUM)

### Admin Dashboard - Product Management

#### 4.1 Product List View
- [ ] Display all products
- [ ] Filter by category
- [ ] Search by name/SKU/barcode
- [ ] Pagination
- [ ] Sort by columns

#### 4.2 Product Creation
- [ ] Create product form
  - All required fields
  - Optional fields
  - Physical attributes (weight, dimensions)
  - Image upload
  - Category selection
- [ ] Form validation
- [ ] Success/error messages
- [ ] Redirect after creation

#### 4.3 Product Edit ⚠️ (CURRENT ISSUE)
- [ ] **Debug why edits don't persist**
  - Check API endpoint being called
  - Verify request payload
  - Check response status
  - Review browser console errors
  - Test CORS headers

- [ ] Edit product details
- [ ] Update physical attributes
- [ ] Change category
- [ ] Update prices
- [ ] Upload new image

#### 4.4 Product Delete
- [ ] Delete confirmation modal
- [ ] Successful deletion
- [ ] Error handling

### Admin Dashboard - Warehouse Management

#### 5.1 Warehouse CRUD
- [ ] List all warehouses
- [ ] Create new warehouse
- [ ] Edit warehouse details
- [ ] Delete warehouse

### Admin Dashboard - Inventory Management

#### 6.1 Inventory View
- [ ] View inventory levels by product
- [ ] View inventory by warehouse
- [ ] Low stock alerts

#### 6.2 Stock Adjustments
- [ ] Add stock (IN)
- [ ] Remove stock (OUT)
- [ ] Transfer between warehouses
- [ ] View movement history

### Image & Video Upload (NOT IMPLEMENTED)

#### 7.1 Image Upload
- [ ] **Implement image upload to R2**
  - Single image upload
  - Multiple images (gallery)
  - Image preview
  - Crop/resize functionality
  - Set primary image
  - Sort order

#### 7.2 Video Upload
- [ ] **Implement video upload to R2**
  - Single video upload
  - Multiple videos
  - Video preview/player
  - Set primary video
  - Progress indicator

---

## 🔗 Phase 3: End-to-End User Journeys (Priority: MEDIUM)

### Journey 1: Product Onboarding
```
1. Admin creates category
2. Admin creates product with details + images
3. Admin adds variants (colors/sizes)
4. Admin sets up UOMs
5. Warehouse manager adds initial stock
6. Verify product appears in catalog
```

### Journey 2: Sales Flow (Retail)
```
1. Customer browses products
2. Add to cart
3. Checkout
4. Payment (Xendit integration)
5. Order created
6. Inventory deducted (POS source, allows negative)
7. Order confirmation
```

### Journey 3: Sales Flow (Wholesale)
```
1. Wholesale customer registers
2. Browse wholesale products
3. Add bulk quantity to cart
4. Get volume discount
5. Request quote
6. Admin approves quote
7. Order placed
8. Inventory reserved
```

### Journey 4: Warehouse Operations
```
1. Receive new stock (IN)
2. Transfer between warehouses
3. Handle returns
4. Adjust for damaged goods
5. View movement history
6. Generate reports
```

---

## 🔒 Phase 4: Security Testing (Priority: HIGH)

### Authentication & Authorization
- [ ] Test JWT token validation
- [ ] Test token expiration
- [ ] Test role-based access (RBAC)
- [ ] Test unauthorized access attempts

### Input Validation
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] File upload restrictions (size, type)

### API Security
- [ ] CORS configuration
- [ ] Rate limiting
- [ ] Request validation (Zod schemas)
- [ ] Error handling (don't expose sensitive info)

---

## ⚡ Phase 5: Performance Testing (Priority: LOW)

### Load Testing
- [ ] Test product list with 10,000+ products
- [ ] Test concurrent inventory adjustments
- [ ] Test database query performance
- [ ] Test image upload/delivery speed

### Optimization
- [ ] Database indexing review
- [ ] API response caching
- [ ] Image optimization (CDN)
- [ ] Code splitting (frontend)

---

## 🐛 Phase 6: Bug Fixes & Known Issues

### High Priority
1. ⚠️ **Frontend product edit not persisting**
   - Status: Needs investigation
   - Impact: Critical - admins can't update products

2. **Frontend TypeScript errors**
   - Status: Configuration issue
   - Impact: Medium - prevents builds

3. **Image/Video upload missing**
   - Status: Not implemented
   - Impact: High - core feature

### Medium Priority
4. **apps/backend directory cleanup**
   - Status: Legacy code exists
   - Recommendation: Archive or remove

---

## 📋 Test Automation Tools

### Backend Testing
- **Jest** - Unit tests
- **Supertest** - API integration tests
- **Node.js scripts** - E2E tests (current approach)

### Frontend Testing
- **Vitest** - Unit tests
- **Testing Library** - Component tests
- **Playwright** or **Cypress** - E2E tests

### CI/CD Integration
- Run tests on every commit
- Prevent merging if tests fail
- Automated deployment on success

---

## 📅 Suggested Timeline

### Week 1: Backend Stability
- Complete Product Service API tests
- Complete Inventory Service API tests
- Fix any blocking bugs

### Week 2: Frontend Critical Path
- Debug product edit issue
- Implement image upload
- Fix TypeScript configuration

### Week 3: E2E User Journeys
- Test complete product onboarding flow
- Test retail sales flow
- Test warehouse operations

### Week 4: Polish & Performance
- Security testing
- Performance optimization
- Documentation

---

## 🎯 Success Metrics

- ✅ Backend API Coverage: 90%+ of endpoints tested
- ✅ Frontend Feature Coverage: All CRUD operations working
- ✅ E2E Journeys: 5+ complete user flows tested
- ✅ Performance: API response < 200ms (p95)
- ✅ Security: No critical vulnerabilities
- ✅ Zero breaking bugs in production

---

## 📝 Notes

- **Priority Focus**: Fix product edit issue first
- **Legacy Code**: Consider archiving `apps/backend`
- **Missing Features**: Image/video upload needed for production
- **Testing Strategy**: Automated tests > Manual tests
- **Documentation**: Keep this roadmap updated as we progress
