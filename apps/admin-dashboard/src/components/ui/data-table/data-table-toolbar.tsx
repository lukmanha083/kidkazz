import { Table } from '@tanstack/react-table';
import { X, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '../button';
import { Input } from '../input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { DataTableFacetedFilter } from './data-table-faceted-filter';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  searchPlaceholder?: string;
  filterableColumns?: {
    id: string;
    title: string;
    options: { label: string; value: string }[];
  }[];
  enableColumnVisibility?: boolean;
}

/**
 * Render a data-table toolbar with optional search, faceted column filters, a reset action, and a column visibility menu.
 *
 * Renders:
 * - A search input bound to the column identified by `searchKey` (when provided).
 * - One DataTableFacetedFilter per entry in `filterableColumns` for the matching table column.
 * - A "Reset" button when any column filters are active.
 * - A "View" dropdown that lists hideable columns with checkboxes when `enableColumnVisibility` is true.
 *
 * @param table - TanStack Table instance used to read state and manipulate column filters and visibility.
 * @param searchKey - Optional column id whose filter value is bound to the search input.
 * @param searchPlaceholder - Placeholder text for the search input.
 * @param filterableColumns - Array of faceted filter descriptors. Each item should contain:
 *   - id: the column id
 *   - title: displayed title for the facet
 *   - options: array of { label: string; value: string } used by the faceted filter
 * @param enableColumnVisibility - When true, shows the column visibility dropdown; otherwise hides it.
 * @returns The rendered toolbar React element.
 */
export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = 'Search...',
  filterableColumns = [],
  enableColumnVisibility = true,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-1 items-center gap-2 flex-wrap">
        {searchKey && (
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-8 w-full sm:w-[250px] lg:w-[300px]"
            />
          </div>
        )}
        {filterableColumns.map((column) => {
          const tableColumn = table.getColumn(column.id);
          if (!tableColumn) return null;
          return (
            <DataTableFacetedFilter
              key={column.id}
              column={tableColumn}
              title={column.title}
              options={column.options}
            />
          );
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      {enableColumnVisibility && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-8">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              View
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== 'undefined' && column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id.replace(/_/g, ' ')}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}