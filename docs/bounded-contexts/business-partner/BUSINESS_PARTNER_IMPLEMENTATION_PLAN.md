# Business Partner Service Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the Business Partner Service, which consolidates Employee (with RBAC), Supplier, and Customer management into a unified service.

---

## ⚠️ TDD Approach (MANDATORY)

**This project uses Test-Driven Development (TDD).** All implementation MUST follow the Red-Green-Refactor cycle:

### TDD Workflow for Each Phase

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TDD IMPLEMENTATION ORDER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   1. Write Unit Tests (test/unit/)           ← Write FIRST, should FAIL    │
│      ↓                                                                      │
│   2. Implement Domain/Application Code       ← Minimal code to pass tests  │
│      ↓                                                                      │
│   3. Write Integration Tests (test/integration/)                            │
│      ↓                                                                      │
│   4. Implement Infrastructure Code           ← Repositories, handlers      │
│      ↓                                                                      │
│   5. Write E2E Tests (test/e2e/)                                           │
│      ↓                                                                      │
│   6. Implement Routes/Controllers            ← Wire everything together    │
│      ↓                                                                      │
│   7. Refactor (keep all tests green)                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Test Coverage Requirements

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain (entities, value objects, services) | >90% | Required |
| Application (commands, queries, handlers) | >80% | Required |
| Infrastructure (repositories, controllers) | >70% | Required |

---

## Current State

- `services/user-service/` exists with basic authentication
- RBAC design documented but not fully implemented
- Customer data scattered or non-existent
- No supplier management
- Frontend uses basic auth with limited role support

## Goal

- Full DDD/hexagonal architecture Business Partner Service
- Unified management of Employees, Suppliers, Customers
- Complete RBAC implementation
- Migration path from User Service
- Frontend integration with all partner types

---

## Phase 1: Service Setup & Domain Model (Steps 1-4)

### Step 1: Create Service Scaffolding

**Task**: Set up the new service structure

```bash
# Create service directory
mkdir -p services/business-partner-service/src/{domain,application,infrastructure}
mkdir -p services/business-partner-service/migrations
mkdir -p services/business-partner-service/test/{unit,integration,e2e}

# Initialize package.json
cd services/business-partner-service
pnpm init
```

**Files to Create**:
- `services/business-partner-service/package.json`
- `services/business-partner-service/tsconfig.json`
- `services/business-partner-service/wrangler.toml`
- `services/business-partner-service/src/index.ts`

**wrangler.toml**:
```toml
name = "business-partner-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "business-partner-db"
database_id = "your-database-id"

[vars]
JWT_SECRET = "your-secret-key"
JWT_ACCESS_EXPIRY = "1h"
JWT_REFRESH_EXPIRY = "7d"
```

**Deliverable**: Working service skeleton

---

### Step 2: Design Domain Entities

**Task**: Create domain entity classes

**Files to Create**:
```
services/business-partner-service/src/domain/
├── entities/
│   ├── BusinessPartner.ts      # Base entity
│   ├── Employee.ts             # Employee with auth
│   ├── Supplier.ts             # Supplier entity
│   ├── Customer.ts             # Customer entity
│   ├── Address.ts              # Address entity
│   ├── Role.ts                 # RBAC Role
│   └── Permission.ts           # RBAC Permission
├── value-objects/
│   ├── PartnerCode.ts          # EMP-001, SUP-001, CUS-001
│   ├── Email.ts                # Email validation
│   ├── Phone.ts                # Phone validation
│   ├── TaxId.ts                # NPWP validation
│   ├── Password.ts             # Password requirements
│   └── Money.ts                # Currency amounts
├── enums/
│   ├── PartnerType.ts
│   ├── PartnerStatus.ts
│   ├── CustomerType.ts
│   ├── EmploymentStatus.ts
│   └── AddressType.ts
└── events/
    ├── EmployeeCreated.ts
    ├── EmployeeTerminated.ts
    ├── RoleAssigned.ts
    ├── SupplierCreated.ts
    ├── CustomerCreated.ts
    └── CreditLimitChanged.ts
```

