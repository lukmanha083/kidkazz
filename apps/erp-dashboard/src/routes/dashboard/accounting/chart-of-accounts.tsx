import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTable } from '@/components/ui/data-table';
import {
  accountStatusOptions,
  accountTypeOptions,
  getAccountColumns,
} from '@/components/ui/data-table/columns';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  useAccounts,
  useActiveAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/hooks/queries';
import type { ChartOfAccount } from '@/lib/api';
import { type AccountFormData, accountFormSchema, createFormValidator } from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-client';
import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Calculator, Edit, Loader2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/dashboard/accounting/chart-of-accounts')({
  component: ChartOfAccountsPage,
});

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    if ('message' in errorObj) {
      const msg = errorObj.message;
      if (typeof msg === 'string') return msg;
      if (msg && typeof msg === 'object' && 'message' in (msg as object)) {
        const nestedMsg = (msg as { message: unknown }).message;
        if (typeof nestedMsg === 'string') return nestedMsg;
      }
    }
  }
  return 'Validation error';
}

function ChartOfAccountsPage() {
  const queryClient = useQueryClient();

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null);

  // React Query hooks
  const { data: accountsData, isLoading, error } = useAccounts();
  const { data: activeAccountsData } = useActiveAccounts();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const accounts = accountsData?.accounts || [];
  const activeAccounts = activeAccountsData?.accounts || [];

  // TanStack Form
  const form = useForm({
    defaultValues: {
      code: '',
      name: '',
      accountType: 'Asset' as AccountFormData['accountType'],
      accountSubType: '',
      parentAccountId: '',
      description: '',
      taxType: '',
      isDetailAccount: true,
      status: 'Active' as AccountFormData['status'],
      currency: 'IDR',
    },
    validators: {
      onChange: createFormValidator(accountFormSchema),
    },
    onSubmit: async ({ value }) => {
      const submitData = {
        ...value,
        accountSubType: value.accountSubType || undefined,
        parentAccountId: value.parentAccountId || undefined,
        description: value.description || undefined,
        taxType: value.taxType || undefined,
      };

      try {
        if (formMode === 'add') {
          await createAccountMutation.mutateAsync(submitData);
          toast.success('Account created successfully');
        } else if (formMode === 'edit' && selectedAccount) {
          await updateAccountMutation.mutateAsync({ id: selectedAccount.id, data: submitData });
          toast.success('Account updated successfully');
        }
        setFormDrawerOpen(false);
        form.reset();
      } catch (error) {
        toast.error(formMode === 'add' ? 'Failed to create account' : 'Failed to update account', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // Handlers
  const handleViewAccount = (account: ChartOfAccount) => {
    setSelectedAccount(account);
    setViewDrawerOpen(true);
  };

  const handleAddAccount = (parentId?: string) => {
    setFormMode('add');
    const parentAccount = parentId ? accounts.find((a) => a.id === parentId) : null;
    form.reset();
    if (parentAccount) {
      form.setFieldValue('accountType', parentAccount.accountType);
      form.setFieldValue('parentAccountId', parentId || '');
    }
    setFormDrawerOpen(true);
  };

  const handleEditAccount = (account: ChartOfAccount) => {
    setFormMode('edit');
    setSelectedAccount(account);
    form.setFieldValue('code', account.code);
    form.setFieldValue('name', account.name);
    form.setFieldValue('accountType', account.accountType);
    form.setFieldValue('accountSubType', account.accountSubType || '');
    form.setFieldValue('parentAccountId', account.parentAccountId || '');
    form.setFieldValue('description', account.description || '');
    form.setFieldValue('taxType', account.taxType || '');
    form.setFieldValue('isDetailAccount', account.isDetailAccount);
    form.setFieldValue('status', account.status);
    form.setFieldValue('currency', account.currency);
    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleDeleteAccount = (account: ChartOfAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteAccountMutation.mutate(accountToDelete.id, {
        onSuccess: () => {
          toast.success('Account deleted successfully');
          setDeleteDialogOpen(false);
          setAccountToDelete(null);
        },
        onError: (error) => {
          toast.error('Failed to delete account', { description: error.message });
        },
      });
    }
  };

  // Get parent account options (excluding descendants for edit mode)
  const getParentAccountOptions = (): ChartOfAccount[] => {
    const headerAccounts = activeAccounts.filter((a) => !a.isDetailAccount);

    if (formMode === 'add') {
      return headerAccounts;
    }

    // For edit mode, exclude the account itself and its descendants
    const getDescendantIds = (accountId: string): string[] => {
      const children = accounts.filter((a) => a.parentAccountId === accountId);
      return [accountId, ...children.flatMap((child) => getDescendantIds(child.id))];
    };

    const excludeIds = selectedAccount ? getDescendantIds(selectedAccount.id) : [];
    return headerAccounts.filter((a) => !excludeIds.includes(a.id));
  };

  // Column definitions with handlers
  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are stable
  const columns = useMemo(
    () =>
      getAccountColumns({
        onView: handleViewAccount,
        onEdit: handleEditAccount,
        onDelete: handleDeleteAccount,
      }),
    []
  );

  // Stats calculations
  const totalAccounts = accounts.length;
  const assetAccounts = accounts.filter((a) => a.accountType === 'Asset').length;
  const revenueAccounts = accounts.filter((a) => a.accountType === 'Revenue').length;
  const expenseAccounts = accounts.filter((a) => a.accountType === 'Expense').length;

  // Get account type badge styling
  const getAccountTypeBadgeClass = (type: string): string => {
    const colors: Record<string, string> = {
      Asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      COGS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Expense: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[type] || '';
  };

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
            <p className="text-muted-foreground mt-1">Manage account hierarchy and structure</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading accounts</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your account hierarchy and structure</p>
        </div>
        <Button onClick={() => handleAddAccount()} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">All account types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assetAccounts}</div>
            <p className="text-xs text-muted-foreground">Asset accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueAccounts}</div>
            <p className="text-xs text-muted-foreground">Revenue accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenseAccounts}</div>
            <p className="text-xs text-muted-foreground">Expense accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>View and manage chart of accounts</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={accounts}
            searchKey="name"
            searchPlaceholder="Search by name, code..."
            isLoading={isLoading}
            onRowClick={handleViewAccount}
            filterableColumns={[
              { id: 'accountType', title: 'Type', options: accountTypeOptions },
              { id: 'status', title: 'Status', options: accountStatusOptions },
            ]}
          />
        </CardContent>
      </Card>

      {/* View Drawer (Right) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedAccount?.name}</DrawerTitle>
            <DrawerDescription>Account Details</DrawerDescription>
          </DrawerHeader>

          {selectedAccount && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <p className="font-mono font-medium">{selectedAccount.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge className={getAccountTypeBadgeClass(selectedAccount.accountType)}>
                      {selectedAccount.accountType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedAccount.name}</p>
                </div>
                {selectedAccount.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm">{selectedAccount.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Sub-Type</p>
                    <p className="font-medium">{selectedAccount.accountSubType || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currency</p>
                    <p className="font-medium">{selectedAccount.currency}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Account Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Level</p>
                    <Badge variant={selectedAccount.isDetailAccount ? 'default' : 'secondary'}>
                      {selectedAccount.isDetailAccount ? 'Detail' : 'Header'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Normal Balance</p>
                    <p className="font-medium">{selectedAccount.normalBalance}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        selectedAccount.status === 'Active'
                          ? 'default'
                          : selectedAccount.status === 'Archived'
                            ? 'outline'
                            : 'secondary'
                      }
                      className={
                        selectedAccount.status === 'Active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                          : ''
                      }
                    >
                      {selectedAccount.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">System Account</p>
                    <p className="font-medium">{selectedAccount.isSystemAccount ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                {selectedAccount.parentAccountId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Parent Account</p>
                    <p className="font-medium">
                      {accounts.find((a) => a.id === selectedAccount.parentAccountId)?.name ||
                        selectedAccount.parentAccountId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DrawerFooter>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => selectedAccount && handleEditAccount(selectedAccount)}
                className="w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedAccount && handleAddAccount(selectedAccount.id)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sub-Account
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Form Drawer (Left) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>{formMode === 'add' ? 'Add New Account' : 'Edit Account'}</DrawerTitle>
            <DrawerDescription>
              {formMode === 'add'
                ? 'Create a new account in your chart of accounts'
                : 'Update account information'}
            </DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="code">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Account Code *</Label>
                    <Input
                      id={field.name}
                      placeholder="1000"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      disabled={formMode === 'edit'}
                    />
                    <p className="text-xs text-muted-foreground">
                      4-digit code (e.g., 1000-1999 for Assets)
                    </p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="currency">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Currency</Label>
                    <Input
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      disabled
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Account Name *</Label>
                  <Input
                    id={field.name}
                    placeholder="Cash and Cash Equivalents"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="accountType">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Account Type *</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as AccountFormData['accountType'])}
                      disabled={formMode === 'edit'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asset">Asset</SelectItem>
                        <SelectItem value="Liability">Liability</SelectItem>
                        <SelectItem value="Equity">Equity</SelectItem>
                        <SelectItem value="Revenue">Revenue</SelectItem>
                        <SelectItem value="COGS">Cost of Goods Sold</SelectItem>
                        <SelectItem value="Expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    {formMode === 'edit' && (
                      <p className="text-xs text-muted-foreground">
                        Account type cannot be changed after creation
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="accountSubType">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Sub-Type</Label>
                    <Input
                      id={field.name}
                      placeholder="Current Asset"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="parentAccountId">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Parent Account</Label>
                  <Select
                    value={field.state.value || '__none__'}
                    onValueChange={(v) => field.handleChange(v === '__none__' ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (Top level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None (Top level)</SelectItem>
                      {getParentAccountOptions().map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} - {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Optional: Make this a sub-account of another account
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="description">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Description</Label>
                  <Input
                    id={field.name}
                    placeholder="Account description"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field name="isDetailAccount">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Account Level</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="isDetailAccount"
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(checked === true)}
                      />
                      <Label htmlFor="isDetailAccount" className="font-normal">
                        Detail Account
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only detail accounts can have transactions
                    </p>
                  </div>
                )}
              </form.Field>

              <form.Field name="status">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Status</Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => field.handleChange(v as AccountFormData['status'])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>

            <DrawerFooter className="px-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={form.state.isSubmitting || !form.state.canSubmit}
                >
                  {form.state.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formMode === 'add' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : formMode === 'add' ? (
                    'Create Account'
                  ) : (
                    'Update Account'
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>
              {accountToDelete && (
                <>
                  Are you sure you want to delete account <strong>"{accountToDelete.name}"</strong>{' '}
                  ({accountToDelete.code})?
                  <br />
                  <br />
                  This action cannot be undone. Accounts with transactions cannot be deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccountMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
