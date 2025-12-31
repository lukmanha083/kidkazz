# Frontend Integration Roadmap - DDD + tRPC Microservices

## 🎯 Objective
Wire the refactored Product Service and Inventory Service (DDD + tRPC architecture) to the frontend, ensuring all existing product and inventory features work seamlessly with the new event-driven microservices architecture.

---

## 📋 Current State

### Backend Architecture (✅ Completed)
- **Product Service**: DDD architecture with tRPC endpoints
  - Domain: Product aggregate with business logic
  - tRPC API: `/trpc/*` (service-to-service)
  - REST API: `/api/*` (frontend compatible)
  - Events: ProductCreated, StockAdjusted, PriceChanged, ProductDiscontinued

- **Inventory Service**: DDD architecture with tRPC endpoints
  - Domain: Warehouse & Inventory aggregates
  - tRPC API: `/trpc/*` (service-to-service)
  - REST API: `/api/*` (frontend compatible)
  - Events: WarehouseCreated, InventoryCreated, InventoryAdjusted

### Frontend Current State
- Location: `apps/erp-dashboard/`
- Framework: React + TanStack Router
- API Client: `/src/lib/api.ts`
- Features: Product management, Inventory management, Accounting

---

## 🚀 Phase 1: API Client Updates & Testing (Priority: HIGH)

### Task 1.1: Verify REST API Compatibility
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Test all Product Service REST endpoints with current frontend
  - GET `/api/products` - List products
  - GET `/api/products/:id` - Get product details
  - POST `/api/products` - Create product
  - PATCH `/api/products/:id` - Update product
  - PATCH `/api/products/:id/stock` - Update stock
  - PATCH `/api/products/:id/price` - Update price
  - DELETE `/api/products/:id` - Delete product

- [ ] Test all Inventory Service REST endpoints
  - GET `/api/warehouses` - List warehouses
  - GET `/api/warehouses/:id` - Get warehouse
  - POST `/api/warehouses` - Create warehouse
  - PUT `/api/warehouses/:id` - Update warehouse
  - DELETE `/api/warehouses/:id` - Delete warehouse
  - POST `/api/inventory/adjust` - Adjust inventory
  - GET `/api/inventory/:productId` - Get inventory for product
  - GET `/api/inventory/:productId/:warehouseId` - Get specific inventory

- [ ] Fix any routing issues (double `/api` prefix issue)
- [ ] Update API client error handling for DDD validation errors

**Expected Outcome**: All existing frontend features work without modification

---

### Task 1.2: Update TypeScript Types
**Duration**: 1-2 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Update Product interface in `/src/lib/api.ts` to match DDD domain model
- [ ] Add Warehouse interface
- [ ] Add Inventory interface
- [ ] Add proper error types from domain validation
- [ ] Ensure type compatibility with frontend components

**Files to Update:**
- `apps/erp-dashboard/src/lib/api.ts`

---

### Task 1.3: Test Existing Features
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Test Product CRUD operations
  - Create product form
  - Edit product form
  - Delete product
  - List products with filters
  - View product details

- [ ] Test Inventory operations
  - Create warehouse
  - List warehouses
  - Adjust inventory (in/out)
  - View inventory by product
  - View inventory by warehouse

- [ ] Test business rules enforcement
  - Verify negative stock is allowed (POS rule)
  - Verify SKU uniqueness validation
  - Verify price change restrictions

**Expected Outcome**: All existing UI flows work correctly

---

## 🔥 Phase 2: Real-Time Event Integration (Priority: MEDIUM)

### Task 2.1: Event Subscription Infrastructure
**Duration**: 3-4 hours
**Status**: 🔴 TODO

**Objective**: Enable frontend to receive real-time updates when domain events occur

**Subtasks:**
- [ ] Evaluate event delivery options:
  - **Option A**: Server-Sent Events (SSE) endpoint
  - **Option B**: WebSocket connection
  - **Option C**: Polling with event log endpoint
  - **Option D**: Cloudflare Durable Objects for real-time push

