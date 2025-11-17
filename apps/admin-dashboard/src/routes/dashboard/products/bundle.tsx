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
  Tag
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/bundle')({
  component: ProductBundlePage,
});

interface BundleProduct {
  productName: string;
  productSKU: string;
  quantity: number;
}

interface ProductBundle {
  id: string;
  bundleName: string;
  bundleSKU: string;
  description: string;
  bundleType: 'Buy 1 Get 1' | 'Buy 2 Get 1' | 'Buy 3 Get 1' | 'Custom Bundle';
  products: BundleProduct[];
  originalPrice: number;
  bundlePrice: number;
  discount: number;
  status: 'Active' | 'Inactive';
  startDate: string;
  endDate: string;
  stock: number;
}

const mockBundles: ProductBundle[] = [
  {
    id: '1',
    bundleName: 'Baby Bottle Starter Pack',
    bundleSKU: 'BUNDLE-001',
    description: 'Buy 2 bottles, get 1 free - Perfect starter set for new parents',
    bundleType: 'Buy 2 Get 1',
    products: [
      { productName: 'Baby Bottle 4oz', productSKU: 'BB-001-4OZ', quantity: 3 },
    ],
    originalPrice: 89.97,
    bundlePrice: 59.98,
    discount: 33,
    status: 'Active',
    startDate: '2024-11-01',
    endDate: '2024-12-31',
    stock: 45
  },
  {
    id: '2',
    bundleName: 'Back to School Bundle',
    bundleSKU: 'BUNDLE-002',
    description: 'Backpack + Lunch Box combo deal',
    bundleType: 'Custom Bundle',
    products: [
      { productName: 'Kids Backpack', productSKU: 'BP-002', quantity: 1 },
      { productName: 'Kids Lunch Box', productSKU: 'LB-010', quantity: 1 },
    ],
    originalPrice: 60.99,
    bundlePrice: 49.99,
    discount: 18,
    status: 'Active',
    startDate: '2024-08-01',
    endDate: '2024-09-30',
    stock: 78
  },
  {
    id: '3',
    bundleName: 'Educational Toy Set',
    bundleSKU: 'BUNDLE-003',
    description: 'Buy 1 puzzle, get another puzzle free',
    bundleType: 'Buy 1 Get 1',
    products: [
      { productName: 'Educational Puzzle', productSKU: 'PZ-007', quantity: 2 },
    ],
    originalPrice: 39.98,
    bundlePrice: 19.99,
    discount: 50,
    status: 'Active',
    startDate: '2024-11-15',
    endDate: '2024-12-15',
    stock: 120
  },
  {
    id: '4',
    bundleName: 'Complete Feeding Set',
    bundleSKU: 'BUNDLE-004',
    description: 'Bottles, bibs, and utensils - everything for feeding time',
    bundleType: 'Custom Bundle',
    products: [
      { productName: 'Baby Bottle Set', productSKU: 'BB-001', quantity: 1 },
      { productName: 'Baby Bibs Pack', productSKU: 'BIB-001', quantity: 1 },
      { productName: 'Baby Utensils Set', productSKU: 'UTN-001', quantity: 1 },
    ],
    originalPrice: 75.97,
    bundlePrice: 59.99,
    discount: 21,
    status: 'Active',
    startDate: '2024-10-01',
    endDate: '2024-12-31',
    stock: 34
  },
  {
    id: '5',
    bundleName: 'Toy Car Mega Deal',
    bundleSKU: 'BUNDLE-005',
    description: 'Buy 3 toy car sets, get 1 free',
    bundleType: 'Buy 3 Get 1',
    products: [
      { productName: 'Toy Car Collection', productSKU: 'TC-003', quantity: 4 },
    ],
    originalPrice: 359.96,
    bundlePrice: 269.97,
    discount: 25,
    status: 'Inactive',
    startDate: '2024-07-01',
    endDate: '2024-08-31',
    stock: 0
  },
  {
    id: '6',
    bundleName: 'Twin Baby Essentials',
    bundleSKU: 'BUNDLE-006',
    description: 'Double everything for twins - bottles, diapers, and more',
    bundleType: 'Custom Bundle',
    products: [
      { productName: 'Baby Bottle Set', productSKU: 'BB-001', quantity: 2 },
      { productName: 'Diaper Bag', productSKU: 'DB-009', quantity: 2 },
    ],
    originalPrice: 159.96,
    bundlePrice: 129.99,
    discount: 19,
    status: 'Active',
    startDate: '2024-11-01',
    endDate: '2025-01-31',
    stock: 23
  },
];

