/**
 * Result Pattern for functional error handling
 * Based on Railway Oriented Programming
 */

export interface Result<T> {
  isSuccess: boolean;
  isFailure: boolean;
  value?: T;
  error?: Error;
}

export class ResultFactory {
  static ok<T>(value: T): Result<T> {
    return {
      isSuccess: true,
      isFailure: false,
      value,
    };
  }

  static fail<T>(error: Error): Result<T> {
    return {
      isSuccess: false,
      isFailure: true,
      error,
    };
  }
}

// Custom Errors
export class InvalidOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOperationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
