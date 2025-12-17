import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	variantApi,
	productApi,
	warehouseApi,
	productLocationApi,
	variantLocationApi,
	type ProductVariant,
	type CreateVariantInput,
} from "@/lib/api";
import {
	ProductWarehouseAllocation,
	type WarehouseAllocation,
} from "@/components/products/ProductWarehouseAllocation";
import {
	WarehouseDetailModal,
	type WarehouseStockDetail,
} from "@/components/products/WarehouseDetailModal";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DataTable } from "@/components/ui/data-table/data-table";
import {
	getVariantColumns,
	variantTypeOptions,
	variantStatusOptions,
} from "@/components/ui/data-table/columns/variant-columns";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, X, Package } from "lucide-react";

export const Route = createFileRoute("/dashboard/products/variant")({
	component: ProductVariantPage,
});

// Remove mock data - using API now
const legacyMockForFallback: ProductVariant[] = [
	{
		id: "1",
		productName: "Baby Bottle Set",
		productSKU: "BB-001",
		variantName: "Pink",
		variantSKU: "BB-001-PNK",
		variantType: "Color",
		price: 29.99,
		stock: 50,
		status: "Active",
	},
	{
		id: "2",
		productName: "Baby Bottle Set",
		productSKU: "BB-001",
		variantName: "Blue",
		variantSKU: "BB-001-BLU",
		variantType: "Color",
		price: 29.99,
		stock: 95,
		status: "Active",
	},
	{
		id: "3",
		productName: "Kids Backpack",
		productSKU: "BP-002",
		variantName: "Red",
		variantSKU: "BP-002-RED",
		variantType: "Color",
		price: 45.0,
		stock: 30,
		status: "Active",
	},
	{
		id: "4",
		productName: "Kids Backpack",
		productSKU: "BP-002",
		variantName: "Blue",
		variantSKU: "BP-002-BLU",
		variantType: "Color",
		price: 45.0,
		stock: 34,
		status: "Active",
	},
	{
		id: "5",
		productName: "Kids Backpack",
		productSKU: "BP-002",
		variantName: "Green",
		variantSKU: "BP-002-GRN",
		variantType: "Color",
		price: 45.0,
		stock: 25,
		status: "Active",
	},
	{
		id: "6",
		productName: "Toddler Shoes",
		productSKU: "SH-006",
		variantName: "Size 3",
		variantSKU: "SH-006-S3",
		variantType: "Size",
		price: 35.5,
		stock: 20,
		status: "Active",
	},
	{
		id: "7",
		productName: "Toddler Shoes",
		productSKU: "SH-006",
		variantName: "Size 4",
		variantSKU: "SH-006-S4",
		variantType: "Size",
		price: 35.5,
		stock: 28,
		status: "Active",
	},
	{
		id: "8",
		productName: "Toddler Shoes",
		productSKU: "SH-006",
		variantName: "Size 5",
		variantSKU: "SH-006-S5",
		variantType: "Size",
		price: 35.5,
		stock: 30,
		status: "Active",
	},
	{
		id: "9",
		productName: "Baby Crib",
		productSKU: "CR-005",
		variantName: "White Oak",
		variantSKU: "CR-005-WOK",
		variantType: "Material",
		price: 299.99,
		stock: 7,
		status: "Active",
	},
	{
		id: "10",
		productName: "Baby Crib",
		productSKU: "CR-005",
		variantName: "Walnut",
		variantSKU: "CR-005-WNT",
		variantType: "Material",
		price: 319.99,
		stock: 5,
		status: "Inactive",
	},
	{
		id: "11",
		productName: "Diaper Bag",
		productSKU: "DB-009",
		variantName: "Black",
		variantSKU: "DB-009-BLK",
		variantType: "Color",
		price: 49.99,
		stock: 45,
		status: "Active",
	},
	{
		id: "12",
		productName: "Diaper Bag",
		productSKU: "DB-009",
		variantName: "Gray",
		variantSKU: "DB-009-GRY",
		variantType: "Color",
		price: 49.99,
		stock: 47,
		status: "Active",
	},
];

