# Business Partner Business Rules Documentation

## Overview

This document describes all business rules implemented in the Business Partner Service. The service manages employees (with RBAC), suppliers, and customers following the Party Pattern.

---

## General Partner Rules

### Rule 1: Partner Code Uniqueness

**Rule**: Partner code must be unique within each partner type. Format: `{TYPE}-{SEQUENCE}`.

**Business Rationale**:
- Easy identification of partners
- Prevents confusion between different partner types
- Supports import/export operations

**Code Formats**:
- Employees: `EMP-001`, `EMP-002`, ...
- Suppliers: `SUP-001`, `SUP-002`, ...
- Customers: `CUS-001`, `CUS-002`, ...

**Implementation**:
```typescript
export class PartnerCode {
  constructor(
    public readonly type: PartnerType,
    public readonly sequence: number
  ) {}

  toString(): string {
    const prefix = {
      employee: 'EMP',
      supplier: 'SUP',
      customer: 'CUS'
    }[this.type];
    return `${prefix}-${this.sequence.toString().padStart(3, '0')}`;
  }

  static async generate(type: PartnerType, repository: IPartnerRepository): Promise<PartnerCode> {
    const lastCode = await repository.getLastCodeByType(type);
    const nextSequence = lastCode ? lastCode.sequence + 1 : 1;
    return new PartnerCode(type, nextSequence);
  }
}
```

**Error Message**: "Partner code {code} already exists"

---

### Rule 2: Partner Status Transitions

**Rule**: Partner status must follow valid transition paths.

**Valid Transitions**:
```
pending → active        # After verification/approval
active → inactive       # Temporary deactivation
active → blocked        # Due to policy violation
inactive → active       # Reactivation
blocked → active        # After review/resolution
any → deleted           # Soft delete (admin only)
```

**Implementation**:
```typescript
const VALID_TRANSITIONS: Record<PartnerStatus, PartnerStatus[]> = {
  pending: ['active', 'deleted'],
  active: ['inactive', 'blocked', 'deleted'],
  inactive: ['active', 'deleted'],
  blocked: ['active', 'deleted'],
  deleted: [], // Terminal state
};

public changeStatus(newStatus: PartnerStatus, reason?: string): void {
  if (!VALID_TRANSITIONS[this.status].includes(newStatus)) {
    throw new Error(`Cannot transition from ${this.status} to ${newStatus}`);
  }
  this.status = newStatus;
  this.addDomainEvent(new PartnerStatusChanged(this.id, this.status, newStatus, reason));
}
```

**Error Message**: "Cannot transition from {current} to {new}"

---

### Rule 3: Email Uniqueness Per Partner Type

**Rule**: Email must be unique within each partner type (employees, customers).

**Business Rationale**:
- Prevents duplicate accounts
- Email used for authentication
- Same person can be both employee and customer

**Implementation**:
```typescript
public async validateEmail(email: string, partnerType: PartnerType): Promise<void> {
  const existing = await this.repository.findByEmailAndType(email, partnerType);
  if (existing) {
    throw new Error(`Email ${email} is already registered as ${partnerType}`);
  }
}
```

**Note**: Suppliers don't require unique email (multiple contacts may share email).

**Error Message**: "Email is already registered"

---

### Rule 4: Tax ID Validation (NPWP)

**Rule**: If provided, Tax ID (NPWP) must be in valid Indonesian format.

**Business Rationale**:
- Required for B2B transactions
- Tax compliance
- Invoice generation

**Format**: 15 digits: `XX.XXX.XXX.X-XXX.XXX`

**Implementation**:
```typescript
export class TaxId {
  constructor(public readonly value: string) {
    const cleaned = value.replace(/[.\-]/g, '');
    if (!/^\d{15}$/.test(cleaned)) {
      throw new Error('Invalid NPWP format. Must be 15 digits.');
    }
    this.value = this.format(cleaned);
  }

  private format(digits: string): string {
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}.${digits.slice(8,9)}-${digits.slice(9,12)}.${digits.slice(12,15)}`;
  }
}
```

**Error Message**: "Invalid NPWP format. Must be 15 digits."

---

### Rule 5: Address Requirements

**Rule**: Every partner must have at least one primary address.

**Business Rationale**:
- Required for shipping/billing
- Legal requirements
- Communication

**Implementation**:
```typescript
public addAddress(address: Address): void {
  if (this.addresses.length === 0) {
    address.isPrimary = true; // First address is always primary
  }
  this.addresses.push(address);
}

