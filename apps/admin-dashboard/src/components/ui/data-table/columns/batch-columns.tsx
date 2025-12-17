import { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "../../badge";
import { DataTableColumnHeader } from "../data-table-column-header";
import { DataTableRowActions } from "../data-table-row-actions";
import type { InventoryBatch } from "@/lib/api";

// Helper function to calculate days until expiration
const calculateDaysUntilExpiration = (
	expirationDate: string | null,
): number => {
	if (!expirationDate) return Infinity;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const expDate = new Date(expirationDate);
	expDate.setHours(0, 0, 0, 0);
	return Math.ceil(
		(expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
	);
};

// Helper function to get expiration badge
const getExpirationBadge = (expirationDate: string | null) => {
	if (!expirationDate) {
		return (
			<Badge variant="outline" className="bg-gray-100">
				No Expiration
			</Badge>
		);
	}

	const days = calculateDaysUntilExpiration(expirationDate);

	if (days < 0) {
		return (
			<Badge variant="destructive" className="flex items-center gap-1">
				<AlertTriangle className="h-3 w-3" />
				Expired ({Math.abs(days)}d ago)
			</Badge>
		);
	} else if (days <= 7) {
		return (
			<Badge
				variant="destructive"
				className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1"
			>
				<Clock className="h-3 w-3" />
				{days}d left
			</Badge>
		);
	} else if (days <= 30) {
		return (
			<Badge
				variant="outline"
				className="bg-yellow-100 text-yellow-800 border-yellow-300 flex items-center gap-1"
			>
				<Clock className="h-3 w-3" />
				{days}d left
			</Badge>
		);
	} else {
		return (
			<Badge
				variant="outline"
				className="bg-green-100 text-green-800 border-green-300"
			>
				{days}d left
			</Badge>
		);
	}
};

// Helper function to get status badge color
const getStatusBadgeColor = (status: InventoryBatch["status"]) => {
	const styles = {
		active: "bg-green-100 text-green-800 border-green-300",
		expired: "bg-red-100 text-red-800 border-red-300",
		quarantined: "bg-yellow-100 text-yellow-800 border-yellow-300",
		recalled: "bg-orange-100 text-orange-800 border-orange-300",
	};

	return (
		<Badge variant="outline" className={styles[status]}>
			{status.toUpperCase()}
		</Badge>
	);
};

interface BatchColumnOptions {
	onEdit?: (batch: InventoryBatch) => void;
	onAdjust?: (batch: InventoryBatch) => void;
	onDelete?: (batch: InventoryBatch) => void;
}

export function getBatchColumns(
	options: BatchColumnOptions = {},
): ColumnDef<InventoryBatch>[] {
	const { onEdit, onAdjust, onDelete } = options;

	return [
		{
			accessorKey: "batchNumber",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Batch #" />
			),
			cell: ({ row }) => (
				<span className="font-medium">{row.getValue("batchNumber")}</span>
			),
		},
		{
			accessorKey: "lotNumber",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Lot #" />
			),
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{row.getValue("lotNumber") || "-"}
				</span>
			),
		},
		{
			id: "expiration",
			accessorFn: (row) => calculateDaysUntilExpiration(row.expirationDate),
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Expiration" />
			),
			cell: ({ row }) => (
				<div className="space-y-1">
					{row.original.expirationDate && (
						<div className="text-sm">
							{new Date(row.original.expirationDate).toLocaleDateString()}
						</div>
					)}
					{getExpirationBadge(row.original.expirationDate)}
				</div>
			),
			sortingFn: (rowA, rowB) => {
				const daysA = calculateDaysUntilExpiration(
					rowA.original.expirationDate,
				);
				const daysB = calculateDaysUntilExpiration(
					rowB.original.expirationDate,
				);
				// Expired batches first (negative values come first)
				if (daysA < 0 && daysB >= 0) return -1;
				if (daysA >= 0 && daysB < 0) return 1;
				return daysA - daysB;
			},
		},
		{
			id: "quantity",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Quantity" />
			),
			cell: ({ row }) => {
				const batch = row.original;
				return (
					<div className="space-y-1">
						<div className="font-medium">
							{batch.quantityAvailable} available
						</div>
						{batch.quantityReserved > 0 && (
							<div className="text-sm text-muted-foreground">
								{batch.quantityReserved} reserved
							</div>
						)}
					</div>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => {
				const status = row.getValue("status") as InventoryBatch["status"];
				return getStatusBadgeColor(status);
			},
			filterFn: (row, id, value) => {
				return value.includes(row.getValue(id));
			},
		},
		{
			accessorKey: "supplier",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Supplier" />
			),
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{row.getValue("supplier") || "-"}
				</span>
			),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<DataTableRowActions
					row={row}
					onEdit={onEdit}
					customActions={
						onAdjust
							? [
									{
										label: "Adjust Quantity",
										onClick: () => onAdjust(row.original),
									},
								]
							: []
					}
					onDelete={onDelete}
				/>
			),
		},
	];
}

// Batch status filter options
export const batchStatusOptions = [
	{ label: "Active", value: "active" },
	{ label: "Expired", value: "expired" },
	{ label: "Quarantined", value: "quarantined" },
	{ label: "Recalled", value: "recalled" },
];