- [ ] Implement chosen approach in services
- [ ] Create frontend event listener utility
- [ ] Add React context for event subscriptions

**Files to Create:**
- `apps/erp-dashboard/src/lib/events.ts` - Event client
- `apps/erp-dashboard/src/contexts/EventContext.tsx` - React context
- `apps/erp-dashboard/src/hooks/useEventSubscription.ts` - React hook

---

### Task 2.2: Event Handlers in Frontend
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Subscribe to Product events:
  - `ProductCreated` → Refresh product list
  - `StockAdjusted` → Update product stock in UI
  - `PriceChanged` → Update product price in UI
  - `ProductDiscontinued` → Mark product as discontinued

- [ ] Subscribe to Inventory events:
  - `WarehouseCreated` → Refresh warehouse list
  - `InventoryCreated` → Update inventory records
  - `InventoryAdjusted` → Update stock levels in real-time

- [ ] Add toast notifications for events
- [ ] Handle optimistic updates vs event confirmations

**Files to Update:**
- Product pages: `apps/erp-dashboard/src/routes/dashboard/products/*`
- Inventory pages: `apps/erp-dashboard/src/routes/dashboard/inventory/*`

---

### Task 2.3: Real-Time UI Updates
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Add real-time stock indicator (updates when inventory adjusted)
- [ ] Add "Last updated" timestamp on data displays
- [ ] Add event feed/activity log component
- [ ] Handle concurrent updates (optimistic locking)

**Components to Create:**
- `<RealTimeStockBadge />` - Shows live stock count
- `<EventActivityFeed />` - Shows recent domain events
- `<LastUpdatedIndicator />` - Shows when data was last synced

---

## 🎨 Phase 3: UI Enhancements for DDD Concepts (Priority: LOW)

### Task 3.1: Business Rule Visibility
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Add validation messages from domain layer to forms
- [ ] Show business rule violations clearly
  - "Cannot change price of discontinued product"
  - "SKU must be unique"
  - etc.

- [ ] Add help text explaining business rules
- [ ] Add "Why was this blocked?" tooltips

---

### Task 3.2: Domain Event Visualization
**Duration**: 3-4 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Create Event History view for products
  - Show all events for a product (Created, StockAdjusted, PriceChanged)
  - Timeline visualization
  - Filter by event type

- [ ] Create Event History view for inventory
  - Show all adjustments for a warehouse
  - Show all movements for a product

**Pages to Create:**
- `/dashboard/products/:id/history` - Product event history
- `/dashboard/inventory/:id/movements` - Inventory movement history

---

### Task 3.3: Advanced Features (Optional)
**Duration**: 4-6 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Add inventory movement graph (visual stock changes over time)
- [ ] Add low stock alerts based on minimum stock levels
- [ ] Add "Negative stock" indicator with warning badge
- [ ] Add bulk operations (bulk price update, bulk stock adjustment)

---

## 🔗 Phase 4: Service-to-Service Integration Demo (Priority: MEDIUM)

### Task 4.1: Cross-Service Features
**Duration**: 3-4 hours
**Status**: 🔴 TODO

**Objective**: Demonstrate tRPC service-to-service communication in action

**Subtasks:**
- [ ] When creating inventory adjustment, fetch product details via tRPC
  - Inventory Service calls Product Service via tRPC
  - Shows product name, SKU in inventory form

- [ ] Add "Check Inventory" button on product page
  - Calls Inventory Service to get stock across all warehouses
  - Displays in modal/drawer

- [ ] Add validation: Cannot adjust inventory for discontinued products
  - Inventory Service validates with Product Service via tRPC

**Expected Outcome**: Frontend demonstrates microservices working together

---

### Task 4.2: Event Flow Demonstration
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Create "Event Flow" dev tool/debug page
  - Shows events being published
  - Shows which services are consuming events
  - Shows event processing timeline

- [ ] Add event replay capability (for testing)
- [ ] Add event inspection tool

