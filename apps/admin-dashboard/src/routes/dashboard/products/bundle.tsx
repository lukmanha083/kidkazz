import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bundleApi, productApi, warehouseApi, productLocationApi, inventoryApi, type ProductBundle, type BundleItem, type CreateBundleInput, type Product } from '@/lib/api';
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
import { Separator } from '@/components/ui/separator';
import { Plus, Search, Edit, Trash2, Eye, X, Gift, Minus, Loader2, Film, ImageIcon } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageGallery } from '@/components/ImageGallery';
import { VideoGallery } from '@/components/VideoGallery';

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

  // Fetch warehouses for warehouse selector
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Fetch all product locations to filter products by warehouse
  const { data: productLocationsData } = useQuery({
    queryKey: ['productLocations'],
    queryFn: () => productLocationApi.getAll(),
  });

  const productLocations = productLocationsData?.locations || [];

  // Fetch inventory data (Phase 2B: Using Inventory Service as single source of truth)
  const { data: inventoryData } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll(),
  });

  const inventory = inventoryData?.inventory || [];

  // Aggregate stock by product ID from Inventory Service (DDD: Single Source of Truth)
  const productStockMap = inventory.reduce((acc, inv) => {
    if (!acc[inv.productId]) {
      acc[inv.productId] = 0;
    }
    acc[inv.productId] += inv.quantityAvailable || 0;
    return acc;
  }, {} as Record<string, number>);

  // Helper function to get stock for a product
  const getProductStock = (productId: string): number => {
    return productStockMap[productId] || 0;
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);
  const [selectedBundleItems, setSelectedBundleItems] = useState<BundleItem[]>([]);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data (Phase 2B: Removed availableStock - bundles now use virtual stock)
  const [formData, setFormData] = useState({
    bundleName: '',
    bundleSKU: '',
    barcode: '',
    bundleDescription: '',
    bundlePrice: '',
    discountPercentage: '',
    status: 'active' as 'active' | 'inactive',
    warehouseId: '', // Warehouse where bundle is assembled
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

  // Available products for combobox - only show products with base UOM (PCS) and allocated in selected warehouse
  const availableProducts = useMemo(() => {
    const selectedWarehouse = formData.warehouseId;

    return products
      .filter(p => {
        // Only allow base UOM (PCS) for bundles
        if (p.baseUnit !== 'PCS') return false;

        // If warehouse is selected, only show products allocated to that warehouse
        if (selectedWarehouse) {
          const productLocation = productLocations.find(
            loc => loc.productId === p.id && loc.warehouseId === selectedWarehouse
          );
          // Only include products that have stock in the selected warehouse
          return productLocation && productLocation.quantity > 0;
        }

        // If no warehouse selected, show all products
        return true;
      })
      .map(p => {
        // Calculate warehouse-specific stock if warehouse is selected
        let stockToShow = p.stock;
        if (selectedWarehouse) {
          const productLocation = productLocations.find(
            loc => loc.productId === p.id && loc.warehouseId === selectedWarehouse
          );
          stockToShow = productLocation?.quantity || 0;
        }

        return {
          value: p.id,
          label: `${p.name} (${p.sku}) - Stock: ${getProductStock(p.id)} PCS`,
          barcode: p.barcode,
          name: p.name,
          sku: p.sku,
          price: p.price,
          stock: getProductStock(p.id),
          baseUnit: p.baseUnit,
        };
      });
  }, [products, productLocations, formData.warehouseId]);

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
      status: 'active',
      warehouseId: '',
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
      status: bundle.status,
      warehouseId: (bundle as any).warehouseId || '',
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

    // Validate: Only allow base UOM (PCS)
    if (product.baseUnit !== 'PCS') {
      toast.error('Only products with base UOM (PCS) can be added to bundles', {
        description: 'Custom UOMs are not supported for product bundles.',
      });
      return;
    }

    // Check if product already exists in bundle
    const existingProduct = selectedProducts.find(p => p.productId === product.id);
    if (existingProduct) {
      toast.error('Product already added to bundle', {
        description: 'You can modify the quantity of existing products.',
      });
      return;
    }

    setSelectedProducts([...selectedProducts, {
      productId: product.id,
      productSKU: product.sku,
      productName: product.name,
      barcode: product.barcode,
      quantity,
      price: product.price,
      stock: product.stock, // Add stock information
      baseUnit: product.baseUnit, // Add base unit
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

    // Phase 2B: No stock validation - bundles use virtual stock calculation
    // Virtual stock is calculated real-time from component availability

    // Use the calculated bundle price
    const bundleData: CreateBundleInput = {
      bundleName: formData.bundleName,
      bundleSKU: formData.bundleSKU,
      barcode: formData.barcode || null,
      bundleDescription: formData.bundleDescription || null,
      bundlePrice: calculatedBundlePrice,
      discountPercentage: parseFloat(formData.discountPercentage) || 0,
      status: formData.status,
      items: selectedProducts,
      warehouseId: formData.warehouseId, // Warehouse where bundle is assembled
    } as any;

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

  // Calculate maximum possible bundles based on component stock (Phase 2B: Using Inventory data)
  const calculateMaxBundles = (items: BundleItem[]) => {
    if (items.length === 0) return 0;

    // For each product, calculate how many complete bundles can be formed
    const possibleBundles = items.map(item => {
      const stock = getProductStock(item.productId);
      if (!stock) return 0;

      // Calculate how many bundles we can make from this product's stock
      return Math.floor(stock / item.quantity);
    });

    // Return the minimum (bottleneck)
    return Math.min(...possibleBundles);
  };

  // Calculate stock allocated to bundles for each component product
  const calculateAllocatedStock = (productId: string, quantityPerBundle: number, bundleStock: number) => {
    return quantityPerBundle * bundleStock;
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Barcode</p>
                    <p className="font-mono font-medium">{(selectedBundle as any).barcode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Assembly Warehouse</p>
                    <p className="font-medium">
                      {(selectedBundle as any).warehouseId
                        ? warehouses.find(w => w.id === (selectedBundle as any).warehouseId)?.name || 'Unknown Warehouse'
                        : 'Not assigned'}
                    </p>
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
                  <p className="text-sm text-muted-foreground">Stock Type</p>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Virtual (Calculated)
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stock is calculated from component availability
                  </p>
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

              {/* Bundle Media (Images & Videos) */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Bundle Media</h3>
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
                      productId={selectedBundle.id}
                      readOnly={true}
                    />
                  </TabsContent>
                  <TabsContent value="videos" className="mt-4">
                    <VideoGallery
                      productId={selectedBundle.id}
                      readOnly={true}
                    />
                  </TabsContent>
                </Tabs>
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

            {/* Warehouse Selection */}
            <div className="space-y-2 border rounded-lg p-3 bg-blue-50/50 dark:bg-blue-950/20">
              <Label htmlFor="warehouseId">Assembly Warehouse *</Label>
              <select
                id="warehouseId"
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="">Select warehouse...</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name} - {warehouse.city}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Select the warehouse where this bundle will be assembled. All component products must be available in this warehouse.
              </p>
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
                    <div className="flex-1">
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.productSKU} × {item.quantity}
                        {item.stock !== undefined && (
                          <span className="ml-2 text-xs">
                            (Available: <span className="font-semibold">{item.stock} PCS</span>)
                          </span>
                        )}
                      </p>
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
                    No products added yet. Only products with base UOM (PCS) can be added.
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

            {/* Phase 2B: Virtual Stock Info - No stored stock for bundles */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <Label>Virtual Stock Calculation</Label>
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Maximum Possible Bundles:
                    </span>
                    <Badge variant="default" className="bg-blue-600">
                      {calculateMaxBundles(selectedProducts)} bundles
                    </Badge>
                  </div>

                  <Separator className="bg-blue-200 dark:bg-blue-900" />

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                      Component Availability:
                    </p>
                    {selectedProducts.map((item, index) => {
                      const availableStock = getProductStock(item.productId);
                      const maxBundles = Math.floor(availableStock / item.quantity);

                      return (
                        <div key={index} className="text-xs space-y-1 p-2 bg-white/50 dark:bg-black/20 rounded">
                          <p className="font-medium text-blue-900 dark:text-blue-100">{item.productName}</p>
                          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                            <div>
                              <span>Available Stock:</span>
                              <span className="ml-1 font-semibold">{availableStock} PCS</span>
                            </div>
                            <div>
                              <span>Per Bundle:</span>
                              <span className="ml-1 font-semibold">×{item.quantity}</span>
                            </div>
                            <div className="col-span-2">
                              <span>Max Bundles from this:</span>
                              <span className={`ml-1 font-semibold ${maxBundles === 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {maxBundles} bundles
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                    💡 Bundle stock is calculated in real-time from component availability. No stock is pre-allocated.
                  </p>
                </div>
              </div>
            )}

            {/* Bundle Media (Images & Videos) - Available in both add and edit mode */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-semibold">Bundle Media</Label>
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
                      Upload and manage bundle images. Supports multiple images with automatic optimization.
                    </p>
                    <ImageGallery
                      productId={selectedBundle?.id || ''}
                      readOnly={false}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="videos" className="mt-4">
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Upload and manage bundle videos. Choose between R2 storage or Cloudflare Stream.
                    </p>
                    <VideoGallery
                      productId={selectedBundle?.id || ''}
                      readOnly={false}
                    />
                  </div>
                </TabsContent>
              </Tabs>
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
