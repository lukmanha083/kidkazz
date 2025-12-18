import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table/data-table";
import {
	getOrderColumns,
	orderStatusOptions,
	type Order,
} from "@/components/ui/data-table/columns/order-columns";

export const Route = createFileRoute("/dashboard/orders")({
	component: OrdersPage,
});

const mockOrders: Order[] = [
	{
		id: "ORD-001",
		customer: "John Doe",
		email: "john@example.com",
		product: "Baby Bottle Set",
		quantity: 2,
		amount: 59.98,
		status: "Delivered",
		date: "2024-11-10",
	},
	{
		id: "ORD-002",
		customer: "Jane Smith",
		email: "jane@example.com",
		product: "Kids Backpack",
		quantity: 1,
		amount: 45.0,
		status: "Shipped",
		date: "2024-11-12",
	},
	{
		id: "ORD-003",
		customer: "Bob Johnson",
		email: "bob@example.com",
		product: "Toy Car Collection",
		quantity: 3,
		amount: 269.97,
		status: "Processing",
		date: "2024-11-13",
	},
	{
		id: "ORD-004",
		customer: "Alice Brown",
		email: "alice@example.com",
		product: "Children Books Set",
		quantity: 2,
		amount: 69.0,
		status: "Pending",
		date: "2024-11-14",
	},
	{
		id: "ORD-005",
		customer: "Charlie Wilson",
		email: "charlie@example.com",
		product: "Baby Crib",
		quantity: 1,
		amount: 299.99,
		status: "Cancelled",
		date: "2024-11-11",
	},
];

function OrdersPage() {
	const [orders] = useState<Order[]>(mockOrders);

	// Calculate stats
	const stats = useMemo(() => {
		return {
			total: orders.length,
			pending: orders.filter((o) => o.status === "Pending").length,
			processing: orders.filter((o) => o.status === "Processing").length,
			shipped: orders.filter((o) => o.status === "Shipped").length,
			delivered: orders.filter((o) => o.status === "Delivered").length,
		};
	}, [orders]);

	// Get columns with optional handlers
	const columns = useMemo(() => {
		return getOrderColumns({
			onView: (order) => {
				console.log("View order:", order);
			},
			onEdit: (order) => {
				console.log("Edit order:", order);
			},
			onDelete: (order) => {
				console.log("Delete order:", order);
			},
		});
	}, []);

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Orders</h1>
				<p className="text-muted-foreground mt-1">
					View and manage customer orders
				</p>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Total Orders</CardDescription>
						<CardTitle className="text-2xl">{stats.total}</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Pending</CardDescription>
						<CardTitle className="text-2xl text-yellow-600">
							{stats.pending}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Processing</CardDescription>
						<CardTitle className="text-2xl text-blue-600">
							{stats.processing}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Shipped</CardDescription>
						<CardTitle className="text-2xl text-purple-600">
							{stats.shipped}
						</CardTitle>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader className="pb-2">
						<CardDescription>Delivered</CardDescription>
						<CardTitle className="text-2xl text-green-600">
							{stats.delivered}
						</CardTitle>
					</CardHeader>
				</Card>
			</div>

			{/* Orders Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Orders</CardTitle>
					<CardDescription>Manage and view all customer orders</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={orders}
						searchKey="id"
						searchPlaceholder="Search by order ID..."
						filterableColumns={[
							{
								id: "status",
								title: "Status",
								options: orderStatusOptions,
							},
						]}
						enablePagination={true}
						enableColumnVisibility={true}
						pageSize={10}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
