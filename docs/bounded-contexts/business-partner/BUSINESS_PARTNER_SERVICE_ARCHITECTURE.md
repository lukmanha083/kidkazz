# Business Partner Service Architecture

## Overview

The Business Partner Service consolidates all party/entity management into a single bounded context. This service manages all entities that interact with the business:

1. **Employees** - Internal staff with RBAC (Role-Based Access Control)
2. **Suppliers** - Vendors who supply products/services
3. **Customers** - Both retail (B2C) and wholesale (B2B) customers

This approach follows the **Party Pattern**, a common design pattern in ERP systems where all business relationships are unified under a single domain model.

---

## Why Business Partner Service?

### Current Problem

The current User Service only handles authentication and basic user management. It lacks:
- Supplier management
- Customer management (separate from users)
- Employee HR data
- Unified contact management
- Relationship tracking between parties

### Solution: Unified Business Partner Model

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS PARTNER SERVICE                      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   EMPLOYEE   │  │   SUPPLIER   │  │   CUSTOMER   │          │
│  │              │  │              │  │              │          │
│  │ - Profile    │  │ - Profile    │  │ - Profile    │          │
│  │ - Auth/RBAC  │  │ - Contracts  │  │ - Type (B2C/ │          │
│  │ - Roles      │  │ - Products   │  │   B2B)       │          │
│  │ - Department │  │ - Lead Time  │  │ - Loyalty    │          │
│  │ - Position   │  │ - Payment    │  │ - Credit     │          │
│  │              │  │   Terms      │  │   Limit      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│           │                │                │                    │
│           └────────────────┼────────────────┘                   │
│                            ▼                                     │
│              ┌──────────────────────────┐                       │
│              │   COMMON BASE ENTITY     │                       │
│              │   (Business Partner)     │                       │
│              │                          │                       │
│              │ - ID, Code               │                       │
│              │ - Name (Company/Person)  │                       │
│              │ - Contact Info           │                       │
│              │ - Addresses              │                       │
│              │ - Status                 │                       │
│              │ - Type                   │                       │
│              └──────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Benefits

1. **Single Source of Truth** for all party data
2. **Unified Contact Management** - One place for addresses, phones, emails
3. **Consistent API** for all party types
4. **Reusable Components** - Address validation, contact management
5. **Clear Domain Boundaries** - Separate from Product, Inventory, Order services
6. **Scalable** - Easy to add new party types (e.g., Distributors, Partners)

---

## Domain Model

### Core Entities

#### 1. BusinessPartner (Base Entity)

The abstract base for all party types.

```typescript
interface BusinessPartner {
  id: string;                          // UUID
  code: string;                        // Unique business code (EMP-001, SUP-001, CUS-001)
  partnerType: PartnerType;            // 'employee' | 'supplier' | 'customer'

  // Name (person or company)
  name: string;                        // Full name or company name
  legalName?: string;                  // Official legal name
  displayName?: string;                // Preferred display name

  // Contact
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;

  // Tax/Legal
  taxId?: string;                      // NPWP for Indonesia
  registrationNumber?: string;         // Company registration

  // Status
  status: PartnerStatus;               // 'active' | 'inactive' | 'blocked' | 'pending'

  // Metadata
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

type PartnerType = 'employee' | 'supplier' | 'customer';
type PartnerStatus = 'active' | 'inactive' | 'blocked' | 'pending';
```

#### 2. Employee (Extends BusinessPartner)

Internal staff with authentication and RBAC.

```typescript
interface Employee extends BusinessPartner {
  partnerType: 'employee';

  // Employment
  employeeNumber: string;              // Internal employee ID
  department?: string;
  position?: string;
  jobTitle?: string;
  managerId?: string;                  // Reports to
  hireDate?: Date;
  terminationDate?: Date;
  employmentStatus: EmploymentStatus;  // 'active' | 'probation' | 'suspended' | 'terminated'
  employmentType: EmploymentType;      // 'full_time' | 'part_time' | 'contract' | 'intern'

  // Authentication
  auth: EmployeeAuth;

  // RBAC
  roles: Role[];
  permissions: Permission[];           // Computed from roles

  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
}

interface EmployeeAuth {
  email: string;                       // Login email (required)
  passwordHash: string;
  isEmailVerified: boolean;
  phoneNumber?: string;
  isPhoneVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  refreshTokens: RefreshToken[];
}

type EmploymentStatus = 'active' | 'probation' | 'suspended' | 'terminated';
type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
```

