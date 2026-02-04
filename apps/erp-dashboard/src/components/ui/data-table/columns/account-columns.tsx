import type { ChartOfAccount } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';
import { FileText, Folder } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';

interface AccountColumnOptions {
  onView?: (account: ChartOfAccount) => void;
  onEdit?: (account: ChartOfAccount) => void;
  onDelete?: (account: ChartOfAccount) => void;
}

export const accountTypeOptions = [
  { label: 'Asset', value: 'Asset' },
  { label: 'Liability', value: 'Liability' },
  { label: 'Equity', value: 'Equity' },
  { label: 'Revenue', value: 'Revenue' },
  { label: 'COGS', value: 'COGS' },
  { label: 'Expense', value: 'Expense' },
];

export const accountStatusOptions = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Archived', value: 'Archived' },
];

/**
 * Get account type badge styling
 */
function getAccountTypeBadgeClass(type: string): string {
  const colors: Record<string, string> = {
    Asset: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Liability: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    Equity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Revenue: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    COGS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Expense: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return colors[type] || '';
}

export function getAccountColumns(options: AccountColumnOptions = {}): ColumnDef<ChartOfAccount>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Account Name" />,
      cell: ({ row }) => {
        const isDetail = row.original.isDetailAccount;
        return (
          <div className="flex items-center gap-2">
            {isDetail ? (
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <div>
              <div className="font-medium">{row.getValue('name')}</div>
              {row.original.description && (
                <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {row.original.description}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => (
        <span className="hidden lg:inline font-mono text-sm">{row.getValue('code')}</span>
      ),
    },
    {
      accessorKey: 'accountType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const type = row.getValue('accountType') as string;
        return <Badge className={getAccountTypeBadgeClass(type)}>{type}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'accountSubType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sub-Type" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const subType = row.getValue('accountSubType') as string | undefined;
        return (
          <span className="hidden lg:inline text-sm text-muted-foreground">{subType || '-'}</span>
        );
      },
    },
    {
      accessorKey: 'isDetailAccount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Level" />,
      cell: ({ row }) => {
        const isDetail = row.getValue('isDetailAccount') as boolean;
        return (
          <Badge variant={isDetail ? 'default' : 'secondary'}>
            {isDetail ? 'Detail' : 'Header'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
          Active: 'default',
          Inactive: 'secondary',
          Archived: 'outline',
        };
        return (
          <Badge
            variant={variants[status] || 'secondary'}
            className={
              status === 'Active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                : ''
            }
          >
            {status}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        // Don't allow delete for system accounts
        const canDelete = !row.original.isSystemAccount;
        return (
          <DataTableRowActions
            row={row}
            onView={onView}
            onEdit={onEdit}
            onDelete={canDelete ? onDelete : undefined}
          />
        );
      },
    },
  ];
}