public removeAddress(addressId: string): void {
  const address = this.addresses.find(a => a.id === addressId);
  if (address?.isPrimary && this.addresses.length > 1) {
    throw new Error('Cannot remove primary address. Set another address as primary first.');
  }
  this.addresses = this.addresses.filter(a => a.id !== addressId);
}
```

**Error Message**: "Cannot remove primary address. Set another address as primary first."

---

## Employee Rules

### Rule 6: Employee Number Uniqueness

**Rule**: Employee number must be globally unique.

**Business Rationale**:
- Internal HR identification
- Payroll integration
- Audit trail

**Implementation**:
```typescript
const existing = await this.repository.findByEmployeeNumber(employeeNumber);
if (existing) {
  throw new Error(`Employee number ${employeeNumber} already exists`);
}
```

**Error Message**: "Employee number already exists"

---

### Rule 7: Password Requirements

**Rule**: Employee password must meet security requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Business Rationale**:
- Security best practice
- Prevents weak passwords
- Compliance requirements

**Implementation**:
```typescript
export class Password {
  static validate(password: string): void {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new Error(errors.join('. '));
    }
  }
}
```

**Error Messages**: Specific validation failures listed

---

### Rule 8: Account Lockout

**Rule**: Employee account is locked after 5 failed login attempts. Lockout duration: 30 minutes.

**Business Rationale**:
- Prevents brute force attacks
- Security best practice
- Automatic recovery

**Implementation**:
```typescript
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

public recordFailedLogin(): void {
  this.failedLoginAttempts += 1;

  if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
    this.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    this.addDomainEvent(new AccountLocked(this.id, this.lockedUntil));
  }
}

public isLocked(): boolean {
  if (!this.lockedUntil) return false;
  if (new Date() > this.lockedUntil) {
    this.lockedUntil = null;
    this.failedLoginAttempts = 0;
    return false;
  }
  return true;
}

