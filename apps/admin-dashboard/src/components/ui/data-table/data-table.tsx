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
} from "@tanstack/react-table";
import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../table";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableToolbar } from "./data-table-toolbar";
import { Loader2 } from "lucide-react";

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

// Manual pagination configuration - requires pageCount
interface ManualPaginationProps<TData, TValue>
	extends BaseDataTableProps<TData, TValue> {
	manualPagination: true;
	pageCount: number;
	pagination?: PaginationState;
	onPaginationChange?: OnChangeFn<PaginationState>;
}

// Client-side pagination configuration - pageCount is optional
interface ClientPaginationProps<TData, TValue>
	extends BaseDataTableProps<TData, TValue> {
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
	const [internalPagination, setInternalPagination] = useState<PaginationState>(
		{
			pageIndex: 0,
			pageSize,
		},
	);

	// Use controlled pagination if provided, otherwise use internal state
	const paginationState = controlledPagination ?? internalPagination;
	const setPaginationState = onPaginationChange ?? setInternalPagination;

	// Runtime validation for manual pagination
	if (manualPagination && pageCount === undefined) {
		console.warn(
			"DataTable: pageCount is required when manualPagination is true. " +
				"Pagination may not work correctly without it.",
		);
	}

	const table = useReactTable({
		data,
		columns,
		pageCount: manualPagination ? pageCount : undefined,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: manualPagination
			? undefined
			: getPaginationRowModel(),
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
													header.getContext(),
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
									data-state={row.getIsSelected() && "selected"}
									className={onRowClick ? "cursor-pointer" : ""}
									onClick={() => onRowClick?.(row.original)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
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
									<span className="text-muted-foreground">
										No results found.
									</span>
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