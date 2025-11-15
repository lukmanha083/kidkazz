import { compare } from 'bcryptjs';
import { IUserRepository } from './RegisterUser';
import { JWTService } from '../../infrastructure/auth/JWTService';
import { Result, ResultFactory, ValidationError, UnauthorizedError } from '@kidkazz/types';

/**
 * Login User Use Case
 * Authenticates user and returns JWT tokens
 */
export class LoginUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JWTService
  ) {}

  async execute(input: LoginUserInput): Promise<Result<LoginUserOutput>> {
    // Validate input
    if (!input.email || !input.password) {
      return ResultFactory.fail(
        new ValidationError('Email and password are required')
      );
    }

    // Find user by email
    const userResult = await this.userRepository.findByEmail(input.email);
    if (!userResult.isSuccess) {
      const error = userResult.error || new Error('Failed to find user');
      return ResultFactory.fail(error);
    }

    if (!userResult.value) {
      return ResultFactory.fail(
        new UnauthorizedError('Invalid email or password')
      );
    }

    const user = userResult.value;

    // Check if user is active
    if (!user.isActive()) {
      return ResultFactory.fail(
        new UnauthorizedError('Account is not active')
      );
    }

    // Verify password
    const isPasswordValid = await compare(input.password, user.getPasswordHash());
    if (!isPasswordValid) {
      // TODO: Increment failed login attempts
      return ResultFactory.fail(
        new UnauthorizedError('Invalid email or password')
      );
    }

    // Generate JWT tokens
    const tokens = await this.jwtService.generateTokenPair({
      userId: user.getId(),
      email: user.getEmail().getValue(),
      userType: user.getUserType(),
    });

    // TODO: Save refresh token to database
    // TODO: Update last login timestamp

    return ResultFactory.ok({
      userId: user.getId(),
      email: user.getEmail().getValue(),
      fullName: user.getFullName(),
      userType: user.getUserType(),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  }
}

export interface LoginUserInput {
  email: string;
  password: string;
}

export interface LoginUserOutput {
  userId: string;
  email: string;
  fullName: string;
  userType: 'retail' | 'wholesale' | 'admin';
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
