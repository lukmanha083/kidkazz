import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Gift,
  Tag,
  Minus
} from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';

export const Route = createFileRoute('/dashboard/products/bundle')({
  component: ProductBundlePage,
});

interface UnitOfMeasure {
  code: string;
  name: string;
  conversionFactor: number;
  isBaseUnit: boolean;
}

interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  stockQuantity: number; // Always in base unit (PCS)
  retailPrice: number;
  wholesalePrice: number | null; // null if stock < threshold
}

interface Product {
  barcode: string;
  sku: string;
  name: string;
  price: number;
  stock: number; // Total stock across all warehouses (base unit)
  baseUnit: string; // e.g., "PCS"
  alternateUnits: UnitOfMeasure[];
  wholesaleThreshold: number; // e.g., 12 pcs
  warehouseStock: WarehouseStock[];
}

interface BundleProduct {
  productName: string;
  productSKU: string;
  barcode: string;
  quantity: number;
  price: number;
}

interface ProductBundle {
  id: string;
  bundleName: string;
  bundleSKU: string;
  description: string;
  warehouseId: string;
  warehouseName: string;
  products: BundleProduct[];
  bundlePrice: number;
  status: 'Active' | 'Inactive';
  startDate: string;
  endDate: string;
}

// Mock warehouses
const mockWarehouses = [
  { id: 'WH-001', name: 'Main Warehouse' },
  { id: 'WH-002', name: 'North Branch' },
  { id: 'WH-003', name: 'South Branch' },
];

// Standard UOM for all products
const standardUOMs: UnitOfMeasure[] = [
  { code: 'PCS', name: 'Pieces', conversionFactor: 1, isBaseUnit: true },
  { code: 'DOZEN', name: 'Dozen', conversionFactor: 12, isBaseUnit: false },
  { code: 'BOX6', name: 'Box of 6', conversionFactor: 6, isBaseUnit: false },
];

// Mock individual products with stock and prices
const mockProducts: Product[] = [
  {
    barcode: '1234567890001',
    sku: 'BB-001',
    name: 'Baby Bottle Set',
    price: 29.99,
    stock: 74, // Total: WH-001(24) + WH-002(50)
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 24, retailPrice: 29.99, wholesalePrice: 25.00 },
      { warehouseId: 'WH-002', warehouseName: 'North Branch', stockQuantity: 50, retailPrice: 29.99, wholesalePrice: 25.00 },
    ],
  },
  {
    barcode: '1234567890002',
    sku: 'BP-002',
    name: 'Kids Backpack',
    price: 39.99,
    stock: 43, // Total: WH-001(35) + WH-003(8)
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 35, retailPrice: 39.99, wholesalePrice: 35.00 },
      { warehouseId: 'WH-003', warehouseName: 'South Branch', stockQuantity: 8, retailPrice: 39.99, wholesalePrice: null }, // Can't wholesale (< 12)
    ],
  },
  {
    barcode: '1234567890003',
    sku: 'TC-003',
    name: 'Toy Car Collection',
    price: 89.99,
    stock: 20,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 20, retailPrice: 89.99, wholesalePrice: 80.00 },
    ],
  },
  {
    barcode: '1234567890004',
    sku: 'BK-004',
    name: 'Children Books Set',
    price: 24.99,
    stock: 60,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-002', warehouseName: 'North Branch', stockQuantity: 60, retailPrice: 24.99, wholesalePrice: 22.00 },
    ],
  },
  {
    barcode: '1234567890005',
    sku: 'CR-005',
    name: 'Baby Crib',
    price: 299.99,
    stock: 8,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 8, retailPrice: 299.99, wholesalePrice: null }, // Can't wholesale
    ],
  },
  {
    barcode: '1234567890006',
    sku: 'SH-006',
    name: 'Toddler Shoes',
    price: 34.99,
    stock: 45,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 45, retailPrice: 34.99, wholesalePrice: 30.00 },
    ],
  },
  {
    barcode: '1234567890007',
    sku: 'PZ-007',
    name: 'Educational Puzzle',
    price: 19.99,
    stock: 100,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 100, retailPrice: 19.99, wholesalePrice: 17.00 },
    ],
  },
  {
    barcode: '1234567890008',
    sku: 'BM-008',
    name: 'Baby Monitor',
    price: 149.99,
    stock: 15,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-002', warehouseName: 'North Branch', stockQuantity: 15, retailPrice: 149.99, wholesalePrice: 135.00 },
    ],
  },
  {
    barcode: '1234567890009',
    sku: 'DB-009',
    name: 'Diaper Bag',
    price: 49.99,
    stock: 30,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 30, retailPrice: 49.99, wholesalePrice: 45.00 },
    ],
  },
  {
    barcode: '1234567890010',
    sku: 'LB-010',
    name: 'Kids Lunch Box',
    price: 21.00,
    stock: 80,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-003', warehouseName: 'South Branch', stockQuantity: 80, retailPrice: 21.00, wholesalePrice: 18.50 },
    ],
  },
  {
    barcode: '1234567890011',
    sku: 'BIB-001',
    name: 'Baby Bibs Pack',
    price: 15.99,
    stock: 120,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 120, retailPrice: 15.99, wholesalePrice: 14.00 },
    ],
  },
  {
    barcode: '1234567890012',
    sku: 'UTN-001',
    name: 'Baby Utensils Set',
    price: 12.99,
    stock: 95,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-002', warehouseName: 'North Branch', stockQuantity: 95, retailPrice: 12.99, wholesalePrice: 11.50 },
    ],
  },
];

