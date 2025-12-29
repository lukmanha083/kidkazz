import { Table } from "@tanstack/react-table";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
} from "lucide-react";
import { Button } from "../button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../select";

interface DataTablePaginationProps<TData> {
	table: Table<TData>;
	pageSizeOptions?: number[];
}

/**
 * Render pagination controls, current-range status, and a rows-per-page selector for a TanStack Table instance.
 *
 * Renders a status area showing either selected-row count or the visible range and total entries, a configurable
 * "rows per page" Select, a page indicator, and first/previous/next/last navigation buttons wired to the provided table.
 *
 * @param table - The TanStack Table instance to control and reflect pagination state for.
 * @param pageSizeOptions - Optional list of numeric page-size options shown in the rows-per-page selector (default: [10, 20, 30, 50, 100]).
 * @returns A React element containing pagination UI connected to the supplied table instance.
 */
export function DataTablePagination<TData>({
	table,
	pageSizeOptions = [10, 20, 30, 50, 100],
}: DataTablePaginationProps<TData>) {
	return (
		<div className="flex flex-col tablet:flex-row items-center justify-between gap-4 px-2">
			{/* Row count - Hidden on mobile */}
			<div className="hidden tablet:flex tablet:flex-1 text-sm text-muted-foreground">
				{table.getFilteredSelectedRowModel().rows.length > 0 && (
					<span>
						{table.getFilteredSelectedRowModel().rows.length} of{" "}
						{table.getFilteredRowModel().rows.length} row(s) selected.
					</span>
				)}
				{table.getFilteredSelectedRowModel().rows.length === 0 && (
					<span>
						Showing{" "}
						{table.getState().pagination.pageIndex *
							table.getState().pagination.pageSize +
							1}{" "}
						to{" "}
						{Math.min(
							(table.getState().pagination.pageIndex + 1) *
								table.getState().pagination.pageSize,
							table.getFilteredRowModel().rows.length,
						)}{" "}
						of {table.getFilteredRowModel().rows.length} entries
					</span>
				)}
			</div>
			<div className="flex items-center gap-4 tablet:gap-6 desktop:gap-8">
				{/* Rows per page - Hidden on mobile */}
				<div className="hidden tablet:flex items-center gap-2">
					<p className="text-sm font-medium">Rows per page</p>
					<Select
						value={`${table.getState().pagination.pageSize}`}
						onValueChange={(value) => {
							table.setPageSize(Number(value));
						}}
					>
						<SelectTrigger className="h-8 w-[70px]">
							<SelectValue placeholder={table.getState().pagination.pageSize} />
						</SelectTrigger>
						<SelectContent side="top">
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={`${size}`}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{/* Page indicator */}
				<div className="flex items-center justify-center text-sm font-medium min-w-[100px]">
					Page {table.getState().pagination.pageIndex + 1} of{" "}
					{table.getPageCount()}
				</div>
				{/* Pagination controls */}
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						className="hidden desktop:flex h-8 w-8 p-0"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to first page</span>
						<ChevronsLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Go to previous page</span>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to next page</span>
						<ChevronRight className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="hidden desktop:flex h-8 w-8 p-0"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Go to last page</span>
						<ChevronsRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
