import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Calculator,
} from 'lucide-react';
import { accountingApi, type ChartOfAccount } from '@/lib/api';

export const Route = createFileRoute('/dashboard/accounting/chart-of-accounts')({
  component: ChartOfAccountsPage,
});

interface AccountNode extends ChartOfAccount {
  children: AccountNode[];
  isExpanded?: boolean;
}

function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('Active');

  // Drawer states
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<ChartOfAccount | null>(null);

  // Expanded accounts tracking
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    accountType: 'Asset' as ChartOfAccount['accountType'],
    accountSubType: '',
    parentAccountId: '',
    description: '',
    taxType: '',
    isDetailAccount: true,
    status: 'Active' as ChartOfAccount['status'],
    currency: 'IDR',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await accountingApi.accounts.getAll();
      setAccounts(response.accounts);

      // Auto-expand all parent accounts initially
      const parentIds = new Set(
        response.accounts
          .filter(a => !a.isDetailAccount)
          .map(a => a.id)
      );
      setExpandedAccounts(parentIds);
    } catch (err) {
      toast.error('Failed to load accounts');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical tree structure
  const accountTree = useMemo(() => {
    const filtered = accounts.filter(account => {
      const matchesSearch =
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || account.accountType === filterType;
      const matchesStatus = filterStatus === 'all' || account.status === filterStatus;

      return matchesSearch && matchesType && matchesStatus;
    });

    const buildTree = (parentId: string | null | undefined): AccountNode[] => {
      return filtered
        .filter(account => account.parentAccountId === parentId)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(account => ({
          ...account,
          children: buildTree(account.id),
          isExpanded: expandedAccounts.has(account.id),
        }));
    };

    return buildTree(null);
  }, [accounts, searchTerm, filterType, filterStatus, expandedAccounts]);

  const toggleExpand = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const handleAddAccount = (parentId?: string) => {
    setFormMode('add');
    setFormData({
      code: '',
      name: '',
      accountType: parentId
        ? accounts.find(a => a.id === parentId)?.accountType || 'Asset'
        : 'Asset',
      accountSubType: '',
      parentAccountId: parentId || '',
      description: '',
      taxType: '',
      isDetailAccount: true,
      status: 'Active',
      currency: 'IDR',
    });
    setFormDrawerOpen(true);
  };

  const handleEditAccount = (account: ChartOfAccount) => {
    setFormMode('edit');
    setSelectedAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      accountSubType: account.accountSubType || '',
      parentAccountId: account.parentAccountId || '',
      description: account.description || '',
      taxType: account.taxType || '',
      isDetailAccount: account.isDetailAccount,
      status: account.status,
      currency: account.currency,
    });
    setFormDrawerOpen(true);
  };

  const handleDeleteAccount = (account: ChartOfAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    try {
      await accountingApi.accounts.delete(accountToDelete.id);
      setAccounts(accounts.filter(a => a.id !== accountToDelete.id));
      toast.success('Account deleted successfully');
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (formMode === 'add') {
        const response = await accountingApi.accounts.create(formData);
        setAccounts([...accounts, response.account]);
        toast.success('Account created successfully');
      } else if (formMode === 'edit' && selectedAccount) {
        const response = await accountingApi.accounts.update(selectedAccount.id, formData);
        setAccounts(accounts.map(a =>
          a.id === selectedAccount.id ? response.account : a
        ));
        toast.success('Account updated successfully');
      }
      setFormDrawerOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  // Get account type badge color
  const getAccountTypeBadge = (type: string) => {
    const colors = {
      Asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      Equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      COGS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Expense: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[type as keyof typeof colors] || '';
  };

  // Render account row with hierarchy
  const renderAccountRow = (account: AccountNode, level: number = 0) => {
    const hasChildren = account.children.length > 0;
    const isExpanded = account.isExpanded;
    const indent = level * 24;

    return (
      <>
        <TableRow key={account.id} className="hover:bg-muted/50">
          <TableCell>
            <div className="flex items-center" style={{ paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 mr-2"
                  onClick={() => toggleExpand(account.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="w-6 mr-2" />
              )}

              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                ) : (
                  <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
                )
              ) : (
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
              )}

              <div>
                <div className="font-medium">{account.name}</div>
                {account.description && (
                  <div className="text-xs text-muted-foreground">{account.description}</div>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="font-mono text-sm">{account.code}</TableCell>
          <TableCell>
            <Badge className={getAccountTypeBadge(account.accountType)}>
              {account.accountType}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {account.accountSubType || '-'}
          </TableCell>
          <TableCell>
            <Badge variant={account.isDetailAccount ? 'default' : 'secondary'}>
              {account.isDetailAccount ? 'Detail' : 'Header'}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant={account.status === 'Active' ? 'default' : 'secondary'}
              className={
                account.status === 'Active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                  : ''
              }
            >
              {account.status}
            </Badge>
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleAddAccount(account.id)}
                title="Add sub-account"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEditAccount(account)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {!account.isSystemAccount && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteAccount(account)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>

        {isExpanded && account.children.map(child => renderAccountRow(child, level + 1))}
      </>
    );
  };

  // Get parent account options (excluding descendants to prevent circular references)
  const getParentAccountOptions = (): ChartOfAccount[] => {
    if (formMode === 'add') {
      return accounts.filter(a => !a.isDetailAccount && a.status === 'Active');
    }

    // For edit mode, exclude the account itself and its descendants
    const getDescendantIds = (accountId: string): string[] => {
      const children = accounts.filter(a => a.parentAccountId === accountId);
      return [
        accountId,
        ...children.flatMap(child => getDescendantIds(child.id))
      ];
    };

    const excludeIds = selectedAccount ? getDescendantIds(selectedAccount.id) : [];
    return accounts.filter(a =>
      !a.isDetailAccount &&
      a.status === 'Active' &&
      !excludeIds.includes(a.id)
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Calculator className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-2 text-sm text-muted-foreground">Loading chart of accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account hierarchy and structure
          </p>
        </div>
        <Button onClick={() => handleAddAccount()} className="gap-2">
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
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">All account types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets</CardTitle>
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.accountType === 'Asset').length}
            </div>
            <p className="text-xs text-muted-foreground">Asset accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <div className="h-3 w-3 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.accountType === 'Revenue').length}
            </div>
            <p className="text-xs text-muted-foreground">Revenue accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accounts.filter(a => a.accountType === 'Expense').length}
            </div>
            <p className="text-xs text-muted-foreground">Expense accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Accounts</CardTitle>
              <CardDescription>
                {accountTree.reduce((sum, node) => {
                  const countNodes = (n: AccountNode): number =>
                    1 + n.children.reduce((s, c) => s + countNodes(c), 0);
                  return sum + countNodes(node);
                }, 0)} accounts in hierarchy
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Asset">Asset</SelectItem>
                  <SelectItem value="Liability">Liability</SelectItem>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Revenue">Revenue</SelectItem>
                  <SelectItem value="COGS">COGS</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">Account Name</TableHead>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[150px]">Sub-Type</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountTree.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No accounts found. Click "Add Account" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  accountTree.map(account => renderAccountRow(account, 0))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Account Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle>
              {formMode === 'add' ? 'Add New Account' : 'Edit Account'}
            </DrawerTitle>
            <DrawerDescription>
              {formMode === 'add'
                ? 'Create a new account in your chart of accounts'
                : 'Update account information'}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Account Code *</Label>
                <Input
                  id="code"
                  placeholder="1000"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={formMode === 'edit'}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  4-digit code (e.g., 1000-1999 for Assets)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                placeholder="Cash and Cash Equivalents"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type *</Label>
                <Select
                  value={formData.accountType}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, accountType: value })
                  }
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountSubType">Sub-Type</Label>
                <Input
                  id="accountSubType"
                  placeholder="Current Asset"
                  value={formData.accountSubType}
                  onChange={(e) => setFormData({ ...formData, accountSubType: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentAccountId">Parent Account</Label>
              <Select
                value={formData.parentAccountId}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentAccountId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None (Top level)</SelectItem>
                  {getParentAccountOptions().map(account => (
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Account description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Level</Label>
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isDetailAccount"
                    checked={formData.isDetailAccount}
                    onChange={(e) =>
                      setFormData({ ...formData, isDetailAccount: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="isDetailAccount" className="font-normal">
                    Detail Account
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only detail accounts can have transactions
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, status: value })
                  }
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
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create Account' : 'Update Account'}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
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
                  Are you sure you want to delete account <strong>"{accountToDelete.name}"</strong> ({accountToDelete.code})?
                  <br /><br />
                  This action cannot be undone. This will permanently delete the account
                  and all its data. Accounts with transactions cannot be deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
