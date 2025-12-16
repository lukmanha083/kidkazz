import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';

// Low stock item type
export interface LowStockItem {
  productId: string;
  sku: string;
  name: string;
  warehouse: string;
  currentStock: number;
  minStock: number;
  status: 'Critical' | 'Low';
}

export function getLowStockColumns(): ColumnDef<LowStockItem>[] {
  return [
    {
      accessorKey: 'sku',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SKU" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('sku')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'warehouse',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Warehouse" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('warehouse')}</span>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'currentStock',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Current Stock" />
      ),
      cell: ({ row }) => {
        const currentStock = row.getValue('currentStock') as number;
        const minStock = row.original.minStock;
        const isCritical = currentStock <= Math.floor(minStock * 0.4);

        return (
          <span className={isCritical ? 'text-destructive font-medium' : ''}>
            {currentStock}
          </span>
        );
      },
    },
    {
      accessorKey: 'minStock',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Min Stock" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue('minStock')}</span>
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
            variant="outline"
            className={
              status === 'Critical'
                ? 'bg-destructive/10 text-destructive border-destructive/30'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500 border-yellow-200'
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
  ];
}

// Status filter options for low stock table
export const lowStockStatusOptions = [
  { label: 'Critical', value: 'Critical' },
  { label: 'Low', value: 'Low' },
];
