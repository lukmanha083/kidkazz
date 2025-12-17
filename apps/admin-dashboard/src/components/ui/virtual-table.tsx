import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { cn } from "../../lib/utils";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

interface VirtualTableColumn<TData> {
	header: string;
	accessor: keyof TData | ((row: TData) => React.ReactNode);
	className?: string;
	headerClassName?: string;
}

interface VirtualTableProps<TData> {
	columns: VirtualTableColumn<TData>[];
	data: TData[];
	rowHeight?: number;
	overscan?: number;
	maxHeight?: string;
	onRowClick?: (row: TData, index: number) => void;
	getRowId?: (row: TData, index: number) => string;
	isLoading?: boolean;
	emptyMessage?: string;
	stickyHeader?: boolean;
}

/**
 * VirtualTable - High-performance table component for large datasets (1,000-10,000+ rows)
 *
 * Features:
 * - Virtualized scrolling (only renders visible rows)
 * - Sticky header support
 * - Custom row height
 * - Row click handlers
 * - Optimized for large datasets
 *
 * Use Cases (from roadmap):
 * - Inventory List (1,000-10,000 items) - Recommended
 * - Movement History (10,000+) - Required
 * - Stock Opname Count (1,000-5,000) - Recommended
 * - Batch Lists (expiring, all batches)
 */
export function VirtualTable<TData>({
	columns,
	data,
	rowHeight = 52,
	overscan = 5,
	maxHeight = "600px",
	onRowClick,
	getRowId,
	isLoading = false,
	emptyMessage = "No results found.",
	stickyHeader = true,
}: VirtualTableProps<TData>) {
	const parentRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: data.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => rowHeight,
		overscan,
	});

	const items = virtualizer.getVirtualItems();
	const totalSize = virtualizer.getTotalSize();

	// Calculate padding for virtual scrolling
	const paddingTop = items.length > 0 ? (items[0]?.start ?? 0) : 0;
	const paddingBottom =
		items.length > 0 ? totalSize - (items[items.length - 1]?.end ?? 0) : 0;

	if (isLoading) {
		return (
			<div className="rounded-md border" style={{ height: maxHeight }}>
				<div className="flex h-full items-center justify-center">
					<div className="flex items-center gap-2">
						<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						<span className="text-muted-foreground">Loading...</span>
					</div>
				</div>
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className="rounded-md border" style={{ height: maxHeight }}>
				<div className="flex h-full items-center justify-center">
					<span className="text-muted-foreground">{emptyMessage}</span>
				</div>
			</div>
		);
	}

	return (
		<div
			ref={parentRef}
			className="relative overflow-auto rounded-md border"
			style={{ height: maxHeight }}
		>
			<Table>
				<TableHeader
					className={cn(
						stickyHeader && "sticky top-0 z-10 bg-background",
						"border-b",
					)}
				>
					<TableRow>
						{columns.map((col, idx) => (
							<TableHead
								key={idx}
								className={cn("whitespace-nowrap", col.headerClassName)}
							>
								{col.header}
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* Top padding for virtual scrolling */}
					{paddingTop > 0 && (
						<tr key="padding-top">
							<td
								colSpan={columns.length}
								style={{ height: `${paddingTop}px` }}
							/>
						</tr>
					)}

					{/* Render only visible rows */}
					{items.map((virtualRow) => {
						const row = data[virtualRow.index];
						const rowId = getRowId
							? getRowId(row, virtualRow.index)
							: `row-${virtualRow.index}`;

						return (
							<TableRow
								key={rowId}
								data-index={virtualRow.index}
								style={{ height: `${rowHeight}px` }}
								className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
								onClick={() => onRowClick?.(row, virtualRow.index)}
							>
								{columns.map((col, colIdx) => {
									const value =
										typeof col.accessor === "function"
											? col.accessor(row)
											: String(row[col.accessor] ?? "");

									return (
										<TableCell key={colIdx} className={cn(col.className)}>
											{value}
										</TableCell>
									);
								})}
							</TableRow>
						);
					})}

					{/* Bottom padding for virtual scrolling */}
					{paddingBottom > 0 && (
						<tr key="padding-bottom">
							<td
								colSpan={columns.length}
								style={{ height: `${paddingBottom}px` }}
							/>
						</tr>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