public recordSuccessfulLogin(): void {
  this.failedLoginAttempts = 0;
  this.lockedUntil = null;
  this.lastLoginAt = new Date();
}
```

**Error Message**: "Account is locked. Try again in {minutes} minutes."

---

### Rule 9: Email Verification Required for Login

**Rule**: Employees must verify their email before accessing the system.

**Business Rationale**:
- Confirms email ownership
- Prevents typos in email
- Security requirement

**Implementation**:
```typescript
public canLogin(): boolean {
  if (!this.auth.isEmailVerified) {
    throw new Error('Please verify your email before logging in');
  }
  if (this.isLocked()) {
    throw new Error('Account is locked');
  }
  if (this.employmentStatus === 'terminated') {
    throw new Error('Account has been terminated');
  }
  return true;
}
```

**Error Message**: "Please verify your email before logging in"

---

### Rule 10: Terminated Employees Cannot Login

**Rule**: Employees with `employmentStatus: 'terminated'` cannot access the system.

**Business Rationale**:
- Security after offboarding
- Prevents unauthorized access
- Compliance

**Implementation**:
```typescript
public terminate(terminationDate: Date, reason?: string): void {
  this.employmentStatus = 'terminated';
  this.terminationDate = terminationDate;

  // Revoke all refresh tokens
  this.refreshTokens = [];

  this.addDomainEvent(new EmployeeTerminated(this.id, terminationDate, reason));
}
```

**Error Message**: "Account has been terminated"

---

### Rule 11: Manager Hierarchy Validation

**Rule**: Manager must be an active employee. Cannot create circular reporting.

**Business Rationale**:
- Organizational integrity
- Valid reporting structure
- Prevents infinite loops

**Implementation**:
```typescript
public setManager(managerId: string): void {
  if (managerId === this.id) {
    throw new Error('Employee cannot be their own manager');
  }

  // Check for circular reference
  const visited = new Set<string>();
  let currentId = managerId;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error('Circular reporting relationship detected');
    }
    visited.add(currentId);
    const manager = await this.repository.findById(currentId);
    currentId = manager?.managerId;
  }

  this.managerId = managerId;
}
```

**Error Messages**:
- "Employee cannot be their own manager"
- "Circular reporting relationship detected"

---

## RBAC Rules

### Rule 12: At Least One Admin Required

**Rule**: System must always have at least one active employee with admin role.

**Business Rationale**:
- Prevents lockout
- Ensures system administration capability
- Recovery path

**Implementation**:
```typescript
public async revokeRole(employeeId: string, roleId: string): Promise<void> {
  const role = await this.roleRepository.findById(roleId);

  if (role.name === 'admin') {
    const adminCount = await this.countEmployeesWithRole('admin');
    if (adminCount <= 1) {
      throw new Error('Cannot revoke last admin role. At least one admin must exist.');
    }
  }

  // Proceed with revocation
}
```

**Error Message**: "Cannot revoke last admin role. At least one admin must exist."

---

### Rule 13: System Roles Cannot Be Deleted

**Rule**: Roles marked as `isSystemRole: true` cannot be deleted.

**Business Rationale**:
- Protects essential roles (admin, etc.)
- Prevents accidental deletion
- System integrity

**System Roles**:
- `admin` - Full system access
- `user` - Basic read access (default)

**Implementation**:
```typescript
public deleteRole(roleId: string): void {
  const role = this.roles.find(r => r.id === roleId);

  if (role.isSystemRole) {
    throw new Error('System roles cannot be deleted');
  }

  // Check if any employees have this role
  const assignedCount = await this.countEmployeesWithRole(role.name);
  if (assignedCount > 0) {
    throw new Error(`Cannot delete role. ${assignedCount} employees have this role assigned.`);
  }

  this.roles = this.roles.filter(r => r.id !== roleId);
}
```

**Error Messages**:
- "System roles cannot be deleted"
- "Cannot delete role. {count} employees have this role assigned."

---

### Rule 14: Permission Inheritance

**Rule**: Employee permissions are the union of all assigned role permissions.

**Business Rationale**:
- Flexible role assignment
- Additive permissions
- No permission conflicts

**Implementation**:
```typescript
public getEffectivePermissions(): Permission[] {
  const permissionSet = new Set<string>();
  const permissions: Permission[] = [];

  for (const role of this.roles) {
    for (const permission of role.permissions) {
      const key = `${permission.module}:${permission.action}`;
      if (!permissionSet.has(key)) {
        permissionSet.add(key);
        permissions.push(permission);
      }
    }
  }

  return permissions;
}

public hasPermission(module: Module, action: Action): boolean {
  return this.getEffectivePermissions().some(
    p => p.module === module && p.action === action
  );
}
```

---

### Rule 15: Admin Bypasses Permission Checks

**Rule**: Employees with admin role have all permissions by default.

**Business Rationale**:
- Super user capability
- System maintenance
- Emergency access

**Implementation**:
```typescript
public hasPermission(module: Module, action: Action): boolean {
  // Admin has all permissions
  if (this.roles.some(r => r.name === 'admin')) {
    return true;
  }

  return this.getEffectivePermissions().some(
    p => p.module === module && p.action === action
  );
}
```

---

## Supplier Rules

### Rule 16: Payment Terms Validation

**Rule**: Payment terms must be one of predefined values.

**Valid Values**:
- `COD` - Cash on Delivery
- `CBD` - Cash Before Delivery
- `NET7` - Net 7 days
- `NET15` - Net 15 days
- `NET30` - Net 30 days
- `NET45` - Net 45 days
- `NET60` - Net 60 days

**Implementation**:
```typescript
const VALID_PAYMENT_TERMS = ['COD', 'CBD', 'NET7', 'NET15', 'NET30', 'NET45', 'NET60'];

