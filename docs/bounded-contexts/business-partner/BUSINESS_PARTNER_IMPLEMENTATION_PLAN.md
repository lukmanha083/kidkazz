# Business Partner Service Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for the Business Partner Service, which manages **Customer**, **Supplier**, and **Employee** entities.

**APPROACH**: Rename existing `user-service` to `business-partner-service` and add Customer/Supplier tables. No data migration needed.

**RBAC**: Deferred to later phases (after all modules are created). This plan focuses on creating Customer and Supplier management first.

---

## Implementation Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION APPROACH                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1: RENAME user-service → business-partner-service                      │
│  ═══════════════════════════════════════════════════════                     │
│  • Rename folder: services/user-service → services/business-partner-service │
│  • Update wrangler.toml, package.json                                        │
│  • Update imports in other services                                          │
│  • NO DATA MIGRATION - same database, same tables                            │
│                                                                              │
│  Step 2: ADD Customer & Supplier tables (NO Auth needed for these)           │
│  ═══════════════════════════════════════════════════════════════            │
│  • Customer CRUD                                                             │
│  • Supplier CRUD                                                             │
│  • Address Management (shared)                                               │
│  • Frontend integration                                                      │
│                                                                              │
│  Step 3: RBAC Enhancement (LATER - after all modules exist)                  │
│  ════════════════════════════════════════════════════════════════           │
│  • Role & Permission tables                                                  │
│  • Permission middleware for all services                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚠️ TDD Approach (MANDATORY)

**This project uses Test-Driven Development (TDD).** All implementation MUST follow the Red-Green-Refactor cycle.

### Test Coverage Requirements

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Domain (entities, value objects) | >90% | Required |
| Application (commands, queries) | >80% | Required |
| Infrastructure (repositories, controllers) | >70% | Required |

---

## Current State

- `services/user-service/` exists with basic authentication
- Users table with basic employee/user data
- Customer data scattered or non-existent
- No supplier management

## Goal (This Plan)

- Rename user-service to business-partner-service
- Add Customer table with full CRUD
- Add Supplier table with full CRUD
- Add shared Address table
- Keep existing auth functionality (employees/users can still login)
- RBAC enhancement will be added later when all modules exist

---

## Phase 1: Service Setup & Schema (Steps 1-3)

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

**wrangler.toml** (Simple - no JWT yet):
```toml
name = "business-partner-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "business-partner-db"
database_id = "your-database-id"
```

**Deliverable**: Working service skeleton

---

### Step 2: Create Database Schema

**Task**: Design tables for Customer, Supplier, Employee WITHOUT RBAC

**File**: `services/business-partner-service/src/infrastructure/db/schema.ts`

