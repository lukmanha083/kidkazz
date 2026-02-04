/**
 * Account Queries (React Query)
 *
 * Hooks for Chart of Accounts (COA) data fetching and mutations.
 * Follows established patterns from useProducts.ts and useCustomers.ts.
 *
 * Features:
 * - Automatic cache invalidation
 * - Optimistic updates for mutations
 * - Type-safe API calls
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ChartOfAccount, accountingApi } from '../../lib/api';
import type { AccountFormData } from '../../lib/form-schemas';
import { queryKeys } from '../../lib/query-client';

/**
 * Hook to fetch all accounts with optional filters
 *
 * @param filters.type - Filter by account type (Asset, Liability, etc.)
 * @param filters.status - Filter by status (Active, Inactive, Archived)
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useAccounts(
  filters?: { type?: string; status?: string },
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.accounts.list(filters),
    queryFn: () => accountingApi.accounts.getAll(filters),
    enabled,
  });
}

/**
 * Hook to fetch only active accounts
 * Useful for parent account dropdowns and selection lists
 */
export function useActiveAccounts(options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.accounts.active(),
    queryFn: () => accountingApi.accounts.getActive(),
    enabled,
  });
}

/**
 * Hook to fetch a single account by ID
 *
 * @param id - Account ID
 * @param options.enabled - Enable/disable query (default: true)
 */
export function useAccount(id: string, options?: { enabled?: boolean }) {
  const { enabled = true } = options || {};

  return useQuery({
    queryKey: queryKeys.accounts.detail(id),
    queryFn: () => accountingApi.accounts.getById(id),
    enabled: enabled && !!id,
  });
}

/**
 * Hook to create a new account
 *
 * Features:
 * - Optimistic update to cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AccountFormData) => {
      // Convert null parentAccountId to undefined for API compatibility
      const apiData = {
        ...data,
        parentAccountId: data.parentAccountId ?? undefined,
      };
      return accountingApi.accounts.create(apiData);
    },

    // Optimistic update before API call
    onMutate: async (newAccount) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts.all });

      const previousData = queryClient.getQueryData<{ accounts: ChartOfAccount[] }>(
        queryKeys.accounts.lists()
      );

      // Create optimistic account with temporary ID
      const optimisticAccount: ChartOfAccount = {
        ...newAccount,
        id: `temp-${Date.now()}`,
        isSystemAccount: false,
        normalBalance: ['Asset', 'Expense', 'COGS'].includes(newAccount.accountType)
          ? 'Debit'
          : 'Credit',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ChartOfAccount;

      // Update cache
      queryClient.setQueryData<{ accounts: ChartOfAccount[] }>(
        queryKeys.accounts.lists(),
        (old) => {
          if (!old) return { accounts: [optimisticAccount] };
          return {
            accounts: [...old.accounts, optimisticAccount],
          };
        }
      );

      return {
        rollback: () => {
          queryClient.setQueryData(queryKeys.accounts.lists(), previousData);
        },
      };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      if (context?.rollback) {
        context.rollback();
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

/**
 * Hook to update an existing account
 *
 * Features:
 * - Optimistic update to cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountFormData> }) => {
      // Convert null parentAccountId to undefined for API compatibility
      const apiData = {
        ...data,
        parentAccountId: data.parentAccountId ?? undefined,
      };
      return accountingApi.accounts.update(id, apiData);
    },

    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts.all });

      const previousAccounts = queryClient.getQueryData(queryKeys.accounts.lists());
      const previousAccount = queryClient.getQueryData(queryKeys.accounts.detail(id));

      // Update list cache
      queryClient.setQueryData(
        queryKeys.accounts.lists(),
        (old: { accounts: ChartOfAccount[] } | undefined) => {
          if (!old) return old;
          return {
            accounts: old.accounts.map((a) =>
              a.id === id ? { ...a, ...data, updatedAt: new Date() } : a
            ),
          };
        }
      );

      // Update detail cache
      queryClient.setQueryData(
        queryKeys.accounts.detail(id),
        (old: { account: ChartOfAccount } | undefined) => {
          if (!old) return old;
          return { account: { ...old.account, ...data, updatedAt: new Date() } };
        }
      );

      return { previousAccounts, previousAccount };
    },

    onError: (_err, { id }, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(queryKeys.accounts.lists(), context.previousAccounts);
      }
      if (context?.previousAccount) {
        queryClient.setQueryData(queryKeys.accounts.detail(id), context.previousAccount);
      }
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.detail(id),
      });
    },
  });
}

/**
 * Hook to delete an account
 *
 * Features:
 * - Optimistic removal from cache
 * - Automatic cache invalidation on success
 * - Rollback on error
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountingApi.accounts.delete(id),

    // Optimistic update
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts.all });

      const previousAccounts = queryClient.getQueryData(queryKeys.accounts.lists());

      // Remove from list cache
      queryClient.setQueryData(
        queryKeys.accounts.lists(),
        (old: { accounts: ChartOfAccount[] } | undefined) => {
          if (!old) return old;
          return {
            accounts: old.accounts.filter((a) => a.id !== id),
          };
        }
      );

      // Remove detail cache
      queryClient.removeQueries({
        queryKey: queryKeys.accounts.detail(id),
      });

      return { previousAccounts };
    },

    onError: (_err, _id, context) => {
      if (context?.previousAccounts) {
        queryClient.setQueryData(queryKeys.accounts.lists(), context.previousAccounts);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