**Example Entity**:
```typescript
// src/domain/entities/Employee.ts
import { BusinessPartner } from './BusinessPartner';
import { Role } from './Role';
import { Password } from '../value-objects/Password';

export class Employee extends BusinessPartner {
  private _employeeNumber: string;
  private _department: string;
  private _position: string;
  private _managerId: string | null;
  private _employmentStatus: EmploymentStatus;
  private _passwordHash: string;
  private _roles: Role[];
  private _failedLoginAttempts: number;
  private _lockedUntil: Date | null;

  public static create(props: CreateEmployeeProps): Employee {
    // Validation
    Password.validate(props.password);

    const employee = new Employee();
    employee._id = generateId();
    employee._code = props.code;
    employee._partnerType = 'employee';
    employee._name = props.name;
    employee._email = props.email;
    employee._employeeNumber = props.employeeNumber;
    employee._department = props.department;
    employee._position = props.position;
    employee._employmentStatus = 'active';
    employee._passwordHash = hashPassword(props.password);
    employee._roles = [];
    employee._failedLoginAttempts = 0;
    employee._status = 'pending'; // Until email verified

    employee.addDomainEvent(new EmployeeCreated(employee));

    return employee;
  }

  public canLogin(): boolean {
    if (this._status !== 'active') {
      throw new Error('Account is not active');
    }
    if (this.isLocked()) {
      throw new Error('Account is locked');
    }
    if (this._employmentStatus === 'terminated') {
      throw new Error('Account has been terminated');
    }
    return true;
  }

  public hasPermission(module: Module, action: Action): boolean {
    if (this._roles.some(r => r.name === 'admin')) {
      return true; // Admin has all permissions
    }
    return this.getEffectivePermissions().some(
      p => p.module === module && p.action === action
    );
  }

  // ... more methods
}
```

**Deliverable**: Complete domain model

---

### Step 3: Create Repository Interfaces (Ports)

**Task**: Define data access contracts

**Files to Create**:
```
services/business-partner-service/src/domain/repositories/
├── IBusinessPartnerRepository.ts
├── IEmployeeRepository.ts
├── ISupplierRepository.ts
├── ICustomerRepository.ts
├── IAddressRepository.ts
├── IRoleRepository.ts
└── IPermissionRepository.ts
```

**Example Interface**:
```typescript
// src/domain/repositories/IEmployeeRepository.ts
export interface IEmployeeRepository {
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  findByEmployeeNumber(number: string): Promise<Employee | null>;
  findAll(filters: EmployeeFilters): Promise<PaginatedResult<Employee>>;
  save(employee: Employee): Promise<void>;
  delete(id: string): Promise<void>;

  // RBAC
  findWithRoles(id: string): Promise<Employee | null>;
  assignRole(employeeId: string, roleId: string): Promise<void>;
  revokeRole(employeeId: string, roleId: string): Promise<void>;
  countByRole(roleName: string): Promise<number>;
}
```

**Deliverable**: Repository interfaces for all entities

---

### Step 4: Implement Database Schema

**Task**: Create Drizzle schema and migrations

**Files to Create**:
- `services/business-partner-service/src/infrastructure/db/schema.ts`
- `services/business-partner-service/migrations/0001_business_partners.sql`
- `services/business-partner-service/migrations/0002_employees.sql`
- `services/business-partner-service/migrations/0003_suppliers.sql`
- `services/business-partner-service/migrations/0004_customers.sql`
- `services/business-partner-service/migrations/0005_addresses.sql`
- `services/business-partner-service/migrations/0006_rbac.sql`
- `services/business-partner-service/migrations/0007_seed_data.sql`

**Deliverable**: Complete database schema with migrations

