import { type Result, ResultFactory, ValidationError } from '@kidkazz/types';
import { hash } from 'bcryptjs';
import { User, type UserType } from '../../domain/entities/User';

export interface IUserRepository {
  save(user: User): Promise<Result<void>>;
  findByEmail(email: string): Promise<Result<User | null>>;
  findById(id: string): Promise<Result<User | null>>;
}

/**
 * Register User Use Case
 * Handles user registration for retail, wholesale, and admin users
 */
export class RegisterUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: RegisterUserInput): Promise<Result<RegisterUserOutput>> {
    // Validate input
    const validation = this.validate(input);
    if (!validation.isSuccess) {
      const error = validation.error || new ValidationError('Validation failed');
      return ResultFactory.fail(error);
    }

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(input.email);
    if (!existingUser.isSuccess) {
      const error = existingUser.error || new Error('Failed to check existing user');
      return ResultFactory.fail(error);
    }

    if (existingUser.value) {
      return ResultFactory.fail(
        new ValidationError(`User with email ${input.email} already exists`)
      );
    }

    // Hash password
    const passwordHash = await hash(input.password, 10);

    // Create domain entity
    const userResult = User.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phoneNumber: input.phoneNumber,
      userType: input.userType,
      companyName: input.companyName,
      businessLicense: input.businessLicense,
      taxId: input.taxId,
    });

    if (!userResult.isSuccess) {
      const error = userResult.error || new ValidationError('Failed to create user');
      return ResultFactory.fail(error);
    }

    const user = userResult.value;
    if (!user) {
      return ResultFactory.fail(new ValidationError('Failed to create user'));
    }

    // Persist user
    const saveResult = await this.userRepository.save(user);
    if (!saveResult.isSuccess) {
      const error = saveResult.error || new Error('Failed to save user');
      return ResultFactory.fail(error);
    }

    // TODO: Publish domain events
    // TODO: Send verification email

    return ResultFactory.ok({
      userId: user.getId(),
      email: user.getEmail().getValue(),
      fullName: user.getFullName(),
      userType: user.getUserType(),
      status: user.getStatus(),
    });
  }

  private validate(input: RegisterUserInput): Result<void> {
    if (!input.email || !input.email.includes('@')) {
      return ResultFactory.fail(new ValidationError('Valid email is required'));
    }

    if (!input.password || input.password.length < 8) {
      return ResultFactory.fail(new ValidationError('Password must be at least 8 characters'));
    }

    if (!input.fullName || input.fullName.trim().length === 0) {
      return ResultFactory.fail(new ValidationError('Full name is required'));
    }

    if (!input.userType || !['retail', 'wholesale', 'admin'].includes(input.userType)) {
      return ResultFactory.fail(new ValidationError('Invalid user type'));
    }

    return ResultFactory.ok(undefined);
  }
}

export interface RegisterUserInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  userType: UserType;
  // Wholesale-specific
  companyName?: string;
  businessLicense?: string;
  taxId?: string;
}

export interface RegisterUserOutput {
  userId: string;
  email: string;
  fullName: string;
  userType: UserType;
  status: string;
}