#### 3. Supplier (Extends BusinessPartner)

Vendors who supply products or services.

```typescript
interface Supplier extends BusinessPartner {
  partnerType: 'supplier';

  // Company Info
  companyType?: string;                // 'manufacturer' | 'distributor' | 'wholesaler'
  industry?: string;

  // Contact Person
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  contactPersonPosition?: string;

  // Banking
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankBranch?: string;

  // Terms
  paymentTerms?: string;               // 'NET30', 'NET60', 'COD'
  paymentTermDays?: number;            // 30, 60, etc.
  currency?: string;                   // 'IDR', 'USD'
  creditLimit?: number;

  // Logistics
  leadTimeDays?: number;               // Average delivery lead time
  minimumOrderValue?: number;
  freeShippingThreshold?: number;

  // Products (reference to Product Service)
  suppliedProductIds?: string[];
  productCategories?: string[];

  // Rating
  rating?: number;                     // 1-5 stars
  totalOrders?: number;
  onTimeDeliveryRate?: number;         // Percentage

  // Contract
  contractStartDate?: Date;
  contractEndDate?: Date;
  contractDocument?: string;           // File URL
}
```

#### 4. Customer (Extends BusinessPartner)

Both retail (B2C) and wholesale (B2B) customers.

```typescript
interface Customer extends BusinessPartner {
  partnerType: 'customer';

  // Customer Type
  customerType: CustomerType;          // 'retail' | 'wholesale'
  customerTier?: CustomerTier;         // 'bronze' | 'silver' | 'gold' | 'platinum'

  // Company Info (for B2B)
  companyName?: string;
  companyIndustry?: string;
  companySize?: string;                // 'small' | 'medium' | 'large' | 'enterprise'

  // Contact Person (for B2B)
  contactPersonName?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  contactPersonPosition?: string;

  // Authentication (optional - for self-service portal)
  auth?: CustomerAuth;

  // Terms (for B2B)
  paymentTerms?: string;               // 'COD', 'NET30'
  paymentTermDays?: number;
  creditLimit?: number;
  currentBalance?: number;             // Outstanding balance

  // Pricing
  priceListId?: string;                // Special price list
  discountPercentage?: number;         // Global discount

  // Loyalty (for B2C)
  loyaltyPoints?: number;
  loyaltyTier?: string;

  // Sales
  assignedSalesRepId?: string;         // Employee ID
  salesChannel?: string;               // 'web' | 'pos' | 'mobile' | 'wholesale_portal'

  // Statistics
  totalOrders?: number;
  totalSpent?: number;
  averageOrderValue?: number;
  lastOrderDate?: Date;
  firstOrderDate?: Date;
}

interface CustomerAuth {
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  phoneNumber?: string;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
}

type CustomerType = 'retail' | 'wholesale';
type CustomerTier = 'bronze' | 'silver' | 'gold' | 'platinum';
```

#### 5. Address (Value Object)

Shared address structure for all partner types.

```typescript
interface Address {
  id: string;
  partnerId: string;
  addressType: AddressType;            // 'billing' | 'shipping' | 'office' | 'warehouse' | 'home'
  isPrimary: boolean;

  label?: string;                      // "Main Office", "Home", etc.
  recipientName?: string;
  phone?: string;

  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;                     // Default: 'Indonesia'

  latitude?: number;
  longitude?: number;

  notes?: string;                      // Delivery instructions

  createdAt: Date;
  updatedAt: Date;
}

type AddressType = 'billing' | 'shipping' | 'office' | 'warehouse' | 'home';
```

#### 6. Role (RBAC)

