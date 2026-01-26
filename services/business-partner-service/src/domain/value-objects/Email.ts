import { ValueObject } from '@kidkazz/ddd-core';

interface EmailProps {
  value: string;
}

/**
 * Email Value Object
 * Validates and normalizes email addresses
 */
export class Email extends ValueObject<EmailProps> {
  protected validate(props: EmailProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Email is required');
    }

    // Simple email regex - validates basic format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.value)) {
      throw new Error('Invalid email format');
    }
  }

  public toString(): string {
    return this._value.value;
  }

  public getDomain(): string {
    return this._value.value.split('@')[1];
  }

  public getLocalPart(): string {
    return this._value.value.split('@')[0];
  }

  /**
   * Create a new Email value object
   * Normalizes email to lowercase
   */
  public static create(email: string): Email {
    const normalized = email.toLowerCase().trim();
    return new Email({ value: normalized });
  }
}