function ProductBundlePage() {
  const [bundles, setBundles] = useState<ProductBundle[]>(mockBundles);
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
    bundleType: 'Custom Bundle' as 'Buy 1 Get 1' | 'Buy 2 Get 1' | 'Buy 3 Get 1' | 'Custom Bundle',
    originalPrice: '',
    bundlePrice: '',
    startDate: '',
    endDate: '',
    stock: '',
  });

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
      bundleType: 'Custom Bundle',
      originalPrice: '',
      bundlePrice: '',
      startDate: '',
      endDate: '',
      stock: '',
    });
    setFormDrawerOpen(true);
  };

  const handleEditBundle = (bundle: ProductBundle) => {
    setFormMode('edit');
    setSelectedBundle(bundle);
    setFormData({
      bundleName: bundle.bundleName,
      bundleSKU: bundle.bundleSKU,
      description: bundle.description,
      bundleType: bundle.bundleType,
      originalPrice: bundle.originalPrice.toString(),
      bundlePrice: bundle.bundlePrice.toString(),
      startDate: bundle.startDate,
      endDate: bundle.endDate,
      stock: bundle.stock.toString(),
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const originalPrice = parseFloat(formData.originalPrice);
    const bundlePrice = parseFloat(formData.bundlePrice);
    const discount = Math.round(((originalPrice - bundlePrice) / originalPrice) * 100);

    if (formMode === 'add') {
      const newBundle: ProductBundle = {
        id: String(bundles.length + 1),
        bundleName: formData.bundleName,
        bundleSKU: formData.bundleSKU,
        description: formData.description,
        bundleType: formData.bundleType,
        products: [],
        originalPrice,
        bundlePrice,
        discount,
        status: 'Active',
        startDate: formData.startDate,
        endDate: formData.endDate,
        stock: parseInt(formData.stock),
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
              bundleType: formData.bundleType,
              originalPrice,
              bundlePrice,
              discount,
              startDate: formData.startDate,
              endDate: formData.endDate,
              stock: parseInt(formData.stock),
            }
          : b
      ));
    }
    setFormDrawerOpen(false);
  };

  // Get bundle type badge color
  const getBundleTypeBadge = (type: string) => {
    const colors = {
      'Buy 1 Get 1': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'Buy 2 Get 1': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      'Buy 3 Get 1': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'Custom Bundle': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return colors[type as keyof typeof colors] || '';
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
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[100px] text-right">Original</TableHead>
                  <TableHead className="w-[100px] text-right">Bundle Price</TableHead>
                  <TableHead className="w-[80px] text-right">Discount</TableHead>
                  <TableHead className="w-[80px] text-right">Stock</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBundles.map((bundle) => (
                  <TableRow
                    key={bundle.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewBundle(bundle)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                        {bundle.bundleName}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {bundle.bundleSKU}
                    </TableCell>
                    <TableCell className="text-sm">
                      {bundle.description}
                    </TableCell>
                    <TableCell>
                      <Badge className={getBundleTypeBadge(bundle.bundleType)}>
                        {bundle.bundleType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground line-through">
                      ${bundle.originalPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      ${bundle.bundlePrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-semibold">
                        -{bundle.discount}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          bundle.stock === 0
                            ? 'text-destructive font-medium'
                            : bundle.stock < 30
                            ? 'text-yellow-600 font-medium'
                            : ''
                        }
                      >
                        {bundle.stock}
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
                ))}
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

          {selectedBundle && (
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
                  <Label className="text-xs text-muted-foreground">Bundle Type</Label>
                  <div className="mt-1">
                    <Badge className={getBundleTypeBadge(selectedBundle.bundleType)}>
                      {selectedBundle.bundleType}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Products in Bundle</Label>
                  <div className="mt-2 space-y-2">
                    {selectedBundle.products.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{product.productName}</p>
                          <p className="text-xs text-muted-foreground">{product.productSKU}</p>
                        </div>
                        <Badge variant="secondary">Qty: {product.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Original Price</Label>
                    <p className="text-lg line-through text-muted-foreground mt-1">
                      ${selectedBundle.originalPrice.toFixed(2)}
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
                    {selectedBundle.discount}% OFF
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
                  <Label className="text-xs text-muted-foreground">Stock</Label>
                  <p className="text-lg font-bold mt-1">{selectedBundle.stock}</p>
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
          )}

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
                placeholder="Buy 2 bottles, get 1 free..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleType">Bundle Type</Label>
              <select
                id="bundleType"
                value={formData.bundleType}
                onChange={(e) => setFormData({ ...formData, bundleType: e.target.value as any })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Buy 1 Get 1">Buy 1 Get 1</option>
                <option value="Buy 2 Get 1">Buy 2 Get 1</option>
                <option value="Buy 3 Get 1">Buy 3 Get 1</option>
                <option value="Custom Bundle">Custom Bundle</option>
              </select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="originalPrice">Original Price ($)</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  placeholder="89.97"
                  value={formData.originalPrice}
                  onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
                  required
                />
              </div>
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
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="stock">Stock Quantity</Label>
              <Input
                id="stock"
                type="number"
                placeholder="100"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
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
