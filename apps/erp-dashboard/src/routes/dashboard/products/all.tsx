import { ImageGallery } from '@/components/ImageGallery';
import { VideoGallery } from '@/components/VideoGallery';
import { PhysicalDimensionsSection } from '@/components/products/PhysicalDimensionsSection';
import { ProductExpirationSection } from '@/components/products/ProductExpirationSection';
import { ProductUOMManagementSection } from '@/components/products/ProductUOMManagementSection';
import type { UOMWarehouseAllocation } from '@/components/products/ProductUOMWarehouseAllocation';
import {
  ProductWarehouseAllocation,
  type WarehouseAllocation,
} from '@/components/products/ProductWarehouseAllocation';
import {
  WarehouseDetailModal,
  type WarehouseStockDetail,
} from '@/components/products/WarehouseDetailModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ProductWithStock,
  getProductColumns,
  productStatusOptions,
} from '@/components/ui/data-table/columns/product-columns';
import { DataTable } from '@/components/ui/data-table/data-table';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAsyncValidation } from '@/hooks/useAsyncValidation';
import { type ProductUOMWithStock, useUOMManagement } from '@/hooks/useUOMManagement';
import {
  type CreateProductInput,
  type Product,
  type ProductUOM,
  categoryApi,
  productApi,
  productLocationApi,
  productUOMLocationApi,
  uomApi,
  variantLocationApi,
  warehouseApi,
} from '@/lib/api';
import { type ProductFormData, createFormValidator, productFormSchema } from '@/lib/form-schemas';
import {
  buildProductPayload,
  createBaseUnitUOM,
  createProductWarehouseLocations,
  createUOMWarehouseLocations,
  syncProductUOMsAdd,
  syncProductUOMsEdit,
  syncProductWarehouseLocations,
  syncUOMWarehouseLocations,
  validateStockConsistencyWithToast,
} from '@/lib/product-form-utils';
import { queryKeys } from '@/lib/query-client';
import { productListSearchSchema } from '@/lib/route-search-schemas';
import { validationApi } from '@/lib/validation-api';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  CheckCircle2,
  Edit,
  Film,
  Image as ImageIcon,
  Loader2,
  Plus,
  X,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

/**
 * All Products Route
 *
 * Features:
 * - Zod-validated search params for filtering
 * - Route loader for data prefetching
 * - Pagination synced with URL
 */
export const Route = createFileRoute('/dashboard/products/all')({
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
    case 'online sales':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200';
    case 'offline sales':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200';
    case 'omnichannel sales':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200';
    case 'inactive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
    case 'discontinued':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200';
    // Legacy support
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200';
  }
};

// Helper function to format status display text
const formatStatusText = (status: string) => {
  // Capitalize each word
  return status
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to format currency in Indonesian Rupiah
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to get category badge color (based on category color from database)
const getCategoryBadgeColor = (color?: string | null) => {
  if (!color) {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200';
  }

  // Map color names to Tailwind classes
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200',
    yellow:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200',
    purple:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200',
    pink: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200',
    indigo:
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200',
    orange:
      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200',
    teal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200',
  };

  return (
    colorMap[color.toLowerCase()] ||
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'
  );
};

