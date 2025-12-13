# RBAC Implementation Plan for Admin Dashboard

**Date**: 2025-11-18
**Status**: Design Phase
**Author**: Claude (based on ERP research & codebase analysis)

---

## Executive Summary

This document outlines the implementation plan for integrating Role-Based Access Control (RBAC) into the KidKazz admin-dashboard frontend with the user-service backend.

### Goals
1. Implement secure authentication with email + phone registration
2. Create two user categories: Admin (full access) and User (role-based access)
3. Apply module-based permissions for: Orders, Products, Inventory, Customers
4. Protect routes and UI elements based on user permissions
5. Follow ERP industry best practices for RBAC

---

## Research Findings

### How Modern ERPs Handle RBAC (2025)

Based on research from leading ERP systems (Procuzy, ERPNext, Odoo, SAP):

1. **Module-Based Permissions**: Access controlled at module level (Orders, Inventory, etc.)
2. **Action-Based Controls**: CREATE, READ, UPDATE, DELETE permissions per module
3. **Hierarchical Roles**: Admin → Manager → User with permission inheritance
4. **Least Privilege Principle**: Users get minimum permissions needed
5. **Multi-Factor Registration**: Email + Phone for account recovery
6. **JWT Tokens**: Short-lived access tokens (1h) + refresh tokens (7d)
7. **Frontend Permission Gates**: Hide/disable UI elements based on permissions
8. **Zero Trust**: Always verify permissions on backend, frontend is for UX only

### Best Practices from Research

- **Automation**: 30% efficiency increase from automated permission management
- **Role Consolidation**: Reduce roles by 50-70% through proper analysis
- **Just-In-Time Admin Access**: Temporary elevation for administrative tasks
- **Audit Logging**: Track all permission changes and high-privilege actions
- **Hybrid RBAC-ABAC**: Combine role-based with attribute-based for flexibility

---

## Current State Analysis

### Admin Dashboard (React + Vite + TanStack Router)
- **Framework**: React 18.2.0 with Vite
- **Router**: TanStack Router (file-based routing)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: React hooks (no global state management)

**Existing Modules**:
- `/dashboard/products` - Product management with categories, bundles, variants, UOM
- `/dashboard/orders` - Order management
- `/dashboard/inventory` - Inventory & warehouse management
- `/dashboard/customers` - Customer management

**Authentication Status**:
- ✅ Login/Register endpoints functional
- ✅ JWT token generation working
- ❌ No token persistence (lost on page refresh)
- ❌ No protected routes
- ❌ No permission-based rendering

### User Service (Cloudflare Workers + Drizzle ORM)
- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **ORM**: Drizzle
- **Auth**: JWT via `@tsndr/cloudflare-worker-jwt`

**Existing Features**:
- ✅ User registration with email, password, fullName
- ✅ JWT access + refresh tokens
- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ User types: retail, wholesale, admin
- ✅ Phone number field in schema (not used)
- ❌ No role management system
- ❌ No permissions table
- ❌ No authorization middleware

**Critical TODOs Found in Code**:
- Increment failed login attempts
- Update last login timestamp
- Save refresh token to database
- Check if refresh token is revoked

---

## Architecture Design

### 1. User Categories

#### Admin User (Super User)
- **Access**: Full CRUD on all modules
- **Capabilities**:
  - Manage all orders, products, inventory, customers
  - Create and manage user accounts
  - Assign roles and permissions to users
  - View audit logs
  - System configuration
- **Default**: First registered user or explicitly set

#### Regular User (Role-Based)
- **Access**: Based on assigned role(s)
- **Capabilities**: Determined by role permissions
- **Cannot**: Manage other users or assign permissions
- **Examples**:
  - Inventory Manager: Full access to inventory, read-only products
  - Sales Staff: Manage orders and customers, read-only products
  - Product Manager: Full access to products, read-only inventory

### 2. Permission System

#### Module Definition
```typescript
type Module = 'orders' | 'products' | 'inventory' | 'customers' | 'users';
```

