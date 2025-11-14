import { DrizzleD1Database } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { IUserRepository } from '../../application/use-cases/RegisterUser';
import { User, UserType, UserStatus } from '../../domain/entities/User';
import { users } from '../db/schema';
import { Result, ResultFactory, Email } from '@kidkazz/types';

/**
 * Drizzle User Repository (Adapter)
 * Implements IUserRepository using Drizzle ORM
 */
export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: DrizzleD1Database) {}

  async save(user: User): Promise<Result<void>> {
    try {
      const existing = await this.db
        .select()
        .from(users)
        .where(eq(users.id, user.getId()))
        .get();

      const data = {
        id: user.getId(),
        email: user.getEmail().getValue(),
        passwordHash: user.getPasswordHash(),
        fullName: user.getFullName(),
        phoneNumber: user.getPhoneNumber(),
        userType: user.getUserType(),
        status: user.getStatus(),
        emailVerified: user.isEmailVerified(),
        companyName: user.getCompanyName(),
        businessLicense: user.getBusinessLicense(),
        taxId: user.getTaxId(),
        updatedAt: new Date(),
      };

      if (existing) {
        // Update existing user
        await this.db
          .update(users)
          .set(data)
          .where(eq(users.id, user.getId()))
          .run();
      } else {
        // Insert new user
        await this.db
          .insert(users)
          .values({
            ...data,
            createdAt: new Date(),
            failedLoginAttempts: 0,
          })
          .run();
      }

      return ResultFactory.ok(undefined);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  async findByEmail(email: string): Promise<Result<User | null>> {
    try {
      const row = await this.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get();

      if (!row) {
        return ResultFactory.ok(null);
      }

      const user = this.toDomain(row);
      return ResultFactory.ok(user);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  async findById(id: string): Promise<Result<User | null>> {
    try {
      const row = await this.db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .get();

      if (!row) {
        return ResultFactory.ok(null);
      }

      const user = this.toDomain(row);
      return ResultFactory.ok(user);
    } catch (error) {
      return ResultFactory.fail(error as Error);
    }
  }

  /**
   * Map database row to domain entity
   */
  private toDomain(row: any): User {
    const userResult = User.create({
      email: row.email,
      passwordHash: row.passwordHash,
      fullName: row.fullName,
      phoneNumber: row.phoneNumber || undefined,
      userType: row.userType as UserType,
      companyName: row.companyName || undefined,
      businessLicense: row.businessLicense || undefined,
      taxId: row.taxId || undefined,
    });

    if (!userResult.isSuccess) {
      throw new Error('Failed to reconstitute user from database');
    }

    const user = userResult.value!;

    // Restore state that can't be set via constructor
    if (row.emailVerified) {
      user.verifyEmail();
    }

    if (row.status === 'suspended') {
      user.suspend('Restored from database');
    }

    user.clearDomainEvents(); // Clear events from reconstitution

    return user;
  }
}
