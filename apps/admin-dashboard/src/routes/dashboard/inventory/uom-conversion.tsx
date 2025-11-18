import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { Warehouse, MapPin, Package, ArrowRightLeft, History, AlertTriangle } from 'lucide-react';

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
}

interface ProductInventory {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  totalStock: number;
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

// Mock warehouse data
const warehouses = [
  { id: 'WH-001', name: 'Main Warehouse' },
  { id: 'WH-002', name: 'Distribution Center' },
  { id: 'WH-003', name: 'Regional Hub' },
];

// Mock product inventory data
const mockInventory: ProductInventory[] = [
  {
    id: '1',
    name: 'Baby Bottle Set',
    sku: 'BB-001',
    barcode: '8901234567890',
    category: 'Feeding',
    totalStock: 100,
    productUOMs: [
      { id: 'uom-1-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567890', conversionFactor: 1, stock: 10, isDefault: true },
      { id: 'uom-1-2', uomCode: 'BOX6', uomName: 'Box of 6', barcode: '8901234567906', conversionFactor: 6, stock: 10, isDefault: false },
      { id: 'uom-1-3', uomCode: 'CARTON18', uomName: 'Carton (18 PCS)', barcode: '8901234567918', conversionFactor: 18, stock: 2, isDefault: false },
    ],
  },
  {
    id: '2',
    name: 'Kids Backpack',
    sku: 'KB-002',
    barcode: '8901234567891',
    category: 'School',
    totalStock: 89,
    productUOMs: [
      { id: 'uom-2-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567891', conversionFactor: 1, stock: 5, isDefault: true },
      { id: 'uom-2-2', uomCode: 'BOX6', uomName: 'Box of 6', barcode: '8901234567897', conversionFactor: 6, stock: 14, isDefault: false },
    ],
  },
  {
    id: '3',
    name: 'Educational Puzzle Set',
    sku: 'EP-003',
    barcode: '8901234567892',
    category: 'Education',
    totalStock: 120,
    productUOMs: [
      { id: 'uom-3-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567892', conversionFactor: 1, stock: 0, isDefault: true },
      { id: 'uom-3-2', uomCode: 'BOX6', uomName: 'Box of 6', barcode: '8901234567898', conversionFactor: 6, stock: 20, isDefault: false },
    ],
  },
];

function UOMConversionPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState('WH-001');
  const [inventory, setInventory] = useState<ProductInventory[]>(mockInventory);
  const [conversions, setConversions] = useState<ConversionHistory[]>([]);

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
      return total + (uom.stock * uom.conversionFactor);
    }, 0);
  };

  // Get PCS UOM
  const getPCSUOM = (product: ProductInventory): ProductUOM | undefined => {
    return product.productUOMs.find(uom => uom.uomCode === 'PCS');
  };

  // Handle open conversion drawer
  const handleOpenConversion = (product: ProductInventory, uom: ProductUOM) => {
    if (uom.uomCode === 'PCS') {
      toast.error('Cannot convert PCS', {
        description: 'PCS is the base unit and cannot be converted'
      });
      return;
    }

    if (uom.stock === 0) {
      toast.error('No stock available', {
        description: `${uom.uomName} has no stock available for conversion`
      });
      return;
    }

    setSelectedProduct(product);
    setSelectedFromUOM(uom);
    setConversionQuantity('');
    setConversionReason('PCS sold out');
    setConversionNotes('');
    setConversionDrawerOpen(true);
  };

  // Handle conversion submit
  const handleConversionSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || !selectedFromUOM) return;

    const qty = parseInt(conversionQuantity);
    if (qty <= 0 || qty > selectedFromUOM.stock) {
      toast.error('Invalid quantity', {
        description: `Please enter a quantity between 1 and ${selectedFromUOM.stock}`
      });
      return;
    }

    setConfirmDialogOpen(true);
  };

  // Confirm and execute conversion
  const executeConversion = () => {
    if (!selectedProduct || !selectedFromUOM) return;

    const qty = parseInt(conversionQuantity);
    const pcsToAdd = qty * selectedFromUOM.conversionFactor;

    // Update inventory
    setInventory(inventory.map(product => {
      if (product.id === selectedProduct.id) {
        return {
          ...product,
          productUOMs: product.productUOMs.map(uom => {
            if (uom.id === selectedFromUOM.id) {
              // Decrease source UOM stock
              return { ...uom, stock: uom.stock - qty };
            } else if (uom.uomCode === 'PCS') {
              // Increase PCS stock
              return { ...uom, stock: uom.stock + pcsToAdd };
            }
            return uom;
          }),
        };
      }
      return product;
    }));

    // Add to conversion history
    const newConversion: ConversionHistory = {
      id: `conv-${Date.now()}`,
      productName: selectedProduct.name,
      productSKU: selectedProduct.sku,
      fromUOM: `${qty} ${selectedFromUOM.uomName}`,
      fromQuantity: qty,
      toQuantity: pcsToAdd,
      reason: conversionReason,
      notes: conversionNotes,
      performedBy: 'Current User', // In real app, get from auth context
      timestamp: new Date(),
    };
    setConversions([newConversion, ...conversions]);

    toast.success('UOM Converted Successfully', {
      description: `Converted ${qty} ${selectedFromUOM.uomName} → ${pcsToAdd} PCS`
    });

    setConfirmDialogOpen(false);
    setConversionDrawerOpen(false);
    setSelectedProduct(null);
    setSelectedFromUOM(null);
  };

  // Get low stock products (PCS stock < 10)
  const lowStockProducts = inventory.filter(product => {
    const pcsUOM = getPCSUOM(product);
    return pcsUOM && pcsUOM.stock < 10;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Inventory</h1>
          <p className="text-muted-foreground mt-1">
            Manage product inventory and perform UOM conversions
          </p>
        </div>
        <Button onClick={() => setHistoryDrawerOpen(true)} variant="outline">
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
          <div className="flex gap-2">
            {warehouses.map(wh => (
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
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
            <p className="text-xs text-muted-foreground">In warehouse</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock (PCS)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventory.reduce((sum, p) => sum + calculateTotalPCS(p), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Equivalent pieces</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">PCS below 10 units</p>
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
          <CardTitle>Product Inventory</CardTitle>
          <CardDescription>
            View stock by UOM and convert larger units to PCS when needed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>UOM Breakdown</TableHead>
                  <TableHead className="text-right">Total (PCS)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map(product => {
                  const pcsUOM = getPCSUOM(product);
                  const totalPCS = calculateTotalPCS(product);
                  const isLowStock = pcsUOM && pcsUOM.stock < 10;

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
                          {product.productUOMs.map(uom => (
                            <div
                              key={uom.id}
                              className="flex items-center justify-between gap-4 p-2 border rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{uom.uomCode}</span>
                                <span className="text-muted-foreground">×{uom.conversionFactor}</span>
                                {uom.isDefault && (
                                  <Badge variant="outline" className="text-xs">Default</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`font-semibold ${
                                    uom.uomCode === 'PCS' && uom.stock < 10
                                      ? 'text-destructive'
                                      : ''
                                  }`}
                                >
                                  {uom.stock} units
                                </span>
                                {uom.uomCode !== 'PCS' && uom.stock > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenConversion(product, uom)}
                                  >
                                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                                    Convert
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`text-lg font-bold ${isLowStock ? 'text-destructive' : ''}`}>
                          {totalPCS} PCS
                        </div>
                        {isLowStock && (
                          <p className="text-xs text-destructive">Low stock!</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLowStock && product.productUOMs.some(u => u.uomCode !== 'PCS' && u.stock > 0) && (
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
              <DrawerTitle>Convert UOM to PCS</DrawerTitle>
              <DrawerDescription>
                Break down larger units into pieces for retail sale
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
                  {conversionQuantity && parseInt(conversionQuantity) > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Will produce</p>
                          <p className="text-2xl font-bold text-green-600">
                            {parseInt(conversionQuantity) * selectedFromUOM.conversionFactor} PCS
                          </p>
                        </div>
                        <ArrowRightLeft className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {conversionQuantity} {selectedFromUOM.uomName} × {selectedFromUOM.conversionFactor}
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
                      <option value="PCS sold out">PCS sold out</option>
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
                Convert to PCS
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
            <DrawerDescription>
              All UOM conversion activities in this warehouse
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-6 pb-6">
            {conversions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mt-4">No conversions yet</p>
                <p className="text-sm text-muted-foreground">
                  Conversion history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {conversions.map(conversion => (
                  <div key={conversion.id} className="p-4 border rounded-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{conversion.productName}</p>
                        <p className="text-sm text-muted-foreground">SKU: {conversion.productSKU}</p>
                      </div>
                      <Badge variant="outline">
                        {conversion.fromUOM} → {conversion.toQuantity} PCS
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
                        {parseInt(conversionQuantity) * selectedFromUOM.conversionFactor} PCS
                      </Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">
                    This will decrease <strong>{selectedFromUOM.uomName}</strong> stock and increase
                    <strong> PCS</strong> stock. This action cannot be undone.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeConversion}>
              Confirm Conversion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