#### Action Definition
```typescript
type Action = 'create' | 'read' | 'update' | 'delete';
```

#### Permission Format
```typescript
type Permission = `${Module}:${Action}`;
// Examples: 'orders:create', 'products:read', 'inventory:update'
```

#### Permission Matrix

| Role | Orders | Products | Inventory | Customers | Users |
|------|--------|----------|-----------|-----------|-------|
| **Admin** | CRUD | CRUD | CRUD | CRUD | CRUD |
| **Inventory Manager** | R | R | CRUD | R | - |
| **Sales Staff** | CRU | R | R | RU | - |
| **Product Manager** | R | CRUD | R | R | - |

### 3. Database Schema

#### New Tables

```sql
-- Roles table
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,           -- 'admin', 'inventory_manager', etc.
  display_name TEXT NOT NULL,          -- 'Inventory Manager'
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- true for 'admin'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Permissions table
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,                -- 'orders', 'products', 'inventory', 'customers', 'users'
  action TEXT NOT NULL,                -- 'create', 'read', 'update', 'delete'
  description TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE(module, action)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping (many-to-many)
CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by TEXT REFERENCES users(id),
  assigned_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

-- Audit log for permission changes
CREATE TABLE permission_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,               -- 'role_assigned', 'role_revoked', 'permission_changed'
  target_user_id TEXT REFERENCES users(id),
  details TEXT,                        -- JSON details
  ip_address TEXT,
  created_at INTEGER NOT NULL
);
```

#### Updated Users Table

```sql
ALTER TABLE users ADD COLUMN phone_number TEXT;
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN phone_verification_code TEXT;
ALTER TABLE users ADD COLUMN phone_verification_expires_at INTEGER;
```

### 4. Authentication Flow

```
┌──────────────────┐
│  Registration    │
│  - Email         │
│  - Password      │
│  - Full Name     │
│  - Phone Number  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  Backend Validation          │
│  - Email unique check        │
│  - Phone format validation   │
│  - Password strength (≥8)    │
│  - Create user (status=pending) │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Send Verifications          │
│  - Email verification link   │
│  - SMS verification code     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  User Verifies Email         │
│  - Click link or enter code  │
│  - Status → active           │
│  - emailVerified = true      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Login                       │
│  - Email + Password          │
│  - Check status = active     │
│  - Check emailVerified       │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Generate JWT Tokens         │
│  Access Token (1h):          │
│  {                           │
│    userId, email,            │
│    userType,                 │
│    roles: [],                │
│    permissions: []           │
│  }                           │
│  Refresh Token (7d)          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Frontend Stores             │
│  - localStorage: tokens      │
│  - sessionStorage: user      │
│  - AuthContext: state        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Dashboard                   │
│  - Show available modules    │
│  - Hide restricted features  │
│  - Check permissions         │
└──────────────────────────────┘
```

### 5. Frontend Architecture

```
src/
├── auth/
│   ├── AuthProvider.tsx           # Context provider with useReducer
│   ├── useAuth.ts                 # Hook: login, logout, register, checkAuth
│   ├── ProtectedRoute.tsx         # Wrapper for routes requiring auth
│   ├── RoleGuard.tsx              # Wrapper for role-specific routes
│   ├── PermissionGate.tsx         # Component for conditional rendering
│   └── authService.ts             # API calls
│
├── permissions/
│   ├── constants.ts               # PERMISSIONS, MODULES, ACTIONS
│   ├── usePermissions.ts          # Hook: hasPermission, hasAnyPermission
│   ├── PermissionChecker.ts       # Core permission logic
│   └── types.ts                   # TypeScript types
│
├── services/
│   ├── api.ts                     # Axios instance with interceptors
│   ├── tokenService.ts            # Token get/set/remove/refresh
│   └── userService.ts             # User management API calls
│
├── routes/
│   ├── index.tsx                  # Login page (public)
│   ├── register.tsx               # Registration (public)
│   ├── dashboard.tsx              # Protected layout
│   └── dashboard/
│       ├── index.tsx              # Dashboard home
│       ├── users.tsx              # User management (admin only)
│       ├── products/              # Products module
│       ├── orders/                # Orders module
│       ├── inventory/             # Inventory module
│       └── customers/             # Customers module
│
└── components/
    ├── PermissionButton.tsx       # Button with permission check
    └── RoleBasedNav.tsx           # Navigation filtered by permissions
```

