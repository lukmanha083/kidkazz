import type { ProductBundle } from '@/lib/api';
import type { ColumnDef } from '@tanstack/react-table';
import { Gift } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';

// Rupiah currency formatter
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface BundleColumnOptions {
  onView?: (bundle: ProductBundle) => void;
  onEdit?: (bundle: ProductBundle) => void;
  onDelete?: (bundle: ProductBundle) => void;
}

/**
 * Builds column definitions for displaying ProductBundle data in a data table.
 *
 * Generates columns for bundle name and description, SKU, a static "Products" badge,
 * price formatted as Indonesian Rupiah, discount percentage, status with badge styling,
 * and row actions wired to optional callbacks.
 *
 * @param options - Optional callbacks for row actions.
 *   - onView: Called with the ProductBundle when the row's view action is triggered.
 *   - onEdit: Called with the ProductBundle when the row's edit action is triggered.
 *   - onDelete: Called with the ProductBundle when the row's delete action is triggered.
 * @returns An array of ColumnDef<ProductBundle> representing the table columns.
 */
export function getBundleColumns(options: BundleColumnOptions = {}): ColumnDef<ProductBundle>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'bundleName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Bundle Name" />,
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('bundleName')}</div>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {row.original.bundleDescription}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'bundleSKU',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="SKU" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm hidden lg:inline">{row.getValue('bundleSKU')}</span>
      ),
    },
    {
      id: 'products',
      header: () => <span>Products</span>,
      cell: () => (
        <Badge variant="outline">
          <Gift className="h-3 w-3 mr-1" />
          Bundle
        </Badge>
      ),
    },
    {
      accessorKey: 'bundlePrice',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => (
        <span className="font-semibold">{formatRupiah(row.getValue('bundlePrice'))}</span>
      ),
    },
    {
      accessorKey: 'discountPercentage',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Discount" />,
      cell: ({ row }) => <Badge variant="secondary">{row.getValue('discountPercentage')}%</Badge>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" className="hidden lg:table-cell" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const isActive = status === 'active';
        return (
          <Badge variant={isActive ? 'default' : 'secondary'} className="hidden lg:table-cell">
            {status}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const status = row.getValue(id) as string;
        return value.includes(status.toLowerCase());
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

export const bundleStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
