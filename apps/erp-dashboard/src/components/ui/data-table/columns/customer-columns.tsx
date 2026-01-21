import type { Customer } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';
import { Mail, Phone } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';

interface CustomerColumnOptions {
  onView?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export const customerStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Blocked', value: 'blocked' },
];

export const customerTypeOptions = [
  { label: 'Retail', value: 'retail' },
  { label: 'Wholesale', value: 'wholesale' },
];

export function getCustomerColumns(options: CustomerColumnOptions = {}): ColumnDef<Customer>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue('code')}</span>,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('name')}</div>
          {row.original.companyName && (
            <div className="text-sm text-muted-foreground">{row.original.companyName}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'customerType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => {
        const type = row.getValue('customerType') as string;
        return <Badge variant={type === 'wholesale' ? 'default' : 'secondary'}>{type}</Badge>;
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" className="hidden md:table-cell" />
      ),
      cell: ({ row }) => {
        const email = row.original.email;
        const phone = row.original.phone;
        return (
          <div className="hidden md:block space-y-1">
            {email && (
              <div className="flex items-center gap-1 text-sm">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{email}</span>
              </div>
            )}
            {phone && (
              <div className="flex items-center gap-1 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{phone}</span>
              </div>
            )}
            {!email && !phone && <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'membershipTier',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tier" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const tier = row.getValue('membershipTier') as string | null;
        const type = row.original.customerType;
        if (type === 'wholesale' || !tier) {
          return <span className="hidden lg:inline text-muted-foreground">-</span>;
        }
        const tierColors: Record<string, 'default' | 'secondary' | 'outline'> = {
          gold: 'default',
          silver: 'secondary',
          bronze: 'outline',
        };
        return (
          <span className="hidden lg:inline">
            <Badge variant={tierColors[tier] || 'outline'}>{tier}</Badge>
          </span>
        );
      },
    },
    {
      accessorKey: 'totalOrders',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Orders" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => <span className="hidden lg:inline">{row.getValue('totalOrders')}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
          active: 'default',
          inactive: 'secondary',
          blocked: 'destructive',
        };
        return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
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