**Page to Create:**
- `/dashboard/dev/events` - Event debugging page

---

## 🧪 Phase 5: End-to-End Testing (Priority: HIGH)

### Task 5.1: Integration Testing
**Duration**: 4-5 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Update existing integration test script
- [ ] Add Playwright/Cypress E2E tests
  - Product CRUD workflow
  - Inventory adjustment workflow
  - Multi-warehouse stock management

- [ ] Test error scenarios
  - Network failures
  - Validation errors
  - Concurrent updates

- [ ] Load testing (optional)

**Files to Create:**
- `apps/erp-dashboard/e2e/product-workflow.spec.ts`
- `apps/erp-dashboard/e2e/inventory-workflow.spec.ts`

---

### Task 5.2: User Acceptance Testing
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Create UAT checklist for all features
- [ ] Test all user workflows end-to-end
- [ ] Verify data consistency across services
- [ ] Performance testing (response times)

---

## 📚 Phase 6: Documentation (Priority: MEDIUM)

### Task 6.1: Technical Documentation
**Duration**: 2-3 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Document frontend architecture with DDD backend
- [ ] Document API integration patterns
- [ ] Document event subscription patterns
- [ ] Create sequence diagrams for key workflows

**Files to Create:**
- `docs/FRONTEND_ARCHITECTURE.md`
- `docs/API_INTEGRATION.md`
- `docs/EVENT_DRIVEN_PATTERNS.md`

---

### Task 6.2: User Documentation
**Duration**: 1-2 hours
**Status**: 🔴 TODO

**Subtasks:**
- [ ] Update user guide for new features
- [ ] Document business rules visible in UI
- [ ] Create troubleshooting guide

---

## 📊 Summary

### Total Estimated Time: **35-50 hours**

### Priority Breakdown:
- **Phase 1**: API Client Updates (HIGH) - 5-8 hours
- **Phase 2**: Event Integration (MEDIUM) - 7-10 hours
- **Phase 3**: UI Enhancements (LOW) - 9-13 hours
- **Phase 4**: Service Integration (MEDIUM) - 5-7 hours
- **Phase 5**: Testing (HIGH) - 6-8 hours
- **Phase 6**: Documentation (MEDIUM) - 3-5 hours

### Recommended Order:
1. ✅ Start with **Phase 1** (API Client) - Get existing features working
2. ✅ Then **Phase 5.1** (Integration Testing) - Ensure stability
3. → **Phase 2** (Events) - Add real-time capabilities
4. → **Phase 4** (Service Integration) - Showcase architecture benefits
5. → **Phase 3** (UI Enhancements) - Polish the experience
6. → **Phase 6** (Documentation) - Knowledge transfer

---

## 🎯 Success Criteria

**Phase 1 Complete When:**
- ✅ All existing product features work
- ✅ All existing inventory features work
- ✅ No regressions from refactoring
- ✅ Types are correct and compile

**Phase 2 Complete When:**
- ✅ Events are received in real-time
- ✅ UI updates automatically on domain events
- ✅ Toast notifications work

**Overall Success When:**
- ✅ All existing features work with new architecture
- ✅ Frontend demonstrates DDD concepts
- ✅ Event-driven updates work smoothly
- ✅ Service-to-service communication is visible
- ✅ Performance is acceptable (< 500ms API responses)
- ✅ All tests pass

---

## 🚧 Known Issues to Address

1. **REST API routing** - Double `/api` prefix causing 404s (Phase 1)
2. **Type mismatches** - Some fields may have changed names (Phase 1)
3. **Event queue configuration** - Need to decide on real-time delivery method (Phase 2)
4. **Error handling** - Domain validation errors need proper frontend handling (Phase 1)

---

## 🔮 Future Enhancements (Beyond This Roadmap)

- GraphQL layer for more flexible frontend queries
- Offline-first capability with event replay
- Multi-tenant support in frontend
- Advanced analytics dashboard showing event metrics
- Admin tools for event replay and debugging
- Webhook support for external integrations