public setPaymentTerms(terms: string): void {
  if (!VALID_PAYMENT_TERMS.includes(terms)) {
    throw new Error(`Invalid payment terms. Must be one of: ${VALID_PAYMENT_TERMS.join(', ')}`);
  }
  this.paymentTerms = terms;
  this.paymentTermDays = this.calculateDays(terms);
}

private calculateDays(terms: string): number {
  if (terms === 'COD' || terms === 'CBD') return 0;
  return parseInt(terms.replace('NET', ''));
}
```

**Error Message**: "Invalid payment terms. Must be one of: COD, CBD, NET7, NET15, NET30, NET45, NET60"

---

### Rule 17: Bank Account Required for Credit Terms

**Rule**: Suppliers with credit terms (NET) must have bank account information.

**Business Rationale**:
- Required for payment processing
- Financial compliance
- Audit trail

**Implementation**:
```typescript
public validateForPayment(): void {
  if (this.paymentTermDays > 0) { // Credit terms
    if (!this.bankName || !this.bankAccountNumber || !this.bankAccountName) {
      throw new Error('Bank account information required for credit payment terms');
    }
  }
}
```

**Error Message**: "Bank account information required for credit payment terms"

---

### Rule 18: Supplier Rating Validation

**Rule**: Supplier rating must be between 1 and 5.

**Business Rationale**:
- Standardized evaluation
- Supplier performance tracking
- Procurement decisions

**Implementation**:
```typescript
public setRating(rating: number): void {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }
  this.rating = Math.round(rating * 10) / 10; // One decimal place
}
```

**Error Message**: "Rating must be between 1 and 5"

---

### Rule 19: Contract Date Validation

**Rule**: Contract end date must be after start date.

**Business Rationale**:
- Logical date range
- Contract management
- Renewal tracking

**Implementation**:
```typescript
public setContractDates(startDate: Date, endDate: Date): void {
  if (endDate <= startDate) {
    throw new Error('Contract end date must be after start date');
  }
  this.contractStartDate = startDate;
  this.contractEndDate = endDate;
}
```

**Error Message**: "Contract end date must be after start date"

---

## Customer Rules

### Rule 20: Customer Type Immutability

**Rule**: Customer type (retail/wholesale) cannot be changed after creation.

**Business Rationale**:
- Different pricing structures
- Different terms and conditions
- Order history consistency
- Create new customer if type needs to change

**Implementation**:
```typescript
public updateCustomerType(newType: CustomerType): void {
  throw new Error('Customer type cannot be changed. Create a new customer record if needed.');
}
```

**Error Message**: "Customer type cannot be changed. Create a new customer record if needed."

---

### Rule 21: Wholesale Customer Requirements

**Rule**: Wholesale customers must have:
- Company name
- Tax ID (NPWP)
- Billing address

**Business Rationale**:
- B2B compliance
- Tax invoicing
- Credit assessment

**Implementation**:
```typescript
public validateWholesaleCustomer(): void {
  const errors: string[] = [];

  if (!this.companyName) {
    errors.push('Company name is required for wholesale customers');
  }
  if (!this.taxId) {
    errors.push('Tax ID (NPWP) is required for wholesale customers');
  }
  if (!this.addresses.some(a => a.addressType === 'billing')) {
    errors.push('Billing address is required for wholesale customers');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('. '));
  }
}
```

**Error Messages**: Specific validation failures

---

### Rule 22: Credit Limit for Wholesale Only

**Rule**: Credit limit can only be set for wholesale customers.

**Business Rationale**:
- Retail customers pay immediately
- Credit is a B2B feature
- Risk management

**Implementation**:
```typescript
public setCreditLimit(limit: number): void {
  if (this.customerType !== 'wholesale') {
    throw new Error('Credit limit can only be set for wholesale customers');
  }
  if (limit < 0) {
    throw new Error('Credit limit cannot be negative');
  }
  this.creditLimit = limit;
  this.addDomainEvent(new CreditLimitChanged(this.id, this.creditLimit, limit));
}
```

**Error Message**: "Credit limit can only be set for wholesale customers"

---

### Rule 23: Order Blocked When Over Credit Limit

**Rule**: Wholesale customers cannot place orders if current balance exceeds credit limit.

**Business Rationale**:
- Credit risk management
- Accounts receivable control
- Financial policy enforcement

**Implementation**:
```typescript
public canPlaceOrder(orderTotal: number): boolean {
  if (this.customerType !== 'wholesale') {
    return true; // Retail always allowed (pay immediately)
  }

  if (this.status === 'blocked') {
    throw new Error('Customer account is blocked');
  }

  const projectedBalance = this.currentBalance + orderTotal;

  if (this.creditLimit && projectedBalance > this.creditLimit) {
    throw new Error(
      `Order would exceed credit limit. Current balance: ${this.currentBalance}, ` +
      `Order total: ${orderTotal}, Credit limit: ${this.creditLimit}`
    );
  }

  return true;
}
```

**Error Message**: "Order would exceed credit limit"

---

### Rule 24: Customer Tier Calculation

**Rule**: Customer tier is automatically calculated based on total spent.

**Tier Thresholds**:
- Bronze: < Rp 1,000,000
- Silver: Rp 1,000,000 - Rp 10,000,000
- Gold: Rp 10,000,000 - Rp 50,000,000
- Platinum: > Rp 50,000,000

**Implementation**:
```typescript
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1_000_000,
  gold: 10_000_000,
  platinum: 50_000_000,
};

