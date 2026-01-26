import { Account } from '@/domain/entities';
import { AccountType, AccountCategory, FinancialStatementType } from '@/domain/value-objects';
import type { IAccountRepository } from '@/domain/repositories';

/**
 * Create Account Command
 */
export interface CreateAccountCommand {
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  accountType: AccountType;
  accountCategory?: AccountCategory;
  normalBalance: 'Debit' | 'Credit';
  financialStatementType?: FinancialStatementType;
  parentAccountId?: string;
  level?: number;
  isDetailAccount: boolean;
  isSystemAccount: boolean;
}

/**
 * Create Account Result
 */
export interface CreateAccountResult {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
  accountType: AccountType;
  accountCategory?: AccountCategory;
  normalBalance: 'Debit' | 'Credit';
  parentAccountId?: string;
}

/**
 * Create Account Handler
 */
export class CreateAccountHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(command: CreateAccountCommand): Promise<CreateAccountResult> {
    // Check if code already exists
    const codeExists = await this.accountRepository.codeExists(command.code);
    if (codeExists) {
      throw new Error(`Account code ${command.code} already exists`);
    }

    // Validate parent account if provided
    if (command.parentAccountId) {
      const parentAccount = await this.accountRepository.findById(command.parentAccountId);
      if (!parentAccount) {
        throw new Error('Parent account not found');
      }
    }

    // Create the account
    const account = Account.create({
      code: command.code,
      name: command.name,
      nameEn: command.nameEn,
      description: command.description,
      accountType: command.accountType,
      accountCategory: command.accountCategory,
      normalBalance: command.normalBalance,
      financialStatementType: command.financialStatementType,
      parentAccountId: command.parentAccountId,
      level: command.level,
      isDetailAccount: command.isDetailAccount,
      isSystemAccount: command.isSystemAccount,
    });

    await this.accountRepository.save(account);

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      nameEn: account.nameEn || undefined,
      description: account.description || undefined,
      accountType: account.accountType,
      accountCategory: account.accountCategory,
      normalBalance: account.normalBalance,
      parentAccountId: account.parentAccountId || undefined,
    };
  }
}

/**
 * Update Account Command
 */
export interface UpdateAccountCommand {
  id: string;
  code?: string;
  name?: string;
  nameEn?: string;
  description?: string;
}

/**
 * Update Account Result
 */
export interface UpdateAccountResult {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  description?: string;
}

/**
 * Update Account Handler
 */
export class UpdateAccountHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(command: UpdateAccountCommand): Promise<UpdateAccountResult> {
    const account = await this.accountRepository.findById(command.id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Check if trying to change code of system account
    if (command.code && account.isSystemAccount) {
      throw new Error('Cannot change code of system account');
    }

    // Check code uniqueness if changing code
    if (command.code && command.code !== account.code) {
      const codeExists = await this.accountRepository.codeExists(command.code, account.id);
      if (codeExists) {
        throw new Error(`Account code ${command.code} already exists`);
      }
      account.updateCode(command.code);
    }

    // Update name if provided
    if (command.name !== undefined) {
      account.updateName(command.name);
    }

    // Update name (English) if provided
    if (command.nameEn !== undefined) {
      account.updateNameEn(command.nameEn);
    }

    // Update description if provided
    if (command.description !== undefined) {
      account.updateDescription(command.description);
    }

    await this.accountRepository.save(account);

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      nameEn: account.nameEn,
      description: account.description,
    };
  }
}

/**
 * Delete Account Command
 */
export interface DeleteAccountCommand {
  id: string;
}

/**
 * Delete Account Handler
 */
export class DeleteAccountHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(command: DeleteAccountCommand): Promise<void> {
    const account = await this.accountRepository.findById(command.id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Cannot delete system accounts
    if (account.isSystemAccount) {
      throw new Error('Cannot delete system account');
    }

    // Check if account has transactions
    const hasTransactions = await this.accountRepository.hasTransactions(account.id);
    if (hasTransactions) {
      throw new Error('Cannot delete account with transactions');
    }

    // Check if account has child accounts
    const children = await this.accountRepository.findByParentId(account.id);
    if (children.length > 0) {
      throw new Error('Cannot delete account with child accounts');
    }

    await this.accountRepository.delete(account.id);
  }
}
