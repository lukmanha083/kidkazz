import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
  OnChangeFn,
  PaginationState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { Loader2 } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
  onRowClick?: (row: TData) => void;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string }[];
  }[];
  // Server-side pagination support
  pageCount?: number;
  manualPagination?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
}

/**
 * Render a configurable data table with sorting, filtering, column visibility, row selection, and optional client- or server-side pagination.
 *
 * This component wires @tanstack/react-table state and behavior to the local Table, DataTableToolbar, and DataTablePagination UI components and handles loading and empty states.
 *
 * @param columns - Column definitions for the table.
 * @param data - Array of rows to render.
 * @param searchKey - Optional key used by the toolbar search input to filter rows.
 * @param searchPlaceholder - Optional placeholder text for the toolbar search input.
 * @param isLoading - If true, displays a loading row instead of data.
 * @param enableRowSelection - Enable per-row selection UI and state.
 * @param enableColumnVisibility - Enable column visibility toggles in the toolbar.
 * @param enablePagination - Show pagination controls and enable paging behavior.
 * @param pageSize - Default number of rows per page when using internal pagination.
 * @param onRowClick - Optional callback invoked with the row's original data when a row is clicked.
 * @param filterableColumns - Configuration for filter UI shown in the toolbar. Each item should include `id`, `title`, and `options` (array of `{ label, value }`).
 * @param pageCount - Total number of pages (required for server-side/manual pagination).
 * @param manualPagination - When true, the table expects server-side pagination and will not compute pagination client-side.
 * @param pagination - Optional controlled pagination state ({ pageIndex, pageSize }); when provided, the component uses this instead of internal pagination.
 * @param onPaginationChange - Optional change handler for controlled pagination state.
 *
 * @returns A JSX element containing the configured data table, toolbar, and optional pagination controls.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  isLoading = false,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enablePagination = true,
  pageSize = 10,
  onRowClick,
  filterableColumns = [],
  // Server-side pagination
  pageCount,
  manualPagination = false,
  pagination: controlledPagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Use controlled pagination if provided, otherwise use internal state
  const paginationState = controlledPagination ?? internalPagination;
  const setPaginationState = onPaginationChange ?? setInternalPagination;

  const table = useReactTable({
    data,
    columns,
    pageCount: manualPagination ? pageCount : undefined,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPaginationState,
    manualPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
    },
    enableRowSelection,
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        filterableColumns={filterableColumns}
        enableColumnVisibility={enableColumnVisibility}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <span className="text-muted-foreground">No results found.</span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  );
}