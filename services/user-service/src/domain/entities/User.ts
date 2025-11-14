import { UserId, Email, Result, ResultFactory, InvalidOperationError } from '@kidkazz/types';
import { UserRegistered, UserStatusChanged } from '@kidkazz/domain-events';
import { generateId, generateTimestamp } from '@kidkazz/utils';

export type UserType = 'retail' | 'wholesale' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * User Entity (Domain Model)
 * Represents a user account in the system
 */
export class User {
  private domainEvents: any[] = [];

  private constructor(
    private readonly id: UserId,
    private email: Email,
    private readonly passwordHash: string,
    private fullName: string,
    private phoneNumber: string | null,
    private readonly userType: UserType,
    private status: UserStatus,
    private emailVerified: boolean,
    // Wholesale-specific fields
    private companyName: string | null,
    private businessLicense: string | null,
    private taxId: string | null
  ) {}

  /**
   * Factory method to create a new User (Registration)
   */
  static create(params: {
    email: string;
    passwordHash: string;
    fullName: string;
    phoneNumber?: string;
    userType: UserType;
    // Wholesale-specific
    companyName?: string;
    businessLicense?: string;
    taxId?: string;
  }): Result<User> {
    // Business Rule: Wholesale users must provide company information
    if (params.userType === 'wholesale') {
      if (!params.companyName || !params.businessLicense) {
        return ResultFactory.fail(
          new InvalidOperationError(
            'Wholesale users must provide company name and business license'
          )
        );
      }
    }

    const user = new User(
      generateId(),
      Email.create(params.email),
      params.passwordHash,
      params.fullName,
      params.phoneNumber || null,
      params.userType,
      'active',
      false,
      params.companyName || null,
      params.businessLicense || null,
      params.taxId || null
    );

    // Raise domain event
    user.addDomainEvent({
      eventId: generateId(),
      eventType: 'UserRegistered',
      aggregateId: user.id,
      timestamp: generateTimestamp(),
      version: 1,
      userId: user.id,
      email: user.email.getValue(),
      userType: user.userType,
      fullName: user.fullName,
    } as UserRegistered);

    return ResultFactory.ok(user);
  }

  /**
   * Verify email address
   */
  verifyEmail(): void {
    this.emailVerified = true;
  }

  /**
   * Suspend user account
   */
  suspend(reason: string): Result<void> {
    if (this.status === 'suspended') {
      return ResultFactory.fail(
        new InvalidOperationError('User is already suspended')
      );
    }

    const previousStatus = this.status;
    this.status = 'suspended';

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'UserStatusChanged',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      userId: this.id,
      previousStatus,
      newStatus: 'suspended',
      reason,
    } as UserStatusChanged);

    return ResultFactory.ok(undefined);
  }

  /**
   * Activate suspended user
   */
  activate(): Result<void> {
    if (this.status === 'active') {
      return ResultFactory.fail(
        new InvalidOperationError('User is already active')
      );
    }

    const previousStatus = this.status;
    this.status = 'active';

    this.addDomainEvent({
      eventId: generateId(),
      eventType: 'UserStatusChanged',
      aggregateId: this.id,
      timestamp: generateTimestamp(),
      version: 1,
      userId: this.id,
      previousStatus,
      newStatus: 'active',
      reason: 'Account activated',
    } as UserStatusChanged);

    return ResultFactory.ok(undefined);
  }

  /**
   * Update profile information
   */
  updateProfile(params: {
    fullName?: string;
    phoneNumber?: string;
  }): void {
    if (params.fullName) {
      this.fullName = params.fullName;
    }
    if (params.phoneNumber !== undefined) {
      this.phoneNumber = params.phoneNumber;
    }
  }

  // Getters
  getId(): UserId {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getFullName(): string {
    return this.fullName;
  }

  getPhoneNumber(): string | null {
    return this.phoneNumber;
  }

  getUserType(): UserType {
    return this.userType;
  }

  getStatus(): UserStatus {
    return this.status;
  }

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  getCompanyName(): string | null {
    return this.companyName;
  }

  getBusinessLicense(): string | null {
    return this.businessLicense;
  }

  getTaxId(): string | null {
    return this.taxId;
  }

  isActive(): boolean {
    return this.status === 'active';
  }

  isWholesale(): boolean {
    return this.userType === 'wholesale';
  }

  isAdmin(): boolean {
    return this.userType === 'admin';
  }

  // Domain Events Management
  private addDomainEvent(event: any): void {
    this.domainEvents.push(event);
  }

  getDomainEvents(): any[] {
    return this.domainEvents;
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
