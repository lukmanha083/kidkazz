import type { Supplier } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';
import { Building2, Mail, Phone, Star } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';

interface SupplierColumnOptions {
  onView?: (supplier: Supplier) => void;
  onEdit?: (supplier: Supplier) => void;
  onDelete?: (supplier: Supplier) => void;
}

export const supplierStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Blocked', value: 'blocked' },
];

export function getSupplierColumns(options: SupplierColumnOptions = {}): ColumnDef<Supplier>[] {
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
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span>{row.original.companyName}</span>
            </div>
          )}
        </div>
      ),
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
      accessorKey: 'paymentTermDays',
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Payment Terms"
          className="hidden lg:table-cell"
        />
      ),
      cell: ({ row }) => {
        const days = row.getValue('paymentTermDays') as number | null;
        if (days == null) return <span className="hidden lg:inline text-muted-foreground">-</span>;
        return <span className="hidden lg:inline">{days} days</span>;
      },
    },
    {
      accessorKey: 'leadTimeDays',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Lead Time" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const days = row.getValue('leadTimeDays') as number | null;
        if (days == null) return <span className="hidden lg:inline text-muted-foreground">-</span>;
        return <span className="hidden lg:inline">{days} days</span>;
      },
    },
    {
      accessorKey: 'rating',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Rating" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const rating = row.getValue('rating') as number | null;
        if (rating == null)
          return <span className="hidden lg:inline text-muted-foreground">-</span>;
        return (
          <div className="hidden lg:flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            <span>{rating.toFixed(1)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'totalOrders',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Orders" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const totalOrders = row.getValue('totalOrders') as number | null;
        if (totalOrders == null)
          return <span className="hidden lg:inline text-muted-foreground">-</span>;
        return <span className="hidden lg:inline">{totalOrders}</span>;
      },
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
