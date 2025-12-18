import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	Plus,
	Edit,
	Trash2,
	Eye,
	Image as ImageIcon,
	Package,
	X,
	Loader2,
	Film,
} from "lucide-react";
import { DataTable } from "@/components/ui/data-table/data-table";
import {
	getProductColumns,
	productStatusOptions,
	type ProductWithStock,
} from "@/components/ui/data-table/columns/product-columns";
import {
	Product,
	ProductUOM,
	CreateProductInput,
	productApi,
	categoryApi,
	warehouseApi,
	uomApi,
	productLocationApi,
	productUOMLocationApi,
	variantLocationApi,
} from "@/lib/api";
import { productFormSchema, type ProductFormData } from '@/lib/form-schemas';
import { ImageGallery } from "@/components/ImageGallery";
import { VideoGallery } from "@/components/VideoGallery";
import { DatePicker } from "@/components/ui/date-picker";
import {
	ProductWarehouseAllocation,
	type WarehouseAllocation,
} from "@/components/products/ProductWarehouseAllocation";
import {
	ProductUOMWarehouseAllocation,
	type UOMWarehouseAllocation,
} from "@/components/products/ProductUOMWarehouseAllocation";
import {
	WarehouseDetailModal,
	type WarehouseStockDetail,
} from "@/components/products/WarehouseDetailModal";
import { productListSearchSchema } from "@/lib/route-search-schemas";
import { queryKeys } from "@/lib/query-client";

/**
 * All Products Route
 *
 * Features:
 * - Zod-validated search params for filtering
 * - Route loader for data prefetching
 * - Pagination synced with URL
 */
export const Route = createFileRoute("/dashboard/products/all")({
	validateSearch: productListSearchSchema,

	// Prefetch products and categories data
	loader: async ({ context: { queryClient } }) => {
		await Promise.all([
			queryClient.ensureQueryData({
				queryKey: queryKeys.products.all,
				queryFn: () => productApi.getAll(),
			}),
			queryClient.ensureQueryData({
				queryKey: queryKeys.categories.all,
				queryFn: () => categoryApi.getAll(),
			}),
		]);
	},

	component: AllProductsPage,
});

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
		// Legacy support
		case "active":
			return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200";
		default:
			return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200";
	}
};

// Helper function to format status display text
const formatStatusText = (status: string) => {
	// Capitalize each word
	return status
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
};