```typescript
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ============================================================================
// CUSTOMER TABLE
// ============================================================================
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),           // CUS-0001

  // Basic Info
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),

  // Customer Type
  customerType: text('customer_type').notNull(),   // 'retail' | 'wholesale'

  // B2B Fields (for wholesale)
  companyName: text('company_name'),
  npwp: text('npwp'),                              // Tax ID
  creditLimit: integer('credit_limit').default(0),
  creditUsed: integer('credit_used').default(0),
  paymentTermDays: integer('payment_term_days').default(0),

  // B2C Fields (for retail)
  loyaltyPoints: integer('loyalty_points').default(0),
  membershipTier: text('membership_tier'),         // 'bronze' | 'silver' | 'gold'

  // Stats (updated by events)
  totalOrders: integer('total_orders').default(0),
  totalSpent: integer('total_spent').default(0),
  lastOrderDate: integer('last_order_date'),

  // Status
  status: text('status').notNull().default('active'),  // 'active' | 'inactive' | 'blocked'

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// ============================================================================
// SUPPLIER TABLE
// ============================================================================
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),           // SUP-0001

  // Basic Info
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),

  // Company Info
  companyName: text('company_name'),
  npwp: text('npwp'),

  // Business Terms
  paymentTermDays: integer('payment_term_days').default(30),
  leadTimeDays: integer('lead_time_days').default(7),
  minimumOrderAmount: integer('minimum_order_amount').default(0),

  // Bank Info (for payment)
  bankName: text('bank_name'),
  bankAccountNumber: text('bank_account_number'),
  bankAccountName: text('bank_account_name'),

  // Rating & Stats
  rating: real('rating'),                          // 1-5 stars
  totalOrders: integer('total_orders').default(0),
  totalPurchased: integer('total_purchased').default(0),
  lastOrderDate: integer('last_order_date'),

  // Status
  status: text('status').notNull().default('active'),

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// ============================================================================
// EMPLOYEE TABLE (Data only - NO auth fields yet)
// ============================================================================
export const employees = sqliteTable('employees', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),           // EMP-0001

  // Basic Info
  name: text('name').notNull(),
  email: text('email').unique(),
  phone: text('phone'),

  // Employment Info
  employeeNumber: text('employee_number').unique(),
  department: text('department'),
  position: text('position'),
  managerId: text('manager_id'),                   // Self-reference for org chart

  // Personal Info
  dateOfBirth: integer('date_of_birth'),
  gender: text('gender'),                          // 'male' | 'female'
  nationalId: text('national_id'),                 // KTP number
  npwp: text('npwp'),

  // Employment Dates
  joinDate: integer('join_date'),
  endDate: integer('end_date'),

  // Status
  employmentStatus: text('employment_status').notNull().default('active'),
  // 'active' | 'on_leave' | 'terminated' | 'resigned'

  // Salary (basic info, detailed in HRM module)
  baseSalary: integer('base_salary'),

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
});

// ============================================================================
// ADDRESS TABLE (Shared by all partner types)
// ============================================================================
export const addresses = sqliteTable('addresses', {
  id: text('id').primaryKey(),

  // Owner (polymorphic)
  ownerType: text('owner_type').notNull(),         // 'customer' | 'supplier' | 'employee'
  ownerId: text('owner_id').notNull(),

  // Address Type
  addressType: text('address_type').notNull(),     // 'billing' | 'shipping' | 'home' | 'office'
  isPrimary: integer('is_primary').default(0),

  // Address Fields
  label: text('label'),                            // "Kantor Pusat", "Rumah", etc.
  recipientName: text('recipient_name'),
  phone: text('phone'),

  addressLine1: text('address_line_1').notNull(),
  addressLine2: text('address_line_2'),

  subdistrict: text('subdistrict'),                // Kelurahan
  district: text('district'),                      // Kecamatan
  city: text('city').notNull(),
  province: text('province').notNull(),
  postalCode: text('postal_code'),
  country: text('country').default('Indonesia'),

  // Coordinates (for delivery)
  latitude: real('latitude'),
  longitude: real('longitude'),

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Indexes
// CREATE INDEX idx_addresses_owner ON addresses(owner_type, owner_id);
// CREATE INDEX idx_customers_status ON customers(status);
// CREATE INDEX idx_suppliers_status ON suppliers(status);
// CREATE INDEX idx_employees_status ON employees(employment_status);
// CREATE INDEX idx_employees_department ON employees(department);
```

**Deliverable**: Complete database schema

---

### Step 3: Create Migrations

**Task**: Create SQL migration files

**File**: `services/business-partner-service/migrations/0001_customers.sql`

```sql
-- Customer table
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  customer_type TEXT NOT NULL,

  company_name TEXT,
  npwp TEXT,
  credit_limit INTEGER DEFAULT 0,
  credit_used INTEGER DEFAULT 0,
  payment_term_days INTEGER DEFAULT 0,

  loyalty_points INTEGER DEFAULT 0,
  membership_tier TEXT,

  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  last_order_date INTEGER,

  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX idx_customers_code ON customers(code);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_type ON customers(customer_type);
```

**File**: `services/business-partner-service/migrations/0002_suppliers.sql`

```sql
-- Supplier table
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,

  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  company_name TEXT,
  npwp TEXT,

  payment_term_days INTEGER DEFAULT 30,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_amount INTEGER DEFAULT 0,

  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,

  rating REAL,
  total_orders INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  last_order_date INTEGER,

  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_status ON suppliers(status);
```

**File**: `services/business-partner-service/migrations/0003_employees.sql`

```sql
-- Employee table (data only, no auth)
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,

  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,

  employee_number TEXT UNIQUE,
  department TEXT,
  position TEXT,
  manager_id TEXT,

  date_of_birth INTEGER,
  gender TEXT,
  national_id TEXT,
  npwp TEXT,

  join_date INTEGER,
  end_date INTEGER,

  employment_status TEXT NOT NULL DEFAULT 'active',
  base_salary INTEGER,
  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,

  FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE INDEX idx_employees_code ON employees(code);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_status ON employees(employment_status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_manager ON employees(manager_id);
```

**File**: `services/business-partner-service/migrations/0004_addresses.sql`

