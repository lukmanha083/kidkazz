/**
 * Chart of Accounts Fixtures for E2E Testing
 *
 * Fetches existing accounts from the database.
 * The COA is already seeded in the production D1 database.
 */

import { AccountingApiClient } from '../helpers/api-client';

export interface AccountInfo {
  id: string;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string;
}

/**
 * Fetch all accounts and build a map by code
 */
export async function fetchAccountMap(
  apiClient: AccountingApiClient
): Promise<Map<string, AccountInfo>> {
  const accountMap = new Map<string, AccountInfo>();

  const response = await apiClient.listAccounts();
  if (response.ok && response.data) {
    const accounts = response.data as Array<{
      id: string;
      code: string;
      name: string;
      accountType: string;
      normalBalance: string;
    }>;

    for (const account of accounts) {
      accountMap.set(account.code, {
        id: account.id,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
      });
    }
  }

  return accountMap;
}

/**
 * Get account by code from map
 */
export function getAccountByCode(
  accountMap: Map<string, AccountInfo>,
  code: string
): AccountInfo {
  const account = accountMap.get(code);
  if (!account) {
    throw new Error(`Account with code ${code} not found in map. Available: ${Array.from(accountMap.keys()).join(', ')}`);
  }
  return account;
}

/**
 * Fetch account info by code via API
 */
export async function fetchAccountByCode(
  apiClient: AccountingApiClient,
  code: string
): Promise<AccountInfo | null> {
  const response = await apiClient.getAccountByCode(code);
  if (response.ok && response.data) {
    const data = response.data as {
      id: string;
      code: string;
      name: string;
      accountType: string;
      normalBalance: string;
    };
    return {
      id: data.id,
      code: data.code,
      name: data.name,
      accountType: data.accountType,
      normalBalance: data.normalBalance,
    };
  }
  return null;
}
