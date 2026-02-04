import type { Account, AccountStatus } from '@/domain/entities';
import type { AccountFilter, IAccountRepository } from '@/domain/repositories';
import type { AccountType } from '@/domain/value-objects';

/**
 * Get Account By ID Query
 */
export interface GetAccountByIdQuery {
  id: string;
}

/**
 * Get Account By ID Handler
 */
export class GetAccountByIdHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(query: GetAccountByIdQuery): Promise<Account | null> {
    return this.accountRepository.findById(query.id);
  }
}

/**
 * Get Account By Code Query
 */
export interface GetAccountByCodeQuery {
  code: string;
}

/**
 * Get Account By Code Handler
 */
export class GetAccountByCodeHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(query: GetAccountByCodeQuery): Promise<Account | null> {
    return this.accountRepository.findByCode(query.code);
  }
}

/**
 * List Accounts Query
 */
export interface ListAccountsQuery {
  status?: AccountStatus;
  accountType?: AccountType;
  parentAccountId?: string | null;
  isDetailAccount?: boolean;
  isSystemAccount?: boolean;
  search?: string;
  tag?: string;
}

/**
 * List Accounts Handler
 */
export class ListAccountsHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(query: ListAccountsQuery): Promise<Account[]> {
    const filter: AccountFilter = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }
    if (query.accountType !== undefined) {
      filter.accountType = query.accountType;
    }
    if (query.parentAccountId !== undefined) {
      filter.parentAccountId = query.parentAccountId;
    }
    if (query.isDetailAccount !== undefined) {
      filter.isDetailAccount = query.isDetailAccount;
    }
    if (query.isSystemAccount !== undefined) {
      filter.isSystemAccount = query.isSystemAccount;
    }
    if (query.search !== undefined) {
      filter.search = query.search;
    }
    if (query.tag !== undefined) {
      filter.tag = query.tag;
    }

    return this.accountRepository.findAll(Object.keys(filter).length > 0 ? filter : undefined);
  }
}

/**
 * Get Account Tree Query
 */
export type GetAccountTreeQuery = {};

/**
 * Get Account Tree Handler
 */
export class GetAccountTreeHandler {
  constructor(private readonly accountRepository: IAccountRepository) {}

  async execute(_query: GetAccountTreeQuery): Promise<Account[]> {
    return this.accountRepository.getAccountTree();
  }
}
