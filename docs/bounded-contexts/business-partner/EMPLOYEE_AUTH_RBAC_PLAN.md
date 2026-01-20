# Employee Authentication & RBAC Plan

> **Status**: PLANNED (Phase 2/3)
> **Priority**: High
> **Dependencies**: Business Partner Service Phase 1 complete

## Table of Contents

1. [Overview](#overview)
2. [Authentication Strategy](#authentication-strategy)
3. [Face Recognition Analysis](#face-recognition-analysis)
4. [Database Schema (Planned)](#database-schema-planned)
5. [RBAC Design](#rbac-design)
6. [Implementation Phases](#implementation-phases)
7. [Security Considerations](#security-considerations)
8. [API Endpoints (Planned)](#api-endpoints-planned)

---

## Overview

### Goals

1. **Secure authentication** for all employee types (office, field, warehouse)
2. **Role-based access control** for ERP modules
3. **Audit trail** for all sensitive actions
4. **Multi-factor verification** for high-risk operations
5. **Mobile-friendly** for field workers

### Non-Goals (This Phase)

- Customer authentication (separate system)
- External API authentication (use API keys)
- Single sign-on federation (future enhancement)

---

## Authentication Strategy

### Recommended: Multi-Method Authentication

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION METHODS BY USER TYPE                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  OFFICE STAFF              FIELD WORKERS            WAREHOUSE STAFF      │
│  ────────────              ─────────────            ───────────────      │
│  Primary:                  Primary:                 Primary:             │
│  • Passkey/WebAuthn        • PIN + Device ID        • PIN + Badge scan   │
│  • SSO (Google/MS365)      • Magic Link             • Passkey            │
│                                                                          │
│  Secondary (High-risk):    Secondary (Verification): Secondary:          │
│  • TOTP (Authenticator)    • Face photo at location • Face (clock in)   │
│  • Hardware key            • Manager approval       • Manager PIN        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Primary Authentication Methods

| Method | Security | UX | Best For | Implementation |
|--------|----------|-----|----------|----------------|
| **Passkey/WebAuthn** | ★★★★★ | ★★★★★ | Modern devices | WebAuthn API |
| **SSO (Google)** | ★★★★☆ | ★★★★★ | Office staff | OAuth 2.0 |
| **PIN + Device** | ★★★☆☆ | ★★★★★ | Field workers | Custom + device fingerprint |
| **Magic Link** | ★★★★☆ | ★★★★☆ | Occasional users | Email token |
| **Password + TOTP** | ★★★☆☆ | ★★★☆☆ | Legacy/fallback | bcrypt + TOTP |

### Decision: Primary Auth

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRIMARY AUTH DECISION                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ✅ RECOMMENDED                        ❌ NOT RECOMMENDED                │
│  ─────────────                         ───────────────────               │
│  • Passkeys (WebAuthn)                 • Face recognition (primary)     │
│  • SSO with Google Workspace           • SMS OTP (SIM swap attacks)     │
│  • PIN + Device binding                • Password only                   │
│  • Magic links (email)                 • Security questions              │
│                                                                          │
│  WHY:                                  WHY NOT:                          │
│  • Phishing resistant                  • Single point of failure         │
│  • No passwords to manage              • Privacy/legal concerns          │
│  • Works offline (passkeys)            • Cost per API call               │
│  • Industry standard                   • Accuracy issues                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Face Recognition Analysis

### When to Use Face Recognition

| Use Case | Recommended | Reason |
|----------|-------------|--------|
| Primary login | ❌ No | Single point of failure, privacy concerns |
| Time & attendance | ✅ Yes | Prevents buddy punching, photo proof |
| Field visit verification | ✅ Yes | Proves salesperson was at location |
| High-value transaction approval | ✅ Yes | Additional verification layer |
| Restricted area access | ✅ Yes | Physical security audit trail |
| Password reset | ⚠️ Maybe | With other factors, not alone |

### Face Recognition: Pros vs Cons

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FACE RECOGNITION ANALYSIS                             │
├──────────────────────────────┬──────────────────────────────────────────┤
│           PROS               │              CONS                         │
├──────────────────────────────┼──────────────────────────────────────────┤
│ ✅ Convenient (no password)  │ ❌ Privacy concerns (biometric data)     │
│ ✅ Hard to share credentials │ ❌ Legal compliance (PDP Law, GDPR)      │
│ ✅ Photo proof of action     │ ❌ AWS dependency (outage = locked out)  │
│ ✅ Prevents buddy punching   │ ❌ Cost ($0.001/search, adds up)         │
│ ✅ Works for field workers   │ ❌ Accuracy (masks, lighting, glasses)   │
│                              │ ❌ Spoofing risk (need liveness check)   │
│                              │ ❌ Employee resistance (surveillance)    │
└──────────────────────────────┴──────────────────────────────────────────┘
```

### Recommended: Face as Secondary Verification

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STANDARD LOGIN                     HIGH-RISK ACTION                     │
│  ──────────────                     ────────────────                     │
│                                                                          │
│  ┌─────────┐                        ┌─────────────┐                     │
│  │ Employee│                        │ Approve     │                     │
│  │ opens   │                        │ Rp 50M      │                     │
│  │ app     │                        │ refund      │                     │
│  └────┬────┘                        └──────┬──────┘                     │
│       │                                    │                             │
│       ▼                                    ▼                             │
│  ┌─────────┐                        ┌─────────────┐                     │
│  │ Passkey │                        │ Face verify │                     │
│  │ or SSO  │                        │ required    │                     │
│  └────┬────┘                        └──────┬──────┘                     │
│       │                                    │                             │
│       ▼                                    ▼                             │
│  ┌─────────┐                        ┌─────────────┐                     │
│  │ Access  │                        │ ✅ Approved │                     │
│  │ granted │                        │ + audit log │                     │
│  └─────────┘                        └─────────────┘                     │
│                                            │                             │
│                                     ┌──────┴──────┐                     │
│                                     │  Fallback:  │                     │
│                                     │  2 manager  │                     │
│                                     │  PINs       │                     │
│                                     └─────────────┘                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### AWS Rekognition Integration (When Implemented)

```typescript
// Face indexing (during employee onboarding)
const indexEmployeeFace = async (employeeId: string, photoUrl: string) => {
  const result = await rekognition.indexFaces({
    CollectionId: 'kidkazz-employees',
    Image: { S3Object: { Bucket: 'employee-photos', Name: photoUrl } },
    ExternalImageId: employeeId,
    DetectionAttributes: ['DEFAULT'],
    MaxFaces: 1,
    QualityFilter: 'HIGH'  // Reject low quality photos
  }).promise();

  return {
    faceId: result.FaceRecords[0]?.Face?.FaceId,
    confidence: result.FaceRecords[0]?.Face?.Confidence
  };
};

// Face verification (during high-risk action)
const verifyEmployeeFace = async (employeeId: string, photoBytes: Buffer) => {
  // 1. Search for face in collection
  const searchResult = await rekognition.searchFacesByImage({
    CollectionId: 'kidkazz-employees',
    Image: { Bytes: photoBytes },
    FaceMatchThreshold: 95,  // High threshold for security
    MaxFaces: 1
  }).promise();

  if (searchResult.FaceMatches?.length === 0) {
    return { verified: false, reason: 'face_not_found' };
  }

  const match = searchResult.FaceMatches[0];
  const matchedEmployeeId = match.Face?.ExternalImageId;

  // 2. Verify it's the expected employee
  if (matchedEmployeeId !== employeeId) {
    return { verified: false, reason: 'wrong_employee' };
  }

  // 3. Check confidence
  if (match.Similarity < 95) {
    return { verified: false, reason: 'low_confidence' };
  }

  return {
    verified: true,
    confidence: match.Similarity,
    faceId: match.Face?.FaceId
  };
};
```

### Liveness Detection (Anti-Spoofing)

```
⚠️ IMPORTANT: Basic face matching can be spoofed with a photo

Options for liveness detection:
1. AWS Rekognition Face Liveness (recommended)
2. Random action challenge (blink, turn head)
3. 3D depth sensor (hardware dependent)

// AWS Rekognition Face Liveness
const checkLiveness = async (sessionId: string) => {
  const result = await rekognition.getFaceLivenessSessionResults({
    SessionId: sessionId
  }).promise();

  return {
    isLive: result.Confidence > 90,
    confidence: result.Confidence
  };
};
```

---

## Database Schema (Planned)

### Employee Auth Table

```sql
-- ============================================================================
-- EMPLOYEE_AUTH TABLE (To be created in Auth Phase)
-- ============================================================================
CREATE TABLE `employee_auth` (
    `id` TEXT PRIMARY KEY,
    `employee_id` TEXT NOT NULL UNIQUE,  -- FK to employees table

    -- ════════════════════════════════════════════════════════════════════════
    -- PRIMARY AUTH CREDENTIALS
    -- ════════════════════════════════════════════════════════════════════════
    -- Passkey/WebAuthn
    `passkey_credential_id` TEXT,         -- WebAuthn credential ID
    `passkey_public_key` TEXT,            -- Public key (COSE format)
    `passkey_counter` INTEGER DEFAULT 0,  -- Signature counter
    `passkey_created_at` INTEGER,

    -- Password (fallback only)
    `password_hash` TEXT,                 -- bcrypt hash
    `password_changed_at` INTEGER,
    `password_expires_at` INTEGER,
    `password_must_change` INTEGER DEFAULT 0,

    -- PIN (for mobile/field workers)
    `pin_hash` TEXT,                      -- bcrypt hash of 6-digit PIN
    `pin_attempts` INTEGER DEFAULT 0,
    `pin_locked_until` INTEGER,

    -- SSO
    `sso_provider` TEXT,                  -- 'google' | 'microsoft' | null
    `sso_subject_id` TEXT,                -- Provider's user ID
    `sso_email` TEXT,

    -- ════════════════════════════════════════════════════════════════════════
    -- MULTI-FACTOR AUTH
    -- ════════════════════════════════════════════════════════════════════════
    `mfa_enabled` INTEGER DEFAULT 0,
    `mfa_method` TEXT,                    -- 'totp' | 'sms' | 'email' | 'face'
    `totp_secret` TEXT,                   -- Encrypted TOTP secret
    `totp_verified_at` INTEGER,

    -- ════════════════════════════════════════════════════════════════════════
    -- FACE VERIFICATION (Secondary only, requires consent)
    -- ════════════════════════════════════════════════════════════════════════
    `face_enabled` INTEGER DEFAULT 0,
    `face_consent_given` INTEGER DEFAULT 0,
    `face_consent_date` INTEGER,
    `face_consent_ip` TEXT,
    `face_id` TEXT,                       -- AWS Rekognition Face ID
    `face_photo_url` TEXT,                -- S3 URL
    `face_indexed_at` INTEGER,
    `face_quality_score` REAL,
    `face_last_verified_at` INTEGER,
    `face_verification_count` INTEGER DEFAULT 0,

    -- ════════════════════════════════════════════════════════════════════════
    -- DEVICE BINDING
    -- ════════════════════════════════════════════════════════════════════════
    `trusted_devices` TEXT,               -- JSON array of device fingerprints
    `max_trusted_devices` INTEGER DEFAULT 3,

    -- ════════════════════════════════════════════════════════════════════════
    -- SESSION MANAGEMENT
    -- ════════════════════════════════════════════════════════════════════════
    `current_session_id` TEXT,
    `last_login_at` INTEGER,
    `last_login_ip` TEXT,
    `last_login_device` TEXT,
    `last_login_location` TEXT,           -- Geolocation
    `failed_login_attempts` INTEGER DEFAULT 0,
    `locked_until` INTEGER,

    -- ════════════════════════════════════════════════════════════════════════
    -- AUDIT
    -- ════════════════════════════════════════════════════════════════════════
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,

    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);

-- Indexes
CREATE UNIQUE INDEX `idx_employee_auth_employee` ON `employee_auth`(`employee_id`);
CREATE INDEX `idx_employee_auth_sso` ON `employee_auth`(`sso_provider`, `sso_subject_id`);
CREATE INDEX `idx_employee_auth_face` ON `employee_auth`(`face_id`);
CREATE INDEX `idx_employee_auth_passkey` ON `employee_auth`(`passkey_credential_id`);
```

### Auth Sessions Table

```sql
-- ============================================================================
-- AUTH_SESSIONS TABLE
-- ============================================================================
CREATE TABLE `auth_sessions` (
    `id` TEXT PRIMARY KEY,
    `employee_id` TEXT NOT NULL,

    -- Session Info
    `token_hash` TEXT NOT NULL,           -- SHA256 of session token
    `refresh_token_hash` TEXT,
    `expires_at` INTEGER NOT NULL,
    `refresh_expires_at` INTEGER,

    -- Device Info
    `device_id` TEXT,
    `device_name` TEXT,
    `device_type` TEXT,                   -- 'web' | 'mobile' | 'tablet'
    `user_agent` TEXT,
    `ip_address` TEXT,

    -- Location
    `latitude` REAL,
    `longitude` REAL,
    `geohash` TEXT,

    -- Status
    `is_active` INTEGER DEFAULT 1,
    `revoked_at` INTEGER,
    `revoked_reason` TEXT,

    -- Audit
    `created_at` INTEGER NOT NULL,
    `last_activity_at` INTEGER,

    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`)
);

CREATE INDEX `idx_sessions_employee` ON `auth_sessions`(`employee_id`);
CREATE INDEX `idx_sessions_token` ON `auth_sessions`(`token_hash`);
CREATE INDEX `idx_sessions_expires` ON `auth_sessions`(`expires_at`);
```

### Auth Audit Log Table

```sql
-- ============================================================================
-- AUTH_AUDIT_LOG TABLE
-- ============================================================================
CREATE TABLE `auth_audit_log` (
    `id` TEXT PRIMARY KEY,
    `employee_id` TEXT,                   -- NULL for failed login attempts

    -- Event Info
    `event_type` TEXT NOT NULL,           -- See event types below
    `event_status` TEXT NOT NULL,         -- 'success' | 'failure'
    `event_details` TEXT,                 -- JSON with additional info

    -- Context
    `ip_address` TEXT,
    `user_agent` TEXT,
    `device_id` TEXT,
    `session_id` TEXT,

    -- Location
    `latitude` REAL,
    `longitude` REAL,
    `geohash` TEXT,

    -- Risk Assessment
    `risk_score` REAL,                    -- 0.0-1.0
    `risk_factors` TEXT,                  -- JSON array

    -- Timestamp
    `created_at` INTEGER NOT NULL
);

CREATE INDEX `idx_audit_employee` ON `auth_audit_log`(`employee_id`);
CREATE INDEX `idx_audit_event` ON `auth_audit_log`(`event_type`);
CREATE INDEX `idx_audit_created` ON `auth_audit_log`(`created_at`);

-- Event Types:
-- login_success, login_failure, logout
-- password_change, password_reset_request, password_reset_complete
-- pin_change, pin_failure, pin_locked
-- passkey_register, passkey_login, passkey_remove
-- mfa_enable, mfa_disable, mfa_verify_success, mfa_verify_failure
-- face_consent_given, face_consent_revoked, face_index, face_verify_success, face_verify_failure
-- session_create, session_revoke, session_expire
-- device_trust, device_untrust
-- permission_grant, permission_revoke
-- suspicious_activity, account_locked, account_unlocked
```

---

## RBAC Design

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ROLE HIERARCHY                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌──────────────┐                                 │
│                        │  SUPER_ADMIN │                                 │
│                        │  (Owner)     │                                 │
│                        └──────┬───────┘                                 │
│                               │                                          │
│              ┌────────────────┼────────────────┐                        │
│              ▼                ▼                ▼                        │
│       ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│       │  ADMIN   │     │  FINANCE │     │    HR    │                   │
│       │          │     │  MANAGER │     │  MANAGER │                   │
│       └────┬─────┘     └────┬─────┘     └────┬─────┘                   │
│            │                │                │                          │
│     ┌──────┴──────┐   ┌─────┴─────┐   ┌─────┴─────┐                   │
│     ▼             ▼   ▼           ▼   ▼           ▼                   │
│ ┌────────┐  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│ │ SALES  │  │INVENTORY│ │ACCOUNTS│ │ACCOUNTS│ │   HR   │              │
│ │MANAGER │  │ MANAGER │ │PAYABLE │ │RECEIVE │ │ STAFF  │              │
│ └───┬────┘  └───┬────┘ └────────┘ └────────┘ └────────┘              │
│     │           │                                                       │
│     ▼           ▼                                                       │
│ ┌────────┐  ┌────────┐                                                 │
│ │ SALES  │  │WAREHOUSE│                                                │
│ │ STAFF  │  │ STAFF  │                                                 │
│ └────────┘  └────────┘                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Roles Table

```sql
-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE `roles` (
    `id` TEXT PRIMARY KEY,
    `code` TEXT NOT NULL UNIQUE,          -- 'SUPER_ADMIN', 'SALES_MANAGER', etc.
    `name` TEXT NOT NULL,
    `description` TEXT,

    -- Hierarchy
    `parent_role_id` TEXT,                -- For role inheritance
    `level` INTEGER NOT NULL,             -- 0 = highest (super_admin)

    -- Constraints
    `max_users` INTEGER,                  -- Limit users per role (optional)
    `requires_mfa` INTEGER DEFAULT 0,
    `requires_face_verify` INTEGER DEFAULT 0,

    -- Status
    `is_system` INTEGER DEFAULT 0,        -- System roles can't be deleted
    `is_active` INTEGER DEFAULT 1,

    -- Audit
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,

    FOREIGN KEY (`parent_role_id`) REFERENCES `roles`(`id`)
);
```

### Permissions Table

```sql
-- ============================================================================
-- PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE `permissions` (
    `id` TEXT PRIMARY KEY,
    `code` TEXT NOT NULL UNIQUE,          -- 'customers.create', 'orders.approve', etc.
    `name` TEXT NOT NULL,
    `description` TEXT,

    -- Categorization
    `module` TEXT NOT NULL,               -- 'customers', 'orders', 'inventory', etc.
    `action` TEXT NOT NULL,               -- 'create', 'read', 'update', 'delete', 'approve'

    -- Risk Level (determines verification requirements)
    `risk_level` TEXT DEFAULT 'low',      -- 'low' | 'medium' | 'high' | 'critical'

    -- Audit
    `created_at` INTEGER NOT NULL
);

-- Permission Codes Pattern: {module}.{action}
-- Examples:
-- customers.create, customers.read, customers.update, customers.delete
-- customers.view_sensitive (view credit info, etc.)
-- orders.create, orders.approve, orders.cancel
-- inventory.adjust, inventory.transfer
-- reports.financial, reports.export
-- employees.manage, employees.view_salary
-- settings.system, settings.company
```

### Role Permissions Table

```sql
-- ============================================================================
-- ROLE_PERMISSIONS TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE `role_permissions` (
    `role_id` TEXT NOT NULL,
    `permission_id` TEXT NOT NULL,

    -- Constraints
    `conditions` TEXT,                    -- JSON: additional conditions
    -- e.g., {"max_amount": 10000000, "own_records_only": true}

    -- Audit
    `granted_at` INTEGER NOT NULL,
    `granted_by` TEXT,

    PRIMARY KEY (`role_id`, `permission_id`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`),
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`)
);
```

### Employee Roles Table

```sql
-- ============================================================================
-- EMPLOYEE_ROLES TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE `employee_roles` (
    `employee_id` TEXT NOT NULL,
    `role_id` TEXT NOT NULL,

    -- Scope (optional - for multi-branch/warehouse)
    `scope_type` TEXT,                    -- 'branch' | 'warehouse' | 'region' | null (global)
    `scope_id` TEXT,                      -- Branch/warehouse ID

    -- Validity
    `valid_from` INTEGER,
    `valid_until` INTEGER,                -- For temporary roles

    -- Audit
    `assigned_at` INTEGER NOT NULL,
    `assigned_by` TEXT,

    PRIMARY KEY (`employee_id`, `role_id`, `scope_type`, `scope_id`),
    FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
);
```

### Default Roles & Permissions

```sql
-- Default System Roles
INSERT INTO roles (id, code, name, level, is_system) VALUES
('role-super-admin', 'SUPER_ADMIN', 'Super Administrator', 0, 1),
('role-admin', 'ADMIN', 'Administrator', 1, 1),
('role-finance-mgr', 'FINANCE_MANAGER', 'Finance Manager', 2, 1),
('role-hr-mgr', 'HR_MANAGER', 'HR Manager', 2, 1),
('role-sales-mgr', 'SALES_MANAGER', 'Sales Manager', 3, 1),
('role-inventory-mgr', 'INVENTORY_MANAGER', 'Inventory Manager', 3, 1),
('role-sales', 'SALES_STAFF', 'Sales Staff', 4, 1),
('role-warehouse', 'WAREHOUSE_STAFF', 'Warehouse Staff', 4, 1),
('role-cashier', 'CASHIER', 'Cashier', 4, 1);

-- Permission Categories
-- customers: create, read, update, delete, view_sensitive, manage_credit
-- suppliers: create, read, update, delete, manage_payments
-- employees: create, read, update, delete, view_salary, manage
-- orders: create, read, update, cancel, approve, refund
-- inventory: read, adjust, transfer, count
-- products: create, read, update, delete, set_price
-- reports: view, export, financial
-- settings: company, system, users
```

---

## Implementation Phases

### Phase 1: Foundation (Current - COMPLETED)
- ✅ Employee table (data only, no auth)
- ✅ Basic CRUD operations
- ✅ No authentication required

### Phase 2: Basic Authentication
```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: BASIC AUTH                                                     │
│  ───────────────────                                                     │
│  Duration: 2-3 sprints                                                   │
│                                                                          │
│  Deliverables:                                                           │
│  □ employee_auth table                                                   │
│  □ auth_sessions table                                                   │
│  □ Passkey/WebAuthn registration & login                                │
│  □ PIN + device binding for mobile                                       │
│  □ Session management (JWT + refresh tokens)                            │
│  □ Basic audit logging                                                   │
│                                                                          │
│  Security:                                                               │
│  □ Rate limiting                                                         │
│  □ Account lockout                                                       │
│  □ Secure token storage                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: RBAC Implementation
```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: RBAC                                                           │
│  ────────────                                                            │
│  Duration: 2 sprints                                                     │
│                                                                          │
│  Deliverables:                                                           │
│  □ roles table                                                           │
│  □ permissions table                                                     │
│  □ role_permissions table                                                │
│  □ employee_roles table                                                  │
│  □ Permission checking middleware                                        │
│  □ Role management UI                                                    │
│  □ Permission inheritance                                                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 4: Enhanced Security (Optional)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: ENHANCED SECURITY                                              │
│  ─────────────────────────                                               │
│  Duration: 1-2 sprints                                                   │
│                                                                          │
│  Deliverables:                                                           │
│  □ MFA (TOTP) support                                                    │
│  □ Face verification (secondary, opt-in)                                │
│  □ SSO integration (Google Workspace)                                   │
│  □ Advanced audit logging                                                │
│  □ Suspicious activity detection                                         │
│  □ IP/Geo restrictions                                                   │
│                                                                          │
│  Face Verification:                                                      │
│  □ AWS Rekognition integration                                          │
│  □ Consent management                                                    │
│  □ Liveness detection                                                    │
│  □ Time & attendance integration                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Password Policy (If Used)

```typescript
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  maxAge: 90,           // days
  historyCount: 5,      // can't reuse last 5 passwords
  maxFailedAttempts: 5,
  lockoutDuration: 30   // minutes
};
```

### Session Security

```typescript
const SESSION_CONFIG = {
  accessTokenExpiry: 15 * 60,        // 15 minutes
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
  maxConcurrentSessions: 3,
  idleTimeout: 30 * 60,              // 30 minutes
  absoluteTimeout: 12 * 60 * 60,     // 12 hours
  rotateRefreshToken: true,
  bindToDevice: true,
  bindToIP: false                    // Too restrictive for mobile
};
```

### Face Verification Security

```typescript
const FACE_VERIFICATION_CONFIG = {
  minConfidence: 95,          // Minimum match confidence
  requireLiveness: true,      // Anti-spoofing
  maxVerifyAttempts: 3,       // Per action
  cooldownPeriod: 60,         // Seconds between attempts
  consentRequired: true,
  consentRenewalDays: 365,    // Re-consent annually
  photoRetentionDays: 30,     // Delete verification photos
  fallbackMethod: 'manager_approval'
};
```

### Risk-Based Authentication

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RISK-BASED AUTH TRIGGERS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  LOW RISK (Normal login)              HIGH RISK (Additional verify)     │
│  ──────────────────────               ─────────────────────────────     │
│  • Known device                       • New device                       │
│  • Normal location                    • Unusual location                 │
│  • Normal time                        • Unusual time (3 AM)              │
│  • Normal behavior                    • Multiple failed attempts         │
│                                       • VPN/Tor detected                 │
│  Action: Allow                        • High-value transaction           │
│                                                                          │
│                                       Action: Step-up auth              │
│                                       • MFA required                     │
│                                       • Face verify                      │
│                                       • Manager approval                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints (Planned)

### Authentication Endpoints

```
POST   /api/auth/register-passkey     # Register new passkey
POST   /api/auth/login-passkey        # Login with passkey
POST   /api/auth/login-pin            # Login with PIN (mobile)
POST   /api/auth/login-sso            # Initiate SSO login
GET    /api/auth/sso/callback         # SSO callback
POST   /api/auth/magic-link           # Request magic link
POST   /api/auth/verify-magic-link    # Verify magic link
POST   /api/auth/refresh              # Refresh access token
POST   /api/auth/logout               # Logout (revoke session)
POST   /api/auth/logout-all           # Logout all devices
```

### MFA Endpoints

```
POST   /api/auth/mfa/setup-totp       # Get TOTP secret & QR
POST   /api/auth/mfa/verify-totp      # Verify & enable TOTP
POST   /api/auth/mfa/disable          # Disable MFA
```

### Face Verification Endpoints

```
POST   /api/auth/face/consent         # Give consent for face verification
DELETE /api/auth/face/consent         # Revoke consent
POST   /api/auth/face/enroll          # Enroll face (with photo)
POST   /api/auth/face/verify          # Verify face for action
GET    /api/auth/face/status          # Get face enrollment status
```

### RBAC Endpoints

```
GET    /api/roles                     # List roles
POST   /api/roles                     # Create role
GET    /api/roles/:id                 # Get role details
PUT    /api/roles/:id                 # Update role
DELETE /api/roles/:id                 # Delete role
GET    /api/roles/:id/permissions     # Get role permissions
PUT    /api/roles/:id/permissions     # Update role permissions

GET    /api/permissions               # List all permissions
GET    /api/permissions/my            # Get my permissions

GET    /api/employees/:id/roles       # Get employee roles
PUT    /api/employees/:id/roles       # Assign roles to employee
```

---

## References

- [WebAuthn Guide](https://webauthn.guide/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [AWS Rekognition Face Liveness](https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html)
- [Indonesia PDP Law](https://www.kominfo.go.id/content/detail/43012/uu-pdp/0/uu_pdp)

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2024-01-20 | - | Initial planning document |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tech Lead | | | |
| Security | | | |
| Product Owner | | | |
