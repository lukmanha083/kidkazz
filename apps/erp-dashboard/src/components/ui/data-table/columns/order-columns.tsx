import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle, Package, Truck } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';

// Order interface
export interface Order {
  id: string;
  customer: string;
  email: string;
  product: string;
  quantity: number;
  amount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  date: string;
}

// Status colors mapping
const statusColors = {
  Pending:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200',
  Processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  Shipped:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  Delivered:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200',
  Cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200',
};

// Status icons mapping
const statusIcons = {
  Pending: Package,
  Processing: Package,
  Shipped: Truck,
  Delivered: CheckCircle,
  Cancelled: Package,
};

interface OrderColumnOptions {
  onView?: (order: Order) => void;
  onEdit?: (order: Order) => void;
  onDelete?: (order: Order) => void;
}

/**
 * Build column definitions for an orders data table, including display and action cells.
 *
 * @param options - Optional callbacks to wire row actions:
 *   - `onView(order)` invoked when a row's view action is triggered.
 *   - `onEdit(order)` invoked when a row's edit action is triggered.
 *   - `onDelete(order)` invoked when a row's delete action is triggered.
 * @returns An array of `ColumnDef<Order>` describing columns for Order ID, customer, product, quantity, amount, date, status (with colored badge and icon), and row actions.
 */
export function getOrderColumns(options: OrderColumnOptions = {}): ColumnDef<Order>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'id',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Order ID" />,
      cell: ({ row }) => <span className="font-mono font-medium">{row.getValue('id')}</span>,
    },
    {
      id: 'customer',
      accessorFn: (row) => row.customer,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div>
            <p className="font-medium">{order.customer}</p>
            <p className="text-xs text-muted-foreground">{order.email}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'product',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
      cell: ({ row }) => <span>{row.getValue('product')}</span>,
    },
    {
      accessorKey: 'quantity',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Quantity" />,
      cell: ({ row }) => <div className="text-center">{row.getValue('quantity')}</div>,
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number;
        return <span className="font-semibold">${amount.toFixed(2)}</span>;
      },
    },
    {
      accessorKey: 'date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
      cell: ({ row }) => {
        const dateString = row.getValue('date') as string;
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(dateString).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as keyof typeof statusColors;
        const StatusIcon = statusIcons[status];
        return (
          <Badge variant="outline" className={statusColors[status]}>
            <StatusIcon className="h-3 w-3 mr-1.5" />
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
        <DataTableRowActions row={row} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      ),
    },
  ];
}

// Status filter options
export const orderStatusOptions = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Processing', value: 'Processing' },
  { label: 'Shipped', value: 'Shipped' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
];