const mockBundles: ProductBundle[] = [
  {
    id: '1',
    bundleName: 'Baby Bottle Starter Pack',
    bundleSKU: 'BUNDLE-001',
    description: 'Perfect starter set for new parents - 3 bottles at special price',
    warehouseId: 'WH-001',
    warehouseName: 'Main Warehouse',
    products: [
      { productName: 'Baby Bottle Set', productSKU: 'BB-001', barcode: '1234567890001', quantity: 3, price: 29.99 },
    ],
    bundlePrice: 75.00,
    status: 'Active',
    startDate: '2024-11-01',
    endDate: '2024-12-31',
  },
  {
    id: '2',
    bundleName: 'Back to School Bundle',
    bundleSKU: 'BUNDLE-002',
    description: 'Backpack + Lunch Box combo deal for students',
    warehouseId: 'WH-001',
    warehouseName: 'Main Warehouse',
    products: [
      { productName: 'Kids Backpack', productSKU: 'BP-002', barcode: '1234567890002', quantity: 1, price: 39.99 },
      { productName: 'Kids Lunch Box', productSKU: 'LB-010', barcode: '1234567890010', quantity: 1, price: 21.00 },
    ],
    bundlePrice: 49.99,
    status: 'Active',
    startDate: '2024-08-01',
    endDate: '2024-09-30',
  },
  {
    id: '3',
    bundleName: 'Educational Toy Set',
    bundleSKU: 'BUNDLE-003',
    description: 'Two puzzles for learning and fun at a great price',
    warehouseId: 'WH-001',
    warehouseName: 'Main Warehouse',
    products: [
      { productName: 'Educational Puzzle', productSKU: 'PZ-007', barcode: '1234567890007', quantity: 2, price: 19.99 },
    ],
    bundlePrice: 29.99,
    status: 'Active',
    startDate: '2024-11-15',
    endDate: '2024-12-15',
  },
  {
    id: '4',
    bundleName: 'Complete Feeding Set',
    bundleSKU: 'BUNDLE-004',
    description: 'Bottles, bibs, and utensils - everything for feeding time',
    warehouseId: 'WH-001',
    warehouseName: 'Main Warehouse',
    products: [
      { productName: 'Baby Bottle Set', productSKU: 'BB-001', barcode: '1234567890001', quantity: 1, price: 29.99 },
      { productName: 'Baby Bibs Pack', productSKU: 'BIB-001', barcode: '1234567890011', quantity: 1, price: 15.99 },
      { productName: 'Baby Utensils Set', productSKU: 'UTN-001', barcode: '1234567890012', quantity: 1, price: 12.99 },
    ],
    bundlePrice: 49.99,
    status: 'Active',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
  },
  {
    id: '5',
    bundleName: 'Twin Baby Essentials',
    bundleSKU: 'BUNDLE-005',
    description: 'Double everything for twins - bottles and diaper bags',
    warehouseId: 'WH-002',
    warehouseName: 'North Branch',
    products: [
      { productName: 'Baby Bottle Set', productSKU: 'BB-001', barcode: '1234567890001', quantity: 2, price: 29.99 },
      { productName: 'Diaper Bag', productSKU: 'DB-009', barcode: '1234567890009', quantity: 2, price: 49.99 },
    ],
    bundlePrice: 129.99,
    status: 'Active',
    startDate: '2024-11-01',
    endDate: '2025-01-31',
  },
];

