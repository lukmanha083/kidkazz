import { AggregateRoot } from '@kidkazz/ddd-core';
import { PartnerCode } from '../value-objects/PartnerCode';

export type CustomerType = 'retail' | 'wholesale';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';
export type MembershipTier = 'bronze' | 'silver' | 'gold';

interface CustomerProps {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  customerType: CustomerType;
  companyName: string | null;
  npwp: string | null;
  creditLimit: number;
  creditUsed: number;
  paymentTermDays: number;
  loyaltyPoints: number;
  membershipTier: MembershipTier | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: Date | null;
  status: CustomerStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Customer Aggregate Root
 * Represents both retail (B2C) and wholesale (B2B) customers
 */
export class Customer extends AggregateRoot {
  private props: CustomerProps;

  private constructor(props: CustomerProps) {
    super(props.id);
    this.props = props;
  }

  private static validate(input: {
    name: string;
    customerType: CustomerType;
  }): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    if (!['retail', 'wholesale'].includes(input.customerType)) {
      throw new Error('Customer type must be either retail or wholesale');
    }
  }

  public static create(input: {
    name: string;
    email?: string;
    phone?: string;
    customerType: CustomerType;
    companyName?: string;
    npwp?: string;
    creditLimit?: number;
    paymentTermDays?: number;
  }): Customer {
    Customer.validate({
      name: input.name,
      customerType: input.customerType,
    });

    const now = new Date();
    const id = `cust-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const code = PartnerCode.create('customer').getValue();

    return new Customer({
      id,
      code,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      customerType: input.customerType,
      companyName: input.companyName || null,
      npwp: input.npwp || null,
      creditLimit: input.customerType === 'wholesale' ? input.creditLimit || 0 : 0,
      creditUsed: 0,
      paymentTermDays: input.customerType === 'wholesale' ? input.paymentTermDays || 30 : 0,
      loyaltyPoints: 0,
      membershipTier: input.customerType === 'retail' ? 'bronze' : null,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null,
      status: 'active',
      notes: null,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    });
  }

  public static reconstitute(data: CustomerProps): Customer {
    return new Customer(data);
  }

  // Getters
  public getCode(): string {
    return this.props.code;
  }

  public getName(): string {
    return this.props.name;
  }

  public getEmail(): string | null {
    return this.props.email;
  }

  public getPhone(): string | null {
    return this.props.phone;
  }

  public getCustomerType(): CustomerType {
    return this.props.customerType;
  }

  public getCompanyName(): string | null {
    return this.props.companyName;
  }

  public getNpwp(): string | null {
    return this.props.npwp;
  }

  public getCreditLimit(): number {
    return this.props.creditLimit;
  }

  public getCreditUsed(): number {
    return this.props.creditUsed;
  }

  public getAvailableCredit(): number {
    return this.props.creditLimit - this.props.creditUsed;
  }

  public getPaymentTermDays(): number {
    return this.props.paymentTermDays;
  }

  public getLoyaltyPoints(): number {
    return this.props.loyaltyPoints;
  }

  public getMembershipTier(): MembershipTier | null {
    return this.props.membershipTier;
  }

  public getTotalOrders(): number {
    return this.props.totalOrders;
  }

  public getTotalSpent(): number {
    return this.props.totalSpent;
  }

  public getStatus(): CustomerStatus {
    return this.props.status;
  }

  // Credit Management (Wholesale)
  public hasAvailableCredit(amount: number): boolean {
    if (this.props.customerType !== 'wholesale') {
      return true;
    }
    return this.getAvailableCredit() >= amount;
  }

  public useCreditAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive for useCreditAmount');
    }
    if (this.props.customerType !== 'wholesale') {
      throw new Error('Credit management only applies to wholesale customers');
    }
    if (!this.hasAvailableCredit(amount)) {
      throw new Error('Exceeds available credit limit');
    }
    this.props.creditUsed += amount;
    this.props.updatedAt = new Date();
  }

  public releaseCreditAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive for releaseCreditAmount');
    }
    if (this.props.customerType !== 'wholesale') {
      throw new Error('Credit management only applies to wholesale customers');
    }
    this.props.creditUsed = Math.max(0, this.props.creditUsed - amount);
    this.props.updatedAt = new Date();
  }

  // Loyalty Points (Retail)
  public addLoyaltyPoints(points: number): void {
    if (this.props.customerType !== 'retail') {
      throw new Error('Loyalty points only apply to retail customers');
    }
    if (!Number.isFinite(points) || points <= 0) {
      throw new RangeError('Points must be a positive number');
    }
    this.props.loyaltyPoints += points;
    this.updateMembershipTier();
    this.props.updatedAt = new Date();
  }

  private updateMembershipTier(): void {
    if (this.props.customerType !== 'retail') return;

    const points = this.props.loyaltyPoints;
    if (points >= 1000) {
      this.props.membershipTier = 'gold';
    } else if (points >= 500) {
      this.props.membershipTier = 'silver';
    } else {
      this.props.membershipTier = 'bronze';
    }
  }

  // Status Management
  public block(): void {
    this.props.status = 'blocked';
    this.props.updatedAt = new Date();
  }

  public deactivate(): void {
    this.props.status = 'inactive';
    this.props.updatedAt = new Date();
  }

  public activate(): void {
    this.props.status = 'active';
    this.props.updatedAt = new Date();
  }

  // Order Statistics
  public recordOrder(amount: number): void {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError('Order amount must be a non-negative number');
    }
    this.props.totalOrders += 1;
    this.props.totalSpent += amount;
    this.props.lastOrderDate = new Date();
    this.props.updatedAt = new Date();
  }

  // Update
  public update(input: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    npwp?: string;
    notes?: string;
  }): void {
    if (input.name !== undefined) {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error('Customer name is required');
      }
      this.props.name = input.name;
    }
    if (input.email !== undefined) this.props.email = input.email || null;
    if (input.phone !== undefined) this.props.phone = input.phone || null;
    if (input.companyName !== undefined) this.props.companyName = input.companyName || null;
    if (input.npwp !== undefined) this.props.npwp = input.npwp || null;
    if (input.notes !== undefined) this.props.notes = input.notes || null;
    this.props.updatedAt = new Date();
  }

  public toData() {
    return {
      id: this.props.id,
      code: this.props.code,
      name: this.props.name,
      email: this.props.email,
      phone: this.props.phone,
      customerType: this.props.customerType,
      companyName: this.props.companyName,
      npwp: this.props.npwp,
      creditLimit: this.props.creditLimit,
      creditUsed: this.props.creditUsed,
      paymentTermDays: this.props.paymentTermDays,
      loyaltyPoints: this.props.loyaltyPoints,
      membershipTier: this.props.membershipTier,
      totalOrders: this.props.totalOrders,
      totalSpent: this.props.totalSpent,
      lastOrderDate: this.props.lastOrderDate,
      status: this.props.status,
      notes: this.props.notes,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      createdBy: this.props.createdBy,
      updatedBy: this.props.updatedBy,
    };
  }
}