---

## Phase 2: Repository & Application Layer (Steps 5-8)

### Step 5: Implement Repository Adapters

**Task**: Create concrete repository implementations

**Files to Create**:
```
services/business-partner-service/src/infrastructure/db/repositories/
├── EmployeeRepository.ts
├── SupplierRepository.ts
├── CustomerRepository.ts
├── AddressRepository.ts
├── RoleRepository.ts
└── PermissionRepository.ts
```

**Deliverable**: Working repository implementations

---

### Step 6: Implement Authentication Services

**Task**: Create JWT and password services

**Files to Create**:
```
services/business-partner-service/src/infrastructure/auth/
├── JWTService.ts           # Token generation/validation
├── PasswordService.ts      # Hashing/verification
├── AuthorizationService.ts # Permission checking
└── middleware.ts           # Auth middleware
```

**JWT Payload**:
```typescript
interface JWTPayload {
  sub: string;          // Employee ID
  email: string;
  name: string;
  roles: string[];
  permissions: string[];  // ['orders:read', 'products:create']
  iat: number;
  exp: number;
}
```

**Deliverable**: Complete authentication infrastructure

---

### Step 7: Implement Application Commands

**Task**: Create command handlers (write operations)

**Files to Create**:
```
services/business-partner-service/src/application/commands/
├── employees/
│   ├── CreateEmployee.ts
│   ├── UpdateEmployee.ts
│   ├── TerminateEmployee.ts
│   ├── AssignRole.ts
│   ├── RevokeRole.ts
│   └── ResetPassword.ts
├── suppliers/
│   ├── CreateSupplier.ts
│   ├── UpdateSupplier.ts
│   └── UpdateSupplierRating.ts
├── customers/
│   ├── CreateCustomer.ts
│   ├── UpdateCustomer.ts
│   ├── UpdateCreditLimit.ts
│   └── RedeemLoyaltyPoints.ts
└── addresses/
    ├── AddAddress.ts
    ├── UpdateAddress.ts
    └── SetPrimaryAddress.ts
```

**Deliverable**: All command handlers

---

### Step 8: Implement Application Queries

**Task**: Create query handlers (read operations)

**Files to Create**:
```
services/business-partner-service/src/application/queries/
├── employees/
│   ├── GetEmployee.ts
│   ├── ListEmployees.ts
│   ├── GetEmployeePermissions.ts
│   └── GetOrgChart.ts
├── suppliers/
│   ├── GetSupplier.ts
│   ├── ListSuppliers.ts
│   └── GetSupplierStats.ts
├── customers/
│   ├── GetCustomer.ts
│   ├── ListCustomers.ts
│   ├── GetCustomerStats.ts
│   └── GetCreditStatus.ts
└── roles/
    ├── ListRoles.ts
    └── ListPermissions.ts
```

**Deliverable**: All query handlers

---

## Phase 3: HTTP API Layer (Steps 9-12)

### Step 9: Implement Auth Routes

**Task**: Create authentication endpoints

**File**: `services/business-partner-service/src/infrastructure/http/routes/auth.routes.ts`

**Endpoints**:
```typescript
// Public routes
POST   /api/auth/login              # Employee login
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/forgot-password    # Request password reset
POST   /api/auth/reset-password     # Reset with token

// Protected routes
POST   /api/auth/logout             # Revoke refresh token
GET    /api/auth/me                 # Get current user + permissions
POST   /api/auth/change-password    # Change own password
```

**Deliverable**: Working authentication API

---

### Step 10: Implement Employee Routes

**Task**: Create employee management endpoints

**File**: `services/business-partner-service/src/infrastructure/http/routes/employee.routes.ts`