```sql
-- Address table (shared)
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,

  owner_type TEXT NOT NULL,
  owner_id TEXT NOT NULL,

  address_type TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,

  label TEXT,
  recipient_name TEXT,
  phone TEXT,

  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,

  subdistrict TEXT,
  district TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  country TEXT DEFAULT 'Indonesia',

  latitude REAL,
  longitude REAL,

  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_addresses_owner ON addresses(owner_type, owner_id);
CREATE INDEX idx_addresses_primary ON addresses(owner_type, owner_id, is_primary);
```

**Deliverable**: Migration files ready to run

---

## Phase 2: Customer Management (Steps 4-6)

### Step 4: Customer Domain & Repository

**Task**: Create Customer entity and repository

**Files to Create**:
```
services/business-partner-service/src/domain/
├── entities/
│   └── Customer.ts
├── value-objects/
│   ├── PartnerCode.ts
│   ├── Email.ts
│   └── Phone.ts
└── repositories/
    └── ICustomerRepository.ts
```

**Customer Entity** (simplified - no auth):
```typescript
// src/domain/entities/Customer.ts
export class Customer {
  private _id: string;
  private _code: string;
  private _name: string;
  private _email: string | null;
  private _phone: string | null;
  private _customerType: 'retail' | 'wholesale';

  // B2B fields
  private _companyName: string | null;
  private _npwp: string | null;
  private _creditLimit: number;
  private _creditUsed: number;
  private _paymentTermDays: number;

  // B2C fields
  private _loyaltyPoints: number;
  private _membershipTier: string | null;

  // Stats
  private _totalOrders: number;
  private _totalSpent: number;

  private _status: 'active' | 'inactive' | 'blocked';

  public static create(props: CreateCustomerProps): Customer {
    const customer = new Customer();
    customer._id = generateId();
    customer._code = props.code || generateCode('CUS');
    customer._name = props.name;
    customer._email = props.email || null;
    customer._phone = props.phone || null;
    customer._customerType = props.customerType;
    customer._status = 'active';

    if (props.customerType === 'wholesale') {
      customer._companyName = props.companyName || null;
      customer._creditLimit = props.creditLimit || 0;
      customer._paymentTermDays = props.paymentTermDays || 30;
    }

    return customer;
  }

  public hasAvailableCredit(amount: number): boolean {
    if (this._customerType !== 'wholesale') return true;
    return (this._creditLimit - this._creditUsed) >= amount;
  }

  public addLoyaltyPoints(points: number): void {
    this._loyaltyPoints += points;
    this.updateMembershipTier();
  }

  // ... getters and other methods
}
```

**Deliverable**: Customer domain model

---

### Step 5: Customer Application Layer

**Task**: Create customer commands and queries

**Files to Create**:
```
services/business-partner-service/src/application/
├── commands/customers/
│   ├── CreateCustomer.ts
│   ├── UpdateCustomer.ts
│   └── UpdateCreditLimit.ts
└── queries/customers/
    ├── GetCustomer.ts
    ├── ListCustomers.ts
    └── GetCustomerStats.ts
```

**Deliverable**: Customer application layer

---

### Step 6: Customer Routes

**Task**: Create customer API endpoints (NO AUTH)

**File**: `services/business-partner-service/src/infrastructure/http/routes/customer.routes.ts`

```typescript
import { Hono } from 'hono';

const customerRoutes = new Hono();

// NOTE: No authentication middleware - will be added in Phase 7+

// List customers (paginated)
customerRoutes.get('/', async (c) => {
  const { page, limit, status, type, search } = c.req.query();
  // ... implementation
});

// Get customer by ID
customerRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  // ... implementation
});

// Create customer
customerRoutes.post('/', async (c) => {
  const body = await c.req.json();
  // ... implementation
});

// Update customer
customerRoutes.put('/:id', async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  // ... implementation
});

// Update credit limit (B2B)
customerRoutes.patch('/:id/credit-limit', async (c) => {
  const { id } = c.req.param();
  const { creditLimit } = await c.req.json();
  // ... implementation
});

// Get credit status (B2B)
customerRoutes.get('/:id/credit-status', async (c) => {
  const { id } = c.req.param();
  // ... implementation
});

// Delete (soft delete)
customerRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  // ... implementation
});

export default customerRoutes;
```

**Endpoints Summary**:
```
GET    /api/customers              # List (paginated, filtered)
GET    /api/customers/:id          # Get by ID
POST   /api/customers              # Create
PUT    /api/customers/:id          # Update
PATCH  /api/customers/:id/credit-limit  # Update credit (B2B)
GET    /api/customers/:id/credit-status # Get credit status
DELETE /api/customers/:id          # Soft delete
```

