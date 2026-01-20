import {
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';

// Base props shared by all configurations
interface BaseDataTableProps<TData, TValue> {
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
// Manual pagination configuration - requires pageCount
interface ManualPaginationProps<TData, TValue> extends BaseDataTableProps<TData, TValue> {
  manualPagination: true;
  pageCount: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
}

// Client-side pagination configuration - pageCount is optional
interface ClientPaginationProps<TData, TValue> extends BaseDataTableProps<TData, TValue> {
  manualPagination?: false;
  pageCount?: never;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
}

// Union type for all configurations
type DataTableProps<TData, TValue> =
  | ManualPaginationProps<TData, TValue>
  | ClientPaginationProps<TData, TValue>;

/**
 * Render a configurable data table with sorting, filtering, optional server/client pagination, column visibility, and row selection.
 *
 * @param columns - Column definitions for the table.
 * @param data - Row data displayed in the table.
 * @param searchKey - Optional data key used by the toolbar search input to filter rows.
 * @param searchPlaceholder - Placeholder text for the toolbar search input.
 * @param isLoading - When true, shows a loading row instead of data rows.
 * @param enableRowSelection - When true, enables row selection UI/state.
 * @param enableColumnVisibility - When true, allows toggling column visibility via the toolbar.
 * @param enablePagination - When true, renders the pagination controls.
 * @param pageSize - Initial page size for pagination.
 * @param onRowClick - Optional callback invoked with a row's original data when that row is clicked.
 * @param filterableColumns - Array of column keys that the toolbar search can filter against.
 * @param pageCount - Required when `manualPagination` is true; total number of pages for server-side pagination.
 * @param manualPagination - When true, the table expects pagination to be controlled externally (server-side).
 * @param pagination - Optional controlled pagination state (pageIndex and pageSize).
 * @param onPaginationChange - Optional change handler to receive pagination state updates when pagination is controlled.
 *
 * @returns A React element rendering the data table.
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
  const [globalFilter, setGlobalFilter] = useState<string>('');
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Use controlled pagination if provided, otherwise use internal state
  const paginationState = controlledPagination ?? internalPagination;
  const setPaginationState = onPaginationChange ?? setInternalPagination;

  // Runtime validation for manual pagination
  if (manualPagination && pageCount === undefined) {
    console.warn(
      'DataTable: pageCount is required when manualPagination is true. ' +
        'Pagination may not work correctly without it.'
    );
  }

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
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    manualPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: paginationState,
      globalFilter,
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
      {/* Horizontal scroll wrapper for mobile/tablet */}
      <div className="overflow-x-auto -mx-4 tablet:mx-0">
        <div className="inline-block min-w-full align-middle px-4 tablet:px-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
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
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      <span className="text-muted-foreground">No results found.</span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  );
}