### 6. Backend Architecture

```
services/user-service/src/
├── domain/
│   ├── entities/
│   │   ├── User.ts                # Updated with roles
│   │   ├── Role.ts                # New: Role entity
│   │   └── Permission.ts          # New: Permission entity
│   └── events/
│       ├── UserRoleAssigned.ts    # New event
│       └── UserRoleRevoked.ts     # New event
│
├── application/
│   └── use-cases/
│       ├── RegisterUser.ts        # Updated: phone validation
│       ├── LoginUser.ts           # Updated: return roles & permissions
│       ├── AssignRoleToUser.ts    # New: admin assigns role
│       ├── RevokeRoleFromUser.ts  # New: admin revokes role
│       ├── CreateRole.ts          # New: create custom role
│       ├── UpdateRolePermissions.ts # New: manage role permissions
│       └── GetUserPermissions.ts  # New: fetch user's permissions
│
├── infrastructure/
│   ├── db/
│   │   ├── schema.ts              # Updated with RBAC tables
│   │   └── seed.ts                # New: seed default roles/permissions
│   ├── auth/
│   │   ├── JWTService.ts          # Updated payload
│   │   ├── AuthorizationService.ts # New: permission checking
│   │   └── middleware.ts          # New: auth & permission middleware
│   └── http/
│       ├── routes.ts              # Updated with protected routes
│       └── admin-routes.ts        # New: user/role management endpoints
│
└── wrangler.toml                  # Cloudflare Workers config
```

---

## Implementation Phases

### Phase 1: Backend - Database & Schema (2-3 hours)

**Tasks**:
1. Create migration for RBAC tables (roles, permissions, role_permissions, user_roles)
2. Update users table (add phone_number, phone_verified)
3. Create seed script for default permissions (20 permissions: 4 modules × 5 actions)
4. Create seed script for default roles (admin, inventory_manager, sales_staff, product_manager)
5. Assign permissions to default roles

**Files to Create/Update**:
- `services/user-service/src/infrastructure/db/schema.ts`
- `services/user-service/src/infrastructure/db/migrations/001_rbac.sql`
- `services/user-service/src/infrastructure/db/seed.ts`

**Deliverables**:
- ✅ Database tables created
- ✅ Default permissions seeded
- ✅ Default roles created with permission mappings
- ✅ Migration script ready

---

### Phase 2: Backend - Domain Layer (2-3 hours)

**Tasks**:
1. Create Role entity with validation
2. Create Permission entity
3. Update User entity with role management methods
4. Create domain events (RoleAssigned, RoleRevoked)
5. Create value objects (RoleType, PermissionType)

**Files to Create/Update**:
- `services/user-service/src/domain/entities/Role.ts`
- `services/user-service/src/domain/entities/Permission.ts`
- `services/user-service/src/domain/entities/User.ts`
- `services/user-service/src/domain/events/UserRoleAssigned.ts`
- `services/user-service/src/domain/events/UserRoleRevoked.ts`

**Deliverables**:
- ✅ Domain entities with business logic
- ✅ Domain events for audit trail
- ✅ Type-safe permission system

---

### Phase 3: Backend - Use Cases & Authorization (3-4 hours)

**Tasks**:
1. Create AuthorizationService for permission checking
2. Update RegisterUser to support phone number
3. Update LoginUser to include roles & permissions in JWT
4. Create AssignRoleToUser use case (admin only)
5. Create RevokeRoleFromUser use case (admin only)
6. Create GetUserPermissions use case
7. Create CreateRole use case (admin only)
8. Update JWTService to include roles/permissions in token payload

