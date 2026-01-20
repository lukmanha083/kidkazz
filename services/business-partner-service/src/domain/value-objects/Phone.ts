import { ValueObject } from '@kidkazz/ddd-core';

interface PhoneProps {
  value: string;
}

/**
 * Phone Value Object
 * Validates and normalizes phone numbers
 * Supports Indonesian phone numbers and international format
 */
export class Phone extends ValueObject<PhoneProps> {
  protected validate(props: PhoneProps): void {
    if (!props.value || props.value.trim().length === 0) {
      throw new Error('Phone number is required');
    }

    // Must be at least 8 digits (after removing non-digits)
    const digitsOnly = props.value.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      throw new Error('Invalid phone number format');
    }

    // Check if it contains only valid characters
    const validChars = /^[+\d\s\-()]+$/;
    if (!validChars.test(props.value)) {
      throw new Error('Invalid phone number format');
    }
  }

  public getValue(): string {
    return this._value.value;
  }

  public getCountryCode(): string {
    const value = this._value.value;
    // Check common country codes (Indonesia +62, US +1, etc.)
    if (value.startsWith('+62')) return '+62';
    if (value.startsWith('+1')) return '+1';
    if (value.startsWith('+60')) return '+60'; // Malaysia
    if (value.startsWith('+65')) return '+65'; // Singapore
    if (value.startsWith('+')) {
      // Generic extraction: assume 1-3 digit country code
      const match = value.match(/^\+(\d{1,3})/);
      if (match) {
        return `+${match[1]}`;
      }
    }
    return '+62'; // Default to Indonesia
  }

  public getLocalNumber(): string {
    const value = this._value.value;
    const countryCode = this.getCountryCode();
    if (value.startsWith(countryCode)) {
      return value.substring(countryCode.length);
    }
    return value;
  }

  public format(): string {
    return this._value.value;
  }

  /**
   * Create a new Phone value object
   * Normalizes Indonesian phone numbers to +62 format
   */
  public static create(phone: string): Phone {
    // Check for empty before any processing
    if (!phone || phone.trim().length === 0) {
      throw new Error('Phone number is required');
    }

    let normalized = phone.trim().replace(/[\s\-()]/g, '');

    // Normalize Indonesian phone numbers
    if (normalized.startsWith('0')) {
      // Local format: 0812345678 -> +62812345678
      normalized = `+62${normalized.substring(1)}`;
    } else if (normalized.startsWith('62') && !normalized.startsWith('+')) {
      // Without plus: 62812345678 -> +62812345678
      normalized = `+${normalized}`;
    } else if (!normalized.startsWith('+')) {
      // Assume Indonesian if no country code
      normalized = `+62${normalized}`;
    }

    return new Phone({ value: normalized });
  }
}