**Endpoints**:
```typescript
// Employee CRUD
GET    /api/employees               # List (paginated, filtered)
GET    /api/employees/:id           # Get by ID
POST   /api/employees               # Create (admin only)
PUT    /api/employees/:id           # Update
PATCH  /api/employees/:id/status    # Change status
DELETE /api/employees/:id           # Soft delete

// RBAC
GET    /api/employees/:id/roles     # Get roles
POST   /api/employees/:id/roles     # Assign role
DELETE /api/employees/:id/roles/:roleId  # Revoke role

// Organization
GET    /api/employees/:id/subordinates
GET    /api/employees/org-chart
```

**Deliverable**: Working employee API

---

### Step 11: Implement Supplier Routes

**Task**: Create supplier management endpoints

**File**: `services/business-partner-service/src/infrastructure/http/routes/supplier.routes.ts`

**Endpoints**:
```typescript
GET    /api/suppliers
GET    /api/suppliers/:id
POST   /api/suppliers
PUT    /api/suppliers/:id
PATCH  /api/suppliers/:id/status
DELETE /api/suppliers/:id

GET    /api/suppliers/:id/products
POST   /api/suppliers/:id/products
GET    /api/suppliers/:id/stats
```

**Deliverable**: Working supplier API

---

### Step 12: Implement Customer Routes

**Task**: Create customer management endpoints

**File**: `services/business-partner-service/src/infrastructure/http/routes/customer.routes.ts`

**Endpoints**:
```typescript
GET    /api/customers
GET    /api/customers/:id
POST   /api/customers
PUT    /api/customers/:id
PATCH  /api/customers/:id/status
DELETE /api/customers/:id

// B2B
PATCH  /api/customers/:id/credit-limit
GET    /api/customers/:id/credit-status

// Loyalty (B2C)
GET    /api/customers/:id/loyalty
POST   /api/customers/:id/loyalty/redeem

// Stats
GET    /api/customers/:id/stats
```

**Deliverable**: Working customer API

---

## Phase 4: Admin & Address Routes (Steps 13-14)

### Step 13: Implement Admin Routes

**Task**: Create role and permission management

**File**: `services/business-partner-service/src/infrastructure/http/routes/admin.routes.ts`

**Endpoints**:
```typescript
// Roles
GET    /api/admin/roles
GET    /api/admin/roles/:id
POST   /api/admin/roles
PUT    /api/admin/roles/:id
DELETE /api/admin/roles/:id
PUT    /api/admin/roles/:id/permissions

// Permissions
GET    /api/admin/permissions

// Users overview
GET    /api/admin/users             # All partners summary
```

**Deliverable**: Working admin API

---

### Step 14: Implement Address Routes

**Task**: Create shared address management

**File**: `services/business-partner-service/src/infrastructure/http/routes/address.routes.ts`

**Endpoints**:
```typescript
GET    /api/partners/:partnerId/addresses
POST   /api/partners/:partnerId/addresses
PUT    /api/partners/:partnerId/addresses/:id
DELETE /api/partners/:partnerId/addresses/:id
PATCH  /api/partners/:partnerId/addresses/:id/primary
```

**Deliverable**: Working address API

---

## Phase 5: Service Entry Point & DI (Steps 15-16)

### Step 15: Wire Dependencies

**Task**: Create main entry point with dependency injection

**File**: `services/business-partner-service/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { drizzle } from 'drizzle-orm/d1';

// Routes
import authRoutes from './infrastructure/http/routes/auth.routes';
import employeeRoutes from './infrastructure/http/routes/employee.routes';
import supplierRoutes from './infrastructure/http/routes/supplier.routes';
import customerRoutes from './infrastructure/http/routes/customer.routes';
import addressRoutes from './infrastructure/http/routes/address.routes';
import adminRoutes from './infrastructure/http/routes/admin.routes';

// Middleware
import { authMiddleware } from './infrastructure/auth/middleware';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// Public routes
app.route('/api/auth', authRoutes);

// Protected routes
app.use('/api/*', authMiddleware);
app.route('/api/employees', employeeRoutes);
app.route('/api/suppliers', supplierRoutes);
app.route('/api/customers', customerRoutes);
app.route('/api/partners', addressRoutes);
app.route('/api/admin', adminRoutes);

export default app;
```

