import { AggregateRoot } from '@kidkazz/ddd-core';
import { PartnerCode } from '../value-objects/PartnerCode';

export type SupplierStatus = 'active' | 'inactive' | 'blocked';

interface SupplierProps {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  npwp: string | null;
  paymentTermDays: number;
  leadTimeDays: number;
  minimumOrderAmount: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  rating: number | null;
  totalOrders: number;
  totalPurchased: number;
  lastOrderDate: Date | null;
  status: SupplierStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

/**
 * Supplier Aggregate Root
 * Represents vendors who supply products/services
 */
export class Supplier extends AggregateRoot {
  private props: SupplierProps;

  private constructor(props: SupplierProps) {
    super(props.id);
    this.props = props;
  }

  private static validate(input: {
    name: string;
    paymentTermDays?: number;
    leadTimeDays?: number;
    minimumOrderAmount?: number;
  }): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Supplier name is required');
    }
    if (input.paymentTermDays !== undefined && input.paymentTermDays < 0) {
      throw new Error('Payment term days cannot be negative');
    }
    if (input.leadTimeDays !== undefined && input.leadTimeDays < 0) {
      throw new Error('Lead time days cannot be negative');
    }
    if (input.minimumOrderAmount !== undefined && input.minimumOrderAmount < 0) {
      throw new Error('Minimum order amount cannot be negative');
    }
  }

  public static create(input: {
    name: string;
    email?: string;
    phone?: string;
    companyName?: string;
    npwp?: string;
    paymentTermDays?: number;
    leadTimeDays?: number;
    minimumOrderAmount?: number;
  }): Supplier {
    Supplier.validate(input);

    const now = new Date();
    const id = `sup-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const code = PartnerCode.create('supplier').getValue();

    return new Supplier({
      id,
      code,
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      companyName: input.companyName || null,
      npwp: input.npwp || null,
      paymentTermDays: input.paymentTermDays ?? 30,
      leadTimeDays: input.leadTimeDays ?? 7,
      minimumOrderAmount: input.minimumOrderAmount ?? 0,
      bankName: null,
      bankAccountNumber: null,
      bankAccountName: null,
      rating: null,
      totalOrders: 0,
      totalPurchased: 0,
      lastOrderDate: null,
      status: 'active',
      notes: null,
      createdAt: now,
      updatedAt: now,
      createdBy: null,
      updatedBy: null,
    });
  }

  public static reconstitute(data: SupplierProps): Supplier {
    return new Supplier(data);
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

  public getCompanyName(): string | null {
    return this.props.companyName;
  }

  public getNpwp(): string | null {
    return this.props.npwp;
  }

  public getPaymentTermDays(): number {
    return this.props.paymentTermDays;
  }

  public getLeadTimeDays(): number {
    return this.props.leadTimeDays;
  }

  public getMinimumOrderAmount(): number {
    return this.props.minimumOrderAmount;
  }

  public getBankName(): string | null {
    return this.props.bankName;
  }

  public getBankAccountNumber(): string | null {
    return this.props.bankAccountNumber;
  }

  public getBankAccountName(): string | null {
    return this.props.bankAccountName;
  }

  public getRating(): number | null {
    return this.props.rating;
  }

  public getTotalOrders(): number {
    return this.props.totalOrders;
  }

  public getTotalPurchased(): number {
    return this.props.totalPurchased;
  }

  public getStatus(): SupplierStatus {
    return this.props.status;
  }

  // Bank Information
  public setBankInfo(input: {
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
  }): void {
    if (input.bankAccountNumber.length < 10) {
      throw new Error('Bank account number must be at least 10 characters');
    }
    this.props.bankName = input.bankName;
    this.props.bankAccountNumber = input.bankAccountNumber;
    this.props.bankAccountName = input.bankAccountName;
    this.props.updatedAt = new Date();
  }

  // Rating
  public updateRating(rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    this.props.rating = rating;
    this.props.updatedAt = new Date();
  }

  // Order Statistics
  public recordPurchaseOrder(amount: number): void {
    if (amount <= 0) {
      throw new RangeError('Purchase order amount must be positive');
    }
    this.props.totalOrders += 1;
    this.props.totalPurchased += amount;
    this.props.lastOrderDate = new Date();
    this.props.updatedAt = new Date();
  }

  public meetsMinimumOrder(amount: number): boolean {
    return amount >= this.props.minimumOrderAmount;
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

  // Update
  public update(input: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
    npwp?: string;
    paymentTermDays?: number;
    leadTimeDays?: number;
    minimumOrderAmount?: number;
    notes?: string;
  }): void {
    // Validate inputs
    if (input.name !== undefined && (!input.name || input.name.trim().length === 0)) {
      throw new Error('Supplier name is required');
    }
    if (input.paymentTermDays !== undefined && input.paymentTermDays < 0) {
      throw new Error('Payment term days cannot be negative');
    }
    if (input.leadTimeDays !== undefined && input.leadTimeDays < 0) {
      throw new Error('Lead time days cannot be negative');
    }
    if (input.minimumOrderAmount !== undefined && input.minimumOrderAmount < 0) {
      throw new Error('Minimum order amount cannot be negative');
    }

    if (input.name !== undefined) this.props.name = input.name;
    if (input.email !== undefined) this.props.email = input.email || null;
    if (input.phone !== undefined) this.props.phone = input.phone || null;
    if (input.companyName !== undefined) this.props.companyName = input.companyName || null;
    if (input.npwp !== undefined) this.props.npwp = input.npwp || null;
    if (input.paymentTermDays !== undefined) this.props.paymentTermDays = input.paymentTermDays;
    if (input.leadTimeDays !== undefined) this.props.leadTimeDays = input.leadTimeDays;
    if (input.minimumOrderAmount !== undefined)
      this.props.minimumOrderAmount = input.minimumOrderAmount;
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
      companyName: this.props.companyName,
      npwp: this.props.npwp,
      paymentTermDays: this.props.paymentTermDays,
      leadTimeDays: this.props.leadTimeDays,
      minimumOrderAmount: this.props.minimumOrderAmount,
      bankName: this.props.bankName,
      bankAccountNumber: this.props.bankAccountNumber,
      bankAccountName: this.props.bankAccountName,
      rating: this.props.rating,
      totalOrders: this.props.totalOrders,
      totalPurchased: this.props.totalPurchased,
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
