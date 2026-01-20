import { ValueObject } from '@kidkazz/ddd-core';

export type PartnerType = 'customer' | 'supplier' | 'employee';

const PREFIX_MAP: Record<PartnerType, string> = {
  customer: 'CUS',
  supplier: 'SUP',
  employee: 'EMP',
};

const REVERSE_PREFIX_MAP: Record<string, PartnerType> = {
  CUS: 'customer',
  SUP: 'supplier',
  EMP: 'employee',
};

interface PartnerCodeProps {
  value: string;
}

/**
 * PartnerCode Value Object
 * Generates and validates partner codes in format: {PREFIX}-{4-digit-number}
 * Examples: CUS-0001, SUP-0001, EMP-0001
 */
export class PartnerCode extends ValueObject<PartnerCodeProps> {
  private static counter = 0;
  private static usedCodes = new Set<string>();

  protected validate(props: PartnerCodeProps): void {
    const regex = /^(CUS|SUP|EMP)-\d{4}$/;
    if (!regex.test(props.value)) {
      throw new Error('Invalid partner code format');
    }
  }

  public getValue(): string {
    return this._value.value;
  }

  public getPartnerType(): PartnerType {
    const prefix = this._value.value.substring(0, 3);
    return REVERSE_PREFIX_MAP[prefix];
  }

  /**
   * Create a new partner code for a given partner type
   * Generates unique codes using counter + random + timestamp
   *
   * Note: In-memory uniqueness is a best-effort safeguard within a single process.
   * The database UNIQUE constraint is the authoritative source of truth.
   */
  public static create(partnerType: PartnerType): PartnerCode {
    const prefix = PREFIX_MAP[partnerType];
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      PartnerCode.counter++;
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000);
      const uniqueNum = (timestamp * 17 + random * 31 + PartnerCode.counter * 97) % 10000;
      const number = uniqueNum.toString().padStart(4, '0');
      code = `${prefix}-${number}`;
      attempts++;
    } while (PartnerCode.usedCodes.has(code) && attempts < maxAttempts);

    // If we exhausted attempts and still have a duplicate, throw an error
    if (PartnerCode.usedCodes.has(code)) {
      throw new Error(`Unable to generate unique PartnerCode after ${maxAttempts} attempts`);
    }

    PartnerCode.usedCodes.add(code);
    return new PartnerCode({ value: code });
  }

  /**
   * Reconstitute from existing code string
   *
   * Note: This registers the code in the in-memory tracker to prevent duplicates
   * within the same process. Database UNIQUE constraint is the authoritative check.
   */
  public static fromString(code: string): PartnerCode {
    const partnerCode = new PartnerCode({ value: code });
    PartnerCode.usedCodes.add(code);
    return partnerCode;
  }
}