**Deliverable**: Working service with all routes

---

### Step 16: Create Seed Data

**Task**: Seed default roles, permissions, and admin user

**File**: `services/business-partner-service/src/infrastructure/db/seed.ts`

**Seed Data**:
- 9 modules × 6 actions = 54 permissions
- 4 default roles (admin, inventory_manager, sales_staff, product_manager)
- 1 default admin user

**Deliverable**: Seed script and migration

---

## Phase 6: Event Handling (Steps 17-18)

### Step 17: Implement Event Publisher

**Task**: Publish domain events to queue

**Files to Create**:
```
services/business-partner-service/src/infrastructure/events/
├── publisher.ts
└── EventTypes.ts
```

**Deliverable**: Event publishing infrastructure

---

### Step 18: Implement Event Handlers

**Task**: Handle events from other services

**Files to Create**:
```
services/business-partner-service/src/application/event-handlers/
├── OrderCompletedHandler.ts     # Update customer stats
└── PaymentReceivedHandler.ts    # Update customer balance
```

**Deliverable**: Event consumption handlers

---

## Phase 7: Testing (Steps 19-21)

### Step 19: Unit Tests

**Task**: Test domain logic

**Files to Create**:
```
services/business-partner-service/test/unit/
├── domain/
│   ├── Employee.test.ts
│   ├── Supplier.test.ts
│   ├── Customer.test.ts
│   └── value-objects/
│       ├── Password.test.ts
│       └── TaxId.test.ts
└── application/
    └── commands/
        └── CreateEmployee.test.ts
```

**Deliverable**: Unit test suite

---

### Step 20: Integration Tests

**Task**: Test API endpoints

**Files to Create**:
```
services/business-partner-service/test/integration/
├── auth.test.ts
├── employee.test.ts
├── supplier.test.ts
├── customer.test.ts
└── rbac.test.ts
```

**Deliverable**: Integration test suite

---

### Step 21: E2E Tests

**Task**: Test complete workflows

**Test Scenarios**:
1. Employee onboarding (create → verify email → assign role → login)
2. Supplier lifecycle (create → update → rate → deactivate)
3. Customer journey (create → place orders → earn loyalty → redeem)
4. RBAC enforcement (verify permissions work correctly)
5. Credit limit enforcement for B2B customers

**Deliverable**: E2E test suite

---

## Phase 8: Migration from User Service (Steps 22-24)

### Step 22: Data Migration Script

**Task**: Migrate existing user data

**Steps**:
1. Export users from user-service database
2. Transform to business_partners + employees format
3. Map existing userType to roles
4. Import to new database
5. Verify data integrity

**File**: `services/business-partner-service/scripts/migrate-users.ts`

**Deliverable**: Migration script

---

### Step 23: Update API Gateway

**Task**: Route requests to new service

**Update**: `services/api-gateway/wrangler.toml`
```toml
[[services]]
binding = "BUSINESS_PARTNER_SERVICE"
service = "business-partner-service"
```

**Update**: `services/api-gateway/src/index.ts`
```typescript
// Route all auth and partner requests to new service
app.all('/api/auth/*', async (c) => c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw));
app.all('/api/employees/*', async (c) => c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw));
app.all('/api/suppliers/*', async (c) => c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw));
app.all('/api/customers/*', async (c) => c.env.BUSINESS_PARTNER_SERVICE.fetch(c.req.raw));
```

**Deliverable**: Updated API Gateway

---

### Step 24: Update Other Services

**Task**: Update service bindings in other services

**Services to Update**:
- Order Service → Call Business Partner for customer validation
- Product Service → Call Business Partner for supplier info
- Inventory Service → Call Business Partner for supplier lead times
- Accounting Service → Call Business Partner for customer/supplier data

