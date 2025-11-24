import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bundleApi, productApi, type ProductBundle, type BundleItem, type CreateBundleInput, type Product } from '@/lib/api';
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
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Edit, Trash2, Eye, X, Gift, Minus, Loader2 } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';

export const Route = createFileRoute('/dashboard/products/bundle')({
  component: ProductBundlePage,
});

function ProductBundlePage() {
  const queryClient = useQueryClient();

  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch bundles from API
  const { data: bundlesData, isLoading, error } = useQuery({
    queryKey: ['bundles'],
    queryFn: () => bundleApi.getAll(),
  });

  const bundles = bundlesData?.bundles || [];

  // Fetch products for the product selector
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const products = productsData?.products || [];

  const [searchTerm, setSearchTerm] = useState('');
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);
  const [selectedBundleItems, setSelectedBundleItems] = useState<BundleItem[]>([]);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    bundleName: '',
    bundleSKU: '',
    barcode: '',
    bundleDescription: '',
    bundlePrice: '',
    discountPercentage: '',
    availableStock: '',
    status: 'active' as 'active' | 'inactive',
    startDate: '',
    endDate: '',
  });

  // Selected products for the bundle
  const [selectedProducts, setSelectedProducts] = useState<BundleItem[]>([]);
  const [selectedProductSKU, setSelectedProductSKU] = useState('');
  const [productQuantity, setProductQuantity] = useState('1');

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bundleToDelete, setBundleToDelete] = useState<ProductBundle | null>(null);

  // Create bundle mutation
  const createBundleMutation = useMutation({
    mutationFn: (data: CreateBundleInput) => bundleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle created successfully');
      setFormDrawerOpen(false);
      setSelectedProducts([]);
    },
    onError: (error: Error) => {
      toast.error('Failed to create bundle', {
        description: error.message,
      });
    },
  });

  // Update bundle mutation
  const updateBundleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateBundleInput> }) =>
      bundleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle updated successfully');
      setFormDrawerOpen(false);
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update bundle', {
        description: error.message,
      });
    },
  });

  // Delete bundle mutation
  const deleteBundleMutation = useMutation({
    mutationFn: (id: string) => bundleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bundles'] });
      toast.success('Bundle deleted successfully');
      setDeleteDialogOpen(false);
      setBundleToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete bundle', {
        description: error.message,
      });
    },
  });

  // Available products for combobox
  const availableProducts = useMemo(() => {
    return products.map(p => ({
      value: p.id,
      label: `${p.name} (${p.sku})`,
      barcode: p.barcode,
      name: p.name,
      sku: p.sku,
      price: p.price,
      stock: p.stock,
    }));
  }, [products]);

  const handleViewBundle = async (bundle: ProductBundle) => {
    setSelectedBundle(bundle);
    // Fetch bundle items
    const { items } = await bundleApi.getById(bundle.id);
    setSelectedBundleItems(items);
    setViewDrawerOpen(true);
  };

  const handleAddBundle = () => {
    setFormMode('add');
    const newBarcode = generateBarcode();
    setFormData({
      bundleName: '',
      bundleSKU: '',
      barcode: newBarcode,
      bundleDescription: '',
      bundlePrice: '',
      discountPercentage: '0',
      availableStock: '',
      status: 'active',
      startDate: '',
      endDate: '',
    });
    setSelectedProducts([]);
    setFormDrawerOpen(true);
  };

  const handleEditBundle = async (bundle: ProductBundle) => {
    setFormMode('edit');
    setSelectedBundle(bundle);
    setFormData({
      bundleName: bundle.bundleName,
      bundleSKU: bundle.bundleSKU,
      barcode: (bundle as any).barcode || '',
      bundleDescription: bundle.bundleDescription || '',
      bundlePrice: bundle.bundlePrice.toString(),
      discountPercentage: bundle.discountPercentage.toString(),
      availableStock: bundle.availableStock.toString(),
      status: bundle.status,
      startDate: bundle.startDate || '',
      endDate: bundle.endDate || '',
    });
    // Fetch bundle items
    const { items } = await bundleApi.getById(bundle.id);
    setSelectedProducts(items);
    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleAddProductToBundle = () => {
    const product = products.find(p => p.id === selectedProductSKU);
    if (!product) return;

    const quantity = parseInt(productQuantity) || 1;

    setSelectedProducts([...selectedProducts, {
      productId: product.id,
      productSKU: product.sku,
      productName: product.name,
      barcode: product.barcode,
      quantity,
      price: product.price,
    }]);

    setSelectedProductSKU('');
    setProductQuantity('1');
  };

  const handleRemoveProductFromBundle = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product to the bundle');
      return;
    }

    // Use the calculated bundle price
    const bundleData: CreateBundleInput = {
      bundleName: formData.bundleName,
      bundleSKU: formData.bundleSKU,
      bundleDescription: formData.bundleDescription || null,
      bundlePrice: calculatedBundlePrice,
      discountPercentage: parseFloat(formData.discountPercentage) || 0,
      status: formData.status,
      availableStock: parseInt(formData.availableStock) || 0,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      items: selectedProducts,
    };

    if (formMode === 'add') {
      createBundleMutation.mutate(bundleData);
    } else if (formMode === 'edit' && selectedBundle) {
      const { items, ...updateData } = bundleData;
      updateBundleMutation.mutate({ id: selectedBundle.id, data: updateData });
      // Also update items
      bundleApi.updateItems(selectedBundle.id, items);
    }
  };

  const handleDeleteBundle = () => {
    if (bundleToDelete) {
      deleteBundleMutation.mutate(bundleToDelete.id);
    }
  };

  // Helper function: Generate bundle SKU from bundle name
  const generateBundleSKU = (bundleName: string) => {
    if (!bundleName) return '';

    // Get first 2 letters from bundle name (remove special chars, convert to uppercase)
    const nameCode = bundleName
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'A'); // Default to 'AA' if less than 2 letters

    // Find existing bundles with the same prefix
    const existingBundles = bundles.filter(b =>
      b.bundleSKU.startsWith(nameCode + '-')
    );

    // Extract numbers from existing SKUs and find the highest
    let maxNumber = 0;
    existingBundles.forEach(b => {
      const match = b.bundleSKU.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });

    // Generate next number
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${nameCode}-${nextNumber}`;
  };

  // Helper function: Generate unique barcode for bundle
  const generateBarcode = () => {
    // Generate a 13-digit barcode (EAN-13 format)
    // Format: 890 (country code for India/others) + 10 random digits
    const countryCode = '890';
    const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return countryCode + randomDigits;
  };

  // Calculate bundle totals
  const calculateOriginalPrice = (items: BundleItem[]) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Auto-calculate bundle price based on selected products and discount
  const calculatedBundlePrice = useMemo(() => {
    const originalPrice = calculateOriginalPrice(selectedProducts);
    const discountPercent = parseFloat(formData.discountPercentage) || 0;
    const finalPrice = originalPrice * (1 - discountPercent / 100);
    return Math.round(finalPrice); // Round to nearest integer
  }, [selectedProducts, formData.discountPercentage]);

  // Filter bundles based on search
  const filteredBundles = useMemo(() => {
    return bundles.filter((bundle) =>
      bundle.bundleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.bundleSKU.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bundles, searchTerm]);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Bundles</h1>
            <p className="text-muted-foreground mt-1">
              Manage product bundles and packages
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading bundles</p>
              <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['bundles'] })}
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
          <h1 className="text-3xl font-bold tracking-tight">Product Bundles</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage product bundles with special pricing
          </p>
        </div>
        <Button onClick={handleAddBundle} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Bundle
        </Button>
      </div>

      {/* Bundles Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bundles</CardTitle>
              <CardDescription>
                {filteredBundles.length} bundles
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search bundles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bundle Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBundles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No bundles found. Create your first bundle to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBundles.map((bundle) => (
                      <TableRow
                        key={bundle.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewBundle(bundle)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium">{bundle.bundleName}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {bundle.bundleDescription}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{bundle.bundleSKU}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Gift className="h-3 w-3 mr-1" />
                            Bundle
                          </Badge>
                        </TableCell>
                        <TableCell>{formatRupiah(bundle.bundlePrice)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{bundle.discountPercentage}%</Badge>
                        </TableCell>
                        <TableCell>{bundle.availableStock}</TableCell>
                        <TableCell>
                          <Badge variant={bundle.status === 'active' ? 'default' : 'secondary'}>
                            {bundle.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditBundle(bundle);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBundleToDelete(bundle);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Drawer - Bundle Details */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedBundle?.bundleName}</DrawerTitle>
            <DrawerDescription>Bundle Details</DrawerDescription>
          </DrawerHeader>

          {selectedBundle && (
            <div className="px-4 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bundle SKU</p>
                    <p className="font-mono font-medium">{selectedBundle.bundleSKU}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedBundle.status === 'active' ? 'default' : 'secondary'}>
                      {selectedBundle.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{selectedBundle.bundleDescription || '-'}</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Original Price</p>
                    <p className="font-medium">{formatRupiah(calculateOriginalPrice(selectedBundleItems))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bundle Price</p>
                    <p className="font-medium text-primary">{formatRupiah(selectedBundle.bundlePrice)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount</p>
                    <Badge variant="secondary">{selectedBundle.discountPercentage}%</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available Stock</p>
                  <p className="font-medium">{selectedBundle.availableStock}</p>
                </div>
              </div>

              {/* Bundle Items */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Products in Bundle</h3>
                <div className="space-y-2">
                  {selectedBundleItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">{item.productSKU}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">×{item.quantity}</p>
                        <p className="text-sm text-muted-foreground">{formatRupiah(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button onClick={() => selectedBundle && handleEditBundle(selectedBundle)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Bundle
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>
              {formMode === 'add' ? 'Create New Bundle' : 'Edit Bundle'}
            </DrawerTitle>
            <DrawerDescription>
              {formMode === 'add'
                ? 'Create a new product bundle with special pricing'
                : 'Update bundle information'}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmitForm} className="px-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="bundleName">Bundle Name *</Label>
              <Input
                id="bundleName"
                placeholder="Back to School Bundle"
                value={formData.bundleName}
                onChange={(e) => {
                  const bundleName = e.target.value;
                  setFormData({ ...formData, bundleName });
                  // Auto-generate SKU only when adding new bundle (not editing)
                  if (formMode === 'add' && bundleName) {
                    const generatedSKU = generateBundleSKU(bundleName);
                    setFormData(prev => ({ ...prev, bundleSKU: generatedSKU }));
                  }
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleSKU">Bundle SKU *</Label>
              <div className="flex gap-2">
                <Input
                  id="bundleSKU"
                  placeholder="BA-001"
                  value={formData.bundleSKU}
                  onChange={(e) => setFormData({ ...formData, bundleSKU: e.target.value })}
                  required
                  className="flex-1"
                />
                {formMode === 'add' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const generatedSKU = generateBundleSKU(formData.bundleName);
                      setFormData({ ...formData, bundleSKU: generatedSKU });
                      toast.success('SKU generated');
                    }}
                    disabled={!formData.bundleName}
                  >
                    Generate
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formMode === 'add'
                  ? 'SKU is auto-generated from bundle name. You can modify it if needed.'
                  : 'Bundle SKU cannot be changed after creation.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  placeholder="8901234567890"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const generatedBarcode = generateBarcode();
                    setFormData({ ...formData, barcode: generatedBarcode });
                    toast.success('Barcode generated');
                  }}
                >
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-generate a unique barcode or enter manually.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundleDescription">Description</Label>
              <Input
                id="bundleDescription"
                placeholder="Bundle description"
                value={formData.bundleDescription}
                onChange={(e) => setFormData({ ...formData, bundleDescription: e.target.value })}
              />
            </div>

            {/* Products Selection */}
            <div className="space-y-2 border-t pt-4">
              <Label>Products in Bundle *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={availableProducts}
                    value={selectedProductSKU}
                    onValueChange={setSelectedProductSKU}
                    placeholder="Select product..."
                    searchPlaceholder="Search products..."
                  />
                </div>
                <Input
                  type="number"
                  min="1"
                  value={productQuantity}
                  onChange={(e) => setProductQuantity(e.target.value)}
                  className="w-20"
                  placeholder="Qty"
                />
                <Button
                  type="button"
                  onClick={handleAddProductToBundle}
                  disabled={!selectedProductSKU}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Selected Products List */}
              <div className="space-y-2 mt-4">
                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted/50">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">{item.productSKU} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{formatRupiah(item.price * item.quantity)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveProductFromBundle(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {selectedProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No products added yet
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label htmlFor="discountPercentage">Discount Percentage</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={formData.discountPercentage}
                  onChange={(e) => setFormData({ ...formData, discountPercentage: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Set discount percentage to calculate bundle price automatically.
                </p>
              </div>

              {/* Price Summary */}
              <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Price:</span>
                  <span className="font-medium">{formatRupiah(calculateOriginalPrice(selectedProducts))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({formData.discountPercentage || 0}%):</span>
                  <span className="font-medium text-destructive">
                    -{formatRupiah(calculateOriginalPrice(selectedProducts) * (parseFloat(formData.discountPercentage) || 0) / 100)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Bundle Price:</span>
                  <span className="font-semibold text-primary text-lg">{formatRupiah(calculatedBundlePrice)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="availableStock">Available Stock</Label>
              <Input
                id="availableStock"
                type="number"
                min="0"
                placeholder="0"
                value={formData.availableStock}
                onChange={(e) => setFormData({ ...formData, availableStock: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={createBundleMutation.isPending || updateBundleMutation.isPending}
              >
                {createBundleMutation.isPending || updateBundleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {formMode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  formMode === 'add' ? 'Create Bundle' : 'Update Bundle'
                )}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bundle?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{bundleToDelete?.bundleName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBundleMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBundle}
              disabled={deleteBundleMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBundleMutation.isPending ? (
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
    </div>
  );
}