**Deliverable**: Working customer API (no auth)

---

## Phase 3: Supplier Management (Steps 7-9)

### Step 7: Supplier Domain & Repository

**Task**: Create Supplier entity and repository

**Files to Create**:
```
services/business-partner-service/src/domain/
├── entities/
│   └── Supplier.ts
└── repositories/
    └── ISupplierRepository.ts
```

**Deliverable**: Supplier domain model

---

### Step 8: Supplier Application Layer

**Task**: Create supplier commands and queries

**Files to Create**:
```
services/business-partner-service/src/application/
├── commands/suppliers/
│   ├── CreateSupplier.ts
│   ├── UpdateSupplier.ts
│   └── UpdateSupplierRating.ts
└── queries/suppliers/
    ├── GetSupplier.ts
    ├── ListSuppliers.ts
    └── GetSupplierStats.ts
```

**Deliverable**: Supplier application layer

---

### Step 9: Supplier Routes

**Task**: Create supplier API endpoints (NO AUTH)

**Endpoints**:
```
GET    /api/suppliers              # List (paginated, filtered)
GET    /api/suppliers/:id          # Get by ID
POST   /api/suppliers              # Create
PUT    /api/suppliers/:id          # Update
PATCH  /api/suppliers/:id/rating   # Update rating
GET    /api/suppliers/:id/stats    # Get stats
DELETE /api/suppliers/:id          # Soft delete
```

**Deliverable**: Working supplier API (no auth)

---

## Phase 4: Employee Management (Steps 10-12)

### Step 10: Employee Domain & Repository

**Task**: Create Employee entity (DATA ONLY - no auth fields)

**Files to Create**:
```
services/business-partner-service/src/domain/
├── entities/
│   └── Employee.ts
└── repositories/
    └── IEmployeeRepository.ts
```

**Employee Entity** (NO auth fields):
```typescript
// src/domain/entities/Employee.ts
export class Employee {
  private _id: string;
  private _code: string;
  private _name: string;
  private _email: string | null;
  private _phone: string | null;

  // Employment info
  private _employeeNumber: string;
  private _department: string | null;
  private _position: string | null;
  private _managerId: string | null;

  // Personal info
  private _dateOfBirth: Date | null;
  private _gender: 'male' | 'female' | null;
  private _nationalId: string | null;
  private _npwp: string | null;

  // Employment dates
  private _joinDate: Date | null;
  private _endDate: Date | null;

  private _employmentStatus: 'active' | 'on_leave' | 'terminated' | 'resigned';
  private _baseSalary: number | null;

  // NOTE: No password, no roles, no auth fields
  // These will be added in Phase 7+ (RBAC Implementation)

  public static create(props: CreateEmployeeProps): Employee {
    const employee = new Employee();
    employee._id = generateId();
    employee._code = props.code || generateCode('EMP');
    employee._name = props.name;
    employee._email = props.email || null;
    employee._employeeNumber = props.employeeNumber;
    employee._department = props.department || null;
    employee._position = props.position || null;
    employee._employmentStatus = 'active';
    return employee;
  }

  public terminate(endDate: Date): void {
    this._employmentStatus = 'terminated';
    this._endDate = endDate;
  }

  public getSubordinates(): Employee[] {
    // Will be implemented via repository
    return [];
  }

  // ... getters and other methods
}
```

**Deliverable**: Employee domain model (no auth)

---

### Step 11: Employee Application Layer

**Task**: Create employee commands and queries

**Files to Create**:
```
services/business-partner-service/src/application/
├── commands/employees/
│   ├── CreateEmployee.ts
│   ├── UpdateEmployee.ts
│   ├── TerminateEmployee.ts
│   └── ChangeEmploymentStatus.ts
└── queries/employees/
    ├── GetEmployee.ts
    ├── ListEmployees.ts
    ├── GetOrgChart.ts
    └── GetEmployeesByDepartment.ts
```

**Deliverable**: Employee application layer

---

### Step 12: Employee Routes

**Task**: Create employee API endpoints (NO AUTH)

**Endpoints**:
```
GET    /api/employees                    # List (paginated, filtered)
GET    /api/employees/:id                # Get by ID
POST   /api/employees                    # Create
PUT    /api/employees/:id                # Update
PATCH  /api/employees/:id/status         # Change employment status
DELETE /api/employees/:id                # Soft delete (terminate)

GET    /api/employees/:id/subordinates   # Get direct reports
GET    /api/employees/org-chart          # Get organization chart
GET    /api/employees/by-department/:dept # List by department
```