**Deliverable**: Updated service integrations

---

## Phase 9: Frontend Integration (Steps 25-28)

### Step 25: Update API Client

**Task**: Add Business Partner API methods

**File**: `apps/erp-dashboard/src/lib/api/business-partner.ts`

```typescript
export const employeeApi = {
  getAll: (filters) => apiRequest('/api/employees', { params: filters }),
  getById: (id) => apiRequest(`/api/employees/${id}`),
  create: (data) => apiRequest('/api/employees', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/api/employees/${id}`, { method: 'PUT', body: data }),
  assignRole: (id, roleId) => apiRequest(`/api/employees/${id}/roles`, { method: 'POST', body: { roleId } }),
  // ...
};

export const supplierApi = { /* ... */ };
export const customerApi = { /* ... */ };
```

**Deliverable**: Updated API client

---

### Step 26: Employee Management UI

**Task**: Create employee management pages

**Files to Create**:
```
apps/erp-dashboard/src/routes/dashboard/employees/
├── index.tsx           # Employee list
├── $employeeId.tsx     # Employee detail
└── new.tsx             # Create employee form
```

**Deliverable**: Employee management UI

---

### Step 27: Supplier Management UI

**Task**: Create supplier management pages

**Files to Create**:
```
apps/erp-dashboard/src/routes/dashboard/suppliers/
├── index.tsx
├── $supplierId.tsx
└── new.tsx
```

**Deliverable**: Supplier management UI

---

### Step 28: Customer Management UI

**Task**: Update existing customer pages

**Files to Update**:
```
apps/erp-dashboard/src/routes/dashboard/customers/
├── index.tsx           # Update to use new API
├── $customerId.tsx     # Add B2B features
└── new.tsx             # Add customer type selection
```

**Deliverable**: Updated customer management UI

---

## Phase 10: Cleanup & Documentation (Steps 29-30)

### Step 29: Deprecate User Service

**Task**: Remove old user service

**Steps**:
1. Verify all functionality migrated
2. Run parallel for 2 weeks
3. Monitor for issues
4. Remove service bindings
5. Delete user-service folder

**Deliverable**: Clean codebase

---

### Step 30: Update Documentation

**Task**: Create/update documentation

**Files to Create/Update**:
- `services/business-partner-service/README.md`
- `docs/bounded-contexts/business-partner/API_REFERENCE.md`
- `docs/CLAUDE.md` - Add Business Partner section
- Update architecture diagrams

**Deliverable**: Complete documentation

---

## Summary

### Total Steps: 30

| Phase | Steps | Description |
|-------|-------|-------------|
| 1 | 1-4 | Service Setup & Domain Model |
| 2 | 5-8 | Repository & Application Layer |
| 3 | 9-12 | HTTP API Layer |
| 4 | 13-14 | Admin & Address Routes |
| 5 | 15-16 | Service Entry Point & DI |
| 6 | 17-18 | Event Handling |
| 7 | 19-21 | Testing |
| 8 | 22-24 | Migration from User Service |
| 9 | 25-28 | Frontend Integration |
| 10 | 29-30 | Cleanup & Documentation |

### Key Deliverables

1. ✅ Business Partner Service with hexagonal architecture
2. ✅ Complete RBAC implementation
3. ✅ Unified Employee, Supplier, Customer management
4. ✅ Migration path from User Service
5. ✅ Full test coverage
6. ✅ Frontend integration
7. ✅ Complete documentation

### Dependencies

- Existing: Hono, Drizzle ORM, JWT library, bcrypt
- No new dependencies required

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data migration issues | Run parallel services, verify data before cutover |
| Breaking existing auth | Maintain API compatibility during transition |
| Performance impact | Profile and optimize queries, add caching |
| Permission errors | Extensive testing, fallback to admin override |

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Status**: Ready for Implementation
