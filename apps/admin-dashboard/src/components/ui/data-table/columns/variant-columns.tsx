import { ColumnDef } from '@tanstack/react-table';
import { Palette } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';
import type { ProductVariant } from '@/lib/api';

// Rupiah currency formatter
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get variant type badge color
const getVariantTypeBadge = (type: string) => {
  const colors: Record<string, string> = {
    Color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Size: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Material: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    Style: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };
  return colors[type] || '';
};

interface VariantColumnOptions {
  onView?: (variant: ProductVariant) => void;
  onEdit?: (variant: ProductVariant) => void;
  onDelete?: (variant: ProductVariant) => void;
}

/**
 * Create column definitions for rendering a product variants table.
 *
 * The returned columns include product/variant identifiers, type and status badges,
 * price formatted as Indonesian Rupiah, stock with conditional styling, and row actions.
 *
 * @param options - Optional callbacks for row actions.
 * @param options.onView - Called with the variant when the view action is triggered.
 * @param options.onEdit - Called with the variant when the edit action is triggered.
 * @param options.onDelete - Called with the variant when the delete action is triggered.
 * @returns An array of ColumnDef<ProductVariant> describing columns for the variants table.
 */
export function getVariantColumns(options: VariantColumnOptions = {}): ColumnDef<ProductVariant>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'productName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('productName')}</span>
      ),
    },
    {
      accessorKey: 'productSKU',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Product SKU" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.getValue('productSKU')}
        </span>
      ),
    },
    {
      accessorKey: 'variantName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Variant Name" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('variantName')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'variantSKU',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Variant SKU" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.getValue('variantSKU')}
        </span>
      ),
    },
    {
      accessorKey: 'variantType',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const type = row.getValue('variantType') as string;
        return (
          <Badge className={getVariantTypeBadge(type)}>
            {type}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: 'price',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Price" />
      ),
      cell: ({ row }) => (
        <span className="font-semibold">{formatRupiah(row.getValue('price'))}</span>
      ),
    },
    {
      accessorKey: 'stock',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Stock" />
      ),
      cell: ({ row }) => {
        const stock = row.getValue('stock') as number;
        return (
          <span
            className={
              stock < 10
                ? 'text-destructive font-medium'
                : stock < 30
                ? 'text-yellow-600 font-medium'
                : ''
            }
          >
            {stock}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const isActive = status === 'Active' || status === 'active';
        return (
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={
              isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                : ''
            }
          >
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
        <DataTableRowActions
          row={row}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ];
}

export const variantTypeOptions = [
  { label: 'Color', value: 'Color' },
  { label: 'Size', value: 'Size' },
  { label: 'Material', value: 'Material' },
  { label: 'Style', value: 'Style' },
];

export const variantStatusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];