**Deliverable**: Working employee API (no auth)

---

## Phase 5: Address Management (Steps 13-14)

### Step 13: Address Domain & Repository

**Task**: Create Address entity (shared by all partner types)

**Deliverable**: Address domain model

---

### Step 14: Address Routes

**Task**: Create address API endpoints

**Endpoints**:
```
GET    /api/partners/:type/:id/addresses          # List addresses
POST   /api/partners/:type/:id/addresses          # Add address
PUT    /api/partners/:type/:id/addresses/:addrId  # Update address
DELETE /api/partners/:type/:id/addresses/:addrId  # Delete address
PATCH  /api/partners/:type/:id/addresses/:addrId/primary  # Set as primary
```

**Deliverable**: Working address API

---

## Phase 6: Testing & Frontend (Steps 15-18)

### Step 15: Unit Tests

**Task**: Test domain logic

**Files to Create**:
```
services/business-partner-service/test/unit/
├── domain/
│   ├── Customer.test.ts
│   ├── Supplier.test.ts
│   └── Employee.test.ts
└── application/
    └── commands/
        ├── CreateCustomer.test.ts
        ├── CreateSupplier.test.ts
        └── CreateEmployee.test.ts
```

**Deliverable**: Unit test suite

---

### Step 16: Integration Tests

**Task**: Test API endpoints

**Files to Create**:
```
services/business-partner-service/test/integration/
├── customer.test.ts
├── supplier.test.ts
├── employee.test.ts
└── address.test.ts
```

**Deliverable**: Integration test suite

---

### Step 17: Service Entry Point

**Task**: Wire all routes together

**File**: `services/business-partner-service/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import customerRoutes from './infrastructure/http/routes/customer.routes';
import supplierRoutes from './infrastructure/http/routes/supplier.routes';
import employeeRoutes from './infrastructure/http/routes/employee.routes';
import addressRoutes from './infrastructure/http/routes/address.routes';

const app = new Hono();

// CORS
app.use('*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// NOTE: No auth middleware - will be added in Phase 7+
// All routes are currently open

app.route('/api/customers', customerRoutes);
app.route('/api/suppliers', supplierRoutes);
app.route('/api/employees', employeeRoutes);
app.route('/api/partners', addressRoutes);

export default app;
```

**Deliverable**: Working service

---

### Step 18: Frontend Integration (Basic)

**Task**: Create basic management pages

**Files to Create**:
```
apps/erp-dashboard/src/routes/dashboard/
├── customers/
│   ├── index.tsx           # Customer list
│   ├── $customerId.tsx     # Customer detail
│   └── new.tsx             # Create customer
├── suppliers/
│   ├── index.tsx           # Supplier list
│   ├── $supplierId.tsx     # Supplier detail
│   └── new.tsx             # Create supplier
└── employees/
    ├── index.tsx           # Employee list
    ├── $employeeId.tsx     # Employee detail
    └── new.tsx             # Create employee
```

**Deliverable**: Basic CRUD UI for all partner types

---

## Phase 7: RBAC Implementation (Steps 19-23) - LATER

> **NOTE**: This phase should be implemented AFTER all other services/modules exist.

### Step 19: Create RBAC Schema

**Task**: Add Role and Permission tables

**File**: `services/business-partner-service/migrations/0005_rbac.sql`

```sql
-- Roles table
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Permissions table
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,      -- 'products', 'orders', 'inventory', etc.
  action TEXT NOT NULL,      -- 'create', 'read', 'update', 'delete', 'export', 'approve'
  description TEXT,
  UNIQUE(module, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Employee-Role mapping
CREATE TABLE employee_roles (
  employee_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at INTEGER NOT NULL,
  assigned_by TEXT,
  PRIMARY KEY (employee_id, role_id),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);
```

**Deliverable**: RBAC schema

---

### Step 20: Add Auth Fields to Employee

**Task**: Add password and auth-related fields

**File**: `services/business-partner-service/migrations/0006_employee_auth.sql`