public recalculateTier(): void {
  const oldTier = this.customerTier;
  let newTier: CustomerTier = 'bronze';

  if (this.totalSpent >= TIER_THRESHOLDS.platinum) {
    newTier = 'platinum';
  } else if (this.totalSpent >= TIER_THRESHOLDS.gold) {
    newTier = 'gold';
  } else if (this.totalSpent >= TIER_THRESHOLDS.silver) {
    newTier = 'silver';
  }

  if (newTier !== oldTier) {
    this.customerTier = newTier;
    this.addDomainEvent(new CustomerTierChanged(this.id, oldTier, newTier));
  }
}
```

---

### Rule 25: Loyalty Points (Retail Only)

**Rule**: Loyalty points are only applicable to retail customers. Points earned: 1 point per Rp 10,000 spent.

**Business Rationale**:
- B2C loyalty program
- Customer retention
- Wholesale has different incentives (volume discounts)

**Implementation**:
```typescript
const POINTS_PER_RUPIAH = 10_000;

public earnLoyaltyPoints(orderTotal: number): void {
  if (this.customerType !== 'retail') {
    return; // Wholesale doesn't earn points
  }

  const pointsEarned = Math.floor(orderTotal / POINTS_PER_RUPIAH);
  this.loyaltyPoints += pointsEarned;

  this.addDomainEvent(new LoyaltyPointsEarned(this.id, pointsEarned, this.loyaltyPoints));
}

public redeemLoyaltyPoints(points: number): number {
  if (this.customerType !== 'retail') {
    throw new Error('Loyalty points only available for retail customers');
  }

  if (points > this.loyaltyPoints) {
    throw new Error(`Insufficient points. Available: ${this.loyaltyPoints}`);
  }

  this.loyaltyPoints -= points;

  // 1 point = Rp 100 discount
  const discountAmount = points * 100;

  this.addDomainEvent(new LoyaltyPointsRedeemed(this.id, points, discountAmount));

  return discountAmount;
}
```

**Error Message**: "Insufficient points. Available: {points}"

---

## Validation Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend Validation (First Line of Defense)              │
│    - Email format                                           │
│    - Required fields                                        │
│    - Password strength indicator                            │
│    - NPWP format                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. API Layer Validation (Second Line)                       │
│    - Input schema validation (Zod)                          │
│    - Type checking                                          │
│    - Basic format validation                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Domain Layer Validation (Final Authority)                │
│    - Business rules                                         │
│    - Uniqueness checks                                      │
│    - Cross-entity validation                                │
│    - THIS IS THE SOURCE OF TRUTH                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Common Scenarios

### Scenario 1: Employee Onboarding

```typescript
// Step 1: HR creates employee
POST /api/employees
{
  "name": "John Doe",
  "email": "john.doe@kidkazz.com",
  "department": "Sales",
  "position": "Sales Representative",
  "employmentType": "full_time"
}