function ProductBundlePage() {
  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const [bundles, setBundles] = useState<ProductBundle[]>(mockBundles);
  const [products] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [productDetailDrawerOpen, setProductDetailDrawerOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    bundleName: '',
    bundleSKU: '',
    description: '',
    warehouseId: '',
    discountPercentage: '',
    startDate: '',
    endDate: '',
  });

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<ProductBundle | null>(null);

  // Available products for combobox - searchable by barcode, SKU, or name
  const availableProducts = products.map(p => ({
    value: p.sku,
    label: `${p.name} (${p.sku})`,
    barcode: p.barcode,
    name: p.name,
    sku: p.sku,
    price: p.price,
    stock: p.stock,
  }));

  // Selected products for the bundle
  const [selectedProducts, setSelectedProducts] = useState<BundleProduct[]>([]);
  const [selectedProductSKU, setSelectedProductSKU] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');

  // Helper function: Calculate original price from selected products
  const calculateOriginalPrice = (products: BundleProduct[]): number => {
    return products.reduce((total, p) => total + (p.price * p.quantity), 0);
  };

  // Helper function: Calculate discount percentage
  const calculateDiscount = (originalPrice: number, bundlePrice: number): number => {
    if (originalPrice === 0) return 0;
    return Math.round(((originalPrice - bundlePrice) / originalPrice) * 100);
  };

  // Helper function: Calculate bundle price from original price and discount percentage
  const calculateBundlePrice = (originalPrice: number, discountPercentage: number): number => {
    if (originalPrice === 0 || discountPercentage < 0 || discountPercentage > 100) return 0;
    return originalPrice * (1 - discountPercentage / 100);
  };

  // Helper function: Calculate available bundle stock based on warehouse product stocks
  const calculateBundleStock = (bundleProducts: BundleProduct[], warehouseId?: string): number => {
    if (bundleProducts.length === 0) return 0;

    const availablePerProduct = bundleProducts.map(bp => {
      const product = products.find(p => p.sku === bp.productSKU);
      if (!product) return 0;

      // If warehouse specified, use that warehouse stock; otherwise use total stock
      if (warehouseId) {
        const warehouseStock = product.warehouseStock.find(ws => ws.warehouseId === warehouseId);
        if (!warehouseStock) return 0;
        return Math.floor(warehouseStock.stockQuantity / bp.quantity);
      } else {
        return Math.floor(product.stock / bp.quantity);
      }
    });

    // Return the minimum - that's the constraint
    return Math.min(...availablePerProduct);
  };

  // Filter bundles based on search
  const filteredBundles = useMemo(() => {
    return bundles.filter((bundle) =>
      bundle.bundleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.bundleSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bundles, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBundles.length / itemsPerPage);
  const paginatedBundles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBundles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBundles, currentPage, itemsPerPage]);

  const handleDelete = (bundle: ProductBundle) => {
    setBundleToDelete(bundle);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (bundleToDelete) {
      setBundles(bundles.filter((b) => b.id !== bundleToDelete.id));
      toast.success('Bundle deleted', {
        description: `"${bundleToDelete.bundleName}" has been deleted successfully`
      });
      setDeleteDialogOpen(false);
      setBundleToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewBundle = (bundle: ProductBundle) => {
    setSelectedBundle(bundle);
    setViewDrawerOpen(true);
  };

  const handleViewProduct = (productSKU: string) => {
    const product = products.find(p => p.sku === productSKU);
    if (product) {
      setSelectedProduct(product);
      setProductDetailDrawerOpen(true);
    }
  };

  const handleAddBundle = () => {
    setFormMode('add');
    setFormData({
      bundleName: '',
      bundleSKU: '',
      description: '',
      warehouseId: '',
      discountPercentage: '',
      startDate: '',
      endDate: '',
    });
    setSelectedProducts([]);
    setSelectedProductSKU('');
    setProductQuantity('1');
    setFormDrawerOpen(true);
  };

  const handleEditBundle = (bundle: ProductBundle) => {
    setFormMode('edit');
    setSelectedBundle(bundle);

    // Calculate discount percentage from bundle price and original price
    const originalPrice = calculateOriginalPrice(bundle.products);
    const discount = calculateDiscount(originalPrice, bundle.bundlePrice);

    setFormData({
      bundleName: bundle.bundleName,
      bundleSKU: bundle.bundleSKU,
      description: bundle.description,
      warehouseId: bundle.warehouseId,
      discountPercentage: discount.toString(),
      startDate: bundle.startDate,
      endDate: bundle.endDate,
    });
    setSelectedProducts(bundle.products);
    setSelectedProductSKU('');
    setProductQuantity('1');
    setFormDrawerOpen(true);
  };

  const handleAddProductToBundle = () => {
    if (!selectedProductSKU || !productQuantity) return;

    const product = availableProducts.find(p => p.value === selectedProductSKU);
    if (!product) return;

    const newProduct: BundleProduct = {
      productName: product.name,
      productSKU: product.sku,
      barcode: product.barcode,
      quantity: parseInt(productQuantity),
      price: product.price,
    };

    setSelectedProducts([...selectedProducts, newProduct]);
    setSelectedProductSKU('');
    setProductQuantity('1');
  };

  const handleRemoveProductFromBundle = (sku: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productSKU !== sku));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate bundle price from original price and discount percentage
    const originalPrice = calculateOriginalPrice(selectedProducts);
    const discountPercentage = parseFloat(formData.discountPercentage);
    const bundlePrice = calculateBundlePrice(originalPrice, discountPercentage);

    // Get warehouse name from ID
    const warehouse = mockWarehouses.find(w => w.id === formData.warehouseId);
    const warehouseName = warehouse?.name || '';

    if (formMode === 'add') {
      const newBundle: ProductBundle = {
        id: String(bundles.length + 1),
        bundleName: formData.bundleName,
        bundleSKU: formData.bundleSKU,
        description: formData.description,
        warehouseId: formData.warehouseId,
        warehouseName,
        products: selectedProducts,
        bundlePrice,
        status: 'Active',
        startDate: formData.startDate,
        endDate: formData.endDate,
      };
      setBundles([...bundles, newBundle]);
      toast.success('Bundle created', {
        description: `"${formData.bundleName}" has been created successfully`
      });
    } else if (formMode === 'edit' && selectedBundle) {
      setBundles(bundles.map(b =>
        b.id === selectedBundle.id
          ? {
              ...b,
              bundleName: formData.bundleName,
              bundleSKU: formData.bundleSKU,
              description: formData.description,
              warehouseId: formData.warehouseId,
              warehouseName,
              products: selectedProducts,
              bundlePrice,
              startDate: formData.startDate,
              endDate: formData.endDate,
            }
          : b
      ));
      toast.success('Bundle updated', {
        description: `"${formData.bundleName}" has been updated successfully`
      });
    }
    setFormDrawerOpen(false);
    setSelectedProducts([]);
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Bundles</h1>
          <p className="text-muted-foreground mt-1">
            Create promotional bundles like Buy 1 Get 1, Buy 2 Get 1, or custom combos
          </p>
        </div>
        <Button onClick={handleAddBundle} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Bundle
        </Button>
      </div>

      {/* Bundles Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bundles</CardTitle>
              <CardDescription>
                {filteredBundles.length} of {bundles.length} bundles
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bundles..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Bundle Name</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[130px]">Warehouse</TableHead>
                  <TableHead className="w-[120px] text-right">Prices</TableHead>
                  <TableHead className="w-[90px] text-right">Discount</TableHead>
                  <TableHead className="w-[100px] text-right">Available</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBundles.map((bundle) => {
                  const originalPrice = calculateOriginalPrice(bundle.products);
                  const discount = calculateDiscount(originalPrice, bundle.bundlePrice);
                  const availableStock = calculateBundleStock(bundle.products, bundle.warehouseId);

                  return (
                    <TableRow
                      key={bundle.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewBundle(bundle)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{bundle.bundleName}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {bundle.description}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {bundle.bundleSKU}
                      </TableCell>
                      <TableCell className="text-sm">
                        {bundle.warehouseName}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-green-600">
                          {formatRupiah(bundle.bundlePrice)}
                        </div>
                        <div className="text-xs text-muted-foreground line-through">
                          {formatRupiah(originalPrice)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-semibold">
                          -{discount}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            availableStock === 0
                              ? 'text-destructive font-medium'
                              : availableStock < 10
                              ? 'text-yellow-600 font-medium'
                              : ''
                          }
                        >
                          {availableStock} {availableStock === 1 ? 'bundle' : 'bundles'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={bundle.status === 'Active' ? 'default' : 'secondary'}
                          className={
                            bundle.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                              : ''
                          }
                        >
                          {bundle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewBundle(bundle)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditBundle(bundle)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(bundle)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
              totalItems={filteredBundles.length}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Bundle Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedBundle?.bundleName}</DrawerTitle>
                <DrawerDescription>Bundle Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedBundle && (() => {
            const originalPrice = calculateOriginalPrice(selectedBundle.products);
            const discount = calculateDiscount(originalPrice, selectedBundle.bundlePrice);
            const availableStock = calculateBundleStock(selectedBundle.products, selectedBundle.warehouseId);

            return (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Bundle Name</Label>
                    <p className="text-sm font-medium mt-1">{selectedBundle.bundleName}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">SKU</Label>
                    <p className="text-sm font-mono mt-1">{selectedBundle.bundleSKU}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{selectedBundle.description}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Warehouse</Label>
                    <p className="text-sm font-medium mt-1">{selectedBundle.warehouseName}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedBundle.warehouseId}</p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Products in Bundle</Label>
                    <div className="mt-2 space-y-2">
                      {selectedBundle.products.map((product, index) => {
                        const productData = products.find(p => p.sku === product.productSKU);
                        return (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewProduct(product.productSKU);
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.productSKU} • Barcode: {product.barcode}
                              </p>
                              {productData && (
                                <p className="text-xs text-muted-foreground">
                                  Stock: {productData.stock} units • {formatRupiah(product.price)} each
                                </p>
                              )}
                              <p className="text-xs text-blue-600 mt-1">Click to view details →</p>
                            </div>
                            <Badge variant="secondary">Qty: {product.quantity}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Original Price</Label>
                      <p className="text-lg line-through text-muted-foreground mt-1">
                        {formatRupiah(originalPrice)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bundle Price</Label>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        {formatRupiah(selectedBundle.bundlePrice)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Discount</Label>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {discount}% OFF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Save {formatRupiah(originalPrice - selectedBundle.bundlePrice)}
                    </p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Start Date</Label>
                      <p className="text-sm mt-1">{selectedBundle.startDate}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">End Date</Label>
                      <p className="text-sm mt-1">{selectedBundle.endDate}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Available Bundles</Label>
                    <p className="text-lg font-bold mt-1">
                      {availableStock} {availableStock === 1 ? 'bundle' : 'bundles'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on individual product stock
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedBundle.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          selectedBundle.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {selectedBundle.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DrawerFooter>
            <Button onClick={() => selectedBundle && handleEditBundle(selectedBundle)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Bundle
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Bundle Form Drawer (Left Side) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add New Bundle' : 'Edit Bundle'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Create a new promotional bundle'
                    : 'Update bundle information'}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bundleName">Bundle Name</Label>
              <Input
                id="bundleName"
                placeholder="Baby Bottle Starter Pack"
                value={formData.bundleName}
                onChange={(e) => setFormData({ ...formData, bundleName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleSKU">Bundle SKU</Label>
              <Input
                id="bundleSKU"
                placeholder="BUNDLE-001"
                value={formData.bundleSKU}
                onChange={(e) => setFormData({ ...formData, bundleSKU: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Perfect starter set for new parents..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse</Label>
              <select
                id="warehouseId"
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="">Select warehouse...</option>
                {mockWarehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Bundle will use stock from this warehouse
              </p>
            </div>

            <Separator />

            {/* Product Selection */}
            <div className="space-y-3">
              <Label>Bundle Products</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={availableProducts}
                    value={selectedProductSKU}
                    onValueChange={setSelectedProductSKU}
                    placeholder="Select product..."
                    searchPlaceholder="Search products..."
                    emptyText="No product found."
                  />
                </div>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  className="w-20"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddProductToBundle}
                  disabled={!selectedProductSKU}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Selected Products List */}
              {selectedProducts.length > 0 && (
                <div className="space-y-2 mt-3">
                  {selectedProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">{product.productSKU}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Qty: {product.quantity}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveProductFromBundle(product.productSKU)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Pricing Section */}
            <div className="space-y-3">
              {selectedProducts.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Total Original Price</Label>
                    <p className="text-sm font-semibold">
                      {formatRupiah(calculateOriginalPrice(selectedProducts))}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage (%)</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="20"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter discount percentage (0-100%)
                </p>
              </div>

              {selectedProducts.length > 0 && formData.discountPercentage && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Bundle Price</Label>
                    <p className="text-lg font-bold text-green-600">
                      {formatRupiah(calculateBundlePrice(
                        calculateOriginalPrice(selectedProducts),
                        parseFloat(formData.discountPercentage)
                      ))}
                    </p>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Label className="text-xs text-muted-foreground">You Save</Label>
                    <p className="text-sm font-semibold text-orange-600">
                      {formatRupiah(calculateOriginalPrice(selectedProducts) - calculateBundlePrice(
                        calculateOriginalPrice(selectedProducts),
                        parseFloat(formData.discountPercentage)
                      ))} ({formData.discountPercentage}% OFF)
                    </p>
                  </div>
                </div>
              )}

              {selectedProducts.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Available Bundles</Label>
                    <p className="text-sm font-semibold">
                      {calculateBundleStock(selectedProducts, formData.warehouseId || undefined)} {calculateBundleStock(selectedProducts, formData.warehouseId || undefined) === 1 ? 'bundle' : 'bundles'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.warehouseId
                      ? `Based on stock in ${mockWarehouses.find(w => w.id === formData.warehouseId)?.name}`
                      : 'Select a warehouse to see available bundles'}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create Bundle' : 'Update Bundle'}
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

      {/* Product Detail Report Drawer (Right Side) */}
      <Drawer open={productDetailDrawerOpen} onOpenChange={setProductDetailDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedProduct?.name}</DrawerTitle>
                <DrawerDescription>Product Details & Inventory Report</DrawerDescription>
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
                {/* Basic Product Info */}
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
                  <Label className="text-xs text-muted-foreground">Base Unit</Label>
                  <p className="text-sm font-medium mt-1">{selectedProduct.baseUnit}</p>
                  <p className="text-xs text-muted-foreground">All inventory stored in this unit</p>
                </div>

                <Separator />

                {/* UOM Conversions */}
                <div>
                  <Label className="text-xs text-muted-foreground">Unit of Measure Conversions</Label>
                  <div className="mt-2 space-y-2">
                    {selectedProduct.alternateUnits.map((uom) => (
                      <div key={uom.code} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{uom.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {uom.code}</p>
                        </div>
                        <Badge variant={uom.isBaseUnit ? 'default' : 'secondary'}>
                          {uom.isBaseUnit ? 'Base' : `1 = ${uom.conversionFactor} ${selectedProduct.baseUnit}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Wholesale Threshold */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <Label className="text-xs text-muted-foreground">Wholesale Threshold Rule</Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedProduct.wholesaleThreshold} {selectedProduct.baseUnit} minimum
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Warehouses with stock ≥ {selectedProduct.wholesaleThreshold} can sell retail AND wholesale
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Warehouses with stock &lt; {selectedProduct.wholesaleThreshold} can only sell retail
                  </p>
                </div>

                <Separator />

                {/* Total Stock */}
                <div>
                  <Label className="text-xs text-muted-foreground">Total Stock (All Warehouses)</Label>
                  <p className="text-2xl font-bold mt-1">
                    {selectedProduct.stock} {selectedProduct.baseUnit}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    {selectedProduct.alternateUnits
                      .filter(uom => !uom.isBaseUnit)
                      .map(uom => (
                        <div key={uom.code} className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">{uom.name}</p>
                          <p className="font-semibold">
                            {Math.floor(selectedProduct.stock / uom.conversionFactor)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <Separator />

                {/* Warehouse-Specific Stock */}
                <div>
                  <Label className="text-xs text-muted-foreground">Stock by Warehouse</Label>
                  <div className="mt-2 space-y-2">
                    {selectedProduct.warehouseStock.map((ws) => {
                      const canWholesale = ws.stockQuantity >= selectedProduct.wholesaleThreshold;

                      return (
                        <div key={ws.warehouseId} className="p-3 border rounded-md">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium">{ws.warehouseName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{ws.warehouseId}</p>
                            </div>
                            <Badge variant={canWholesale ? 'default' : 'secondary'}>
                              {canWholesale ? 'Retail & Wholesale' : 'Retail Only'}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Stock Quantity</Label>
                              <p className="text-lg font-bold">
                                {ws.stockQuantity} {selectedProduct.baseUnit}
                              </p>
                              <div className="flex gap-2 mt-1">
                                {selectedProduct.alternateUnits
                                  .filter(uom => !uom.isBaseUnit)
                                  .map(uom => (
                                    <span key={uom.code} className="text-xs text-muted-foreground">
                                      ≈ {Math.floor(ws.stockQuantity / uom.conversionFactor)} {uom.code}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div>
                                <Label className="text-xs text-muted-foreground">Retail Price</Label>
                                <p className="text-sm font-semibold text-green-600">
                                  {formatRupiah(ws.retailPrice)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Wholesale Price</Label>
                                <p className="text-sm font-semibold">
                                  {ws.wholesalePrice !== null ? (
                                    <span className="text-blue-600">{formatRupiah(ws.wholesalePrice)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Not Available</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {!canWholesale && (
                              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                                <p className="text-yellow-700 dark:text-yellow-500">
                                  Need {selectedProduct.wholesaleThreshold - ws.stockQuantity} more {selectedProduct.baseUnit} for wholesale
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedProduct.warehouseStock.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No warehouse stock information available
                  </div>
                )}
              </div>
            </div>
          )}

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {bundleToDelete && (
                <>
                  You are about to delete <strong>"{bundleToDelete.bundleName}"</strong>.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setBundleToDelete(null);
            }}>
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
    </div>
  );
}