// Helper function to extract error message from various error types
const getErrorMessage = (error: any): string => {
  // Handle string errors
  if (typeof error === 'string') {
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
    if (typeof data.message === 'string') {
      return data.message;
    }

    // Check for error field
    if (typeof data.error === 'string') {
      return data.error;
    }

    // Check for errors array
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e: any) => e.message || e).join(', ');
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
  if (typeof error?.message === 'string') {
    return error.message;
  }

  // Handle direct error property
  if (typeof error?.error === 'string') {
    return error.error;
  }

  // Try to extract any useful information from the error object
  if (error && typeof error === 'object') {
    try {
      // Check common error properties
      const errorStr = error.toString();
      if (errorStr && errorStr !== '[object Object]') {
        return errorStr;
      }

      // Try to find any string property that might contain an error message
      for (const key of ['msg', 'detail', 'reason', 'statusText']) {
        if (error[key] && typeof error[key] === 'string') {
          return error[key];
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // Fallback to generic message
  return 'An unexpected error occurred. Please try again.';
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
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

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
      // Phase 3: Updated to match ProductStatus enum
      status: 'offline sales' as const,
      isBundle: false,
      expirationDate: null,
      alertDate: null,
      rack: '',
      bin: '',
      zone: '',
      aisle: '',
    } as ProductFormData,
    validators: {
      onChange: createFormValidator(productFormSchema),
    },
    onSubmit: async ({ value }) => {
      // Form submission will be handled by handleSubmitForm
      // This is just to validate the form structure
    },
  });

  // Product UOM management - using custom hook
  const uomManagement = useUOMManagement();

  // Phase 5: Async validation hooks with debouncing
  const skuValidation = useAsyncValidation(validationApi.checkSKUUnique);
  const barcodeValidation = useAsyncValidation(validationApi.checkBarcodeUnique);

  // Warehouse allocations state
  const [warehouseAllocations, setWarehouseAllocations] = useState<WarehouseAllocation[]>([]);

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
    reportType: 'variant' | 'uom' | 'product';
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
    const loadingStocks: Record<string, { totalStock: number; isLoading: boolean }> = {};
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
            const uomStockData = await productApi.getUOMWarehouseStock(product.id);
            setUomWarehouseStock(uomStockData);
          } catch (error) {
            console.error('Failed to fetch UOM warehouse stock:', error);
            setUomWarehouseStock(null);
          }

          // Fetch variant warehouse stock
          try {
            const variantStockData = await productApi.getVariantWarehouseStock(product.id);
            setVariantWarehouseStock(variantStockData);
          } catch (error) {
            console.error('Failed to fetch variant warehouse stock:', error);
            setVariantWarehouseStock(null);
          }
        },
        onEdit: async (product) => {
          setFormMode('edit');
          setSelectedProduct(product);

          // Fetch product UOMs
          try {
            const productUOMsData = await uomApi.getProductUOMs(product.id);
            uomManagement.setProductUOMs(productUOMsData.productUOMs || []);
          } catch (error) {
            console.error('Failed to fetch product UOMs:', error);
            uomManagement.setProductUOMs([]);
          }

          // Fetch product locations
          let formattedAllocations: WarehouseAllocation[] = [];
          try {
            const productLocationsData = await productLocationApi.getByProduct(product.id);
            formattedAllocations = (productLocationsData.locations || []).map((location: any) => ({
              warehouseId: location.warehouseId,
              quantity: location.quantity || 0,
              minimumStock: location.minimumStock || 0,
              rack: location.rack || '',
              bin: location.bin || '',
              zone: location.zone || '',
              aisle: location.aisle || '',
            }));
            setWarehouseAllocations(formattedAllocations);
          } catch (error) {
            console.error('Failed to fetch product locations:', error);
            setWarehouseAllocations([]);
          }

          // Update TanStack Form with product data
          form.setFieldValue('barcode', product.barcode);
          form.setFieldValue('name', product.name);
          form.setFieldValue('sku', product.sku);
          form.setFieldValue('description', product.description || '');
          form.setFieldValue('categoryId', product.categoryId || '');
          form.setFieldValue('price', product.price);
          form.setFieldValue('baseUnit', product.baseUnit || 'PCS');
          form.setFieldValue('wholesaleThreshold', product.wholesaleThreshold || 12);
          // Phase 3: Updated type cast to match ProductStatus enum
          form.setFieldValue('status', product.status);
          form.setFieldValue('weight', product.weight);
          form.setFieldValue('length', product.length);
          form.setFieldValue('width', product.width);
          form.setFieldValue('height', product.height);
          // Initialize expiration/location fields from warehouse allocations loaded above
          const firstLocation = formattedAllocations[0];
          form.setFieldValue('expirationDate', null);
          form.setFieldValue('alertDate', null);
          form.setFieldValue('rack', firstLocation?.rack || '');
          form.setFieldValue('bin', firstLocation?.bin || '');
          form.setFieldValue('zone', firstLocation?.zone || '');
          form.setFieldValue('aisle', firstLocation?.aisle || '');

          setFormDrawerOpen(true);
        },
        onDelete: (product) => {
          setProductToDelete(product);
          setDeleteDialogOpen(true);
        },
      }),
    // Dependencies: categories for column data, form and uomManagement for callbacks
    // Note: useState setters are stable and don't need to be listed
    [categories, form, uomManagement]
  );

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductInput) => productApi.create(data),
    onSuccess: () => {
      // Invalidate all products queries (including those with search term)
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Product created successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = getErrorMessage(error);
      toast.error('Failed to create product', {
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
        queryKey: queryKeys.products.detail(selectedProduct?.id),
      });
      toast.success('Product updated successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      const errorMessage = getErrorMessage(error);
      toast.error('Failed to update product', {
        description: errorMessage,
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: any) => {
      const errorMessage = getErrorMessage(error);
      toast.error('Failed to delete product', {
        description: errorMessage,
      });
    },
  });

  // Helper function: Generate barcode (EAN-13 format)
  const generateBarcode = () => {
    const randomDigits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += Number.parseInt(randomDigits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return randomDigits + checksum;
  };

  // Helper function: Check if barcode is unique
  const isBarcodeUnique = (barcode: string, excludeProductId?: string) => {
    const existsInProducts = products.some(
      (p) => p.barcode === barcode && p.id !== excludeProductId
    );
    if (existsInProducts) return false;

    const existsInCurrentUOMs = uomManagement.productUOMs.some(
      (uom) => uom.barcode === barcode && uom.uomCode !== 'PCS'
    );
    if (existsInCurrentUOMs) return false;

    return true;
  };

  // Helper function: Generate unique barcode
  const generateUniqueBarcode = () => {
    let barcode = generateBarcode();
    let attempts = 0;
    const excludeId = formMode === 'edit' ? selectedProduct?.id : undefined;

    while (!isBarcodeUnique(barcode, excludeId) && attempts < 100) {
      barcode = generateBarcode();
      attempts++;
    }

    if (attempts >= 100) {
      toast.error('Failed to generate unique barcode', {
        description: 'Please try again or enter manually',
      });
      return '';
    }

    return barcode;
  };

  // Helper function: Generate SKU from category and product name
  const generateSKU = (categoryId: string, productName: string) => {
    if (!categoryId || !productName) return '';

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return '';

    const categoryCode = category.name
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    const nameCode = productName
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    const prefix = `${categoryCode}-${nameCode}`;
    const existingProducts = products.filter((p) => p.sku.startsWith(prefix));
    const nextNumber = String(existingProducts.length + 1).padStart(2, '0');

    return `${prefix}-${nextNumber}`;
  };

  // Auto-generate SKU when category or name changes
  const handleCategoryOrNameChange = (field: 'categoryId' | 'name', value: string) => {
    // Update form field
    form.setFieldValue(field, value);

    // Auto-generate SKU when both category and name are available
    if (formMode === 'add' || !form.state.values.sku) {
      const categoryId = field === 'categoryId' ? value : form.state.values.categoryId;
      const name = field === 'name' ? value : form.state.values.name;

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
      console.error('Failed to fetch UOM warehouse stock:', error);
      setUomWarehouseStock(null);
    }

    // Fetch variant warehouse stock breakdown
    try {
      if (fullProduct.variants && fullProduct.variants.length > 0) {
        const variantStockData = await Promise.all(
          fullProduct.variants.map(async (variant) => {
            try {
              const variantLocs = await variantLocationApi.getByVariant(variant.id);
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
              console.error(`Failed to fetch locations for variant ${variant.id}:`, error);
              return {
                variantId: variant.id,
                variantName: variant.variantName,
                variantSKU: variant.variantSKU,
                totalStock: variant.stock,
                warehouseStocks: [],
              };
            }
          })
        );
        setVariantWarehouseStock({ variants: variantStockData });
      } else {
        setVariantWarehouseStock(null);
      }
    } catch (error) {
      console.error('Failed to fetch variant warehouse stock:', error);
      setVariantWarehouseStock(null);
    }

    setProductDetailDrawerOpen(true);
  };

  const handleAddProduct = () => {
    setFormMode('add');
    // Reset TanStack Form (includes all fields now)
    form.reset();
    uomManagement.resetAll();
    setWarehouseAllocations([]); // Reset warehouse allocations

    // Auto-create PCS as default base unit (matches form schema default)
    const pcsBaseUOM: ProductUOMWithStock = {
      id: `uom-pcs-${Date.now()}`,
      productId: '',
      uomCode: 'PCS',
      uomName: 'Pieces',
      barcode: '',
      conversionFactor: 1,
      stock: 0,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    uomManagement.setProductUOMs([pcsBaseUOM]);

    setFormDrawerOpen(true);
  };

  const handleEditProduct = async (product: Product) => {
    setFormMode('edit');
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

    // Update expiration/alert date fields (now in TanStack form)
    form.setFieldValue('expirationDate', fullProduct.expirationDate || null);
    form.setFieldValue('alertDate', fullProduct.alertDate || null);
    // Update location fields (now in TanStack form)
    form.setFieldValue('rack', firstLocation?.rack || '');
    form.setFieldValue('bin', firstLocation?.bin || '');
    form.setFieldValue('zone', firstLocation?.zone || '');
    form.setFieldValue('aisle', firstLocation?.aisle || '');
    uomManagement.setProductUOMs(fullProduct.productUOMs || []);
    uomManagement.resetUOMInputs();

    // Load warehouse allocations from product locations
    const allocations: WarehouseAllocation[] = (fullProduct.productLocations || []).map(
      (location) => {
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
      }
    );
    setWarehouseAllocations(allocations);

    // Load UOM warehouse allocations
    const uomAllocationsMap: Record<string, UOMWarehouseAllocation[]> = {};
    if (fullProduct.productUOMs && fullProduct.productUOMs.length > 0) {
      try {
        for (const uom of fullProduct.productUOMs) {
          const uomLocations = await productUOMLocationApi.getByProductUOM(uom.id);
          if (uomLocations.locations && uomLocations.locations.length > 0) {
            uomAllocationsMap[uom.id] = uomLocations.locations.map((loc) => {
              const warehouse = warehouses.find((w) => w.id === loc.warehouseId);
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
        uomManagement.setUomWarehouseAllocations(uomAllocationsMap);
      } catch (error) {
        console.error('Failed to load UOM warehouse allocations:', error);
        uomManagement.setUomWarehouseAllocations({});
      }
    } else {
      uomManagement.setUomWarehouseAllocations({});
    }

    setFormDrawerOpen(true);
  };

  const handleRemoveUOM = (uom: ProductUOM) => {
    // Prevent deletion of base unit
    const selectedBaseUnit = form.state.values.baseUnit || 'PCS';
    if (uom.uomCode === selectedBaseUnit) {
      toast.error('Cannot delete base unit', {
        description: `${selectedBaseUnit} is the base unit and cannot be removed`,
      });
      return;
    }

    setUomToDelete(uom);
    setDeleteDialogOpen(true);
  };

  const handleSetDefaultUOM = (uomId: string) => {
    const clickedUOM = uomManagement.productUOMs.find((u) => u.id === uomId);
    const selectedBaseUnit = form.state.values.baseUnit || 'PCS';

    if (clickedUOM?.isDefault) {
      uomManagement.toggleDefaultUOM(uomId);
      toast.info('Default unchecked', {
        description: `Leave all unchecked to use ${selectedBaseUnit} as default, or check another UOM`,
      });
    } else {
      uomManagement.toggleDefaultUOM(uomId);
      if (clickedUOM) {
        toast.success('Default UOM updated', {
          description: `${clickedUOM.uomName} is now the default unit`,
        });
      }
    }
  };

  const confirmDeleteUOM = () => {
    if (uomToDelete) {
      uomManagement.removeUOM(uomToDelete.id);
      toast.success('UOM removed', {
        description: `${uomToDelete.uomName} has been removed`,
      });
      setDeleteDialogOpen(false);
      setUomToDelete(null);
    }
  };

  // Handler to update UOM warehouse allocations for a specific UOM
  const handleUOMAllocationsChange = (uomId: string, allocations: UOMWarehouseAllocation[]) => {
    uomManagement.updateUOMAllocations(uomId, allocations);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get form values
    const formValues = form.state.values;

    // 1. Validate barcode uniqueness
    const excludeId = formMode === 'edit' ? selectedProduct?.id : undefined;
    if (!isBarcodeUnique(formValues.barcode, excludeId)) {
      toast.error('Barcode already exists', {
        description:
          'This barcode is already used by another product. Please use a different barcode or click refresh to generate a new one.',
      });
      return;
    }

    // 2. Auto-create base unit UOM if not added manually
    const finalProductUOMs = createBaseUnitUOM(
      formValues,
      uomManagement.productUOMs,
      availableUOMs,
      uomManagement.calculateAllocatedPCS,
      selectedProduct?.id
    );

    // 3. Build product payload (DDD compliant)
    const productData = buildProductPayload(formValues);

    // 4. DDD VALIDATION: Products with expiration dates require warehouse allocation
    if (formValues.expirationDate && warehouseAllocations.length === 0) {
      toast.error('Expiration date requires warehouse allocation', {
        description:
          'Products with expiration dates must be allocated to at least one warehouse for inventory tracking',
      });
      return;
    }

    // 5. Handle ADD or EDIT mode
    if (formMode === 'add') {
      try {
        // Create product
        const createdProduct = await productApi.create(productData);

        // Create all product UOMs
        if (finalProductUOMs.length > 0) {
          try {
            const uomCodeMap = await syncProductUOMsAdd(
              createdProduct.id,
              finalProductUOMs,
              uomApi
            );

            // Fetch the created product to get the actual UOM IDs
            const createdProductWithUOMs = await productApi.getById(createdProduct.id);

            // Create UOM warehouse locations
            if (
              createdProductWithUOMs.productUOMs &&
              createdProductWithUOMs.productUOMs.length > 0
            ) {
              await createUOMWarehouseLocations(
                uomCodeMap,
                createdProductWithUOMs.productUOMs,
                uomManagement.uomWarehouseAllocations,
                productUOMLocationApi
              );
            }
          } catch (uomError: any) {
            console.error('Failed to create product UOMs:', uomError);
            const errorMessage = getErrorMessage(uomError);
            toast.error('Failed to add UOMs', {
              description: errorMessage,
            });
          }
        }

        // Create multiple warehouse locations if allocated
        if (warehouseAllocations.length > 0) {
          try {
            await createProductWarehouseLocations(
              createdProduct.id,
              warehouseAllocations,
              productLocationApi
            );
          } catch (locationError) {
            console.error('Failed to create product locations:', locationError);
            toast.info('Product created, but some locations could not be set', {
              description: 'You can add the locations later',
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        toast.success('Product created successfully');
        setFormDrawerOpen(false);
      } catch (error: any) {
        const errorMessage = getErrorMessage(error);
        toast.error('Failed to create product', {
          description: errorMessage,
        });
      }
    } else if (formMode === 'edit' && selectedProduct) {
      try {
        // Update product
        await productApi.update(selectedProduct.id, productData);

        // Sync Product UOMs
        if (finalProductUOMs.length > 0) {
          try {
            const existingUOMs = selectedProduct.productUOMs || [];

            await syncProductUOMsEdit(selectedProduct.id, finalProductUOMs, existingUOMs, uomApi);

            // Sync UOM warehouse locations
            await syncUOMWarehouseLocations(
              selectedProduct.id,
              finalProductUOMs,
              uomManagement.uomWarehouseAllocations,
              productApi,
              productUOMLocationApi
            );
          } catch (uomError: any) {
            console.error('Failed to sync product UOMs:', uomError);
            const errorMessage = getErrorMessage(uomError);
            toast.error('Failed to sync UOMs', {
              description: errorMessage,
            });
          }
        }

        // Sync warehouse locations
        try {
          const existingLocations = selectedProduct.productLocations || [];

          await syncProductWarehouseLocations(
            selectedProduct.id,
            warehouseAllocations,
            existingLocations,
            productLocationApi
          );
        } catch (locationError) {
          console.error('Failed to sync product locations:', locationError);
          toast.info('Product updated, but some locations could not be synced', {
            description: 'You can update the locations later',
          });
        }

        // VALIDATE STOCK CONSISTENCY AFTER ALL UPDATES
        // Note: This is a post-save validation warning, not a blocking validation
        // Product data has already been saved successfully at this point
        const isValid = await validateStockConsistencyWithToast(
          selectedProduct.id,
          productApi,
          queryClient,
          queryKeys
        );

        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({
          queryKey: queryKeys.products.detail(selectedProduct.id),
        });

        // Always close drawer since data is saved (validation is just a warning)
        if (isValid) {
          toast.success('Product updated successfully');
        } else {
          toast.success('Product updated successfully (with stock warnings)', {
            description: 'Check the validation warnings and update stock levels if needed',
          });
        }
        setFormDrawerOpen(false);
      } catch (error: any) {
        const errorMessage = getErrorMessage(error);
        toast.error('Failed to update product', {
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
            <p className="text-muted-foreground mt-1">Manage your product inventory and catalog</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading products</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product inventory and catalog</p>
        </div>
        <Button onClick={handleAddProduct} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>View and manage your product catalog</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={productsWithStock}
            searchKey="name"
            searchPlaceholder="Search by name, barcode, SKU, price..."
            isLoading={isLoading}
            enableColumnVisibility
            filterableColumns={[
              {
                id: 'status',
                title: 'Status',
                options: productStatusOptions,
              },
              {
                id: 'category',
                title: 'Category',
                options: (() => {
                  // Build hierarchical list: parents followed by their children
                  const result: Array<{
                    label: string;
                    value: string;
                    children?: string[];
                    parentValue?: string;
                  }> = [];

                  // Get root categories (no parent)
                  const rootCategories = categories.filter((c) => !c.parentId);

                  // For each root category, add it and then its children
                  rootCategories.forEach((parent) => {
                    // Find children of this category
                    const children = categories.filter((child) => child.parentId === parent.id);
                    const childNames = children.map((child) => child.name);

                    // Add parent
                    result.push({
                      label: parent.name,
                      value: parent.name,
                      children: childNames.length > 0 ? childNames : undefined,
                    });

                    // Add children immediately after parent
                    children.forEach((child) => {
                      result.push({
                        label: child.name,
                        value: child.name,
                        parentValue: parent.name,
                      });
                    });
                  });

                  return result;
                })(),
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Product Detail Report Drawer (Right Side) */}
      <Drawer open={productDetailDrawerOpen} onOpenChange={setProductDetailDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle>{selectedProduct?.name}</DrawerTitle>
            <DrawerDescription>Product Details & Inventory Report</DrawerDescription>
          </DrawerHeader>

          {selectedProduct && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Product Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedProduct.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">SKU</Label>
                    <p className="text-sm font-mono mt-1">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Barcode</Label>
                    <p className="text-sm font-mono mt-1">{selectedProduct.barcode}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedProduct.description || 'No description'}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1">
                      {categories.find((c) => c.id === selectedProduct.categoryId)?.name ||
                        'Uncategorized'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedProduct.status === 'active' ? 'default' : 'secondary'}
                        className={
                          selectedProduct.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
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
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <p className="text-lg font-bold mt-1">{formatRupiah(selectedProduct.price)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Stock</Label>
                    <p className="text-lg font-bold mt-1">{selectedProduct.stock}</p>
                  </div>
                </div>

                {(selectedProduct.weight ||
                  selectedProduct.length ||
                  selectedProduct.width ||
                  selectedProduct.height) && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Physical Dimensions</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {selectedProduct.weight && (
                          <div>
                            <p className="text-xs text-muted-foreground">Weight</p>
                            <p className="text-sm font-medium">{selectedProduct.weight} kg</p>
                          </div>
                        )}
                        {selectedProduct.length && (
                          <div>
                            <p className="text-xs text-muted-foreground">Length</p>
                            <p className="text-sm font-medium">{selectedProduct.length} cm</p>
                          </div>
                        )}
                        {selectedProduct.width && (
                          <div>
                            <p className="text-xs text-muted-foreground">Width</p>
                            <p className="text-sm font-medium">{selectedProduct.width} cm</p>
                          </div>
                        )}
                        {selectedProduct.height && (
                          <div>
                            <p className="text-xs text-muted-foreground">Height</p>
                            <p className="text-sm font-medium">{selectedProduct.height} cm</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Product Variants</Label>
                      <div className="mt-2 space-y-2">
                        {selectedProduct.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="p-3 border rounded bg-muted/30 dark:bg-muted/20"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="text-sm font-medium">{variant.variantName}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {variant.variantSKU}
                                </p>
                              </div>
                              <Badge
                                variant={variant.status === 'Active' ? 'default' : 'secondary'}
                                className={
                                  variant.status === 'Active'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                                    : ''
                                }
                              >
                                {variant.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Type:</span>
                                <span className="ml-1 font-medium">{variant.variantType}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price:</span>
                                <span className="ml-1 font-medium">
                                  {formatRupiah(variant.price)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Stock:</span>
                                <span className="ml-1 font-medium">{variant.stock}</span>
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
                                    <p className="text-sm font-medium">{variant.variantName}</p>
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
                                      {variant.warehouseStocks.slice(0, 10).map((stock) => {
                                        const warehouse = warehouses.find(
                                          (w) => w.id === stock.warehouseId
                                        );
                                        return (
                                          <div
                                            key={stock.warehouseId}
                                            className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
                                          >
                                            <div>
                                              <p className="font-medium">
                                                {warehouse?.name || 'Unknown Warehouse'}
                                              </p>
                                              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                                {stock.rack && <span>Rack: {stock.rack}</span>}
                                                {stock.bin && <span>Bin: {stock.bin}</span>}
                                              </div>
                                            </div>
                                            <p className="font-semibold">{stock.quantity}</p>
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
                                            variant.warehouseStocks.map((stock) => {
                                              const warehouse = warehouses.find(
                                                (w) => w.id === stock.warehouseId
                                              );
                                              return {
                                                warehouseId: stock.warehouseId,
                                                warehouseName:
                                                  warehouse?.name || 'Unknown Warehouse',
                                                quantity: stock.quantity,
                                                rack: stock.rack,
                                                bin: stock.bin,
                                              };
                                            });
                                          setWarehouseModalData({
                                            title: `Variant: ${variant.variantName}`,
                                            subtitle: `SKU: ${variant.variantSKU} | Total Stock: ${variant.totalStock} units`,
                                            warehouseStocks: warehouseStockDetails,
                                            reportType: 'variant',
                                            itemName: variant.variantName,
                                            itemSKU: variant.variantSKU,
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
                              Variant warehouse stock data not available. Configure variant
                              warehouse allocations to see breakdown.
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                {selectedProduct.productUOMs && selectedProduct.productUOMs.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Product UOMs (By Warehouse)
                      </Label>
                      {uomWarehouseStock?.uomStocks && uomWarehouseStock.uomStocks.length > 0 ? (
                        <div className="mt-2 space-y-3">
                          {uomWarehouseStock.uomStocks.map((uom) => {
                            const productUOM = selectedProduct.productUOMs?.find(
                              (u) => u.uomCode === uom.uomCode
                            );
                            return (
                              <div key={uom.uomCode} className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 p-3 flex items-center justify-between border-b">
                                  <div>
                                    <p className="text-sm font-medium">
                                      {uom.uomName} ({uom.uomCode})
                                    </p>
                                    {productUOM && (
                                      <p className="text-xs text-muted-foreground">
                                        Barcode: {productUOM.barcode} | Conversion:{' '}
                                        {uom.conversionFactor}x
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-semibold">Total: {uom.totalStock}</p>
                                    {productUOM?.isDefault && (
                                      <Badge variant="outline" className="text-xs mt-1">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {uom.warehouseStocks.length > 0 ? (
                                  <>
                                    <div className="p-3 space-y-2">
                                      {uom.warehouseStocks.slice(0, 10).map((stock) => {
                                        const warehouse = warehouses.find(
                                          (w) => w.id === stock.warehouseId
                                        );
                                        return (
                                          <div
                                            key={stock.warehouseId}
                                            className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
                                          >
                                            <div>
                                              <p className="font-medium">
                                                {warehouse?.name || 'Unknown Warehouse'}
                                              </p>
                                              <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                                {stock.rack && <span>Rack: {stock.rack}</span>}
                                                {stock.bin && <span>Bin: {stock.bin}</span>}
                                                {stock.zone && <span>Zone: {stock.zone}</span>}
                                                {stock.aisle && <span>Aisle: {stock.aisle}</span>}
                                              </div>
                                            </div>
                                            <p className="font-semibold">{stock.quantity}</p>
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
                                            uom.warehouseStocks.map((stock) => {
                                              const warehouse = warehouses.find(
                                                (w) => w.id === stock.warehouseId
                                              );
                                              return {
                                                warehouseId: stock.warehouseId,
                                                warehouseName:
                                                  warehouse?.name || 'Unknown Warehouse',
                                                quantity: stock.quantity,
                                                rack: stock.rack,
                                                bin: stock.bin,
                                                zone: stock.zone,
                                                aisle: stock.aisle,
                                              };
                                            });
                                          setWarehouseModalData({
                                            title: `UOM: ${uom.uomName} (${uom.uomCode})`,
                                            subtitle: `Conversion: ${uom.conversionFactor}x | Total Stock: ${uom.totalStock} units`,
                                            warehouseStocks: warehouseStockDetails,
                                            reportType: 'uom',
                                            itemName: uom.uomName,
                                            itemSKU: uom.uomCode,
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
                            UOM warehouse stock data not available. Configure UOM warehouse
                            allocations to see breakdown.
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
                        <Label className="text-xs text-muted-foreground">Product Locations</Label>
                        <div className="mt-2 space-y-2">
                          {selectedProduct.productLocations.slice(0, 10).map((location) => {
                            const warehouse = warehouses.find((w) => w.id === location.warehouseId);
                            return (
                              <div key={location.id} className="p-3 border rounded bg-muted/30">
                                <p className="text-sm font-medium mb-2">
                                  {warehouse?.name || 'Unknown Warehouse'}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {location.rack && (
                                    <div>
                                      <span className="text-muted-foreground">Rack:</span>
                                      <span className="ml-1 font-medium">{location.rack}</span>
                                    </div>
                                  )}
                                  {location.bin && (
                                    <div>
                                      <span className="text-muted-foreground">Bin:</span>
                                      <span className="ml-1 font-medium">{location.bin}</span>
                                    </div>
                                  )}
                                  {location.zone && (
                                    <div>
                                      <span className="text-muted-foreground">Zone:</span>
                                      <span className="ml-1 font-medium">{location.zone}</span>
                                    </div>
                                  )}
                                  {location.aisle && (
                                    <div>
                                      <span className="text-muted-foreground">Aisle:</span>
                                      <span className="ml-1 font-medium">{location.aisle}</span>
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
                                selectedProduct.productLocations?.map((location) => {
                                  const warehouse = warehouses.find(
                                    (w) => w.id === location.warehouseId
                                  );
                                  return {
                                    warehouseId: location.warehouseId,
                                    warehouseName: warehouse?.name || 'Unknown Warehouse',
                                    quantity: location.quantity,
                                    rack: location.rack,
                                    bin: location.bin,
                                    zone: location.zone,
                                    aisle: location.aisle,
                                  };
                                });
                              setWarehouseModalData({
                                title: `Product: ${selectedProduct.name}`,
                                subtitle: `SKU: ${selectedProduct.sku} | Barcode: ${selectedProduct.barcode} | Total Stock: ${selectedProduct.stock} units`,
                                warehouseStocks: warehouseStockDetails,
                                reportType: 'product',
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
                    <ImageGallery productId={selectedProduct.id} maxImages={10} readOnly={true} />
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
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => selectedProduct && handleEditProduct(selectedProduct)}
                className="w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Product Form Drawer (Left Side) - Simplified for now */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle>{formMode === 'add' ? 'Add New Product' : 'Edit Product'}</DrawerTitle>
            <DrawerDescription>
              {formMode === 'add'
                ? 'Fill in the details to create a new product'
                : 'Update product information'}
            </DrawerDescription>
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
                    <div className="relative flex-1">
                      <Input
                        id={field.name}
                        placeholder="8901234567890"
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          barcodeValidation.validate(e.target.value, selectedProduct?.id);
                        }}
                        onBlur={field.handleBlur}
                        required
                        className={
                          barcodeValidation.isValid === false
                            ? 'border-destructive pr-9'
                            : barcodeValidation.isValid === true
                              ? 'border-green-500 pr-9'
                              : ''
                        }
                      />
                      {/* Phase 5: Async validation feedback icons */}
                      {barcodeValidation.isValidating && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {barcodeValidation.isValid === true && (
                        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                      )}
                      {barcodeValidation.isValid === false && (
                        <XCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const newBarcode = generateUniqueBarcode();
                        if (newBarcode) {
                          field.handleChange(newBarcode);
                          barcodeValidation.validate(newBarcode, selectedProduct?.id);
                          toast.success('Barcode generated');
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
                        role="img"
                        aria-label="Refresh icon"
                      >
                        <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                      </svg>
                    </Button>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                  {barcodeValidation.error && (
                    <p className="text-sm text-destructive">{barcodeValidation.error}</p>
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
                    onChange={(e) => handleCategoryOrNameChange('name', e.target.value)}
                    onBlur={field.handleBlur}
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
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
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Product Media (Images & Videos) - Only available in edit mode */}
            {formMode === 'edit' && selectedProduct && (
              <>
                <Separator className="my-4" />
                <div>
                  <Label className="text-base font-semibold mb-3">Product Media</Label>
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
                          Upload and manage product images. Supports multiple images with automatic
                          optimization.
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
                          Upload and manage product videos. Choose between R2 storage or Cloudflare
                          Stream.
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
            {formMode === 'add' && (
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
                        Create the product first, then edit it to add images and videos with our
                        optimized upload features.
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
                    <div className="relative">
                      <Input
                        id={field.name}
                        placeholder="TO-TA-01"
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          skuValidation.validate(e.target.value, selectedProduct?.id);
                        }}
                        onBlur={field.handleBlur}
                        required
                        readOnly
                        className={
                          skuValidation.isValid === false
                            ? 'bg-muted/30 border-destructive pr-9'
                            : skuValidation.isValid === true
                              ? 'bg-muted/30 border-green-500 pr-9'
                              : 'bg-muted/30 pr-9'
                        }
                      />
                      {/* Phase 5: Async validation feedback icons */}
                      {skuValidation.isValidating && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {skuValidation.isValid === true && (
                        <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-green-500" />
                      )}
                      {skuValidation.isValid === false && (
                        <XCircle className="absolute right-3 top-3 h-4 w-4 text-destructive" />
                      )}
                    </div>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                    {skuValidation.error && (
                      <p className="text-sm text-destructive">{skuValidation.error}</p>
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
                      onChange={(e) => handleCategoryOrNameChange('categoryId', e.target.value)}
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
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
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
                      onChange={(e) => field.handleChange(Number.parseFloat(e.target.value) || 0)}
                      onBlur={field.handleBlur}
                      required
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Status</Label>
                    <select
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) =>
                        field.handleChange(
                          e.target.value as
                            | 'online sales'
                            | 'offline sales'
                            | 'omnichannel sales'
                            | 'inactive'
                            | 'discontinued'
                        )
                      }
                      onBlur={field.handleBlur}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      required
                    >
                      <option value="online sales">Online Sales</option>
                      <option value="offline sales">Offline Sales</option>
                      <option value="omnichannel sales">Omnichannel Sales</option>
                      <option value="inactive">Inactive</option>
                      <option value="discontinued">Discontinued</option>
                    </select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <form.Field name="baseUnit">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Base Unit</Label>
                    <select
                      id={field.name}
                      value={field.state.value}
                      onChange={(e) => {
                        const newBaseUnit = e.target.value;
                        const oldBaseUnit = field.state.value;
                        field.handleChange(newBaseUnit);

                        // Update the base unit UOM in productUOMs when base unit changes
                        if (newBaseUnit !== oldBaseUnit && formMode === 'add') {
                          const newBaseUnitInfo = baseUnits.find((u) => u.code === newBaseUnit);
                          const newUOMName = newBaseUnitInfo?.name || newBaseUnit;

                          // Replace the old base unit UOM with the new one
                          const updatedUOMs = uomManagement.productUOMs.map((uom) => {
                            if (uom.uomCode === oldBaseUnit) {
                              return {
                                ...uom,
                                id: `uom-${newBaseUnit.toLowerCase()}-${Date.now()}`,
                                uomCode: newBaseUnit,
                                uomName: newUOMName,
                              };
                            }
                            return uom;
                          });
                          uomManagement.setProductUOMs(updatedUOMs);
                        }
                      }}
                      onBlur={field.handleBlur}
                      required
                      disabled={formMode === 'edit'}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                      {formMode === 'edit'
                        ? 'Base unit cannot be changed after creation'
                        : 'Base unit for inventory tracking'}
                    </p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
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
                      <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
                    </Label>
                    <Input
                      id={field.name}
                      type="number"
                      placeholder="12"
                      value={field.state.value || ''}
                      onChange={(e) => field.handleChange(Number.parseInt(e.target.value) || 10)}
                      onBlur={field.handleBlur}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum quantity for wholesale pricing
                    </p>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <Separator className="my-4" />

            {/* Physical Dimensions for Shipping Cost Calculation */}
            <PhysicalDimensionsSection form={form} />

            <Separator className="my-4" />

            {/* Product Expiration Section */}
            <ProductExpirationSection form={form} />

            <Separator className="my-4" />

            {/* Product UOMs Section */}
            <ProductUOMManagementSection
              form={form}
              uomManagement={uomManagement}
              warehouses={warehouses}
              availableUOMs={availableUOMs}
              onRemoveUOM={handleRemoveUOM}
              onSetDefaultUOM={handleSetDefaultUOM}
              onUOMAllocationsChange={handleUOMAllocationsChange}
              generateUniqueBarcode={generateUniqueBarcode}
              isBarcodeUnique={isBarcodeUnique}
              formMode={formMode}
              selectedProductId={selectedProduct?.id}
            />

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
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                >
                  {createProductMutation.isPending || updateProductMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formMode === 'add' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : formMode === 'add' ? (
                    'Create Product'
                  ) : (
                    'Update Product'
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DrawerClose>
              </div>
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
                  You are about to delete <strong>"{productToDelete.name}"</strong>. This action
                  cannot be undone. This will permanently delete the product and remove all
                  associated data.
                </>
              )}
              {uomToDelete && (
                <>
                  You are about to remove <strong>{uomToDelete.uomName}</strong> from this product.
                  This action cannot be undone.
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
                'Delete'
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