**Files to Create/Update**:
- `services/user-service/src/infrastructure/auth/AuthorizationService.ts`
- `services/user-service/src/application/use-cases/RegisterUser.ts`
- `services/user-service/src/application/use-cases/LoginUser.ts`
- `services/user-service/src/application/use-cases/AssignRoleToUser.ts`
- `services/user-service/src/application/use-cases/RevokeRoleFromUser.ts`
- `services/user-service/src/application/use-cases/GetUserPermissions.ts`
- `services/user-service/src/infrastructure/auth/JWTService.ts`

**Deliverables**:
- ✅ Authorization logic centralized
- ✅ Role assignment workflow
- ✅ JWT includes permissions
- ✅ Admin can manage user roles

---

### Phase 4: Backend - API Routes & Middleware (2-3 hours)

**Tasks**:
1. Create authentication middleware (verify JWT)
2. Create authorization middleware (check permissions)
3. Update /api/auth/register to accept phone number
4. Update /api/auth/login to return roles & permissions
5. Create /api/auth/me to return user with roles
6. Create admin routes:
   - POST /api/admin/users/:id/roles - Assign role
   - DELETE /api/admin/users/:id/roles/:roleId - Revoke role
   - GET /api/admin/roles - List all roles
   - POST /api/admin/roles - Create custom role
   - PUT /api/admin/roles/:id/permissions - Update role permissions
   - GET /api/admin/users - List all users

**Files to Create/Update**:
- `services/user-service/src/infrastructure/http/middleware.ts`
- `services/user-service/src/infrastructure/http/routes.ts`
- `services/user-service/src/infrastructure/http/admin-routes.ts`

**Deliverables**:
- ✅ Protected endpoints
- ✅ Permission-based access control
- ✅ Admin user management API
- ✅ Role management API

---

### Phase 5: Frontend - Auth Infrastructure (3-4 hours)

**Tasks**:
1. Create tokenService for localStorage management
2. Create API client with axios interceptors (auto-refresh)
3. Create AuthContext with useReducer
4. Create useAuth hook
5. Create authService for API calls
6. Implement auto-logout on token expiry
7. Implement auto-redirect on 401/403

**Files to Create**:
- `apps/admin-dashboard/src/services/tokenService.ts`
- `apps/admin-dashboard/src/services/api.ts`
- `apps/admin-dashboard/src/auth/AuthProvider.tsx`
- `apps/admin-dashboard/src/auth/useAuth.ts`
- `apps/admin-dashboard/src/auth/authService.ts`
- `apps/admin-dashboard/src/auth/types.ts`

**Deliverables**:
- ✅ Persistent authentication
- ✅ Automatic token refresh
- ✅ Global auth state
- ✅ Error handling

---

### Phase 6: Frontend - Permission System (2-3 hours)

**Tasks**:
1. Create permission constants (MODULES, ACTIONS, PERMISSIONS)
2. Create PermissionChecker class
3. Create usePermissions hook
4. Create PermissionGate component
5. Create ProtectedRoute component
6. Create RoleGuard component

**Files to Create**:
- `apps/admin-dashboard/src/permissions/constants.ts`
- `apps/admin-dashboard/src/permissions/PermissionChecker.ts`
- `apps/admin-dashboard/src/permissions/usePermissions.ts`
- `apps/admin-dashboard/src/auth/PermissionGate.tsx`
- `apps/admin-dashboard/src/auth/ProtectedRoute.tsx`
- `apps/admin-dashboard/src/auth/RoleGuard.tsx`

**Deliverables**:
- ✅ Permission checking utilities
- ✅ Route protection
- ✅ Component-level permission gates

---

### Phase 7: Frontend - Login & Registration UI (3-4 hours)

**Tasks**:
1. Create modern login page (email + password)
2. Add "Forgot Password" flow
3. Create registration page (email, password, fullName, phone)
4. Add email/phone validation
5. Add password strength indicator
6. Implement error handling & user feedback
7. Add loading states

