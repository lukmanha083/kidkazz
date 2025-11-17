import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
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

interface Product {
  barcode: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
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
  products: BundleProduct[];
  bundlePrice: number;
  status: 'Active' | 'Inactive';
  startDate: string;
  endDate: string;
}

// Mock individual products with stock and prices
const mockProducts: Product[] = [
  { barcode: '1234567890001', sku: 'BB-001', name: 'Baby Bottle Set', price: 29.99, stock: 50 },
  { barcode: '1234567890002', sku: 'BP-002', name: 'Kids Backpack', price: 39.99, stock: 35 },
  { barcode: '1234567890003', sku: 'TC-003', name: 'Toy Car Collection', price: 89.99, stock: 20 },
  { barcode: '1234567890004', sku: 'BK-004', name: 'Children Books Set', price: 24.99, stock: 60 },
  { barcode: '1234567890005', sku: 'CR-005', name: 'Baby Crib', price: 299.99, stock: 8 },
  { barcode: '1234567890006', sku: 'SH-006', name: 'Toddler Shoes', price: 34.99, stock: 45 },
  { barcode: '1234567890007', sku: 'PZ-007', name: 'Educational Puzzle', price: 19.99, stock: 100 },
  { barcode: '1234567890008', sku: 'BM-008', name: 'Baby Monitor', price: 149.99, stock: 15 },
  { barcode: '1234567890009', sku: 'DB-009', name: 'Diaper Bag', price: 49.99, stock: 30 },
  { barcode: '1234567890010', sku: 'LB-010', name: 'Kids Lunch Box', price: 21.00, stock: 80 },
  { barcode: '1234567890011', sku: 'BIB-001', name: 'Baby Bibs Pack', price: 15.99, stock: 120 },
  { barcode: '1234567890012', sku: 'UTN-001', name: 'Baby Utensils Set', price: 12.99, stock: 95 },
];

const mockBundles: ProductBundle[] = [
  {
    id: '1',
    bundleName: 'Baby Bottle Starter Pack',
    bundleSKU: 'BUNDLE-001',
    description: 'Perfect starter set for new parents - 3 bottles at special price',
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
  const [bundles, setBundles] = useState<ProductBundle[]>(mockBundles);
  const [products] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    bundleName: '',
    bundleSKU: '',
    description: '',
    bundlePrice: '',
    startDate: '',
    endDate: '',
  });

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

  // Helper function: Calculate available bundle stock based on individual product stocks
  const calculateBundleStock = (bundleProducts: BundleProduct[]): number => {
    if (bundleProducts.length === 0) return 0;

    const availablePerProduct = bundleProducts.map(bp => {
      const product = products.find(p => p.sku === bp.productSKU);
      if (!product) return 0;
      return Math.floor(product.stock / bp.quantity);
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

  const handleDelete = (id: string) => {
    setBundles(bundles.filter((b) => b.id !== id));
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

  const handleAddBundle = () => {
    setFormMode('add');
    setFormData({
      bundleName: '',
      bundleSKU: '',
      description: '',
      bundlePrice: '',
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
    setFormData({
      bundleName: bundle.bundleName,
      bundleSKU: bundle.bundleSKU,
      description: bundle.description,
      bundlePrice: bundle.bundlePrice.toString(),
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
    const bundlePrice = parseFloat(formData.bundlePrice);

    if (formMode === 'add') {
      const newBundle: ProductBundle = {
        id: String(bundles.length + 1),
        bundleName: formData.bundleName,
        bundleSKU: formData.bundleSKU,
        description: formData.description,
        products: selectedProducts,
        bundlePrice,
        status: 'Active',
        startDate: formData.startDate,
        endDate: formData.endDate,
      };
      setBundles([...bundles, newBundle]);
    } else if (formMode === 'edit' && selectedBundle) {
      setBundles(bundles.map(b =>
        b.id === selectedBundle.id
          ? {
              ...b,
              bundleName: formData.bundleName,
              bundleSKU: formData.bundleSKU,
              description: formData.description,
              products: selectedProducts,
              bundlePrice,
              startDate: formData.startDate,
              endDate: formData.endDate,
            }
          : b
      ));
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
                  <TableHead className="w-[250px]">Bundle Name</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[140px] text-right">Prices</TableHead>
                  <TableHead className="w-[100px] text-right">Discount</TableHead>
                  <TableHead className="w-[100px] text-right">Available</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBundles.map((bundle) => {
                  const originalPrice = calculateOriginalPrice(bundle.products);
                  const discount = calculateDiscount(originalPrice, bundle.bundlePrice);
                  const availableStock = calculateBundleStock(bundle.products);

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
                      <TableCell className="text-right">
                        <div className="font-semibold text-green-600">
                          ${bundle.bundlePrice.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground line-through">
                          ${originalPrice.toFixed(2)}
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
                            onClick={() => handleDelete(bundle.id)}
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
            const availableStock = calculateBundleStock(selectedBundle.products);

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

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Products in Bundle</Label>
                    <div className="mt-2 space-y-2">
                      {selectedBundle.products.map((product, index) => {
                        const productData = products.find(p => p.sku === product.productSKU);
                        return (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="text-sm font-medium">{product.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                {product.productSKU} • Barcode: {product.barcode}
                              </p>
                              {productData && (
                                <p className="text-xs text-muted-foreground">
                                  Stock: {productData.stock} units • ${product.price.toFixed(2)} each
                                </p>
                              )}
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
                        ${originalPrice.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bundle Price</Label>
                      <p className="text-lg font-bold text-green-600 mt-1">
                        ${selectedBundle.bundlePrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Discount</Label>
                    <p className="text-2xl font-bold text-orange-600 mt-1">
                      {discount}% OFF
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Save ${(originalPrice - selectedBundle.bundlePrice).toFixed(2)}
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
                      ${calculateOriginalPrice(selectedProducts).toFixed(2)}
                    </p>
                  </div>
                  {formData.bundlePrice && (
                    <>
                      <div className="flex justify-between items-center mt-2">
                        <Label className="text-xs text-muted-foreground">Discount</Label>
                        <p className="text-sm font-semibold text-orange-600">
                          {calculateDiscount(
                            calculateOriginalPrice(selectedProducts),
                            parseFloat(formData.bundlePrice)
                          )}% OFF
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <Label className="text-xs text-muted-foreground">Savings</Label>
                        <p className="text-sm font-semibold text-green-600">
                          ${(calculateOriginalPrice(selectedProducts) - parseFloat(formData.bundlePrice)).toFixed(2)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="bundlePrice">Bundle Price ($)</Label>
                <Input
                  id="bundlePrice"
                  type="number"
                  step="0.01"
                  placeholder="59.98"
                  value={formData.bundlePrice}
                  onChange={(e) => setFormData({ ...formData, bundlePrice: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Set the promotional price for this bundle
                </p>
              </div>

              {selectedProducts.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs text-muted-foreground">Available Bundles</Label>
                    <p className="text-sm font-semibold">
                      {calculateBundleStock(selectedProducts)} {calculateBundleStock(selectedProducts) === 1 ? 'bundle' : 'bundles'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on current individual product stock
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
    </div>
  );
}
