import { ColumnDef } from "@tanstack/react-table";
import { Star } from "lucide-react";
import { Badge } from "../../badge";
import { DataTableColumnHeader } from "../data-table-column-header";
import { DataTableRowActions } from "../data-table-row-actions";
import type { Product, Category } from "@/lib/api";

// Helper function to get status badge color
const getStatusBadgeColor = (status: string) => {
	switch (status) {
		case "online sales":
			return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200";
		case "offline sales":
			return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200";
		case "omnichannel sales":
			return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200";
		case "inactive":
			return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200";
		case "discontinued":
			return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200";
		case "active":
			return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200";
		default:
			return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200";
	}
};

// Helper function to format status display text
const formatStatusText = (status: string) => {
	return status
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

// Helper function to get category badge color
const getCategoryBadgeColor = (color?: string | null) => {
	if (!color) {
		return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
	}

	const colorMap: Record<string, string> = {
		blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200",
		green:
			"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200",
		red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200",
		yellow:
			"bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200",
		purple:
			"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200",
		pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200",
		indigo:
			"bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200",
		orange:
			"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200",
		teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200",
		cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200",
	};

	return (
		colorMap[color.toLowerCase()] ||
		"bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200"
	);
};

// Rupiah formatter
const formatRupiah = (amount: number): string => {
	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

// Extended Product type with stock info
export interface ProductWithStock extends Product {
	stockInfo?: {
		totalStock: number;
		isLoading: boolean;
	};
}

interface ProductColumnOptions {
	categories: Category[];
	onView?: (product: ProductWithStock) => void;
	onEdit?: (product: ProductWithStock) => void;
	onDelete?: (product: ProductWithStock) => void;
}

/**
 * Build table column definitions for rendering product rows with badges, formatting, stock logic, and row actions.
 *
 * @param options - Configuration for columns:
 *   - categories: list used to resolve category name and color for the Category column
 *   - onView/onEdit/onDelete: optional callbacks invoked by the Actions column when the corresponding action is triggered
 * @returns An array of ColumnDef<ProductWithStock> describing columns for barcode, name, SKU, category (with badge), price, stock (with loading state and threshold styling), status (with badge), rating, and row actions.
 */
export function getProductColumns(
	options: ProductColumnOptions,
): ColumnDef<ProductWithStock>[] {
	const { categories, onView, onEdit, onDelete } = options;

	return [
		{
			accessorKey: "barcode",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Barcode" />
			),
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.getValue("barcode")}</span>
			),
		},
		{
			accessorKey: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Product Name" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue("name")}</span>
			),
		},
		{
			accessorKey: "sku",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="SKU"
					className="hidden lg:table-cell"
				/>
			),
			cell: ({ row }) => (
				<span className="font-mono text-sm text-muted-foreground hidden lg:table-cell">
					{row.getValue("sku")}
				</span>
			),
		},
		{
			id: "category",
			accessorFn: (row) => {
				const category = categories.find((c) => c.id === row.categoryId);
				return category?.name || "Uncategorized";
			},
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Category"
					className="hidden lg:table-cell"
				/>
			),
			cell: ({ row }) => {
				const category = categories.find(
					(c) => c.id === row.original.categoryId,
				);
				return (
					<Badge
						variant="outline"
						className={`${getCategoryBadgeColor(category?.color)} hidden lg:table-cell`}
					>
						{category?.name || "Uncategorized"}
					</Badge>
				);
			},
			filterFn: (row, id, value) => {
				return value.includes(row.getValue(id));
			},
		},
		{
			accessorKey: "price",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Price" />
			),
			cell: ({ row }) => (
				<span className="font-semibold text-right">
					{formatRupiah(row.getValue("price"))}
				</span>
			),
		},
		{
			id: "stock",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Stock" />
			),
			cell: ({ row }) => {
				const stockInfo = row.original.stockInfo;
				const currentStock = stockInfo?.totalStock ?? 0;
				const minStock = row.original.minimumStock || 50;
				const criticalStock = Math.floor(minStock * 0.4);

				if (stockInfo?.isLoading) {
					return <span className="text-muted-foreground">...</span>;
				}

				const colorClass =
					currentStock < criticalStock
						? "text-destructive font-medium"
						: currentStock < minStock
							? "text-yellow-600 font-medium"
							: "";

				return (
					<div className="flex items-center gap-1">
						<span className={colorClass}>{currentStock}</span>
						<span className="text-xs font-mono text-muted-foreground">
							{row.original.baseUnit || "PCS"}
						</span>
					</div>
				);
			},
			sortingFn: (rowA, rowB) => {
				const a = rowA.original.stockInfo?.totalStock ?? 0;
				const b = rowB.original.stockInfo?.totalStock ?? 0;
				return a - b;
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Status"
					className="hidden lg:table-cell"
				/>
			),
			cell: ({ row }) => {
				const status = row.getValue("status") as string;
				return (
					<Badge
						variant="outline"
						className={`${getStatusBadgeColor(status)} hidden lg:table-cell`}
					>
						{formatStatusText(status)}
					</Badge>
				);
			},
			filterFn: (row, id, value) => {
				return value.includes(row.getValue(id));
			},
		},
		{
			id: "rating",
			accessorKey: "rating",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					title="Rating"
					className="hidden lg:table-cell"
				/>
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-1 hidden lg:table-cell">
					<Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
					<span className="font-medium">{row.original.rating}</span>
					<span className="text-xs text-muted-foreground">
						({row.original.reviews})
					</span>
				</div>
			),
		},
		{
			id: "actions",
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

// Status filter options
export const productStatusOptions = [
	{ label: "Online Sales", value: "online sales" },
	{ label: "Offline Sales", value: "offline sales" },
	{ label: "Omnichannel Sales", value: "omnichannel sales" },
	{ label: "Inactive", value: "inactive" },
	{ label: "Discontinued", value: "discontinued" },
];