```sql
-- Add auth fields to employees
ALTER TABLE employees ADD COLUMN password_hash TEXT;
ALTER TABLE employees ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE employees ADD COLUMN locked_until INTEGER;
ALTER TABLE employees ADD COLUMN last_login_at INTEGER;
ALTER TABLE employees ADD COLUMN password_changed_at INTEGER;
ALTER TABLE employees ADD COLUMN must_change_password INTEGER DEFAULT 0;

-- Refresh tokens table
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_employee ON refresh_tokens(employee_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

**Deliverable**: Auth fields added

---

### Step 21: Implement Authentication Services

**Task**: Create JWT and password services

**Files to Create**:
```
services/business-partner-service/src/infrastructure/auth/
├── JWTService.ts
├── PasswordService.ts
├── AuthorizationService.ts
└── middleware.ts
```

**Deliverable**: Authentication infrastructure

---

### Step 22: Implement Auth Routes

**Task**: Create authentication endpoints

**Endpoints**:
```
POST   /api/auth/login              # Employee login
POST   /api/auth/refresh            # Refresh token
POST   /api/auth/logout             # Revoke token
GET    /api/auth/me                 # Current user + permissions
POST   /api/auth/change-password    # Change password
POST   /api/auth/forgot-password    # Request reset
POST   /api/auth/reset-password     # Reset with token
```

**Deliverable**: Authentication API

---

### Step 23: Implement RBAC Routes

**Task**: Create role and permission management

**Endpoints**:
```
GET    /api/admin/roles
POST   /api/admin/roles
PUT    /api/admin/roles/:id
DELETE /api/admin/roles/:id
PUT    /api/admin/roles/:id/permissions

GET    /api/admin/permissions

POST   /api/employees/:id/roles     # Assign role
DELETE /api/employees/:id/roles/:roleId  # Revoke role
```

**Deliverable**: RBAC management API

---

## Phase 8: Add Auth Middleware (Steps 24-25)

### Step 24: Apply Auth Middleware

**Task**: Protect all routes with authentication

**Update**: `services/business-partner-service/src/index.ts`

```typescript
import { authMiddleware, requirePermission } from './infrastructure/auth/middleware';

// Public routes
app.route('/api/auth', authRoutes);

// Protected routes - require authentication
app.use('/api/*', authMiddleware);

// Permission-protected routes
app.use('/api/admin/*', requirePermission('admin', 'manage'));
```

**Deliverable**: All routes protected

---

### Step 25: Seed Default Roles

**Task**: Create default roles and permissions

**Seed Data**:
```typescript
const DEFAULT_ROLES = [
  { name: 'admin', displayName: 'Administrator', permissions: ['*'] },
  { name: 'inventory_manager', displayName: 'Inventory Manager', permissions: ['inventory:*', 'products:read'] },
  { name: 'sales_staff', displayName: 'Sales Staff', permissions: ['orders:*', 'customers:read', 'products:read'] },
  { name: 'product_manager', displayName: 'Product Manager', permissions: ['products:*', 'inventory:read'] },
  { name: 'accountant', displayName: 'Accountant', permissions: ['accounting:*', 'reports:*'] },
];
```

**Deliverable**: Default roles seeded

---

## Phase 9: Migration from User Service (Steps 26-28)

### Step 26: Data Migration Script

**Task**: Migrate existing users to employees

**Deliverable**: Migration script

---

### Step 27: Update API Gateway

**Task**: Route auth requests to Business Partner Service

**Deliverable**: Updated routing

---

### Step 28: Deprecate User Service

**Task**: Remove old user service after verification

**Deliverable**: Clean codebase

---

## Summary

### Total Steps: 28

| Phase | Steps | Description | Auth Required |
|-------|-------|-------------|---------------|
| 1 | 1-3 | Service Setup & Schema | ❌ No |
| 2 | 4-6 | Customer Management | ❌ No |
| 3 | 7-9 | Supplier Management | ❌ No |
| 4 | 10-12 | Employee Management (data only) | ❌ No |
| 5 | 13-14 | Address Management | ❌ No |
| 6 | 15-18 | Testing & Frontend | ❌ No |
| 7 | 19-23 | RBAC Implementation | ✅ Yes |
| 8 | 24-25 | Apply Auth Middleware | ✅ Yes |
| 9 | 26-28 | Migration from User Service | ✅ Yes |

### Key Points

1. **Phases 1-6**: Build Customer, Supplier, Employee CRUD without authentication
2. **Phase 7+**: Add RBAC after all modules exist
3. **TDD**: Write tests before implementation
4. **Incremental**: Each phase delivers working functionality

### What's NOT in Early Phases

- ❌ Password fields on Employee
- ❌ JWT authentication
- ❌ Role/Permission tables
- ❌ Auth middleware
- ❌ Login/logout endpoints

These are all added in Phase 7+ after the basic data management is working.

---

**Document Version**: 2.0
**Last Updated**: January 2025
**Status**: Ready for Implementation