```typescript
interface Role {
  id: string;
  name: string;                        // 'admin', 'inventory_manager', 'sales_staff'
  displayName: string;                 // 'Inventory Manager'
  description?: string;
  isSystemRole: boolean;               // true = cannot be deleted
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### 7. Permission (RBAC)

```typescript
interface Permission {
  id: string;
  module: Module;
  action: Action;
  description?: string;
}

type Module =
  | 'orders'
  | 'products'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'employees'
  | 'accounting'
  | 'reports'
  | 'settings';

type Action = 'create' | 'read' | 'update' | 'delete' | 'export' | 'approve';
```

---

## Database Schema

### Tables

```sql
-- ============================================
-- BUSINESS PARTNERS (Base Table)
-- ============================================
CREATE TABLE business_partners (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  partner_type TEXT NOT NULL,          -- 'employee', 'supplier', 'customer'

  -- Name
  name TEXT NOT NULL,
  legal_name TEXT,
  display_name TEXT,

  -- Contact
  email TEXT,
  phone TEXT,
  mobile TEXT,
  website TEXT,

  -- Tax/Legal
  tax_id TEXT,
  registration_number TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active',

  -- Metadata
  notes TEXT,
  tags TEXT,                           -- JSON array
  custom_fields TEXT,                  -- JSON object

  -- Audit
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  updated_by TEXT,

  UNIQUE(partner_type, code)
);

CREATE INDEX idx_bp_type ON business_partners(partner_type);
CREATE INDEX idx_bp_status ON business_partners(status);
CREATE INDEX idx_bp_email ON business_partners(email);