**Files to Create/Update**:
- `apps/admin-dashboard/src/routes/index.tsx` (login page)
- `apps/admin-dashboard/src/routes/register.tsx`
- `apps/admin-dashboard/src/routes/forgot-password.tsx`
- `apps/admin-dashboard/src/components/PasswordStrength.tsx`

**Deliverables**:
- ✅ Professional login UI
- ✅ Registration with phone support
- ✅ Form validation
- ✅ User feedback

---

### Phase 8: Frontend - Protected Routes (2 hours)

**Tasks**:
1. Wrap dashboard routes with ProtectedRoute
2. Implement redirect to login if not authenticated
3. Add permission checks to module routes
4. Update navigation to hide unavailable modules
5. Test route protection

**Files to Update**:
- `apps/admin-dashboard/src/routes/__root.tsx`
- `apps/admin-dashboard/src/routes/dashboard.tsx`
- `apps/admin-dashboard/src/components/Sidebar.tsx` (if exists)

**Deliverables**:
- ✅ All dashboard routes protected
- ✅ Auto-redirect to login
- ✅ Navigation reflects permissions

---

### Phase 9: Frontend - User Management UI (Admin Only) (4-5 hours)

**Tasks**:
1. Create user listing page (/dashboard/users)
2. Create user detail/edit modal
3. Create role assignment interface
4. Create role management page (create/edit roles)
5. Create permission matrix UI
6. Add search & filtering
7. Add pagination

**Files to Create**:
- `apps/admin-dashboard/src/routes/dashboard/users.tsx`
- `apps/admin-dashboard/src/components/UserRoleDialog.tsx`
- `apps/admin-dashboard/src/components/RolePermissionMatrix.tsx`
- `apps/admin-dashboard/src/routes/dashboard/roles.tsx`

**Deliverables**:
- ✅ Admin can view all users
- ✅ Admin can assign/revoke roles
- ✅ Admin can create custom roles
- ✅ Admin can manage permissions

---

### Phase 10: Frontend - Permission-Based UI (2-3 hours)

**Tasks**:
1. Update dashboard to show only accessible modules
2. Hide/disable buttons based on permissions (create, edit, delete)
3. Add permission checks to all CRUD operations
4. Update product pages with permission gates
5. Update order pages with permission gates
6. Update inventory pages with permission gates
7. Update customer pages with permission gates

**Files to Update**:
- All route files in `apps/admin-dashboard/src/routes/dashboard/`
- Dashboard home page

**Deliverables**:
- ✅ UI reflects user permissions
- ✅ No unauthorized actions visible
- ✅ Better UX (no 403 errors)

---

### Phase 11: Testing & Validation (3-4 hours)

**Tasks**:
1. Test admin user flow (full access)
2. Test user with limited permissions
3. Test role assignment/revocation
4. Test login/logout/token refresh
5. Test permission changes take effect
6. Test unauthorized access attempts
7. Test phone number registration
8. API endpoint security testing

**Test Scenarios**:
- Admin creates new user with Sales Staff role
- Sales Staff can create orders but not delete
- Sales Staff cannot access User Management
- Inventory Manager can manage inventory but not orders
- Token auto-refresh works
- Invalid tokens are rejected
- Permission changes reflect immediately

**Deliverables**:
- ✅ End-to-end RBAC working
- ✅ Security validated
- ✅ Edge cases handled

---

### Phase 12: Documentation & Deployment (1-2 hours)

**Tasks**:
1. Update API documentation
2. Create admin guide for role management
3. Create developer guide for adding new permissions
4. Update README with RBAC info
5. Deploy to staging
6. Final testing in staging
7. Deploy to production

**Files to Create/Update**:
- `docs/RBAC_USER_GUIDE.md`
- `docs/RBAC_DEVELOPER_GUIDE.md`
- `docs/API_ENDPOINTS.md`
- `README.md`

**Deliverables**:
- ✅ Complete documentation
- ✅ Production deployment
- ✅ Team onboarding guide