// Step 2: System generates code (EMP-042) and sends verification email

// Step 3: Employee verifies email

// Step 4: Admin assigns roles
POST /api/employees/emp-042/roles
{
  "roleId": "role-sales-staff"
}

// Step 5: Employee can now login with assigned permissions
```

### Scenario 2: Wholesale Customer Credit Check

```typescript
// Customer places order
const customer = await customerService.findById(customerId);

// Check credit
try {
  customer.canPlaceOrder(orderTotal); // Throws if over limit
} catch (error) {
  return { error: error.message, requiresApproval: true };
}

// Proceed with order
await orderService.createOrder({ customerId, items });

// Update customer balance
customer.updateBalance(orderTotal);
await customerService.save(customer);
```

### Scenario 3: Supplier Performance Update

```typescript
// After receiving delivery
const supplier = await supplierService.findById(supplierId);

// Update statistics
supplier.totalOrders += 1;

// Calculate on-time rate
const wasOnTime = deliveryDate <= expectedDate;
const totalOnTime = supplier.onTimeDeliveryRate * (supplier.totalOrders - 1);
supplier.onTimeDeliveryRate = (totalOnTime + (wasOnTime ? 1 : 0)) / supplier.totalOrders;

await supplierService.save(supplier);
```

---

## Troubleshooting

### "Account is locked"

**Cause**: 5+ failed login attempts.

**Solution**:
- Wait 30 minutes for automatic unlock, OR
- Admin can manually unlock: `PATCH /api/employees/:id/unlock`

### "Cannot revoke last admin role"

**Cause**: Trying to remove admin role from the only admin.

**Solution**:
- Assign admin role to another employee first
- Then revoke from the original

### "Order would exceed credit limit"

**Cause**: Wholesale customer's balance + order would exceed credit.

**Solution**:
- Process payment to reduce balance
- Request credit limit increase from admin
- Split order into smaller amounts

### "Customer type cannot be changed"

**Cause**: Trying to convert retail to wholesale or vice versa.

**Solution**:
- Create a new customer record with correct type
- Link orders/history if needed via notes/custom fields

---

## Rule Testing

### Unit Tests

```typescript
describe('Employee', () => {
  it('should lock account after 5 failed attempts', () => {
    const employee = Employee.create({...});

    for (let i = 0; i < 5; i++) {
      employee.recordFailedLogin();
    }

    expect(employee.isLocked()).toBe(true);
    expect(() => employee.canLogin()).toThrow('Account is locked');
  });
});

describe('Customer', () => {
  it('should block order when over credit limit', () => {
    const customer = Customer.create({
      customerType: 'wholesale',
      creditLimit: 10_000_000,
      currentBalance: 8_000_000,
    });

    expect(() => customer.canPlaceOrder(3_000_000)).toThrow('exceed credit limit');
  });

  it('should calculate tier based on total spent', () => {
    const customer = Customer.create({ totalSpent: 15_000_000 });
    customer.recalculateTier();

    expect(customer.customerTier).toBe('gold');
  });
});
```

---

## Rule Change Process

1. **Document** the rule in this file
2. **Implement** in domain layer (entity/value object)
3. **Add** validation to use cases
4. **Update** frontend validation
5. **Write** tests for the rule
6. **Update** API documentation
7. **Notify** stakeholders of changes

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**Review Cycle**: Quarterly or when new rules are added
**Related Docs**:
- [Business Partner Service Architecture](./BUSINESS_PARTNER_SERVICE_ARCHITECTURE.md)
- [RBAC Implementation Plan](../../integration/RBAC_IMPLEMENTATION_PLAN.md)