// Helper function to get category badge color (based on category color from database)
const getCategoryBadgeColor = (color?: string | null) => {
	if (!color) {
		return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200";
	}

	// Map color names to Tailwind classes
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

// Helper function to extract error message from various error types
const getErrorMessage = (error: any): string => {
	// Handle string errors
	if (typeof error === "string") {
		return error;
	}

	// Handle Error objects
	if (error instanceof Error) {
		return error.message;
	}

	// Handle API response errors with different structures
	if (error?.response?.data) {
		const data = error.response.data;

		// Check for message field
		if (typeof data.message === "string") {
			return data.message;
		}

		// Check for error field
		if (typeof data.error === "string") {
			return data.error;
		}

		// Check for errors array
		if (Array.isArray(data.errors) && data.errors.length > 0) {
			return data.errors.map((e: any) => e.message || e).join(", ");
		}

		// If data is a plain object with no specific error field, try to stringify it nicely
		try {
			const keys = Object.keys(data);
			if (keys.length > 0) {
				return `Validation error: ${JSON.stringify(data, null, 2)}`;
			}
		} catch (e) {
			// Ignore stringify errors
		}
	}

	// Handle direct message property
	if (typeof error?.message === "string") {
		return error.message;
	}

	// Handle direct error property
	if (typeof error?.error === "string") {
		return error.error;
	}

	// Try to extract any useful information from the error object
	if (error && typeof error === "object") {
		try {
			// Check common error properties
			const errorStr = error.toString();
			if (errorStr && errorStr !== "[object Object]") {
				return errorStr;
			}

			// Try to find any string property that might contain an error message
			for (const key of ["msg", "detail", "reason", "statusText"]) {
				if (error[key] && typeof error[key] === "string") {
					return error[key];
				}
			}
		} catch (e) {
			// Ignore
		}
	}

	// Fallback to generic message
	return "An unexpected error occurred. Please try again.";
};

/**
 * Render the All Products administration page including product list, search, pagination,
 * column controls, product detail and edit drawers, UOM and warehouse allocation management,
 * and create/update/delete workflows integrated with inventory and UOM services.
 *
 * @returns A JSX element representing the All Products page UI.
 */
function AllProductsPage() {
	const queryClient = useQueryClient();

	// Drawer states
	const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
	const [formDrawerOpen, setFormDrawerOpen] = useState(false);
	const [productDetailDrawerOpen, setProductDetailDrawerOpen] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [formMode, setFormMode] = useState<"add" | "edit">("add");

	// TanStack Form for product management (DDD compliant - NO stock fields)
	const form = useForm({
		defaultValues: {
			barcode: '',
			name: '',
			sku: '',
			description: '',
			image: '',
			categoryId: '',
			price: 0,
			retailPrice: null,
			wholesalePrice: null,
			baseUnit: 'PCS',
			wholesaleThreshold: 10,
			minimumOrderQuantity: 1,
			weight: null,
			length: null,
			width: null,
			height: null,
			rating: 0,
			reviews: 0,
			availableForRetail: true,
			availableForWholesale: false,
			status: 'active' as const,
			isBundle: false,
		} as ProductFormData,
		validatorAdapter: zodValidator(),
		validators: {
			onChange: productFormSchema,
		},
		onSubmit: async ({ value }) => {
			// Form submission will be handled by handleSubmitForm
			// This is just to validate the form structure
		},
	});

	// Legacy form data state - keeping for backward compatibility with location/expiration fields
	const [formData, setFormData] = useState({
		// Product expiration and alert dates (not in schema yet)
		expirationDate: "",
		alertDate: "",
		// Optional location fields (not in schema yet)
		warehouseId: "",
		rack: "",
		bin: "",
		zone: "",
		aisle: "",
	});

	// Product UOM management states
	const [productUOMs, setProductUOMs] = useState<ProductUOM[]>([]);
	const [selectedUOM, setSelectedUOM] = useState("");
	const [uomBarcode, setUomBarcode] = useState("");
	const [uomStock, setUomStock] = useState("");

	// Warehouse allocations state
	const [warehouseAllocations, setWarehouseAllocations] = useState<
		WarehouseAllocation[]
	>([]);

	// UOM warehouse allocations state - Map of UOM ID to warehouse allocations
	const [uomWarehouseAllocations, setUomWarehouseAllocations] = useState<
		Record<string, UOMWarehouseAllocation[]>
	>({});

	// UOM warehouse stock data for product detail view
	const [uomWarehouseStock, setUomWarehouseStock] = useState<{
		uomStocks: Array<{
			uomCode: string;
			uomName: string;
			conversionFactor: number;
			totalStock: number;
			warehouseStocks: Array<{
				warehouseId: string;
				quantity: number;
				rack?: string;
				bin?: string;
				zone?: string;
				aisle?: string;
			}>;
		}>;
	} | null>(null);

	// Variant warehouse stock data for product detail view
	const [variantWarehouseStock, setVariantWarehouseStock] = useState<{
		variants: Array<{
			variantId: string;
			variantName: string;
			variantSKU: string;
			totalStock: number;
			warehouseStocks: Array<{
				warehouseId: string;
				quantity: number;
				rack?: string;
				bin?: string;
			}>;
		}>;
	} | null>(null);

	// Delete confirmation states
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [productToDelete, setProductToDelete] = useState<Product | null>(null);
	const [uomToDelete, setUomToDelete] = useState<ProductUOM | null>(null);

	// Warehouse detail modal states
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

	// Product stocks from Inventory Service (DDD pattern)
	const [productStocks, setProductStocks] = useState<
		Record<string, { totalStock: number; isLoading: boolean }>
	>({});

	// Fetch products - using centralized query keys
	const {
		data: productsData,
		isLoading,
		error,
	} = useQuery({
		queryKey: queryKeys.products.all,
		queryFn: () => productApi.getAll(),
	});

	const products = productsData?.products || [];

	// Fetch categories
	const { data: categoriesData } = useQuery({
		queryKey: queryKeys.categories.all,
		queryFn: () => categoryApi.getAll(),
	});

	const categories = categoriesData?.categories || [];

	// Fetch warehouses
	const { data: warehousesData } = useQuery({
		queryKey: queryKeys.warehouses.all,
		queryFn: () => warehouseApi.getAll(),
	});

	const warehouses = warehousesData?.warehouses || [];

	// Fetch UOMs from master data
	const { data: uomsData } = useQuery({
		queryKey: queryKeys.uoms.all,
		queryFn: () => uomApi.getAll(),
	});

	const availableUOMs = uomsData?.uoms || [];

	// Filter base units for Base Unit dropdown
	const baseUnits = availableUOMs.filter((uom) => uom.isBaseUnit);

	// Fetch stock data from Inventory Service for all products (DDD pattern)
	useEffect(() => {
		if (!products || products.length === 0) return;

		// Initialize loading state for all products
		const loadingStocks: Record<
			string,
			{ totalStock: number; isLoading: boolean }
		> = {};
		products.forEach((product) => {
			loadingStocks[product.id] = { totalStock: 0, isLoading: true };
		});
		setProductStocks(loadingStocks);

		// Fetch stock for each product from Inventory Service
		products.forEach(async (product) => {
			try {
				const stockData = await productApi.getStock(product.id);
				setProductStocks((prev) => ({
					...prev,
					[product.id]: { totalStock: stockData.totalStock, isLoading: false },
				}));
			} catch (error) {
				// If no stock data (404), set to 0
				setProductStocks((prev) => ({
					...prev,
					[product.id]: { totalStock: 0, isLoading: false },
				}));
			}
		});
	}, [products]);

	// Combine products with stock info for DataTable
	const productsWithStock: ProductWithStock[] = useMemo(() => {
		return products.map((product) => ({
			...product,
			stockInfo: productStocks[product.id] || {
				totalStock: 0,
				isLoading: true,
			},
		}));
	}, [products, productStocks]);

	// Configure columns with callbacks
	const columns = useMemo(
		() =>
			getProductColumns({
				categories,
				onView: async (product) => {
					setSelectedProduct(product);
					setProductDetailDrawerOpen(true);

					// Fetch UOM warehouse stock
					try {
						const uomStockData = await productApi.getUOMWarehouseStock(
							product.id,
						);
						setUomWarehouseStock(uomStockData);
					} catch (error) {
						console.error("Failed to fetch UOM warehouse stock:", error);
						setUomWarehouseStock(null);
					}

					// Fetch variant warehouse stock
					try {
						const variantStockData = await productApi.getVariantWarehouseStock(
							product.id,
						);
						setVariantWarehouseStock(variantStockData);
					} catch (error) {
						console.error("Failed to fetch variant warehouse stock:", error);
						setVariantWarehouseStock(null);
					}
				},
				onEdit: async (product) => {
					setFormMode("edit");
					setSelectedProduct(product);

					// Fetch product UOMs
					try {
						const productUOMsData = await productApi.getProductUOMs(product.id);
						setProductUOMs(productUOMsData.productUOMs || []);
					} catch (error) {
						console.error("Failed to fetch product UOMs:", error);
						setProductUOMs([]);
					}

					// Fetch product locations
					try {
						const productLocationsData = await productLocationApi.getByProduct(
							product.id,
						);
						const formattedAllocations: WarehouseAllocation[] = (
							productLocationsData.locations || []
						).map((location: any) => ({
							warehouseId: location.warehouseId,
							quantity: location.quantity || 0,
							minimumStock: location.minimumStock || 0,
							rack: location.rack || "",
							bin: location.bin || "",
							zone: location.zone || "",
							aisle: location.aisle || "",
						}));
						setWarehouseAllocations(formattedAllocations);
					} catch (error) {
						console.error("Failed to fetch product locations:", error);
						setWarehouseAllocations([]);
					}

					setFormData({
						barcode: product.barcode || "",
						name: product.name || "",
						description: product.description || "",
						sku: product.sku || "",
						categoryId: product.categoryId || "",
						price: product.price?.toString() || "",
						baseUnit: product.baseUnit || "PCS",
						wholesaleThreshold: product.wholesaleThreshold?.toString() || "12",
						minimumStock: product.minimumStock?.toString() || "",
						status: product.status || "omnichannel sales",
						weight: product.weight?.toString() || "",
						length: product.length?.toString() || "",
						width: product.width?.toString() || "",
						height: product.height?.toString() || "",
						expirationDate: "",
						alertDate: "",
						warehouseId: "",
						rack: "",
						bin: "",
						zone: "",
						aisle: "",
					});

					setFormDrawerOpen(true);
				},
				onDelete: (product) => {
					setProductToDelete(product);
					setDeleteDialogOpen(true);
				},
			}),
		[categories],
	);

	// Create product mutation
	const createProductMutation = useMutation({
		mutationFn: (data: CreateProductInput) => productApi.create(data),
		onSuccess: () => {
			// Invalidate all products queries (including those with search term)
			queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
			toast.success("Product created successfully");
			setFormDrawerOpen(false);
			form.reset();
		},
		onError: (error: any) => {
			const errorMessage = getErrorMessage(error);
			toast.error("Failed to create product", {
				description: errorMessage,
			});
		},
	});

	// Update product mutation
	const updateProductMutation = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: Partial<CreateProductInput>;
		}) => productApi.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
			queryClient.invalidateQueries({
				queryKey: queryKeys.products.detail(selectedProduct!.id),
			});
			toast.success("Product updated successfully");
			setFormDrawerOpen(false);
			form.reset();
		},
		onError: (error: any) => {
			const errorMessage = getErrorMessage(error);
			toast.error("Failed to update product", {
				description: errorMessage,
			});
		},
	});

	// Delete product mutation
	const deleteProductMutation = useMutation({
		mutationFn: (id: string) => productApi.delete(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
			toast.success("Product deleted successfully");
			setDeleteDialogOpen(false);
			setProductToDelete(null);
		},
		onError: (error: any) => {
			const errorMessage = getErrorMessage(error);
			toast.error("Failed to delete product", {
				description: errorMessage,
			});
		},
	});

	// Helper function: Generate barcode (EAN-13 format)
	const generateBarcode = () => {
		const randomDigits = Array.from({ length: 12 }, () =>
			Math.floor(Math.random() * 10),
		).join("");
		let sum = 0;
		for (let i = 0; i < 12; i++) {
			sum += parseInt(randomDigits[i]) * (i % 2 === 0 ? 1 : 3);
		}
		const checksum = (10 - (sum % 10)) % 10;
		return randomDigits + checksum;
	};

	// Helper function: Check if barcode is unique
	const isBarcodeUnique = (barcode: string, excludeProductId?: string) => {
		const existsInProducts = products.some(
			(p) => p.barcode === barcode && p.id !== excludeProductId,
		);
		if (existsInProducts) return false;

		const existsInCurrentUOMs = productUOMs.some(
			(uom) => uom.barcode === barcode && uom.uomCode !== "PCS",
		);
		if (existsInCurrentUOMs) return false;

		return true;
	};

	// Helper function: Generate unique barcode
	const generateUniqueBarcode = () => {
		let barcode = generateBarcode();
		let attempts = 0;
		const excludeId = formMode === "edit" ? selectedProduct?.id : undefined;

		while (!isBarcodeUnique(barcode, excludeId) && attempts < 100) {
			barcode = generateBarcode();
			attempts++;
		}

		if (attempts >= 100) {
			toast.error("Failed to generate unique barcode", {
				description: "Please try again or enter manually",
			});
			return "";
		}

		return barcode;
	};

	// Helper function: Generate SKU from category and product name
	const generateSKU = (categoryId: string, productName: string) => {
		if (!categoryId || !productName) return "";

		const category = categories.find((c) => c.id === categoryId);
		if (!category) return "";

		const categoryCode = category.name
			.replace(/[^a-zA-Z]/g, "")
			.toUpperCase()
			.substring(0, 2)
			.padEnd(2, "X");

		const nameCode = productName
			.replace(/[^a-zA-Z]/g, "")
			.toUpperCase()
			.substring(0, 2)
			.padEnd(2, "X");

		const prefix = `${categoryCode}-${nameCode}`;
		const existingProducts = products.filter((p) => p.sku.startsWith(prefix));
		const nextNumber = String(existingProducts.length + 1).padStart(2, "0");

		return `${prefix}-${nextNumber}`;
	};

	// Auto-generate SKU when category or name changes
	const handleCategoryOrNameChange = (
		field: "categoryId" | "name",
		value: string,
	) => {
		// Update form field
		form.setFieldValue(field, value);

		// Auto-generate SKU when both category and name are available
		if (formMode === "add" || !form.state.values.sku) {
			const categoryId = field === "categoryId" ? value : form.state.values.categoryId;
			const name = field === "name" ? value : form.state.values.name;

			if (categoryId && name) {
				const sku = generateSKU(categoryId, name);
				form.setFieldValue('sku', sku);
			}
		}
	};

	const confirmDeleteProduct = () => {
		if (productToDelete) {
			deleteProductMutation.mutate(productToDelete.id);
		}
	};

	const handleViewProduct = async (product: Product) => {
		// Fetch full product details with variants and UOMs
		const fullProduct = await productApi.getById(product.id);
		setSelectedProduct(fullProduct);

		// Fetch UOM warehouse stock breakdown
		try {
			const uomStock = await productApi.getUOMWarehouseStock(product.id);
			setUomWarehouseStock(uomStock);
		} catch (error) {
			console.error("Failed to fetch UOM warehouse stock:", error);
			setUomWarehouseStock(null);
		}

		// Fetch variant warehouse stock breakdown
		try {
			if (fullProduct.variants && fullProduct.variants.length > 0) {
				const variantStockData = await Promise.all(
					fullProduct.variants.map(async (variant) => {
						try {
							const variantLocs = await variantLocationApi.getByVariant(
								variant.id,
							);
							return {
								variantId: variant.id,
								variantName: variant.variantName,
								variantSKU: variant.variantSKU,
								totalStock: variant.stock,
								warehouseStocks: variantLocs.variantLocations.map((loc) => ({
									warehouseId: loc.warehouseId,
									quantity: loc.quantity,
									rack: loc.rack || undefined,
									bin: loc.bin || undefined,
								})),
							};
						} catch (error) {
							console.error(
								`Failed to fetch locations for variant ${variant.id}:`,
								error,
							);
							return {
								variantId: variant.id,
								variantName: variant.variantName,
								variantSKU: variant.variantSKU,
								totalStock: variant.stock,
								warehouseStocks: [],
							};
						}
					}),
				);
				setVariantWarehouseStock({ variants: variantStockData });
			} else {
				setVariantWarehouseStock(null);
			}
		} catch (error) {
			console.error("Failed to fetch variant warehouse stock:", error);
			setVariantWarehouseStock(null);
		}

		setProductDetailDrawerOpen(true);
	};

	const handleAddProduct = () => {
		setFormMode("add");
		// Reset TanStack Form
		form.reset();
		// Reset legacy form data (expiration/location fields)
		setFormData({
			// Product expiration and alert dates
			expirationDate: "",
			alertDate: "",
			// Optional location fields
			warehouseId: "",
			rack: "",
			bin: "",
			zone: "",
			aisle: "",
		});
		setProductUOMs([]);
		setSelectedUOM("");
		setUomBarcode("");
		setUomStock("");
		setWarehouseAllocations([]); // Reset warehouse allocations
		setUomWarehouseAllocations({}); // Reset UOM warehouse allocations
		setFormDrawerOpen(true);
	};

	const handleEditProduct = async (product: Product) => {
		setFormMode("edit");
		// Fetch full product details
		const fullProduct = await productApi.getById(product.id);
		setSelectedProduct(fullProduct);

		// Get first location if exists (for backward compatibility)
		const firstLocation = fullProduct.productLocations?.[0];

		// Update TanStack Form values
		form.setFieldValue('barcode', fullProduct.barcode);
		form.setFieldValue('name', fullProduct.name);
		form.setFieldValue('sku', fullProduct.sku);
		form.setFieldValue('description', fullProduct.description || '');
		form.setFieldValue('categoryId', fullProduct.categoryId || '');
		form.setFieldValue('price', fullProduct.price);
		form.setFieldValue('baseUnit', fullProduct.baseUnit);
		form.setFieldValue('wholesaleThreshold', fullProduct.wholesaleThreshold);
		form.setFieldValue('status', fullProduct.status as 'active' | 'inactive' | 'omnichannel sales');
		form.setFieldValue('weight', fullProduct.weight);
		form.setFieldValue('length', fullProduct.length);
		form.setFieldValue('width', fullProduct.width);
		form.setFieldValue('height', fullProduct.height);
		form.setFieldValue('availableForRetail', fullProduct.availableForRetail);
		form.setFieldValue('availableForWholesale', fullProduct.availableForWholesale);
		form.setFieldValue('minimumOrderQuantity', fullProduct.minimumOrderQuantity || 1);

		// Update legacy form data (expiration/location fields)
		setFormData({
			// Product expiration and alert dates
			expirationDate: fullProduct.expirationDate || "",
			alertDate: fullProduct.alertDate || "",
			// Optional location fields - kept for backward compatibility
			warehouseId: firstLocation?.warehouseId || "",
			rack: firstLocation?.rack || "",
			bin: firstLocation?.bin || "",
			zone: firstLocation?.zone || "",
			aisle: firstLocation?.aisle || "",
		});
		setProductUOMs(fullProduct.productUOMs || []);
		setSelectedUOM("");
		setUomBarcode("");
		setUomStock("");

		// Load warehouse allocations from product locations
		const allocations: WarehouseAllocation[] = (
			fullProduct.productLocations || []
		).map((location) => {
			const warehouse = warehouses.find((w) => w.id === location.warehouseId);
			return {
				warehouseId: location.warehouseId,
				warehouseName: warehouse?.name,
				quantity: location.quantity,
				rack: location.rack || undefined,
				bin: location.bin || undefined,
				zone: location.zone || undefined,
				aisle: location.aisle || undefined,
			};
		});
		setWarehouseAllocations(allocations);

		// Load UOM warehouse allocations
		const uomAllocationsMap: Record<string, UOMWarehouseAllocation[]> = {};
		if (fullProduct.productUOMs && fullProduct.productUOMs.length > 0) {
			try {
				for (const uom of fullProduct.productUOMs) {
					const uomLocations = await productUOMLocationApi.getByProductUOM(
						uom.id,
					);
					if (uomLocations.locations && uomLocations.locations.length > 0) {
						uomAllocationsMap[uom.id] = uomLocations.locations.map((loc) => {
							const warehouse = warehouses.find(
								(w) => w.id === loc.warehouseId,
							);
							return {
								warehouseId: loc.warehouseId,
								warehouseName: warehouse?.name,
								quantity: loc.quantity,
								rack: loc.rack || undefined,
								bin: loc.bin || undefined,
								zone: loc.zone || undefined,
								aisle: loc.aisle || undefined,
							};
						});
					}
				}
				setUomWarehouseAllocations(uomAllocationsMap);
			} catch (error) {
				console.error("Failed to load UOM warehouse allocations:", error);
				setUomWarehouseAllocations({});
			}
		} else {
			setUomWarehouseAllocations({});
		}

		setFormDrawerOpen(true);
	};

	// Calculate total PCS allocated to UOMs
	const calculateAllocatedPCS = (uoms: ProductUOM[]) => {
		return uoms.reduce((total, uom) => {
			return total + uom.stock * uom.conversionFactor;
		}, 0);
	};

	// Get remaining PCS available for UOMs (Stock is now 0 as it's managed via Inventory Service)
	const getRemainingPCS = () => {
		const totalStock = 0; // Stock is now managed via Product Locations (Inventory Service)
		const allocatedPCS = calculateAllocatedPCS(productUOMs);
		return totalStock - allocatedPCS;
	};

	const handleAddUOM = () => {
		if (!selectedUOM || !uomBarcode || !uomStock) {
			toast.error("Missing UOM information", {
				description: "Please fill in UOM, barcode, and stock quantity",
			});
			return;
		}

		const uom = availableUOMs.find((u) => u.code === selectedUOM);
		if (!uom) return;

		if (productUOMs.some((pu) => pu.uomCode === selectedUOM)) {
			toast.error("UOM already added", {
				description: "This UOM has already been added to the product",
			});
			return;
		}

		const excludeId = formMode === "edit" ? selectedProduct?.id : undefined;
		if (!isBarcodeUnique(uomBarcode, excludeId)) {
			toast.error("Barcode already exists", {
				description:
					"This barcode is already used by another product or UOM. Please click the refresh button to generate a new barcode.",
			});
			return;
		}

		if (uomBarcode === form.state.values.barcode && uom.code !== "PCS") {
			toast.error("Duplicate barcode", {
				description:
					"This barcode is the same as the main product barcode. Please use a different barcode for additional UOMs.",
			});
			return;
		}

		const uomStockInPCS = parseInt(uomStock) * uom.conversionFactor;
		const remainingPCS = getRemainingPCS();

		if (uomStockInPCS > remainingPCS) {
			toast.error("Insufficient stock", {
				description: `Cannot allocate ${uomStockInPCS} PCS to this UOM. Only ${remainingPCS} PCS available. Reduce UOM quantity or increase product stock.`,
			});
			return;
		}

		const newUOM: ProductUOM = {
			id: `uom-temp-${Date.now()}`,
			productId: selectedProduct?.id || "",
			uomCode: uom.code,
			uomName: uom.name,
			barcode: uomBarcode,
			conversionFactor: uom.conversionFactor,
			stock: parseInt(uomStock),
			isDefault: false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		setProductUOMs([...productUOMs, newUOM]);
		setSelectedUOM("");
		setUomBarcode("");
		setUomStock("");
		toast.success("UOM added", {
			description: `${uom.name} has been added successfully`,
		});
	};

	const handleRemoveUOM = (uom: ProductUOM) => {
		setUomToDelete(uom);
		setDeleteDialogOpen(true);
	};

	const handleSetDefaultUOM = (uomId: string) => {
		const clickedUOM = productUOMs.find((u) => u.id === uomId);

		if (clickedUOM?.isDefault) {
			setProductUOMs(
				productUOMs.map((uom) => ({
					...uom,
					isDefault: uom.id === uomId ? false : uom.isDefault,
				})),
			);
			toast.info("Default unchecked", {
				description:
					"Leave all unchecked to use PCS as default, or check another UOM",
			});
		} else {
			setProductUOMs(
				productUOMs.map((uom) => ({
					...uom,
					isDefault: uom.id === uomId,
				})),
			);
			if (clickedUOM) {
				toast.success("Default UOM updated", {
					description: `${clickedUOM.uomName} is now the default unit`,
				});
			}
		}
	};

	const confirmDeleteUOM = () => {
		if (uomToDelete) {
			setProductUOMs(productUOMs.filter((uom) => uom.id !== uomToDelete.id));
			// Also remove UOM warehouse allocations
			const newAllocations = { ...uomWarehouseAllocations };
			delete newAllocations[uomToDelete.id];
			setUomWarehouseAllocations(newAllocations);
			toast.success("UOM removed", {
				description: `${uomToDelete.uomName} has been removed`,
			});
			setDeleteDialogOpen(false);
			setUomToDelete(null);
		}
	};

	// Handler to update UOM warehouse allocations for a specific UOM
	const handleUOMAllocationsChange = (
		uomId: string,
		allocations: UOMWarehouseAllocation[],
	) => {
		setUomWarehouseAllocations((prev) => ({
			...prev,
			[uomId]: allocations,
		}));
	};

	const handleSubmitForm = async (e: React.FormEvent) => {
		e.preventDefault();

		// Get form values
		const formValues = form.state.values;

		const excludeId = formMode === "edit" ? selectedProduct?.id : undefined;
		if (!isBarcodeUnique(formValues.barcode, excludeId)) {
			toast.error("Barcode already exists", {
				description:
					"This barcode is already used by another product. Please use a different barcode or click refresh to generate a new one.",
			});
			return;
		}

		// Auto-create base unit UOM if not added manually
		let finalProductUOMs = [...productUOMs];
		const selectedBaseUnitCode = formValues.baseUnit || "PCS";
		if (!finalProductUOMs.some((u) => u.uomCode === selectedBaseUnitCode)) {
			const hasDefault = finalProductUOMs.some((u) => u.isDefault);

			// Calculate allocated stock from other UOMs
			const allocatedStock = productUOMs.reduce((total, uom) => {
				return total + uom.stock * uom.conversionFactor;
			}, 0);

			// Stock is now 0 as it's managed via Inventory Service
			const remainingStock = 0;

			// Find the base unit details from available UOMs
			const baseUnitInfo = availableUOMs.find(
				(u) => u.code === selectedBaseUnitCode,
			);
			const baseUnitName = baseUnitInfo?.name || "Pieces";

			const baseUOM: ProductUOM = {
				id: `uom-${selectedBaseUnitCode.toLowerCase()}-${Date.now()}`,
				productId: selectedProduct?.id || "",
				uomCode: selectedBaseUnitCode,
				uomName: baseUnitName,
				barcode: formValues.barcode,
				conversionFactor: 1,
				stock: remainingStock,
				isDefault: !hasDefault,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			if (baseUOM.isDefault) {
				finalProductUOMs = finalProductUOMs.map((u) => ({
					...u,
					isDefault: false,
				}));
			}

			finalProductUOMs = [baseUOM, ...finalProductUOMs];
		}

		if (
			!finalProductUOMs.some((u) => u.isDefault) &&
			finalProductUOMs.length > 0
		) {
			finalProductUOMs[0].isDefault = true;
		}

		// Build product data using form values (DDD compliant - NO minimumStock)
		const productData: CreateProductInput = {
			barcode: formValues.barcode,
			name: formValues.name,
			sku: formValues.sku,
			description: formValues.description || undefined,
			categoryId: formValues.categoryId || undefined,
			price: formValues.price,
			stock: 0, // Deprecated: Stock is now managed via Product Locations (Inventory Service)
			baseUnit: formValues.baseUnit,
			wholesaleThreshold: formValues.wholesaleThreshold,
			// NOTE: minimumStock REMOVED - stock management is handled by Inventory Service (DDD)
			status: formValues.status,
			availableForRetail: formValues.availableForRetail,
			availableForWholesale: formValues.availableForWholesale,
			minimumOrderQuantity: formValues.minimumOrderQuantity,
			// Physical dimensions for shipping cost calculation
			weight: formValues.weight || undefined,
			length: formValues.length || undefined,
			width: formValues.width || undefined,
			height: formValues.height || undefined,
			// Product expiration and alert dates (from legacy formData)
			expirationDate: formData.expirationDate || undefined,
			alertDate: formData.alertDate || undefined,
		};

		// DDD VALIDATION: Products with expiration dates require warehouse allocation
		// This ensures expiration tracking works correctly in Inventory Service
		if (formData.expirationDate && warehouseAllocations.length === 0) {
			toast.error("Expiration date requires warehouse allocation", {
				description:
					"Products with expiration dates must be allocated to at least one warehouse for inventory tracking",
			});
			return;
		}

		if (formMode === "add") {
			try {
				// Create product first
				const createdProduct = await productApi.create(productData);

				// Create all product UOMs
				if (finalProductUOMs.length > 0) {
					try {
						const uomCodeMap = new Map<string, string>(); // Map UOM code to temp ID for lookup
						for (const uom of finalProductUOMs) {
							uomCodeMap.set(uom.uomCode, uom.id);
							await uomApi.addProductUOM({
								productId: createdProduct.id,
								uomCode: uom.uomCode,
								uomName: uom.uomName,
								barcode: uom.barcode,
								conversionFactor: uom.conversionFactor,
								stock: uom.stock,
								isDefault: uom.isDefault,
							});
						}

						// Fetch the created product to get the actual UOM IDs
						const createdProductWithUOMs = await productApi.getById(
							createdProduct.id,
						);

						// Create UOM warehouse locations
						if (
							createdProductWithUOMs.productUOMs &&
							createdProductWithUOMs.productUOMs.length > 0
						) {
							for (const createdUOM of createdProductWithUOMs.productUOMs) {
								const tempId = uomCodeMap.get(createdUOM.uomCode);
								if (tempId && uomWarehouseAllocations[tempId]) {
									const allocations = uomWarehouseAllocations[tempId];
									for (const allocation of allocations) {
										try {
											await productUOMLocationApi.create({
												productUOMId: createdUOM.id,
												warehouseId: allocation.warehouseId,
												rack: allocation.rack || null,
												bin: allocation.bin || null,
												zone: allocation.zone || null,
												aisle: allocation.aisle || null,
												quantity: allocation.quantity,
											});
										} catch (locationError) {
											console.error(
												"Failed to create UOM warehouse location:",
												locationError,
											);
										}
									}
								}
							}
						}
					} catch (uomError: any) {
						console.error("Failed to create product UOMs:", uomError);
						const errorMessage = getErrorMessage(uomError);
						toast.error("Failed to add UOMs", {
							description: errorMessage,
						});
					}
				}

				// Create multiple warehouse locations if allocated
				if (warehouseAllocations.length > 0) {
					try {
						for (const allocation of warehouseAllocations) {
							await productLocationApi.create({
								productId: createdProduct.id,
								warehouseId: allocation.warehouseId,
								rack: allocation.rack || null,
								bin: allocation.bin || null,
								zone: allocation.zone || null,
								aisle: allocation.aisle || null,
								quantity: allocation.quantity,
							});

							// NOTE: minimumStock is now managed via Inventory Service (DDD pattern)
							// Stock alerts and thresholds should be set through the Inventory Management interface
						}
					} catch (locationError) {
						console.error("Failed to create product locations:", locationError);
						toast.info("Product created, but some locations could not be set", {
							description: "You can add the locations later",
						});
					}
				}

				queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
				toast.success("Product created successfully");
				setFormDrawerOpen(false);
			} catch (error: any) {
				const errorMessage = getErrorMessage(error);
				toast.error("Failed to create product", {
					description: errorMessage,
				});
			}
		} else if (formMode === "edit" && selectedProduct) {
			try {
				// Update product first
				await productApi.update(selectedProduct.id, productData);

				// Sync Product UOMs
				if (finalProductUOMs.length > 0) {
					try {
						const existingUOMs = selectedProduct.productUOMs || [];

						// Add or update UOMs
						for (const uom of finalProductUOMs) {
							const existingUOM = existingUOMs.find(
								(e) => e.uomCode === uom.uomCode,
							);

							if (existingUOM) {
								// Update existing UOM if there are changes
								if (
									existingUOM.barcode !== uom.barcode ||
									existingUOM.stock !== uom.stock ||
									existingUOM.isDefault !== uom.isDefault
								) {
									await uomApi.updateProductUOM(existingUOM.id, {
										barcode: uom.barcode,
										stock: uom.stock,
										isDefault: uom.isDefault,
									});
								}
							} else {
								// Add new UOM
								await uomApi.addProductUOM({
									productId: selectedProduct.id,
									uomCode: uom.uomCode,
									uomName: uom.uomName,
									barcode: uom.barcode,
									conversionFactor: uom.conversionFactor,
									stock: uom.stock,
									isDefault: uom.isDefault,
								});
							}
						}

						// Delete removed UOMs
						for (const existingUOM of existingUOMs) {
							const stillExists = finalProductUOMs.find(
								(u) => u.uomCode === existingUOM.uomCode,
							);
							if (!stillExists) {
								await uomApi.deleteProductUOM(existingUOM.id);
							}
						}

						// Sync UOM warehouse locations
						// Refetch product to get updated UOM IDs
						const updatedProduct = await productApi.getById(selectedProduct.id);
						if (
							updatedProduct.productUOMs &&
							updatedProduct.productUOMs.length > 0
						) {
							for (const currentUOM of updatedProduct.productUOMs) {
								// Find the UOM in finalProductUOMs to get the temp ID
								const matchingUOM = finalProductUOMs.find(
									(u) => u.uomCode === currentUOM.uomCode,
								);
								if (matchingUOM) {
									const tempId = matchingUOM.id;
									const newAllocations = uomWarehouseAllocations[tempId] || [];

									// Get existing UOM locations
									const existingLocationsResponse =
										await productUOMLocationApi.getByProductUOM(currentUOM.id);
									const existingLocations =
										existingLocationsResponse.locations || [];

									// Delete all existing locations and create new ones
									for (const existingLocation of existingLocations) {
										try {
											await productUOMLocationApi.delete(existingLocation.id);
										} catch (deleteError) {
											console.error(
												"Failed to delete UOM location:",
												deleteError,
											);
										}
									}

									// Create new locations
									for (const allocation of newAllocations) {
										try {
											await productUOMLocationApi.create({
												productUOMId: currentUOM.id,
												warehouseId: allocation.warehouseId,
												rack: allocation.rack || null,
												bin: allocation.bin || null,
												zone: allocation.zone || null,
												aisle: allocation.aisle || null,
												quantity: allocation.quantity,
											});
										} catch (createError) {
											console.error(
												"Failed to create UOM location:",
												createError,
											);
										}
									}
								}
							}
						}
					} catch (uomError: any) {
						console.error("Failed to sync product UOMs:", uomError);
						const errorMessage = getErrorMessage(uomError);
						toast.error("Failed to sync UOMs", {
							description: errorMessage,
						});
					}
				}

				// Sync warehouse locations
				try {
					const existingLocations = selectedProduct.productLocations || [];

					// Create or update allocations
					for (const allocation of warehouseAllocations) {
						const existingLocation = existingLocations.find(
							(loc) => loc.warehouseId === allocation.warehouseId,
						);

						if (existingLocation) {
							// Update existing location
							await productLocationApi.update(existingLocation.id, {
								rack: allocation.rack || null,
								bin: allocation.bin || null,
								zone: allocation.zone || null,
								aisle: allocation.aisle || null,
								quantity: allocation.quantity,
							});
						} else {
							// Create new location
							await productLocationApi.create({
								productId: selectedProduct.id,
								warehouseId: allocation.warehouseId,
								rack: allocation.rack || null,
								bin: allocation.bin || null,
								zone: allocation.zone || null,
								aisle: allocation.aisle || null,
								quantity: allocation.quantity,
							});
						}

						// NOTE: minimumStock is now managed via Inventory Service (DDD pattern)
						// Stock alerts and thresholds should be set through the Inventory Management interface
					}

					// Delete removed locations
					for (const existingLocation of existingLocations) {
						const stillExists = warehouseAllocations.find(
							(alloc) => alloc.warehouseId === existingLocation.warehouseId,
						);
						if (!stillExists) {
							await productLocationApi.delete(existingLocation.id);
						}
					}
				} catch (locationError) {
					console.error("Failed to sync product locations:", locationError);
					toast.info(
						"Product updated, but some locations could not be synced",
						{
							description: "You can update the locations later",
						},
					);
				}

				// VALIDATE STOCK CONSISTENCY AFTER ALL UPDATES (PER WAREHOUSE)
				// This ensures that for EACH warehouse, product locations and UOM locations have matching totals
				try {
					const validationResult = await productApi.validateStockConsistency(
						selectedProduct.id,
					);

					if (!validationResult.isValid) {
						// Build detailed error message with per-warehouse breakdown
						const invalidWarehouses =
							validationResult.warehouseValidation.filter((w) => !w.isValid);

						let warehouseDetails = "";
						invalidWarehouses.forEach((warehouse) => {
							warehouseDetails += `\n\n📦 Warehouse: ${warehouse.warehouseId}\n`;
							warehouseDetails += `  Product Location: ${warehouse.locationStock} ${validationResult.globalSummary.baseUnit}\n`;
							warehouseDetails += `  UOM Locations: ${warehouse.uomStock} ${validationResult.globalSummary.baseUnit}\n`;
							warehouseDetails += `  Difference: ${Math.abs(warehouse.difference)} ${validationResult.globalSummary.baseUnit} (${warehouse.status})\n`;

							// Show UOM breakdown for this warehouse
							if (warehouse.uomBreakdown.length > 0) {
								warehouseDetails += `  UOMs:\n`;
								warehouse.uomBreakdown.forEach((uom) => {
									warehouseDetails += `    - ${uom.quantity} × ${uom.uomCode} (${uom.conversionFactor}×) = ${uom.baseUnits} ${validationResult.globalSummary.baseUnit}\n`;
								});
							}
						});

						toast.error("Stock Validation Failed", {
							description:
								`${validationResult.message}\n` +
								`\n📊 Global Summary:\n` +
								`  Total Product Locations: ${validationResult.globalSummary.totalLocationStock} ${validationResult.globalSummary.baseUnit}\n` +
								`  Total UOM Locations: ${validationResult.globalSummary.totalUOMStock} ${validationResult.globalSummary.baseUnit}\n` +
								`  Global Difference: ${Math.abs(validationResult.globalSummary.globalDifference)} ${validationResult.globalSummary.baseUnit}\n` +
								warehouseDetails +
								`\n⚠️ Product was updated, but ${invalidWarehouses.length} warehouse(s) have inconsistent stock. Please fix the warehouse allocations.`,
							duration: 15000,
						});

						// Refresh the product data to show current state
						queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
						queryClient.invalidateQueries({
							queryKey: queryKeys.products.detail(selectedProduct.id),
						});

						// Keep drawer open so user can fix the issue
						return;
					} else {
						// Validation passed - show brief success message
						console.log("✅ Stock validation passed for all warehouses");
					}
				} catch (validationError) {
					console.error("Stock validation check failed:", validationError);
					const errorMessage = getErrorMessage(validationError);
					toast.warning("Validation Warning", {
						description: `Product updated successfully, but could not validate stock consistency: ${errorMessage}`,
						duration: 6000,
					});
				}

				queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
				queryClient.invalidateQueries({
					queryKey: queryKeys.products.detail(selectedProduct.id),
				});
				toast.success("Product updated successfully");
				setFormDrawerOpen(false);
			} catch (error: any) {
				const errorMessage = getErrorMessage(error);
				toast.error("Failed to update product", {
					description: errorMessage,
				});
			}
		}
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">Products</h1>
						<p className="text-muted-foreground mt-1">
							Manage your product inventory and catalog
						</p>
					</div>
				</div>
				<Card>
					<CardContent className="pt-6">
						<div className="text-center py-12">
							<p className="text-destructive font-medium">
								Error loading products
							</p>
							<p className="text-sm text-muted-foreground mt-2">
								{error.message}
							</p>
							<Button
								onClick={() =>
									queryClient.invalidateQueries({
										queryKey: queryKeys.products.all,
									})
								}
								className="mt-4"
							>
								Retry
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Products</h1>
					<p className="text-muted-foreground mt-1">
						Manage your product inventory and catalog
					</p>
				</div>
				<Button onClick={handleAddProduct} className="gap-2">
					<Plus className="h-4 w-4" />
					Add Product
				</Button>
			</div>

			{/* Products Table */}
			<Card>
				<CardHeader>
					<CardTitle>All Products</CardTitle>
					<CardDescription>
						View and manage your product catalog
					</CardDescription>
				</CardHeader>
				<CardContent>
					<DataTable
						columns={columns}
						data={productsWithStock}
						searchKey="name"
						searchPlaceholder="Search products..."
						isLoading={isLoading}
						enableColumnVisibility
						filterableColumns={[
							{
								id: "status",
								title: "Status",
								options: productStatusOptions,
							},
							{
								id: "category",
								title: "Category",
								options: categories.map((c) => ({
									label: c.name,
									value: c.name,
								})),
							},
						]}
					/>
				</CardContent>
			</Card>

			{/* Product Detail Report Drawer (Right Side) */}
			<Drawer
				open={productDetailDrawerOpen}
				onOpenChange={setProductDetailDrawerOpen}
			>
				<DrawerContent side="right">
					<DrawerHeader>
						<div className="flex items-start justify-between">
							<div>
								<DrawerTitle>{selectedProduct?.name}</DrawerTitle>
								<DrawerDescription>
									Product Details & Inventory Report
								</DrawerDescription>
							</div>
							<DrawerClose asChild>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<X className="h-4 w-4" />
								</Button>
							</DrawerClose>
						</div>
					</DrawerHeader>

					{selectedProduct && (
						<div className="flex-1 overflow-y-auto p-4">
							<div className="space-y-4">
								<div>
									<Label className="text-xs text-muted-foreground">
										Product Name
									</Label>
									<p className="text-sm font-medium mt-1">
										{selectedProduct.name}
									</p>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label className="text-xs text-muted-foreground">SKU</Label>
										<p className="text-sm font-mono mt-1">
											{selectedProduct.sku}
										</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">
											Barcode
										</Label>
										<p className="text-sm font-mono mt-1">
											{selectedProduct.barcode}
										</p>
									</div>
								</div>

								<div>
									<Label className="text-xs text-muted-foreground">
										Description
									</Label>
									<p className="text-sm mt-1">
										{selectedProduct.description || "No description"}
									</p>
								</div>

								<Separator />

								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label className="text-xs text-muted-foreground">
											Category
										</Label>
										<p className="text-sm mt-1">
											{categories.find(
												(c) => c.id === selectedProduct.categoryId,
											)?.name || "Uncategorized"}
										</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">
											Status
										</Label>
										<div className="mt-1">
											<Badge
												variant={
													selectedProduct.status === "active"
														? "default"
														: "secondary"
												}
												className={
													selectedProduct.status === "active"
														? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
														: ""
												}
											>
												{selectedProduct.status}
											</Badge>
										</div>
									</div>
								</div>

								<Separator />

								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label className="text-xs text-muted-foreground">
											Price
										</Label>
										<p className="text-lg font-bold mt-1">
											{formatRupiah(selectedProduct.price)}
										</p>
									</div>
									<div>
										<Label className="text-xs text-muted-foreground">
											Stock
										</Label>
										<p className="text-lg font-bold mt-1">
											{selectedProduct.stock}
										</p>
									</div>
								</div>

								{(selectedProduct.weight ||
									selectedProduct.length ||
									selectedProduct.width ||
									selectedProduct.height) && (
									<>
										<Separator />
										<div>
											<Label className="text-xs text-muted-foreground">
												Physical Dimensions
											</Label>
											<div className="grid grid-cols-2 gap-3 mt-2">
												{selectedProduct.weight && (
													<div>
														<p className="text-xs text-muted-foreground">
															Weight
														</p>
														<p className="text-sm font-medium">
															{selectedProduct.weight} kg
														</p>
													</div>
												)}
												{selectedProduct.length && (
													<div>
														<p className="text-xs text-muted-foreground">
															Length
														</p>
														<p className="text-sm font-medium">
															{selectedProduct.length} cm
														</p>
													</div>
												)}
												{selectedProduct.width && (
													<div>
														<p className="text-xs text-muted-foreground">
															Width
														</p>
														<p className="text-sm font-medium">
															{selectedProduct.width} cm
														</p>
													</div>
												)}
												{selectedProduct.height && (
													<div>
														<p className="text-xs text-muted-foreground">
															Height
														</p>
														<p className="text-sm font-medium">
															{selectedProduct.height} cm
														</p>
													</div>
												)}
											</div>
										</div>
									</>
								)}

								{selectedProduct.variants &&
									selectedProduct.variants.length > 0 && (
										<>
											<Separator />
											<div>
												<Label className="text-xs text-muted-foreground">
													Product Variants
												</Label>
												<div className="mt-2 space-y-2">
													{selectedProduct.variants.map((variant) => (
														<div
															key={variant.id}
															className="p-3 border rounded bg-muted/30 dark:bg-muted/20"
														>
															<div className="flex items-start justify-between mb-2">
																<div>
																	<p className="text-sm font-medium">
																		{variant.variantName}
																	</p>
																	<p className="text-xs text-muted-foreground font-mono">
																		{variant.variantSKU}
																	</p>
																</div>
																<Badge
																	variant={
																		variant.status === "Active"
																			? "default"
																			: "secondary"
																	}
																	className={
																		variant.status === "Active"
																			? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
																			: ""
																	}
																>
																	{variant.status}
																</Badge>
															</div>
															<div className="grid grid-cols-3 gap-2 text-xs">
																<div>
																	<span className="text-muted-foreground">
																		Type:
																	</span>
																	<span className="ml-1 font-medium">
																		{variant.variantType}
																	</span>
																</div>
																<div>
																	<span className="text-muted-foreground">
																		Price:
																	</span>
																	<span className="ml-1 font-medium">
																		{formatRupiah(variant.price)}
																	</span>
																</div>
																<div>
																	<span className="text-muted-foreground">
																		Stock:
																	</span>
																	<span className="ml-1 font-medium">
																		{variant.stock}
																	</span>
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										</>
									)}

								{selectedProduct.variants &&
									selectedProduct.variants.length > 0 &&
									variantWarehouseStock && (
										<>
											<Separator />
											<div>
												<Label className="text-xs text-muted-foreground">
													Product Variants (By Warehouse)
												</Label>
												{variantWarehouseStock.variants &&
												variantWarehouseStock.variants.length > 0 ? (
													<div className="mt-2 space-y-3">
														{variantWarehouseStock.variants.map((variant) => (
															<div
																key={variant.variantId}
																className="border rounded-lg overflow-hidden"
															>
																<div className="bg-muted/50 p-3 flex items-center justify-between border-b">
																	<div>
																		<p className="text-sm font-medium">
																			{variant.variantName}
																		</p>
																		<p className="text-xs text-muted-foreground font-mono">
																			SKU: {variant.variantSKU}
																		</p>
																	</div>
																	<div className="text-right">
																		<p className="text-sm font-semibold">
																			Total: {variant.totalStock}
																		</p>
																	</div>
																</div>
																{variant.warehouseStocks.length > 0 ? (
																	<>
																		<div className="p-3 space-y-2">
																			{variant.warehouseStocks
																				.slice(0, 10)
																				.map((stock, idx) => {
																					const warehouse = warehouses.find(
																						(w) => w.id === stock.warehouseId,
																					);
																					return (
																						<div
																							key={idx}
																							className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
																						>
																							<div>
																								<p className="font-medium">
																									{warehouse?.name ||
																										"Unknown Warehouse"}
																								</p>
																								<div className="flex gap-3 text-xs text-muted-foreground mt-1">
																									{stock.rack && (
																										<span>
																											Rack: {stock.rack}
																										</span>
																									)}
																									{stock.bin && (
																										<span>
																											Bin: {stock.bin}
																										</span>
																									)}
																								</div>
																							</div>
																							<p className="font-semibold">
																								{stock.quantity}
																							</p>
																						</div>
																					);
																				})}
																		</div>
																		<div className="px-3 pb-3">
																			<Button
																				variant="outline"
																				size="sm"
																				className="w-full"
																				onClick={() => {
																					const warehouseStockDetails: WarehouseStockDetail[] =
																						variant.warehouseStocks.map(
																							(stock) => {
																								const warehouse =
																									warehouses.find(
																										(w) =>
																											w.id ===
																											stock.warehouseId,
																									);
																								return {
																									warehouseId:
																										stock.warehouseId,
																									warehouseName:
																										warehouse?.name ||
																										"Unknown Warehouse",
																									quantity: stock.quantity,
																									rack: stock.rack,
																									bin: stock.bin,
																								};
																							},
																						);
																					setWarehouseModalData({
																						title: `Variant: ${variant.variantName}`,
																						subtitle: `SKU: ${variant.variantSKU} | Total Stock: ${variant.totalStock} units`,
																						warehouseStocks:
																							warehouseStockDetails,
																						reportType: "variant",
																						itemName: variant.variantName,
																						itemSKU: variant.variantSKU,
																						productBarcode:
																							selectedProduct.barcode,
																						productSKU: selectedProduct.sku,
																						productName: selectedProduct.name,
																					});
																					setWarehouseModalOpen(true);
																				}}
																			>
																				View Full Report
																			</Button>
																		</div>
																	</>
																) : (
																	<div className="p-3 text-center text-sm text-muted-foreground">
																		No warehouse allocations for this variant
																	</div>
																)}
															</div>
														))}
													</div>
												) : (
													<div className="mt-2 p-4 border rounded-lg bg-muted/20 text-center">
														<p className="text-sm text-muted-foreground">
															Variant warehouse stock data not available.
															Configure variant warehouse allocations to see
															breakdown.
														</p>
													</div>
												)}
											</div>
										</>
									)}

								{selectedProduct.productUOMs &&
									selectedProduct.productUOMs.length > 0 && (
										<>
											<Separator />
											<div>
												<Label className="text-xs text-muted-foreground">
													Product UOMs (By Warehouse)
												</Label>
												{uomWarehouseStock &&
												uomWarehouseStock.uomStocks &&
												uomWarehouseStock.uomStocks.length > 0 ? (
													<div className="mt-2 space-y-3">
														{uomWarehouseStock.uomStocks.map((uom) => {
															const productUOM =
																selectedProduct.productUOMs?.find(
																	(u) => u.uomCode === uom.uomCode,
																);
															return (
																<div
																	key={uom.uomCode}
																	className="border rounded-lg overflow-hidden"
																>
																	<div className="bg-muted/50 p-3 flex items-center justify-between border-b">
																		<div>
																			<p className="text-sm font-medium">
																				{uom.uomName} ({uom.uomCode})
																			</p>
																			{productUOM && (
																				<p className="text-xs text-muted-foreground">
																					Barcode: {productUOM.barcode} |
																					Conversion: {uom.conversionFactor}x
																				</p>
																			)}
																		</div>
																		<div className="text-right">
																			<p className="text-sm font-semibold">
																				Total: {uom.totalStock}
																			</p>
																			{productUOM?.isDefault && (
																				<Badge
																					variant="outline"
																					className="text-xs mt-1"
																				>
																					Default
																				</Badge>
																			)}
																		</div>
																	</div>
																	{uom.warehouseStocks.length > 0 ? (
																		<>
																			<div className="p-3 space-y-2">
																				{uom.warehouseStocks
																					.slice(0, 10)
																					.map((stock, idx) => {
																						const warehouse = warehouses.find(
																							(w) => w.id === stock.warehouseId,
																						);
																						return (
																							<div
																								key={idx}
																								className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
																							>
																								<div>
																									<p className="font-medium">
																										{warehouse?.name ||
																											"Unknown Warehouse"}
																									</p>
																									<div className="flex gap-3 text-xs text-muted-foreground mt-1">
																										{stock.rack && (
																											<span>
																												Rack: {stock.rack}
																											</span>
																										)}
																										{stock.bin && (
																											<span>
																												Bin: {stock.bin}
																											</span>
																										)}
																										{stock.zone && (
																											<span>
																												Zone: {stock.zone}
																											</span>
																										)}
																										{stock.aisle && (
																											<span>
																												Aisle: {stock.aisle}
																											</span>
																										)}
																									</div>
																								</div>
																								<p className="font-semibold">
																									{stock.quantity}
																								</p>
																							</div>
																						);
																					})}
																			</div>
																			<div className="px-3 pb-3">
																				<Button
																					variant="outline"
																					size="sm"
																					className="w-full"
																					onClick={() => {
																						const warehouseStockDetails: WarehouseStockDetail[] =
																							uom.warehouseStocks.map(
																								(stock) => {
																									const warehouse =
																										warehouses.find(
																											(w) =>
																												w.id ===
																												stock.warehouseId,
																										);
																									return {
																										warehouseId:
																											stock.warehouseId,
																										warehouseName:
																											warehouse?.name ||
																											"Unknown Warehouse",
																										quantity: stock.quantity,
																										rack: stock.rack,
																										bin: stock.bin,
																										zone: stock.zone,
																										aisle: stock.aisle,
																									};
																								},
																							);
																						setWarehouseModalData({
																							title: `UOM: ${uom.uomName} (${uom.uomCode})`,
																							subtitle: `Conversion: ${uom.conversionFactor}x | Total Stock: ${uom.totalStock} units`,
																							warehouseStocks:
																								warehouseStockDetails,
																							reportType: "uom",
																							itemName: uom.uomName,
																							itemSKU: uom.uomCode,
																							productBarcode:
																								selectedProduct.barcode,
																							productSKU: selectedProduct.sku,
																							productName: selectedProduct.name,
																						});
																						setWarehouseModalOpen(true);
																					}}
																				>
																					View Full Report
																				</Button>
																			</div>
																		</>
																	) : (
																		<div className="p-3 text-center text-sm text-muted-foreground">
																			No warehouse allocations for this UOM
																		</div>
																	)}
																</div>
															);
														})}
													</div>
												) : (
													<div className="mt-2 p-4 border rounded-lg bg-muted/20 text-center">
														<p className="text-sm text-muted-foreground">
															UOM warehouse stock data not available. Configure
															UOM warehouse allocations to see breakdown.
														</p>
													</div>
												)}
											</div>
										</>
									)}

								{selectedProduct.productLocations &&
									selectedProduct.productLocations.length > 0 && (
										<>
											<Separator />
											<div>
												<Label className="text-xs text-muted-foreground">
													Product Locations
												</Label>
												<div className="mt-2 space-y-2">
													{selectedProduct.productLocations
														.slice(0, 10)
														.map((location) => {
															const warehouse = warehouses.find(
																(w) => w.id === location.warehouseId,
															);
															return (
																<div
																	key={location.id}
																	className="p-3 border rounded bg-muted/30"
																>
																	<p className="text-sm font-medium mb-2">
																		{warehouse?.name || "Unknown Warehouse"}
																	</p>
																	<div className="grid grid-cols-2 gap-2 text-xs">
																		{location.rack && (
																			<div>
																				<span className="text-muted-foreground">
																					Rack:
																				</span>
																				<span className="ml-1 font-medium">
																					{location.rack}
																				</span>
																			</div>
																		)}
																		{location.bin && (
																			<div>
																				<span className="text-muted-foreground">
																					Bin:
																				</span>
																				<span className="ml-1 font-medium">
																					{location.bin}
																				</span>
																			</div>
																		)}
																		{location.zone && (
																			<div>
																				<span className="text-muted-foreground">
																					Zone:
																				</span>
																				<span className="ml-1 font-medium">
																					{location.zone}
																				</span>
																			</div>
																		)}
																		{location.aisle && (
																			<div>
																				<span className="text-muted-foreground">
																					Aisle:
																				</span>
																				<span className="ml-1 font-medium">
																					{location.aisle}
																				</span>
																			</div>
																		)}
																	</div>
																	<div className="mt-2 pt-2 border-t">
																		<span className="text-xs text-muted-foreground">
																			Quantity at location:
																		</span>
																		<span className="ml-1 text-sm font-semibold">
																			{location.quantity}
																		</span>
																	</div>
																</div>
															);
														})}
												</div>
												<div className="mt-3">
													<Button
														variant="outline"
														size="sm"
														className="w-full"
														onClick={() => {
															const warehouseStockDetails: WarehouseStockDetail[] =
																selectedProduct.productLocations!.map(
																	(location) => {
																		const warehouse = warehouses.find(
																			(w) => w.id === location.warehouseId,
																		);
																		return {
																			warehouseId: location.warehouseId,
																			warehouseName:
																				warehouse?.name || "Unknown Warehouse",
																			quantity: location.quantity,
																			rack: location.rack,
																			bin: location.bin,
																			zone: location.zone,
																			aisle: location.aisle,
																		};
																	},
																);
															setWarehouseModalData({
																title: `Product: ${selectedProduct.name}`,
																subtitle: `SKU: ${selectedProduct.sku} | Barcode: ${selectedProduct.barcode} | Total Stock: ${selectedProduct.stock} units`,
																warehouseStocks: warehouseStockDetails,
																reportType: "product",
																itemName: selectedProduct.name,
																itemSKU: selectedProduct.sku,
																productBarcode: selectedProduct.barcode,
																productSKU: selectedProduct.sku,
																productName: selectedProduct.name,
															});
															setWarehouseModalOpen(true);
														}}
													>
														View Full Report
													</Button>
												</div>
											</div>
										</>
									)}

								{/* Product Media (Images & Videos) */}
								<Separator />
								<Tabs defaultValue="images" className="w-full">
									<TabsList className="grid w-full grid-cols-2">
										<TabsTrigger value="images" className="gap-2">
											<ImageIcon className="h-4 w-4" />
											Images
										</TabsTrigger>
										<TabsTrigger value="videos" className="gap-2">
											<Film className="h-4 w-4" />
											Videos
										</TabsTrigger>
									</TabsList>
									<TabsContent value="images" className="mt-4">
										<ImageGallery
											productId={selectedProduct.id}
											maxImages={10}
											readOnly={true}
										/>
									</TabsContent>
									<TabsContent value="videos" className="mt-4">
										<VideoGallery
											productId={selectedProduct.id}
											maxVideos={5}
											defaultMode="r2"
											readOnly={true}
										/>
									</TabsContent>
								</Tabs>
							</div>
						</div>
					)}

					<DrawerFooter>
						<Button
							onClick={() =>
								selectedProduct && handleEditProduct(selectedProduct)
							}
						>
							<Edit className="h-4 w-4 mr-2" />
							Edit Product
						</Button>
						<DrawerClose asChild>
							<Button variant="outline">Close</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>

			{/* Add/Edit Product Form Drawer (Left Side) - Simplified for now */}
			<Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
				<DrawerContent side="left">
					<DrawerHeader>
						<div className="flex items-start justify-between">
							<div>
								<DrawerTitle>
									{formMode === "add" ? "Add New Product" : "Edit Product"}
								</DrawerTitle>
								<DrawerDescription>
									{formMode === "add"
										? "Fill in the details to create a new product"
										: "Update product information"}
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
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							handleSubmitForm(e);
						}}
						className="flex-1 overflow-y-auto p-4 space-y-4"
					>
						<form.Field name="barcode">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Barcode</Label>
									<div className="flex gap-2">
										<Input
											id={field.name}
											placeholder="8901234567890"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											required
											className="flex-1"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => {
												const newBarcode = generateUniqueBarcode();
												if (newBarcode) {
													field.handleChange(newBarcode);
													toast.success("Barcode generated");
												}
											}}
											title="Generate unique barcode"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
											</svg>
										</Button>
									</div>
									{field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">
											{field.state.meta.errors.join(', ')}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="name">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Product Name</Label>
									<Input
										id={field.name}
										placeholder="Baby Bottle Set"
										value={field.state.value}
										onChange={(e) => handleCategoryOrNameChange("name", e.target.value)}
										onBlur={field.handleBlur}
										required
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">
											{field.state.meta.errors.join(', ')}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="description">
							{(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Description</Label>
									<Input
										id={field.name}
										placeholder="BPA-free baby bottles..."
										value={field.state.value || ''}
										onChange={(e) => field.handleChange(e.target.value)}
										onBlur={field.handleBlur}
									/>
									{field.state.meta.errors.length > 0 && (
										<p className="text-sm text-destructive">
											{field.state.meta.errors.join(', ')}
										</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Product Media (Images & Videos) - Only available in edit mode */}
						{formMode === "edit" && selectedProduct && (
							<>
								<Separator className="my-4" />
								<div>
									<Label className="text-base font-semibold mb-3">
										Product Media
									</Label>
									<Tabs defaultValue="images" className="w-full mt-3">
										<TabsList className="grid w-full grid-cols-2">
											<TabsTrigger value="images" className="gap-2">
												<ImageIcon className="h-4 w-4" />
												Images
											</TabsTrigger>
											<TabsTrigger value="videos" className="gap-2">
												<Film className="h-4 w-4" />
												Videos
											</TabsTrigger>
										</TabsList>
										<TabsContent value="images" className="mt-4">
											<div className="space-y-3">
												<p className="text-xs text-muted-foreground">
													Upload and manage product images. Supports multiple
													images with automatic optimization.
												</p>
												<ImageGallery
													productId={selectedProduct.id}
													maxImages={10}
													readOnly={false}
												/>
											</div>
										</TabsContent>
										<TabsContent value="videos" className="mt-4">
											<div className="space-y-3">
												<p className="text-xs text-muted-foreground">
													Upload and manage product videos. Choose between R2
													storage or Cloudflare Stream.
												</p>
												<VideoGallery
													productId={selectedProduct.id}
													maxVideos={5}
													defaultMode="r2"
													readOnly={false}
												/>
											</div>
										</TabsContent>
									</Tabs>
								</div>
								<Separator className="my-4" />
							</>
						)}

						{/* Notice for add mode */}
						{formMode === "add" && (
							<>
								<Separator className="my-4" />
								<div className="p-4 bg-muted/50 border border-border rounded-lg">
									<div className="flex items-start gap-3">
										<ImageIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
										<div className="text-sm">
											<p className="font-medium text-foreground">
												Upload images and videos after creation
											</p>
											<p className="text-muted-foreground mt-1">
												Create the product first, then edit it to add images and
												videos with our optimized upload features.
											</p>
										</div>
									</div>
								</div>
								<Separator className="my-4" />
							</>
						)}

						<div className="grid grid-cols-2 gap-3">
							<form.Field name="sku">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>SKU (Auto-generated)</Label>
										<Input
											id={field.name}
											placeholder="TO-TA-01"
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											required
											readOnly
											className="bg-muted/30"
										/>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>
							<form.Field name="categoryId">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Category</Label>
										<select
											id={field.name}
											value={field.state.value || ''}
											onChange={(e) => handleCategoryOrNameChange("categoryId", e.target.value)}
											onBlur={field.handleBlur}
											className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
										>
											<option value="">Select category...</option>
											{categories.map((cat) => (
												<option key={cat.id} value={cat.id}>
													{cat.name}
												</option>
											))}
										</select>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<form.Field name="price">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Price (Rp)</Label>
										<Input
											id={field.name}
											type="number"
											step="1000"
											placeholder="50000"
											value={field.state.value || ''}
											onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
											onBlur={field.handleBlur}
											required
										/>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>
							{/* Stock field removed - stock is now managed via Product Locations (Inventory Service) */}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<form.Field name="status">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Status</Label>
										<select
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value as 'active' | 'inactive' | 'omnichannel sales')}
											onBlur={field.handleBlur}
											className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
											required
										>
											<option value="active">Active</option>
											<option value="inactive">Inactive</option>
											<option value="omnichannel sales">Omnichannel Sales</option>
										</select>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>
							{/* NOTE: minimumStock field REMOVED per DDD compliance */}
							{/* Stock alerts are now managed via Inventory Service */}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<form.Field name="baseUnit">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Base Unit</Label>
										<select
											id={field.name}
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
											required
											className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
										>
											{baseUnits.length === 0 ? (
												<option value="PCS">PCS (Default)</option>
											) : (
												baseUnits.map((uom) => (
													<option key={uom.id} value={uom.code}>
														{uom.code} - {uom.name}
													</option>
												))
											)}
										</select>
										<p className="text-xs text-muted-foreground">
											Base unit for inventory tracking
										</p>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>
							<form.Field name="wholesaleThreshold">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>
											Wholesale Threshold
											<span className="text-xs text-muted-foreground ml-1">
												(Optional)
											</span>
										</Label>
										<Input
											id={field.name}
											type="number"
											placeholder="12"
											value={field.state.value || ''}
											onChange={(e) => field.handleChange(parseInt(e.target.value) || 10)}
											onBlur={field.handleBlur}
										/>
										<p className="text-xs text-muted-foreground">
											Minimum quantity for wholesale pricing
										</p>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>
						</div>

						<Separator className="my-4" />

						{/* Physical Dimensions for Shipping Cost Calculation */}
						<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
							<div>
								<Label className="text-base font-semibold">
									Physical Dimensions (Optional)
								</Label>
								<p className="text-xs text-muted-foreground mt-1">
									Product dimensions for shipping cost calculation
								</p>
							</div>

							<form.Field name="weight">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Weight (kg)</Label>
										<Input
											id={field.name}
											type="number"
											step="0.01"
											placeholder="0.5"
											value={field.state.value || ''}
											onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
											onBlur={field.handleBlur}
										/>
										{field.state.meta.errors.length > 0 && (
											<p className="text-sm text-destructive">
												{field.state.meta.errors.join(', ')}
											</p>
										)}
									</div>
								)}
							</form.Field>

							<div className="grid grid-cols-3 gap-3">
								<form.Field name="length">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Length (cm)</Label>
											<Input
												id={field.name}
												type="number"
												step="0.1"
												placeholder="10"
												value={field.state.value || ''}
												onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-sm text-destructive">
													{field.state.meta.errors.join(', ')}
												</p>
											)}
										</div>
									)}
								</form.Field>
								<form.Field name="width">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Width (cm)</Label>
											<Input
												id={field.name}
												type="number"
												step="0.1"
												placeholder="10"
												value={field.state.value || ''}
												onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-sm text-destructive">
													{field.state.meta.errors.join(', ')}
												</p>
											)}
										</div>
									)}
								</form.Field>
								<form.Field name="height">
									{(field) => (
										<div className="space-y-2">
											<Label htmlFor={field.name}>Height (cm)</Label>
											<Input
												id={field.name}
												type="number"
												step="0.1"
												placeholder="10"
												value={field.state.value || ''}
												onChange={(e) => field.handleChange(parseFloat(e.target.value) || null)}
												onBlur={field.handleBlur}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-sm text-destructive">
													{field.state.meta.errors.join(', ')}
												</p>
											)}
										</div>
									)}
								</form.Field>
							</div>
						</div>

						<Separator className="my-4" />

						{/* Product Expiration Section */}
						<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
							<div>
								<Label className="text-base font-semibold">
									Product Expiration &amp; Alert
								</Label>
								<p className="text-xs text-muted-foreground mt-1">
									Set expiration date and alert date for product lifecycle
									management
								</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="alertDate">Alert Date</Label>
									<DatePicker
										date={
											formData.alertDate
												? new Date(formData.alertDate)
												: undefined
										}
										onDateChange={(date) => {
											const alertDate = date
												? date.toISOString().split("T")[0]
												: "";
											// Validate: alert date should be before expiration date
											if (
												formData.expirationDate &&
												date &&
												new Date(alertDate) >= new Date(formData.expirationDate)
											) {
												toast.error(
													"Alert date must be before expiration date",
												);
												return;
											}
											setFormData({ ...formData, alertDate });
										}}
										placeholder="Select alert date"
									/>
									<p className="text-xs text-muted-foreground">
										Date to receive notification before expiration
									</p>
								</div>

								<div className="space-y-2">
									<Label htmlFor="expirationDate">Expiration Date</Label>
									<DatePicker
										date={
											formData.expirationDate
												? new Date(formData.expirationDate)
												: undefined
										}
										onDateChange={(date) => {
											const expirationDate = date
												? date.toISOString().split("T")[0]
												: "";
											// Validate: expiration date should be after alert date
											if (
												formData.alertDate &&
												date &&
												new Date(expirationDate) <= new Date(formData.alertDate)
											) {
												toast.error("Expiration date must be after alert date");
												return;
											}
											setFormData({ ...formData, expirationDate });
										}}
										placeholder="Select expiration date"
									/>
									<p className="text-xs text-muted-foreground">
										Date when product expires or should be removed
									</p>
								</div>
							</div>
						</div>

						<Separator className="my-4" />

						{/* Product UOMs Section */}
						<div className="space-y-4 border rounded-lg p-4 bg-muted/20">
							<div className="flex items-start justify-between">
								<div>
									<Label className="text-base font-semibold">
										Product UOMs (Units of Measure)
									</Label>
									<p className="text-xs text-muted-foreground mt-1">
										Add different packaging units for this product (e.g., Box,
										Dozen, Carton). Each UOM can have its own barcode and stock
										quantity.
									</p>
								</div>
							</div>

							{/* Stock allocation info */}
							<div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded">
								<div className="text-sm">
									<span className="font-medium text-foreground">
										Total Stock:{" "}
									</span>
									<span className="text-muted-foreground">
										0 {form.state.values.baseUnit || "PCS"} (managed via Inventory)
									</span>
								</div>
								<div className="text-sm">
									<span className="font-medium text-foreground">
										Allocated:{" "}
									</span>
									<span className="text-muted-foreground">
										{calculateAllocatedPCS(productUOMs)}{" "}
										{form.state.values.baseUnit || "PCS"}
									</span>
								</div>
								<div className="text-sm">
									<span className="font-medium text-foreground">
										Available:{" "}
									</span>
									<span className="text-primary font-bold">
										{getRemainingPCS()} {form.state.values.baseUnit || "PCS"}
									</span>
								</div>
							</div>

							{/* Existing UOMs List */}
							{productUOMs.length > 0 && (
								<div className="space-y-2">
									<Label className="text-sm font-medium">Added UOMs</Label>
									<div className="space-y-3">
										{productUOMs.map((uom) => (
											<div
												key={uom.id}
												className="border rounded bg-background"
											>
												<div className="flex items-start justify-between gap-3 p-3">
													<div className="flex-1 min-w-0 space-y-1">
														<div className="flex items-center gap-2 flex-wrap">
															<span className="font-medium break-words">
																{uom.uomName} ({uom.uomCode})
															</span>
															{uom.isDefault && (
																<Badge
																	variant="outline"
																	className="text-xs bg-green-50 text-green-700 border-green-200"
																>
																	Default
																</Badge>
															)}
														</div>
														<div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
															<span className="break-all">
																Barcode: {uom.barcode}
															</span>
															<span className="whitespace-nowrap">
																Stock: {uom.stock} {uom.uomCode}
															</span>
															<span className="whitespace-nowrap">
																({uom.stock * uom.conversionFactor}{" "}
																{form.state.values.baseUnit || "PCS"})
															</span>
														</div>
													</div>
													<div className="flex items-center gap-1 flex-shrink-0">
														<Checkbox
															checked={uom.isDefault}
															onCheckedChange={() =>
																handleSetDefaultUOM(uom.id)
															}
															id={`default-${uom.id}`}
														/>
														<Label
															htmlFor={`default-${uom.id}`}
															className="text-xs text-muted-foreground cursor-pointer mr-2"
														>
															Default
														</Label>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-8 w-8 text-destructive"
															onClick={() => handleRemoveUOM(uom)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</div>
												</div>

												{/* UOM Warehouse Allocations */}
												<div className="px-3 pb-3 pt-2 border-t bg-muted/10">
													<ProductUOMWarehouseAllocation
														warehouses={warehouses}
														allocations={uomWarehouseAllocations[uom.id] || []}
														onAllocationsChange={(allocations) =>
															handleUOMAllocationsChange(uom.id, allocations)
														}
														uomCode={uom.uomCode}
														uomName={uom.uomName}
														totalStock={uom.stock}
														readOnly={false}
													/>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Add UOM Form */}
							<div className="space-y-3 pt-2 border-t">
								<Label className="text-sm font-medium">Add New UOM</Label>

								<div className="grid grid-cols-3 gap-3">
									<div className="space-y-2">
										<Label htmlFor="uom-select" className="text-xs">
											UOM Type
										</Label>
										<select
											id="uom-select"
											value={selectedUOM}
											onChange={(e) => setSelectedUOM(e.target.value)}
											className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
										>
											<option value="">Select UOM...</option>
											{availableUOMs
												.filter(
													(u) =>
														!u.isBaseUnit &&
														u.baseUnitCode === (form.state.values.baseUnit || "PCS"),
												)
												.map((uom) => (
													<option key={uom.id} value={uom.code}>
														{uom.name} (1 = {uom.conversionFactor}{" "}
														{form.state.values.baseUnit || "PCS"})
													</option>
												))}
										</select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="uom-barcode" className="text-xs">
											Barcode
										</Label>
										<div className="flex gap-2">
											<Input
												id="uom-barcode"
												placeholder="UOM Barcode"
												value={uomBarcode}
												onChange={(e) => setUomBarcode(e.target.value)}
												className="flex-1"
											/>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => {
													const newBarcode = generateUniqueBarcode();
													if (newBarcode) {
														setUomBarcode(newBarcode);
														toast.success("Barcode generated");
													}
												}}
												title="Generate unique barcode"
												className="h-9 w-9"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="16"
													height="16"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
												>
													<path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
												</svg>
											</Button>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="uom-stock" className="text-xs">
											Stock Quantity
										</Label>
										<Input
											id="uom-stock"
											type="number"
											placeholder="Stock"
											value={uomStock}
											onChange={(e) => setUomStock(e.target.value)}
										/>
									</div>
								</div>

								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleAddUOM}
									className="w-full"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add UOM
								</Button>
							</div>
						</div>

						<Separator className="my-4" />

						{/* Multi-Warehouse Allocation Section */}
						<ProductWarehouseAllocation
							warehouses={warehouses}
							allocations={warehouseAllocations}
							onAllocationsChange={setWarehouseAllocations}
							totalStock={0}
							readOnly={false}
						/>

						<DrawerFooter className="px-0">
							<Button
								type="submit"
								className="w-full"
								disabled={
									createProductMutation.isPending ||
									updateProductMutation.isPending
								}
							>
								{createProductMutation.isPending ||
								updateProductMutation.isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										{formMode === "add" ? "Creating..." : "Updating..."}
									</>
								) : formMode === "add" ? (
									"Create Product"
								) : (
									"Update Product"
								)}
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
							{productToDelete && (
								<>
									You are about to delete{" "}
									<strong>"{productToDelete.name}"</strong>. This action cannot
									be undone. This will permanently delete the product and remove
									all associated data.
								</>
							)}
							{uomToDelete && (
								<>
									You are about to remove <strong>{uomToDelete.uomName}</strong>{" "}
									from this product. This action cannot be undone.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								setDeleteDialogOpen(false);
								setProductToDelete(null);
								setUomToDelete(null);
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (productToDelete) {
									confirmDeleteProduct();
								} else if (uomToDelete) {
									confirmDeleteUOM();
								}
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteProductMutation.isPending ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Deleting...
								</>
							) : (
								"Delete"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Warehouse Detail Modal with PDF Export */}
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
