import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';
import type { Category } from '@/lib/api';

interface CategoryColumnOptions {
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export function getCategoryColumns(options: CategoryColumnOptions = {}): ColumnDef<Category>[] {
  const { onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.parentId && <span className="text-muted-foreground">└─</span>}
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'parentCategoryName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Parent Category" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue('parentCategoryName') || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Description" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.getValue('description') || 'No description'}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return (
          <Badge
            variant={status === 'active' ? 'default' : 'secondary'}
            className={
              status === 'active'
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
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ];
}

export const categoryStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
