import { BankAccount } from '@/domain/entities';
import { BankAccountType, BankAccountStatus } from '@/domain/value-objects';
import type { IBankAccountRepository } from '@/domain/repositories';

// ============================================================================
// Create Bank Account Command
// ============================================================================

export interface CreateBankAccountCommand {
  accountId: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  currency: string;
}

export interface CreateBankAccountResult {
  id: string;
  accountId: string;
  bankName: string;
  accountNumber: string;
  status: BankAccountStatus;
}

export class CreateBankAccountHandler {
  constructor(private readonly bankAccountRepo: IBankAccountRepository) {}

  async execute(command: CreateBankAccountCommand): Promise<CreateBankAccountResult> {
    // Check for existing bank account with same account number
    const existing = await this.bankAccountRepo.findByAccountNumber(command.accountNumber);
    if (existing) {
      throw new Error(`Bank account with account number ${command.accountNumber} already exists`);
    }

    // Check if COA account is already linked
    const linkedAccount = await this.bankAccountRepo.findByAccountId(command.accountId);
    if (linkedAccount) {
      throw new Error(`COA account ${command.accountId} is already linked to another bank account`);
    }

    const bankAccount = BankAccount.create({
      accountId: command.accountId,
      bankName: command.bankName,
      accountNumber: command.accountNumber,
      accountType: command.accountType,
      currency: command.currency,
    });

    await this.bankAccountRepo.save(bankAccount);

    return {
      id: bankAccount.id,
      accountId: bankAccount.accountId,
      bankName: bankAccount.bankName,
      accountNumber: bankAccount.accountNumber,
      status: bankAccount.status,
    };
  }
}

// ============================================================================
// Update Bank Account Command
// ============================================================================

export interface UpdateBankAccountCommand {
  id: string;
  bankName?: string;
  accountNumber?: string;
  accountType?: BankAccountType;
  currency?: string;
}

export class UpdateBankAccountHandler {
  constructor(private readonly bankAccountRepo: IBankAccountRepository) {}

  async execute(command: UpdateBankAccountCommand): Promise<void> {
    const bankAccount = await this.bankAccountRepo.findById(command.id);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    // Check for duplicate account number if changing
    if (command.accountNumber && command.accountNumber !== bankAccount.accountNumber) {
      const existing = await this.bankAccountRepo.findByAccountNumber(command.accountNumber);
      if (existing) {
        throw new Error(`Bank account with account number ${command.accountNumber} already exists`);
      }
    }

    bankAccount.update({
      bankName: command.bankName,
      accountNumber: command.accountNumber,
      accountType: command.accountType,
      currency: command.currency,
    });

    await this.bankAccountRepo.save(bankAccount);
  }
}

// ============================================================================
// Deactivate Bank Account Command
// ============================================================================

export interface DeactivateBankAccountCommand {
  id: string;
}

export interface DeactivateBankAccountResult {
  id: string;
  status: BankAccountStatus;
}

export class DeactivateBankAccountHandler {
  constructor(private readonly bankAccountRepo: IBankAccountRepository) {}

  async execute(command: DeactivateBankAccountCommand): Promise<DeactivateBankAccountResult> {
    const bankAccount = await this.bankAccountRepo.findById(command.id);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    bankAccount.deactivate();
    await this.bankAccountRepo.save(bankAccount);

    return {
      id: bankAccount.id,
      status: bankAccount.status,
    };
  }
}

// ============================================================================
// Reactivate Bank Account Command
// ============================================================================

export interface ReactivateBankAccountCommand {
  id: string;
}

export interface ReactivateBankAccountResult {
  id: string;
  status: BankAccountStatus;
}

export class ReactivateBankAccountHandler {
  constructor(private readonly bankAccountRepo: IBankAccountRepository) {}

  async execute(command: ReactivateBankAccountCommand): Promise<ReactivateBankAccountResult> {
    const bankAccount = await this.bankAccountRepo.findById(command.id);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    bankAccount.reactivate();
    await this.bankAccountRepo.save(bankAccount);

    return {
      id: bankAccount.id,
      status: bankAccount.status,
    };
  }
}

// ============================================================================
// Close Bank Account Command
// ============================================================================

export interface CloseBankAccountCommand {
  id: string;
}

export interface CloseBankAccountResult {
  id: string;
  status: BankAccountStatus;
}

export class CloseBankAccountHandler {
  constructor(private readonly bankAccountRepo: IBankAccountRepository) {}

  async execute(command: CloseBankAccountCommand): Promise<CloseBankAccountResult> {
    const bankAccount = await this.bankAccountRepo.findById(command.id);
    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    bankAccount.close();
    await this.bankAccountRepo.save(bankAccount);

    return {
      id: bankAccount.id,
      status: bankAccount.status,
    };
  }
}
