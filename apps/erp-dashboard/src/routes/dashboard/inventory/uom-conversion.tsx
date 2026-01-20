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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { productApi, productUOMLocationApi, uomApi, warehouseApi } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRightLeft,
  History,
  Loader2,
  MapPin,
  Package,
  Search,
  Warehouse,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/dashboard/inventory/uom-conversion')({
  component: UOMConversionPage,
});

interface ProductUOM {
  id: string;
  uomCode: string;
  uomName: string;
  barcode: string;
  conversionFactor: number;
  stock: number;
  isDefault: boolean;
  warehouseStock?: number; // Stock specific to selected warehouse
}

interface ProductInventory {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  totalStock: number;
  baseUnit: string;
  productUOMs: ProductUOM[];
}

interface ConversionHistory {
  id: string;
  productName: string;
  productSKU: string;
  fromUOM: string;
  fromQuantity: number;
  toQuantity: number;
  reason: string;
  notes: string;
  performedBy: string;
  timestamp: Date;
}

function UOMConversionPage() {
  const queryClient = useQueryClient();

  // Fetch warehouses from API
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];
  const activeWarehouses = warehouses.filter((wh) => wh.status === 'active');

  // Fetch all products with their UOMs from API
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const products = productsData?.products || [];

  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [conversions, setConversions] = useState<ConversionHistory[]>([]);
  const [uomLocationsByWarehouse, setUomLocationsByWarehouse] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Load product details with UOMs
  useEffect(() => {
    if (products.length > 0) {
      const loadProductDetails = async () => {
        const productDetails = await Promise.all(
          products.map(async (product) => {
            try {
              const fullProduct = await productApi.getById(product.id);
              return {
                id: fullProduct.id,
                name: fullProduct.name,
                sku: fullProduct.sku,
                barcode: fullProduct.barcode,
                category: 'General', // You could fetch category name if needed
                totalStock: fullProduct.stock,
                baseUnit: fullProduct.baseUnit || 'PCS',
                productUOMs: fullProduct.productUOMs || [],
              };
            } catch (error) {
              console.error(`Failed to load product ${product.id}:`, error);
              return null;
            }
          })
        );
        setInventory(productDetails.filter(Boolean) as ProductInventory[]);
      };
      loadProductDetails();
    }
  }, [products]);

  // Set default warehouse when warehouses load
  useEffect(() => {
    if (activeWarehouses.length > 0 && !selectedWarehouse) {
      setSelectedWarehouse(activeWarehouses[0].id);
    }
  }, [activeWarehouses, selectedWarehouse]);

  // Fetch UOM locations by warehouse when warehouse is selected
  useEffect(() => {
    if (selectedWarehouse && inventory.length > 0) {
      const fetchUOMLocations = async () => {
        try {
          const response = await productUOMLocationApi.getAll({ warehouseId: selectedWarehouse });
          const locationMap: Record<string, number> = {};
          response.locations.forEach((loc) => {
            locationMap[loc.productUOMId] = loc.quantity;
          });
          setUomLocationsByWarehouse(locationMap);
        } catch (error) {
          console.error('Failed to fetch UOM locations:', error);
          setUomLocationsByWarehouse({});
        }
      };
      fetchUOMLocations();
    }
  }, [selectedWarehouse, inventory]);

  // Drawer states
  const [conversionDrawerOpen, setConversionDrawerOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  // Conversion form states
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);
  const [selectedFromUOM, setSelectedFromUOM] = useState<ProductUOM | null>(null);
  const [conversionQuantity, setConversionQuantity] = useState('');
  const [conversionReason, setConversionReason] = useState('PCS sold out');
  const [conversionNotes, setConversionNotes] = useState('');

  // Confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Rupiah formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Calculate total PCS from all UOMs
  const calculateTotalPCS = (product: ProductInventory): number => {
    return product.productUOMs.reduce((total, uom) => {
      return total + uom.stock * uom.conversionFactor;
    }, 0);
  };

  // Get base unit UOM (could be PCS, KG, L, etc.)
  const getBaseUOM = (product: ProductInventory): ProductUOM | undefined => {
    return product.productUOMs.find((uom) => uom.uomCode === product.baseUnit);
  };

  // Handle open conversion drawer
  const handleOpenConversion = (product: ProductInventory, uom: ProductUOM) => {
    if (uom.uomCode === product.baseUnit) {
      toast.error(`Cannot convert ${product.baseUnit}`, {
        description: `${product.baseUnit} is the base unit and cannot be converted`,
      });
      return;
    }

    if (uom.stock === 0) {
      toast.error('No stock available', {
        description: `${uom.uomName} has no stock available for conversion`,
      });
      return;
    }

    setSelectedProduct(product);
    setSelectedFromUOM(uom);
    setConversionQuantity('');
    setConversionReason(`${product.baseUnit} sold out`);
    setConversionNotes('');
    setConversionDrawerOpen(true);
  };

  // Handle conversion submit
  const handleConversionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !selectedFromUOM) return;

    const qty = Number.parseInt(conversionQuantity);
    if (qty <= 0 || qty > selectedFromUOM.stock) {
      toast.error('Invalid quantity', {
        description: `Please enter a quantity between 1 and ${selectedFromUOM.stock}`,
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  // Create UOM conversion mutation
  const conversionMutation = useMutation({
    mutationFn: async (data: {
      fromUOMId: string;
      toBaseUOMId: string;
      fromQty: number;
      toQty: number;
    }) => {
      // Update source UOM stock (decrease)
      await uomApi.updateProductUOMStock(data.fromUOMId, -data.fromQty);

      // Update base UOM stock (increase)
      await uomApi.updateProductUOMStock(data.toBaseUOMId, data.toQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('UOM Converted Successfully');
    },
    onError: (error: Error) => {
      toast.error('Conversion failed', {
        description: error.message,
      });
    },
  });

  // Confirm and execute conversion
  const executeConversion = async () => {
    if (!selectedProduct || !selectedFromUOM) return;

    const qty = Number.parseInt(conversionQuantity);
    const baseUnitsToAdd = qty * selectedFromUOM.conversionFactor;

    // Find the base UOM (could be PCS, KG, L, etc.)
    const baseUOM = getBaseUOM(selectedProduct);
    if (!baseUOM) {
      toast.error('Error', {
        description: `${selectedProduct.baseUnit} UOM not found for this product`,
      });
      return;
    }

    try {
      // Execute conversion via API
      await conversionMutation.mutateAsync({
        fromUOMId: selectedFromUOM.id,
        toBaseUOMId: baseUOM.id,
        fromQty: qty,
        toQty: baseUnitsToAdd,
      });

      // Update local state
      setInventory(
        inventory.map((product) => {
          if (product.id === selectedProduct.id) {
            return {
              ...product,
              productUOMs: product.productUOMs.map((uom) => {
                if (uom.id === selectedFromUOM.id) {
                  return { ...uom, stock: uom.stock - qty };
                }
                if (uom.uomCode === product.baseUnit) {
                  return { ...uom, stock: uom.stock + baseUnitsToAdd };
                }
                return uom;
              }),
            };
          }
          return product;
        })
      );

      // Add to conversion history
      const newConversion: ConversionHistory = {
        id: `conv-${Date.now()}`,
        productName: selectedProduct.name,
        productSKU: selectedProduct.sku,
        fromUOM: `${qty} ${selectedFromUOM.uomName}`,
        fromQuantity: qty,
        toQuantity: baseUnitsToAdd,
        reason: conversionReason,
        notes: conversionNotes,
        performedBy: 'Current User',
        timestamp: new Date(),
      };
      setConversions([newConversion, ...conversions]);

      toast.success(
        `Converted ${qty} ${selectedFromUOM.uomName} → ${baseUnitsToAdd} ${selectedProduct.baseUnit}`
      );

      setConfirmDialogOpen(false);
      setConversionDrawerOpen(false);
      setSelectedProduct(null);
      setSelectedFromUOM(null);
    } catch (error) {
      console.error('Conversion failed:', error);
    }
  };

  // Get low stock products (base unit stock < 10)
  const lowStockProducts = inventory.filter((product) => {
    const baseUOM = getBaseUOM(product);
    return baseUOM && baseUOM.stock < 10;
  });

  // Show loading state while data is being fetched
  if (warehousesLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Warehouse Inventory</h1>
            <p className="text-muted-foreground mt-1">
              Manage product inventory and perform UOM conversions
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading inventory data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage product inventory and perform UOM conversions
          </p>
        </div>
        <Button
          onClick={() => setHistoryDrawerOpen(true)}
          variant="outline"
          className="w-full lg:w-auto"
        >
          <History className="h-4 w-4 mr-2" />
          Conversion History
        </Button>
      </div>

      {/* Warehouse Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Warehouse</CardTitle>
          <CardDescription>Choose a warehouse to view and manage inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {activeWarehouses.map((wh) => (
              <Button
                key={wh.id}
                variant={selectedWarehouse === wh.id ? 'default' : 'outline'}
                onClick={() => setSelectedWarehouse(wh.id)}
              >
                <Warehouse className="h-4 w-4 mr-2" />
                {wh.name}
              </Button>
            ))}
          </div>
          {activeWarehouses.length === 0 && (
            <p className="text-sm text-muted-foreground">No active warehouses available</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                inventory.filter((p) => {
                  const hasStock = p.productUOMs.some(
                    (uom) => (uomLocationsByWarehouse[uom.id] || 0) > 0
                  );
                  return hasStock;
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">In this warehouse</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock (Base Units)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventory.reduce((sum, p) => {
                const warehouseBaseUnits = p.productUOMs.reduce((total, uom) => {
                  const warehouseStock = uomLocationsByWarehouse[uom.id] || 0;
                  return total + warehouseStock * uom.conversionFactor;
                }, 0);
                return sum + warehouseBaseUnits;
              }, 0)}
            </div>
            <p className="text-xs text-muted-foreground">At this warehouse</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                inventory.filter((p) => {
                  const baseUOM = p.productUOMs.find((u) => u.uomCode === p.baseUnit);
                  if (!baseUOM) return false;
                  const baseWarehouseStock = uomLocationsByWarehouse[baseUOM.id] || 0;
                  return baseWarehouseStock < 10;
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Base unit below 10</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions Today</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversions.length}</div>
            <p className="text-xs text-muted-foreground">UOM conversions</p>
          </CardContent>
        </Card>
      </div>

      {/* Product Inventory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                View stock by UOM and convert larger units to base unit when needed
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM Breakdown</TableHead>
                  <TableHead className="text-right">Total (Base Unit)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory
                  .filter((product) => {
                    // Filter by search term (name or barcode)
                    const matchesSearch =
                      searchTerm === '' ||
                      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      product.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      product.sku.toLowerCase().includes(searchTerm.toLowerCase());

                    if (!matchesSearch) return false;

                    // Calculate total stock for this product at the warehouse
                    const warehouseTotalStock = product.productUOMs.reduce((total, uom) => {
                      const warehouseStock = uomLocationsByWarehouse[uom.id] || 0;
                      return total + warehouseStock * uom.conversionFactor;
                    }, 0);

                    // Only show products with stock > 0
                    return warehouseTotalStock > 0;
                  })
                  .map((product) => {
                    // Calculate warehouse-specific stock for each UOM
                    const warehouseUOMs = product.productUOMs.map((uom) => ({
                      ...uom,
                      warehouseStock: uomLocationsByWarehouse[uom.id] || 0,
                    }));

                    const baseUOM = warehouseUOMs.find((u) => u.uomCode === product.baseUnit);
                    const baseWarehouseStock = baseUOM?.warehouseStock || 0;

                    // Calculate total base units from warehouse-specific stock
                    const warehouseTotalBaseUnits = warehouseUOMs.reduce((total, uom) => {
                      return total + uom.warehouseStock * uom.conversionFactor;
                    }, 0);

                    const isLowStock = baseWarehouseStock < 10;

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {warehouseUOMs.map((uom) => {
                              const warehouseStock = uom.warehouseStock;
                              return (
                                <div
                                  key={uom.id}
                                  className="flex items-center justify-between gap-4 p-2 border rounded text-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{uom.uomCode}</span>
                                    <span className="text-muted-foreground">
                                      ×{uom.conversionFactor}
                                    </span>
                                    {uom.isDefault && (
                                      <Badge variant="outline" className="text-xs">
                                        Default
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <span
                                        className={`font-semibold ${
                                          uom.uomCode === product.baseUnit && warehouseStock < 10
                                            ? 'text-destructive'
                                            : ''
                                        }`}
                                      >
                                        {warehouseStock} units
                                      </span>
                                      <p className="text-xs text-muted-foreground">at warehouse</p>
                                    </div>
                                    {uom.uomCode !== product.baseUnit && warehouseStock > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleOpenConversion(product, {
                                            ...uom,
                                            stock: warehouseStock,
                                          })
                                        }
                                      >
                                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                                        Convert
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className={`text-lg font-bold ${isLowStock ? 'text-destructive' : ''}`}
                          >
                            {warehouseTotalBaseUnits} {product.baseUnit}
                          </div>
                          <p className="text-xs text-muted-foreground">at this warehouse</p>
                          {isLowStock && <p className="text-xs text-destructive">Low stock!</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          {isLowStock &&
                            warehouseUOMs.some(
                              (u) => u.uomCode !== product.baseUnit && u.warehouseStock > 0
                            ) && (
                              <Badge variant="destructive" className="animate-pulse">
                                Convert Available
                              </Badge>
                            )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Drawer */}
      <Drawer open={conversionDrawerOpen} onOpenChange={setConversionDrawerOpen}>
        <DrawerContent>
          <form onSubmit={handleConversionSubmit}>
            <DrawerHeader>
              <DrawerTitle>Convert UOM to {selectedProduct?.baseUnit || 'Base Unit'}</DrawerTitle>
              <DrawerDescription>
                Break down larger units into base units for retail sale
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {selectedProduct && selectedFromUOM && (
                <>
                  {/* Product Info */}
                  <div className="p-4 bg-muted rounded-md">
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku}</p>
                  </div>

                  {/* Source UOM */}
                  <div className="space-y-2">
                    <Label>Source UOM</Label>
                    <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{selectedFromUOM.uomName}</p>
                          <p className="text-sm text-muted-foreground">
                            Conversion Factor: ×{selectedFromUOM.conversionFactor}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Available</p>
                          <p className="text-xl font-bold">{selectedFromUOM.stock} units</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Input */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity to Convert</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={selectedFromUOM.stock}
                      value={conversionQuantity}
                      onChange={(e) => setConversionQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Max: {selectedFromUOM.stock} {selectedFromUOM.uomName}
                    </p>
                  </div>

                  {/* Conversion Preview */}
                  {conversionQuantity &&
                    Number.parseInt(conversionQuantity) > 0 &&
                    selectedProduct && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Will produce</p>
                            <p className="text-2xl font-bold text-green-600">
                              {Number.parseInt(conversionQuantity) *
                                selectedFromUOM.conversionFactor}{' '}
                              {selectedProduct.baseUnit}
                            </p>
                          </div>
                          <ArrowRightLeft className="h-6 w-6 text-green-600" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {conversionQuantity} {selectedFromUOM.uomName} ×{' '}
                          {selectedFromUOM.conversionFactor}
                        </p>
                      </div>
                    )}

                  <Separator />

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Conversion</Label>
                    <select
                      id="reason"
                      value={conversionReason}
                      onChange={(e) => setConversionReason(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      required
                    >
                      <option value={`${selectedProduct?.baseUnit || 'Base unit'} sold out`}>
                        {selectedProduct?.baseUnit || 'Base unit'} sold out
                      </option>
                      <option value="Damaged packaging">Damaged packaging</option>
                      <option value="Bulk order breakdown">Bulk order breakdown</option>
                      <option value="Customer request">Customer request</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={conversionNotes}
                      onChange={(e) => setConversionNotes(e.target.value)}
                      placeholder="Additional information..."
                    />
                  </div>
                </>
              )}
            </div>

            <DrawerFooter>
              <Button type="submit" className="w-full">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Convert to {selectedProduct?.baseUnit || 'Base Unit'}
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

      {/* Conversion History Drawer */}
      <Drawer open={historyDrawerOpen} onOpenChange={setHistoryDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Conversion History</DrawerTitle>
            <DrawerDescription>All UOM conversion activities in this warehouse</DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6">
            {conversions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mt-4">No conversions yet</p>
                <p className="text-sm text-muted-foreground">Conversion history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversions.map((conversion) => (
                  <div key={conversion.id} className="p-4 border rounded-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{conversion.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {conversion.productSKU}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {conversion.fromUOM} → {conversion.toQuantity} Base Units
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Reason:</span>
                        <p className="font-medium">{conversion.reason}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">By:</span>
                        <p className="font-medium">{conversion.performedBy}</p>
                      </div>
                    </div>
                    {conversion.notes && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Notes:</span>
                        <p>{conversion.notes}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTimestamp(conversion.timestamp)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Close
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm UOM Conversion</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedProduct && selectedFromUOM && conversionQuantity && (
                <>
                  You are about to convert:
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {conversionQuantity} {selectedFromUOM.uomName}
                      </Badge>
                      <ArrowRightLeft className="h-4 w-4" />
                      <Badge variant="outline">
                        {Number.parseInt(conversionQuantity) * selectedFromUOM.conversionFactor}{' '}
                        {selectedProduct.baseUnit}
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">
                    This will decrease <strong>{selectedFromUOM.uomName}</strong> stock and increase
                    <strong> {selectedProduct.baseUnit}</strong> stock. This action cannot be
                    undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeConversion}>Confirm Conversion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
