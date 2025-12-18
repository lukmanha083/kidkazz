import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';
import type { UOM } from '@/lib/api';

interface UOMColumnOptions {
  onView?: (uom: UOM) => void;
  onEdit?: (uom: UOM) => void;
  onDelete?: (uom: UOM) => void;
}

export function getUOMColumns(options: UOMColumnOptions = {}): ColumnDef<UOM>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.getValue('code')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('name')}</span>
      ),
    },
    {
      accessorKey: 'conversionFactor',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Conversion Factor" />
      ),
      cell: ({ row }) => {
        const uom = row.original;
        return (
          <span className="font-medium">
            {uom.isBaseUnit ? (
              <span className="text-muted-foreground">1 (Base)</span>
            ) : (
              uom.conversionFactor
            )}
          </span>
        );
      },
    },
    {
      id: 'type',
      accessorKey: 'isBaseUnit',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => {
        const isBaseUnit = row.original.isBaseUnit;
        return (
          <Badge
            variant={isBaseUnit ? 'default' : 'secondary'}
            className={
              isBaseUnit
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500'
                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500'
            }
          >
            {isBaseUnit ? 'Base' : 'Custom'}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        const isBase = row.original.isBaseUnit;
        return value.includes(isBase ? 'base' : 'custom');
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={onView}
          onEdit={row.original.isBaseUnit ? undefined : onEdit}
          onDelete={row.original.isBaseUnit ? undefined : onDelete}
        />
      ),
    },
  ];
}

export const uomTypeOptions = [
  { label: 'Base', value: 'base' },
  { label: 'Custom', value: 'custom' },
];
