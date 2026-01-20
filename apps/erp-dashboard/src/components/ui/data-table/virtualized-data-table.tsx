import { cn } from '@/lib/utils';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { DataTableToolbar } from './data-table-toolbar';

interface VirtualizedDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  enableRowSelection?: boolean;
  enableColumnVisibility?: boolean;
  onRowClick?: (row: TData) => void;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string }[];
  }[];
  rowHeight?: number;
  overscan?: number;
  maxHeight?: string;
}

/**
 * Renders a virtualized data table that combines TanStack Table features (sorting, filtering, column visibility, optional row selection)
 * with TanStack Virtual for performant scrolling of large datasets.
 *
 * Designed for large lists where rendering all rows is undesirable; provides a sticky header, toolbar with search/filter controls, loading and empty states,
 * and optional row click handling. Inserts top and bottom padding rows to preserve scroll space while only mounting visible rows.
 *
 * @returns A React element that displays the virtualized data table UI.
 */
export function VirtualizedDataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder,
  isLoading = false,
  enableRowSelection = false,
  enableColumnVisibility = true,
  onRowClick,
  filterableColumns = [],
  rowHeight = 52,
  overscan = 10,
  maxHeight = '600px',
}: VirtualizedDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection,
  });

  // Get filtered rows from TanStack Table
  const { rows } = table.getRowModel();

  // Setup virtual scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return (
    <div className="space-y-4">
      <DataTableToolbar
        table={table}
        searchKey={searchKey}
        searchPlaceholder={searchPlaceholder}
        filterableColumns={filterableColumns}
        enableColumnVisibility={enableColumnVisibility}
      />

      <div
        ref={tableContainerRef}
        className="relative overflow-auto rounded-md border"
        style={{ height: maxHeight }}
      >
        <Table>
          {/* Sticky Header */}
          <TableHeader className="sticky top-0 z-10 bg-background">
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
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  <span className="text-muted-foreground">No results found.</span>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {/* Top padding for virtual scrolling */}
                {paddingTop > 0 && (
                  <tr key="padding-top">
                    <td
                      colSpan={table.getVisibleLeafColumns().length}
                      style={{ height: `${paddingTop}px` }}
                    />
                  </tr>
                )}

                {/* Render only visible rows */}
                {virtualRows.map((virtualRow) => {
                  const row = rows[virtualRow.index];

                  return (
                    <TableRow
                      key={row.id}
                      data-index={virtualRow.index}
                      data-state={row.getIsSelected() && 'selected'}
                      className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50')}
                      onClick={() => onRowClick?.(row.original)}
                      style={{ height: `${rowHeight}px` }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}

                {/* Bottom padding for virtual scrolling */}
                {paddingBottom > 0 && (
                  <tr key="padding-bottom">
                    <td
                      colSpan={table.getVisibleLeafColumns().length}
                      style={{ height: `${paddingBottom}px` }}
                    />
                  </tr>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-2 text-sm text-muted-foreground">
        <div>
          Showing {virtualRows.length} of {rows.length} rows
          {enableRowSelection && (
            <span className="ml-2">
              ({table.getFilteredSelectedRowModel().rows.length} selected)
            </span>
          )}
        </div>
        <div className="text-xs">Virtualized rendering - only visible rows are in the DOM</div>
      </div>
    </div>
  );
}