/**
 * Render the product variants management page with listing, detail view, add/edit form, and warehouse allocation controls.
 *
 * This component fetches variants, products, and warehouses from APIs; provides create, update, and delete mutations for variants (including synchronizing per-warehouse allocations); validates stock and allocation constraints; and exposes UI controls (data table, left/right drawers, modal, and delete confirmation) for managing variant lifecycle and warehouse stock allocation.
 *
 * @returns The React element for the Product Variants management page.
 */
function ProductVariantPage() {
	const queryClient = useQueryClient();

	// Rupiah currency formatter
	const formatRupiah = (amount: number): string => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	// Fetch variants from API
	const {
		data: variantsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["variants"],
		queryFn: () => variantApi.getAll(),
	});

	const variants = variantsData?.variants || [];

	// Fetch products for the product selector
	const { data: productsData } = useQuery({
		queryKey: ["products"],
		queryFn: () => productApi.getAll(),
	});

	const products = productsData?.products || [];

	// Fetch warehouses for warehouse allocation
	const { data: warehousesData } = useQuery({
		queryKey: ["warehouses"],
		queryFn: () => warehouseApi.getAll(),
	});

	const warehouses = warehousesData?.warehouses || [];

	// Drawer states
	const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
	const [formDrawerOpen, setFormDrawerOpen] = useState(false);
	const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
		null,
	);
	const [formMode, setFormMode] = useState<"add" | "edit">("add");

	// Form data
	const [formData, setFormData] = useState({
		productId: "",
		productName: "",
		productSKU: "",
		variantName: "",
		variantSKU: "",
		variantType: "Color" as "Color" | "Size" | "Material" | "Style",
		price: "",
		stock: "",
		status: "Active" as "Active" | "Inactive",
	});

	// Warehouse allocations state
	const [warehouseAllocations, setWarehouseAllocations] = useState<
		WarehouseAllocation[]
	>([]);

	// Parent product warehouse locations state (for reference in variant form)
	const [parentProductLocations, setParentProductLocations] = useState<
		Array<{
			warehouseId: string;
			warehouseName: string;
			quantity: number;
			rack?: string | null;
			bin?: string | null;
		}>
	>([]);

	// Warehouse modal state for parent product locations
	const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
	const [warehouseModalData, setWarehouseModalData] = useState<{
		title: string;
		subtitle?: string;
		warehouseStocks: WarehouseStockDetail[];
		reportType: "variant" | "uom" | "product";
		itemName: string;
		itemSKU?: string;
		productBarcode?: string;
		productSKU?: string;
		productName?: string;
	} | null>(null);

	// Delete confirmation states
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [variantToDelete, setVariantToDelete] = useState<ProductVariant | null>(
		null,
	);

	// Create variant mutation
	const createVariantMutation = useMutation({
		mutationFn: async (data: CreateVariantInput) => {
			// Create the variant first
			const variant = await variantApi.create(data);

			// Then save warehouse allocations if any
			if (warehouseAllocations.length > 0) {
				await Promise.all(
					warehouseAllocations.map((allocation) =>
						variantLocationApi.create({
							variantId: variant.id,
							warehouseId: allocation.warehouseId,
							quantity: allocation.quantity,
							rack: allocation.rack || null,
							bin: allocation.bin || null,
						}),
					),
				);
			}

			return variant;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["variants"] });
			toast.success("Variant created successfully");
			setFormDrawerOpen(false);
		},
		onError: (error: Error) => {
			toast.error("Failed to create variant", {
				description: error.message,
			});
		},
	});

	// Update variant mutation
	const updateVariantMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<CreateVariantInput>;
		}) => {
			// Update the variant first
			const variant = await variantApi.update(id, data);

			// Get existing variant locations
			const existingLocations = await variantLocationApi.getByVariant(id);
			const existingLocs = existingLocations.variantLocations || [];

			// Create or update allocations
			for (const allocation of warehouseAllocations) {
				const existing = existingLocs.find(
					(loc) => loc.warehouseId === allocation.warehouseId,
				);

				if (existing) {
					// Update existing location
					await variantLocationApi.update(existing.id, {
						quantity: allocation.quantity,
						rack: allocation.rack || null,
						bin: allocation.bin || null,
					});
				} else {
					// Create new location
					await variantLocationApi.create({
						variantId: id,
						warehouseId: allocation.warehouseId,
						quantity: allocation.quantity,
						rack: allocation.rack || null,
						bin: allocation.bin || null,
					});
				}
			}

			// Delete removed allocations
			for (const existingLoc of existingLocs) {
				const stillExists = warehouseAllocations.find(
					(alloc) => alloc.warehouseId === existingLoc.warehouseId,
				);
				if (!stillExists) {
					await variantLocationApi.delete(existingLoc.id);
				}
			}

			return variant;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["variants"] });
			toast.success("Variant updated successfully");
			setFormDrawerOpen(false);
			setViewDrawerOpen(false);
		},
		onError: (error: Error) => {
			toast.error("Failed to update variant", {
				description: error.message,
			});
		},
	});

	// Delete variant mutation
	const deleteVariantMutation = useMutation({
		mutationFn: (id: string) => variantApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["variants"] });
			toast.success("Variant deleted successfully");
			setDeleteDialogOpen(false);
			setVariantToDelete(null);
		},
		onError: (error: Error) => {
			toast.error("Failed to delete variant", {
				description: error.message,
			});
		},
	});

	// Get available products from API
	const availableProducts = useMemo(() => {
		return products
			.map((product) => ({
				name: product.name,
				sku: product.sku,
				totalStock: product.stock,
			}))
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [products]);

	// Convert products to combobox options
	const productOptions: ComboboxOption[] = useMemo(() => {
		return availableProducts.map((product) => ({
			value: product.sku,
			label: `${product.name} (${product.sku})`,
			name: product.name,
			sku: product.sku,
		}));
	}, [availableProducts]);

	// Get product stock
	const getProductStock = (productSKU: string) => {
		const product = availableProducts.find((p) => p.sku === productSKU);
		if (!product) return 0;
		return product.totalStock;
	};

	// Calculate total stock allocated to existing variants of the selected product
	const getAllocatedStockForProduct = (
		productSKU: string,
		excludeVariantId?: string,
	) => {
		return variants
			.filter((v) => v.productSKU === productSKU && v.id !== excludeVariantId)
			.reduce((total, variant) => total + variant.stock, 0);
	};

	// Get remaining stock available for allocation
	const getRemainingStock = (productSKU: string, excludeVariantId?: string) => {
		const totalStock = getProductStock(productSKU);
		const allocatedStock = getAllocatedStockForProduct(
			productSKU,
			excludeVariantId,
		);
		return totalStock - allocatedStock;
	};

	// Auto-generate variant SKU from product SKU and variant name
	const generateVariantSKU = (productSKU: string, variantName: string) => {
		if (!productSKU || !variantName) return "";

		// Get 2-3 letters from variant name
		const variantCode = variantName
			.replace(/[^a-zA-Z0-9]/g, "")
			.toUpperCase()
			.substring(0, 3);

		return `${productSKU}-${variantCode}`;
	};

	// Handle product selection
	const handleProductSelect = async (productSKU: string) => {
		const product = products.find((p) => p.sku === productSKU);
		if (product) {
			setFormData({
				...formData,
				productId: product.id,
				productName: product.name,
				productSKU: product.sku,
				variantSKU: generateVariantSKU(product.sku, formData.variantName),
			});

			// Reset warehouse allocations - let user allocate manually
			// The parent product's warehouse structure is available but not pre-filled
			setWarehouseAllocations([]);

			// Fetch and display parent product's warehouse locations for reference
			try {
				const productLocations = await productLocationApi.getByProduct(
					product.id,
				);
				if (
					productLocations.locations &&
					productLocations.locations.length > 0
				) {
					// Build parent locations array with warehouse names and quantities
					const parentLocs = productLocations.locations.map((loc) => {
						const warehouse = warehouses.find((w) => w.id === loc.warehouseId);
						return {
							warehouseId: loc.warehouseId,
							warehouseName: warehouse?.name || "Unknown Warehouse",
							quantity: loc.quantity,
							rack: loc.rack,
							bin: loc.bin,
						};
					});

					setParentProductLocations(parentLocs);

					// Create toast message with warehouse names and stock quantities
					const warehouseInfo = parentLocs
						.map((loc) => `${loc.warehouseName} (${loc.quantity} units)`)
						.join(", ");

					toast.info("Parent Product Stock", {
						description: `Parent is in: ${warehouseInfo}`,
						duration: 6000,
					});
				} else {
					setParentProductLocations([]);
				}
			} catch (error) {
				console.error("Failed to fetch product locations:", error);
				setParentProductLocations([]);
			}
		}
	};

	// Handle variant name change (auto-update variant SKU)
	const handleVariantNameChange = (variantName: string) => {
		setFormData({
			...formData,
			variantName,
			variantSKU: generateVariantSKU(formData.productSKU, variantName),
		});
	};

	// Configure columns with callbacks
	const columns = useMemo(
		() =>
			getVariantColumns({
				onView: handleViewVariant,
				onEdit: (variant) => {
					handleEditVariant(variant).catch((error) => {
						console.error("Failed to open edit variant:", error);
						toast.error("Failed to load variant details", {
							description:
								error instanceof Error ? error.message : "Unknown error",
						});
					});
				},
				onDelete: (variant) => {
					setVariantToDelete(variant);
					setDeleteDialogOpen(true);
				},
			}),
		[],
	);

	const handleViewVariant = (variant: ProductVariant) => {
		setSelectedVariant(variant);
		setViewDrawerOpen(true);
	};

	const handleAddVariant = () => {
		setFormMode("add");
		setFormData({
			productId: "",
			productName: "",
			productSKU: "",
			variantName: "",
			variantSKU: "",
			variantType: "Color",
			price: "",
			stock: "",
			status: "Active",
		});
		setWarehouseAllocations([]); // Reset warehouse allocations
		setParentProductLocations([]); // Reset parent product locations
		setFormDrawerOpen(true);
	};

	const handleEditVariant = async (variant: ProductVariant) => {
		setFormMode("edit");
		setSelectedVariant(variant);
		setFormData({
			productId: variant.productId,
			productName: variant.productName,
			productSKU: variant.productSKU,
			variantName: variant.variantName,
			variantSKU: variant.variantSKU,
			variantType: variant.variantType,
			price: variant.price.toString(),
			stock: variant.stock.toString(),
			status: variant.status === "active" ? "Active" : "Inactive",
		});

		// Load existing warehouse allocations for this variant
		try {
			const variantLocations = await variantLocationApi.getByVariant(
				variant.id,
			);
			if (
				variantLocations.variantLocations &&
				variantLocations.variantLocations.length > 0
			) {
				const allocations: WarehouseAllocation[] =
					variantLocations.variantLocations.map((loc) => ({
						warehouseId: loc.warehouseId,
						quantity: loc.quantity,
						rack: loc.rack || "",
						bin: loc.bin || "",
					}));
				setWarehouseAllocations(allocations);
			} else {
				setWarehouseAllocations([]);
			}
		} catch (error) {
			console.error("Failed to fetch variant locations:", error);
			setWarehouseAllocations([]);
		}

		// Fetch parent product locations for edit mode
		try {
			const productLocations = await productLocationApi.getByProduct(
				variant.productId,
			);
			if (productLocations.locations && productLocations.locations.length > 0) {
				const parentLocs = productLocations.locations.map((loc) => {
					const warehouse = warehouses.find((w) => w.id === loc.warehouseId);
					return {
						warehouseId: loc.warehouseId,
						warehouseName: warehouse?.name || "Unknown Warehouse",
						quantity: loc.quantity,
						rack: loc.rack,
						bin: loc.bin,
					};
				});
				setParentProductLocations(parentLocs);
			} else {
				setParentProductLocations([]);
			}
		} catch (error) {
			console.error("Failed to fetch product locations:", error);
			setParentProductLocations([]);
		}

		setFormDrawerOpen(true);
	};

	const handleSubmitForm = (e: React.FormEvent) => {
		e.preventDefault();

		// Validate stock allocation
		const requestedStock = parseInt(formData.stock) || 0;
		const maxAllowedStock =
			getRemainingStock(formData.productSKU, selectedVariant?.id) +
			(formMode === "edit" && selectedVariant ? selectedVariant.stock : 0);

		if (requestedStock > maxAllowedStock) {
			toast.error("Insufficient stock available", {
				description: `Only ${maxAllowedStock} units available. Reduce the stock or increase the product's total stock.`,
			});
			return;
		}

		// Validate warehouse allocations match total stock
		const totalAllocated = warehouseAllocations.reduce(
			(sum, alloc) => sum + alloc.quantity,
			0,
		);
		if (warehouseAllocations.length > 0 && totalAllocated !== requestedStock) {
			toast.error("Warehouse allocation mismatch", {
				description: `Total warehouse allocation (${totalAllocated}) must equal variant stock (${requestedStock})`,
			});
			return;
		}

		const variantData: CreateVariantInput = {
			productId: formData.productId || selectedVariant?.productId || "",
			productName: formData.productName,
			productSKU: formData.productSKU,
			variantName: formData.variantName,
			variantSKU: formData.variantSKU,
			variantType: formData.variantType,
			price: parseFloat(formData.price),
			stock: parseInt(formData.stock) || 0,
			status: formData.status.toLowerCase() as "active" | "inactive",
		};

		if (formMode === "add") {
			createVariantMutation.mutate(variantData);
		} else if (formMode === "edit" && selectedVariant) {
			updateVariantMutation.mutate({
				id: selectedVariant.id,
				data: variantData,
			});
		}
	};

	const handleDeleteVariant = () => {
		if (variantToDelete) {
			deleteVariantMutation.mutate(variantToDelete.id);
		}
	};

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Product Variants
					</h1>
					<p className="text-muted-foreground mt-1">
						Manage product variations such as colors, sizes, and materials
					</p>
				</div>
				<Button onClick={handleAddVariant} className="gap-2">
					<Plus className="h-4 w-4" />
					Add Variant
				</Button>
			</div>

			{/* Variants Table */}
			<Card>
				<CardHeader>
					<CardTitle>Product Variants</CardTitle>
					<CardDescription>Manage product variants</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={variants}
						searchKey="variantName"
						searchPlaceholder="Search variants..."
						isLoading={isLoading}
						enableColumnVisibility
						filterableColumns={[
							{
								id: "variantType",
								title: "Type",
								options: variantTypeOptions,
							},
							{
								id: "status",
								title: "Status",
								options: variantStatusOptions,
							},
						]}
					/>
				</CardContent>
			</Card>

			{/* View Variant Drawer (Right Side) */}
			<Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
				<DrawerContent side="right">
					<DrawerHeader>
						<div className="flex items-start justify-between">
							<div>
								<DrawerTitle>{selectedVariant?.variantName}</DrawerTitle>
								<DrawerDescription>Variant Details</DrawerDescription>
							</div>
							<DrawerClose asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<X className="h-4 w-4" />
								</Button>
							</DrawerClose>
						</div>
					</DrawerHeader>

					{selectedVariant && (
						<div className="flex-1 overflow-y-auto p-4">
							<div className="space-y-4">
								<div>
									<Label className="text-xs text-muted-foreground">
										Product Name
									</Label>
									<p className="text-sm font-medium mt-1">
										{selectedVariant.productName}
									</p>
								</div>

								<div>
									<Label className="text-xs text-muted-foreground">
										Product SKU
									</Label>
									<p className="text-sm font-mono mt-1">
										{selectedVariant.productSKU}
									</p>
								</div>

								<Separator />

								<div>
									<Label className="text-xs text-muted-foreground">
										Variant Name
									</Label>
									<p className="text-sm font-medium mt-1">
										{selectedVariant.variantName}
									</p>
								</div>

								<div>
									<Label className="text-xs text-muted-foreground">
										Variant SKU
									</Label>
									<p className="text-sm font-mono mt-1">
										{selectedVariant.variantSKU}
									</p>
								</div>

								<div>
									<Label className="text-xs text-muted-foreground">
										Variant Type
									</Label>
									<div className="mt-1">
										<Badge>{selectedVariant.variantType}</Badge>
									</div>
								</div>

								<Separator />

								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label className="text-xs text-muted-foreground">
											Price
										</Label>
										<p className="text-lg font-bold mt-1">
											{formatRupiah(selectedVariant.price)}
										</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">
											Stock
										</Label>
										<p className="text-lg font-bold mt-1">
											{selectedVariant.stock}
										</p>
									</div>
								</div>

								<div>
									<Label className="text-xs text-muted-foreground">
										Status
									</Label>
									<div className="mt-1">
										<Badge
											variant={
												selectedVariant.status === "Active"
													? "default"
													: "secondary"
											}
											className={
												selectedVariant.status === "Active"
													? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
													: ""
											}
										>
											{selectedVariant.status}
										</Badge>
									</div>
								</div>
							</div>
						</div>
					)}

					<DrawerFooter>
						<Button
							onClick={() => {
								if (selectedVariant) {
									handleEditVariant(selectedVariant).catch((error) => {
										console.error("Failed to open edit variant:", error);
										toast.error("Failed to load variant details", {
											description:
												error instanceof Error
													? error.message
													: "Unknown error",
										});
									});
								}
							}}
						>
							<Edit className="h-4 w-4 mr-2" />
							Edit Variant
						</Button>
						<DrawerClose asChild>
							<Button variant="outline">Close</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			{/* Add/Edit Variant Form Drawer (Left Side) */}
			<Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
				<DrawerContent side="left">
					<DrawerHeader>
						<div className="flex items-start justify-between">
							<div>
								<DrawerTitle>
									{formMode === "add" ? "Add New Variant" : "Edit Variant"}
								</DrawerTitle>
								<DrawerDescription>
									{formMode === "add"
										? "Create a new product variant"
										: "Update variant information"}
								</DrawerDescription>
							</div>
							<DrawerClose asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<X className="h-4 w-4" />
								</Button>
							</DrawerClose>
						</div>
					</DrawerHeader>

					<form
						onSubmit={handleSubmitForm}
						className="flex-1 overflow-y-auto p-4 space-y-4"
					>
						<div className="space-y-2">
							<Label>Select Product</Label>
							<Combobox
								options={productOptions}
								value={formData.productSKU}
								onValueChange={handleProductSelect}
								placeholder="Search products..."
								searchPlaceholder="Type to search..."
								emptyText="No products found."
							/>
							<p className="text-xs text-muted-foreground">
								Search and select the product this variant belongs to
							</p>
						</div>

						{formData.productSKU && (
							<div className="p-3 bg-muted/30 rounded-md space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Product:</span>
									<span className="font-medium">{formData.productName}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">SKU:</span>
									<span className="font-mono">{formData.productSKU}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Total Product Stock:
									</span>
									<span className="font-medium">
										{getProductStock(formData.productSKU)} units
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Allocated to Variants:
									</span>
									<span className="font-medium text-orange-600 dark:text-orange-500">
										{getAllocatedStockForProduct(
											formData.productSKU,
											selectedVariant?.id,
										)}{" "}
										units
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">
										Remaining Available:
									</span>
									<span className="font-medium text-green-600 dark:text-green-500">
										{getRemainingStock(
											formData.productSKU,
											selectedVariant?.id,
										)}{" "}
										units
									</span>
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									Variant stock is allocated from the product's total stock
								</p>
							</div>
						)}

						{/* Parent Product Warehouse Stock Breakdown */}
						{formData.productSKU && parentProductLocations.length > 0 && (
							<div className="space-y-2">
								<Label className="text-xs text-muted-foreground flex items-center gap-2">
									<Package className="h-3 w-3" />
									Parent Stock by Warehouse (Reference)
								</Label>
								<div className="border rounded-md bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
									<div className="p-3 space-y-2">
										{parentProductLocations.slice(0, 3).map((loc, idx) => (
											<div
												key={idx}
												className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-900 rounded border border-blue-100 dark:border-blue-900"
											>
												<div>
													<p className="font-medium text-blue-900 dark:text-blue-100">
														{loc.warehouseName}
													</p>
													<div className="flex gap-2 text-xs text-muted-foreground mt-1">
														{loc.rack && <span>Rack: {loc.rack}</span>}
														{loc.bin && <span>Bin: {loc.bin}</span>}
													</div>
												</div>
												<p className="font-semibold text-blue-700 dark:text-blue-300">
													{loc.quantity} units
												</p>
											</div>
										))}
										{parentProductLocations.length > 3 && (
											<p className="text-xs text-center text-muted-foreground pt-2">
												+{parentProductLocations.length - 3} more warehouses
											</p>
										)}
									</div>
									<div className="px-3 pb-2">
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="w-full"
											onClick={() => {
												const product = products.find(
													(p) => p.sku === formData.productSKU,
												);
												const warehouseStockDetails: WarehouseStockDetail[] =
													parentProductLocations.map((loc) => ({
														warehouseId: loc.warehouseId,
														warehouseName: loc.warehouseName,
														quantity: loc.quantity,
														rack: loc.rack,
														bin: loc.bin,
														zone: null,
														aisle: null,
													}));
												const totalStock = parentProductLocations.reduce(
													(sum, loc) => sum + loc.quantity,
													0,
												);
												setWarehouseModalData({
													title: `Parent Product: ${formData.productName}`,
													subtitle: `SKU: ${formData.productSKU} | Total Stock: ${totalStock} units`,
													warehouseStocks: warehouseStockDetails,
													reportType: "product",
													itemName: formData.productName,
													itemSKU: formData.productSKU,
													productBarcode: product?.barcode,
													productSKU: formData.productSKU,
													productName: formData.productName,
												});
												setWarehouseModalOpen(true);
											}}
										>
											View Full Report
										</Button>
									</div>
									<div className="px-3 pb-3">
										<p className="text-xs text-blue-700 dark:text-blue-300">
											💡 Use this as a guide to allocate variant stock to
											warehouses below
										</p>
									</div>
								</div>
							</div>
						)}

						<Separator />

						<div className="space-y-2">
							<Label htmlFor="variantName">Variant Name</Label>
							<Input
								id="variantName"
								placeholder="Pink, Large, Cotton, etc."
								value={formData.variantName}
								onChange={(e) => handleVariantNameChange(e.target.value)}
								required
							/>
							<p className="text-xs text-muted-foreground">
								e.g., "Pink" for color, "Large" for size, "Cotton" for material
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="variantSKU">Variant SKU (Auto-generated)</Label>
							<Input
								id="variantSKU"
								placeholder="BB-001-PIN"
								value={formData.variantSKU}
								readOnly
								className="bg-muted/30"
								required
							/>
							<p className="text-xs text-muted-foreground">
								Auto-generated from product SKU + variant name
							</p>
						</div>

						<div className="space-y-2">
							<Label htmlFor="variantType">Variant Type</Label>
							<select
								id="variantType"
								value={formData.variantType}
								onChange={(e) =>
									setFormData({
										...formData,
										variantType: e.target.value as any,
									})
								}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							>
								<option value="Color">Color</option>
								<option value="Size">Size</option>
								<option value="Material">Material</option>
								<option value="Style">Style</option>
							</select>
						</div>

						<Separator />

						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<Label htmlFor="price">Price (Rp)</Label>
								<Input
									id="price"
									type="number"
									step="1000"
									placeholder="50000"
									value={formData.price}
									onChange={(e) =>
										setFormData({ ...formData, price: e.target.value })
									}
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="stock">Stock</Label>
								<Input
									id="stock"
									type="number"
									placeholder="100"
									value={formData.stock}
									onChange={(e) =>
										setFormData({ ...formData, stock: e.target.value })
									}
									min="0"
									max={
										formData.productSKU
											? getRemainingStock(
													formData.productSKU,
													selectedVariant?.id,
												) +
												(formMode === "edit"
													? parseInt(formData.stock) || 0
													: 0)
											: undefined
									}
									required
								/>
								{formData.productSKU && (
									<p className="text-xs text-muted-foreground">
										Maximum{" "}
										{getRemainingStock(
											formData.productSKU,
											selectedVariant?.id,
										) +
											(formMode === "edit"
												? parseInt(formData.stock) || 0
												: 0)}{" "}
										units available for this variant
									</p>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="status">Status</Label>
							<select
								id="status"
								value={formData.status}
								onChange={(e) =>
									setFormData({
										...formData,
										status: e.target.value as "Active" | "Inactive",
									})
								}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
								required
							>
								<option value="Active">Active</option>
								<option value="Inactive">Inactive</option>
							</select>
							<p className="text-xs text-muted-foreground">
								Inactive variants won't be visible to customers
							</p>
						</div>

						<Separator className="my-4" />

						{/* Multi-Warehouse Allocation Section */}
						<ProductWarehouseAllocation
							warehouses={warehouses}
							allocations={warehouseAllocations}
							onAllocationsChange={setWarehouseAllocations}
							totalStock={parseInt(formData.stock) || 0}
							readOnly={false}
						/>

						<DrawerFooter className="px-0">
							<Button type="submit" className="w-full">
								{formMode === "add" ? "Create Variant" : "Update Variant"}
							</Button>
							<DrawerClose asChild>
								<Button type="button" variant="outline" className="w-full">
									Cancel
								</Button>
							</DrawerClose>
						</DrawerFooter>
					</form>
				</DrawerContent>
			</Drawer>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							{variantToDelete && (
								<>
									You are about to delete variant{" "}
									<strong>"{variantToDelete.variantName}"</strong> of{" "}
									<strong>{variantToDelete.productName}</strong>. This action
									cannot be undone. This will permanently delete the variant and
									remove all associated data.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								setDeleteDialogOpen(false);
								setVariantToDelete(null);
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Warehouse Detail Modal for Parent Product Locations */}
			{warehouseModalData && (
				<WarehouseDetailModal
					open={warehouseModalOpen}
					onOpenChange={setWarehouseModalOpen}
					title={warehouseModalData.title}
					subtitle={warehouseModalData.subtitle}
					warehouseStocks={warehouseModalData.warehouseStocks}
					reportType={warehouseModalData.reportType}
					itemName={warehouseModalData.itemName}
					itemSKU={warehouseModalData.itemSKU}
					productBarcode={warehouseModalData.productBarcode}
					productSKU={warehouseModalData.productSKU}
					productName={warehouseModalData.productName}
				/>
			)}
		</div>
	);
}