-- ============================================
-- EMPLOYEES (Extension Table)
-- ============================================
CREATE TABLE employees (
  id TEXT PRIMARY KEY REFERENCES business_partners(id) ON DELETE CASCADE,

  -- Employment
  employee_number TEXT NOT NULL UNIQUE,
  department TEXT,
  position TEXT,
  job_title TEXT,
  manager_id TEXT REFERENCES employees(id),
  hire_date INTEGER,
  termination_date INTEGER,
  employment_status TEXT NOT NULL DEFAULT 'active',
  employment_type TEXT NOT NULL DEFAULT 'full_time',

  -- Authentication
  password_hash TEXT NOT NULL,
  is_email_verified INTEGER DEFAULT 0,
  phone_number TEXT,
  is_phone_verified INTEGER DEFAULT 0,
  mfa_enabled INTEGER DEFAULT 0,
  mfa_secret TEXT,
  last_login_at INTEGER,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until INTEGER,

  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_emp_number ON employees(employee_number);
CREATE INDEX idx_emp_dept ON employees(department);
CREATE INDEX idx_emp_manager ON employees(manager_id);

-- ============================================
-- SUPPLIERS (Extension Table)
-- ============================================
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY REFERENCES business_partners(id) ON DELETE CASCADE,

  -- Company
  company_type TEXT,
  industry TEXT,

  -- Contact Person
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  contact_person_position TEXT,

  -- Banking
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_branch TEXT,

  -- Terms
  payment_terms TEXT,
  payment_term_days INTEGER,
  currency TEXT DEFAULT 'IDR',
  credit_limit REAL,

  -- Logistics
  lead_time_days INTEGER,
  minimum_order_value REAL,
  free_shipping_threshold REAL,

  -- Products
  supplied_product_ids TEXT,           -- JSON array
  product_categories TEXT,             -- JSON array

  -- Rating
  rating REAL,
  total_orders INTEGER DEFAULT 0,
  on_time_delivery_rate REAL,

  -- Contract
  contract_start_date INTEGER,
  contract_end_date INTEGER,
  contract_document TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_sup_payment ON suppliers(payment_terms);

-- ============================================
-- CUSTOMERS (Extension Table)
-- ============================================
CREATE TABLE customers (
  id TEXT PRIMARY KEY REFERENCES business_partners(id) ON DELETE CASCADE,

  -- Type
  customer_type TEXT NOT NULL,         -- 'retail', 'wholesale'
  customer_tier TEXT,

  -- Company (B2B)
  company_name TEXT,
  company_industry TEXT,
  company_size TEXT,

  -- Contact Person (B2B)
  contact_person_name TEXT,
  contact_person_email TEXT,
  contact_person_phone TEXT,
  contact_person_position TEXT,

  -- Authentication (optional)
  password_hash TEXT,
  is_email_verified INTEGER DEFAULT 0,
  phone_number TEXT,
  is_phone_verified INTEGER DEFAULT 0,
  last_login_at INTEGER,

  -- Terms (B2B)
  payment_terms TEXT,
  payment_term_days INTEGER,
  credit_limit REAL,
  current_balance REAL DEFAULT 0,

  -- Pricing
  price_list_id TEXT,
  discount_percentage REAL,

  -- Loyalty
  loyalty_points INTEGER DEFAULT 0,
  loyalty_tier TEXT,

  -- Sales
  assigned_sales_rep_id TEXT REFERENCES employees(id),
  sales_channel TEXT,

  -- Statistics
  total_orders INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  average_order_value REAL,
  last_order_date INTEGER,
  first_order_date INTEGER,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_cust_type ON customers(customer_type);
CREATE INDEX idx_cust_tier ON customers(customer_tier);
CREATE INDEX idx_cust_sales_rep ON customers(assigned_sales_rep_id);

-- ============================================
-- ADDRESSES (Shared)
-- ============================================
CREATE TABLE addresses (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES business_partners(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,

  label TEXT,
  recipient_name TEXT,
  phone TEXT,

  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Indonesia',

  latitude REAL,
  longitude REAL,

  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_addr_partner ON addresses(partner_id);
CREATE INDEX idx_addr_type ON addresses(address_type);

-- ============================================
-- RBAC TABLES
-- ============================================

-- Roles
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system_role INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Permissions
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(module, action)
);

-- Role-Permission Mapping
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

-- Employee-Role Mapping
CREATE TABLE employee_roles (
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES employees(id),
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (employee_id, role_id)
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX idx_rt_employee ON refresh_tokens(employee_id);

-- Audit Log
CREATE TABLE partner_audit_log (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES business_partners(id),
  action TEXT NOT NULL,
  performed_by TEXT REFERENCES employees(id),
  details TEXT,                        -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_audit_partner ON partner_audit_log(partner_id);
CREATE INDEX idx_audit_action ON partner_audit_log(action);
```

---

## API Endpoints

### Authentication

```
POST   /api/auth/login              # Employee login
POST   /api/auth/logout             # Logout (revoke token)
POST   /api/auth/refresh            # Refresh access token
POST   /api/auth/forgot-password    # Request password reset
POST   /api/auth/reset-password     # Reset password with token
GET    /api/auth/me                 # Get current user with permissions
```

### Employees

```
GET    /api/employees               # List employees (paginated, filtered)
GET    /api/employees/:id           # Get employee by ID
POST   /api/employees               # Create employee (admin only)
PUT    /api/employees/:id           # Update employee
PATCH  /api/employees/:id/status    # Change employee status
DELETE /api/employees/:id           # Delete employee (soft delete)

# RBAC
GET    /api/employees/:id/roles     # Get employee roles
POST   /api/employees/:id/roles     # Assign role to employee
DELETE /api/employees/:id/roles/:roleId  # Revoke role

# Organization
GET    /api/employees/:id/subordinates    # Get direct reports
GET    /api/employees/org-chart           # Get organization hierarchy
```

### Suppliers

```
GET    /api/suppliers               # List suppliers (paginated, filtered)
GET    /api/suppliers/:id           # Get supplier by ID
POST   /api/suppliers               # Create supplier
PUT    /api/suppliers/:id           # Update supplier
PATCH  /api/suppliers/:id/status    # Change supplier status
DELETE /api/suppliers/:id           # Delete supplier (soft delete)

# Products
GET    /api/suppliers/:id/products  # Get products from this supplier
POST   /api/suppliers/:id/products  # Link products to supplier

# Statistics
GET    /api/suppliers/:id/stats     # Get supplier performance stats
```

### Customers

```
GET    /api/customers               # List customers (paginated, filtered)
GET    /api/customers/:id           # Get customer by ID
POST   /api/customers               # Create customer
PUT    /api/customers/:id           # Update customer
PATCH  /api/customers/:id/status    # Change customer status
DELETE /api/customers/:id           # Delete customer (soft delete)

# B2B Specific
PATCH  /api/customers/:id/credit-limit    # Update credit limit
GET    /api/customers/:id/credit-status   # Get credit status

# Loyalty (B2C)
GET    /api/customers/:id/loyalty         # Get loyalty info
POST   /api/customers/:id/loyalty/redeem  # Redeem points

# Statistics
GET    /api/customers/:id/orders          # Get customer orders (from Order Service)
GET    /api/customers/:id/stats           # Get customer statistics
```

### Addresses

```
GET    /api/partners/:partnerId/addresses      # List addresses
POST   /api/partners/:partnerId/addresses      # Add address
PUT    /api/partners/:partnerId/addresses/:id  # Update address
DELETE /api/partners/:partnerId/addresses/:id  # Delete address
PATCH  /api/partners/:partnerId/addresses/:id/primary  # Set as primary
```

### Roles & Permissions (Admin)

```
GET    /api/admin/roles                    # List all roles
GET    /api/admin/roles/:id                # Get role with permissions
POST   /api/admin/roles                    # Create custom role
PUT    /api/admin/roles/:id                # Update role
DELETE /api/admin/roles/:id                # Delete role (non-system only)
PUT    /api/admin/roles/:id/permissions    # Update role permissions

GET    /api/admin/permissions              # List all permissions
```

---

## Service Integration

### With Order Service

```typescript
// Order Service calls Business Partner Service to:
// 1. Validate customer exists and is active
// 2. Get customer credit limit (B2B)
// 3. Get customer discount percentage
// 4. Get shipping address

// Event: OrderCompleted
// Business Partner Service listens to update:
// - Customer total_orders
// - Customer total_spent
// - Customer last_order_date
// - Customer loyalty_points (B2C)
```

### With Product Service

```typescript
// Product Service calls Business Partner Service to:
// 1. Get supplier info for product sourcing
// 2. Validate supplier exists

// Business Partner Service stores supplier product links
// but Product Service is source of truth for products
```

### With Inventory Service

```typescript
// Inventory Service calls Business Partner Service to:
// 1. Validate supplier for purchase orders
// 2. Get supplier lead time for reorder calculations
```

### With Accounting Service

```typescript
// Accounting Service calls Business Partner Service to:
// 1. Get supplier bank details for payments
// 2. Get customer for invoicing
// 3. Validate tax ID (NPWP)

// Event: PaymentReceived
// Business Partner Service listens to update:
// - Customer current_balance (B2B)
```

---

## Event Publishing

### Events Published

```typescript
// Employee Events
EmployeeCreated    { employeeId, email, department }
EmployeeUpdated    { employeeId, changes }
EmployeeTerminated { employeeId, terminationDate }
RoleAssigned       { employeeId, roleId, assignedBy }
RoleRevoked        { employeeId, roleId, revokedBy }

// Supplier Events
SupplierCreated    { supplierId, name, productCategories }
SupplierUpdated    { supplierId, changes }
SupplierBlocked    { supplierId, reason }

// Customer Events
CustomerCreated    { customerId, customerType, email }
CustomerUpdated    { customerId, changes }
CustomerTierChanged { customerId, oldTier, newTier }
CreditLimitChanged  { customerId, oldLimit, newLimit }
```

### Events Consumed

```typescript
// From Order Service
OrderCompleted → Update customer stats, loyalty points
OrderCancelled → Adjust customer stats

// From Accounting Service
PaymentReceived → Update customer balance
InvoiceCreated  → Update customer current_balance
```

---

## Security

### Authentication

- JWT-based authentication for employees
- Access token (1 hour) + Refresh token (7 days)
- Password hashing with bcrypt (10+ rounds)
- Account lockout after 5 failed attempts
- MFA support (TOTP)

### Authorization

- Role-Based Access Control (RBAC)
- Permission format: `module:action` (e.g., `customers:create`)
- Backend validates all requests
- Frontend hides unauthorized UI elements

### Data Protection

- Sensitive fields encrypted at rest (bank accounts, tax IDs)
- Audit log for all changes
- PII handling compliance
- Rate limiting on auth endpoints

---

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Database**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **Auth**: JWT via `@tsndr/cloudflare-worker-jwt`
- **Password**: bcrypt
- **Validation**: Zod
- **Architecture**: Hexagonal + DDD

---

## Folder Structure

```
services/business-partner-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── BusinessPartner.ts
│   │   │   ├── Employee.ts
│   │   │   ├── Supplier.ts
│   │   │   ├── Customer.ts
│   │   │   ├── Address.ts
│   │   │   ├── Role.ts
│   │   │   └── Permission.ts
│   │   ├── value-objects/
│   │   │   ├── PartnerCode.ts
│   │   │   ├── Email.ts
│   │   │   ├── Phone.ts
│   │   │   └── TaxId.ts
│   │   ├── repositories/
│   │   │   ├── IEmployeeRepository.ts
│   │   │   ├── ISupplierRepository.ts
│   │   │   ├── ICustomerRepository.ts
│   │   │   └── IRoleRepository.ts
│   │   ├── services/
│   │   │   ├── AuthorizationService.ts
│   │   │   └── PartnerCodeGenerator.ts
│   │   └── events/
│   │       ├── EmployeeEvents.ts
│   │       ├── SupplierEvents.ts
│   │       └── CustomerEvents.ts
│   │
│   ├── application/
│   │   ├── commands/
│   │   │   ├── CreateEmployee.ts
│   │   │   ├── CreateSupplier.ts
│   │   │   ├── CreateCustomer.ts
│   │   │   ├── AssignRole.ts
│   │   │   └── UpdateCreditLimit.ts
│   │   ├── queries/
│   │   │   ├── GetEmployee.ts
│   │   │   ├── ListSuppliers.ts
│   │   │   ├── GetCustomerStats.ts
│   │   │   └── GetEmployeePermissions.ts
│   │   └── event-handlers/
│   │       ├── OrderCompletedHandler.ts
│   │       └── PaymentReceivedHandler.ts
│   │
│   ├── infrastructure/
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── repositories/
│   │   │   │   ├── EmployeeRepository.ts
│   │   │   │   ├── SupplierRepository.ts
│   │   │   │   └── CustomerRepository.ts
│   │   │   └── seed.ts
│   │   ├── auth/
│   │   │   ├── JWTService.ts
│   │   │   ├── PasswordService.ts
│   │   │   └── middleware.ts
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── employee.routes.ts
│   │   │   │   ├── supplier.routes.ts
│   │   │   │   ├── customer.routes.ts
│   │   │   │   └── admin.routes.ts
│   │   │   └── controllers/
│   │   │       └── ...
│   │   └── events/
│   │       ├── publisher.ts
│   │       └── subscriber.ts
│   │
│   └── index.ts
│
├── migrations/
│   ├── 0001_business_partners.sql
│   ├── 0002_employees.sql
│   ├── 0003_suppliers.sql
│   ├── 0004_customers.sql
│   ├── 0005_addresses.sql
│   ├── 0006_rbac.sql
│   └── 0007_seed_permissions.sql
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── wrangler.toml
├── package.json
└── tsconfig.json
```

---

## Migration from User Service

### Step 1: Create Business Partner Service
- Set up new service with schema
- Implement core entities and APIs

### Step 2: Migrate Employee Data
- Copy user data to business_partners + employees tables
- Map `userType: 'admin'` → admin role
- Preserve authentication data

### Step 3: Add Customer Data
- Migrate any customer data from other sources
- Set up customer authentication (optional)

### Step 4: Add Supplier Data
- Create supplier records
- Link to products

### Step 5: Update Service Bindings
- Update API Gateway to route to new service
- Update other services to call Business Partner Service

### Step 6: Deprecate User Service
- Run both services in parallel for transition
- Gradually migrate traffic
- Decommission User Service

---

**Document Version**: 1.0
**Last Updated**: January 2025
**Status**: Design Phase