---

## Total Estimated Time

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Database & Schema | 2-3 hours |
| Phase 2: Domain Layer | 2-3 hours |
| Phase 3: Use Cases & Authorization | 3-4 hours |
| Phase 4: API Routes & Middleware | 2-3 hours |
| Phase 5: Frontend Auth Infrastructure | 3-4 hours |
| Phase 6: Frontend Permission System | 2-3 hours |
| Phase 7: Login & Registration UI | 3-4 hours |
| Phase 8: Protected Routes | 2 hours |
| Phase 9: User Management UI | 4-5 hours |
| Phase 10: Permission-Based UI | 2-3 hours |
| Phase 11: Testing & Validation | 3-4 hours |
| Phase 12: Documentation & Deployment | 1-2 hours |
| **TOTAL** | **29-41 hours** |

---

## Security Considerations

1. **Token Storage**:
   - Access token in localStorage (XSS risk mitigated by short expiry)
   - Refresh token in httpOnly cookie (if possible) or localStorage with rotation
   - Never store sensitive data in JWT

2. **Password Security**:
   - Bcrypt with 10+ rounds
   - Password strength validation on frontend & backend
   - Account lockout after 5 failed attempts

3. **Permission Validation**:
   - Always validate on backend (frontend is for UX only)
   - Check permissions on every protected endpoint
   - Log permission violations for audit

4. **Phone Verification**:
   - Rate limit SMS sending (max 3 per hour)
   - Verification codes expire in 10 minutes
   - Store hashed codes, not plain text

5. **Audit Trail**:
   - Log all role assignments/revocations
   - Log all permission changes
   - Log all failed authorization attempts
   - Include IP address and timestamp

---

## Dependencies

### Frontend
- Existing: React, TanStack Router, shadcn/ui, Tailwind
- New: None (pure React implementation)

### Backend
- Existing: Hono, Drizzle ORM, JWT library, bcrypt
- New: None (leverage existing infrastructure)

---

## Migration Strategy

### For Existing Users
1. Run migration to add RBAC tables
2. All existing users with `userType: 'admin'` → assign 'admin' role
3. All existing users with `userType: 'retail'` → assign 'sales_staff' role
4. All existing users with `userType: 'wholesale'` → assign 'inventory_manager' role
5. Send email notification about new permission system

### Backward Compatibility
- Keep `userType` field in users table for legacy support
- Gradually deprecate `userType` in favor of roles
- Support both systems during transition (2-4 weeks)

---

## Success Metrics

1. **Security**: Zero unauthorized access incidents
2. **UX**: Users only see features they can use (no 403 errors)
3. **Performance**: Permission checks add <50ms to request time
4. **Adoption**: 100% of users assigned appropriate roles within 1 week
5. **Maintainability**: New permissions can be added in <30 minutes

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration breaks existing auth | Medium | High | Test thoroughly in staging, rollback plan ready |
| Performance degradation | Low | Medium | Cache permissions in JWT, index database properly |
| Users locked out | Low | High | Always keep one admin account, manual override process |
| Permission confusion | Medium | Medium | Clear documentation, training for admins |

---

## Next Steps

1. **Review & Approve**: Review this plan with team
2. **Prioritize**: Decide which phases to implement first
3. **Schedule**: Allocate development time
4. **Assign**: Assign phases to developers
5. **Execute**: Begin Phase 1

---

## References

- [Role-Based Access Control in ERP Systems - Procuzy](https://procuzy.com/blog/role-based-access-control-in-erp-systems/)
- [RBAC Best Practices 2025 - TechPrescient](https://www.techprescient.com/blogs/role-based-access-control-best-practices/)
- [Implementing RBAC in Next.js - Permit.io](https://www.permit.io/blog/how-to-add-rbac-in-nextjs)
- Current codebase analysis

---

**Document Version**: 1.0
**Last Updated**: 2025-11-18
**Status**: Awaiting approval to proceed with implementation
