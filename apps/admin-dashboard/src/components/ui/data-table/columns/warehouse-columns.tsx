import { ColumnDef } from '@tanstack/react-table';
import { MapPin } from 'lucide-react';
import { Badge } from '../../badge';
import { DataTableColumnHeader } from '../data-table-column-header';
import { DataTableRowActions } from '../data-table-row-actions';
import type { Warehouse } from '@/lib/api';

interface WarehouseColumnOptions {
  onView?: (warehouse: Warehouse) => void;
  onEdit?: (warehouse: Warehouse) => void;
  onDelete?: (warehouse: Warehouse) => void;
}

/**
 * Build column definitions for rendering a Warehouse data table.
 *
 * Generates an array of ColumnDef<Warehouse> that configures headers, cell renderers,
 * and a dedicated actions column which wires optional row-level handlers.
 *
 * @param options - Optional callbacks to attach to the actions column:
 *   `onView`, `onEdit`, and `onDelete` are invoked with the corresponding `Warehouse` row.
 * @returns An array of `ColumnDef<Warehouse>` ready to be passed to a react-table instance.
 */
export function getWarehouseColumns(options: WarehouseColumnOptions = {}): ColumnDef<Warehouse>[] {
  const { onView, onEdit, onDelete } = options;

  return [
    {
      accessorKey: 'code',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('code')}</span>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Warehouse Name" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue('name')}</div>
          <div className="text-sm text-muted-foreground">{row.original.addressLine1}</div>
        </div>
      ),
    },
    {
      accessorKey: 'city',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Location" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span>{row.getValue('city')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'province',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Province" />
      ),
    },
    {
      accessorKey: 'contactName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => row.getValue('contactName') || '-',
    },
    {
      accessorKey: 'contactPhone',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue('contactPhone') || '-'}</span>
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
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
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
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    },
  ];
}