import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
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
import { Pagination } from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { inventoryApi, productApi, warehouseApi } from '@/lib/api';
import { type TransferStockFormData, transferStockFormSchema } from '@/lib/form-schemas';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-form-adapter';
import {
  ArrowRightLeft,
  Calendar,
  Eye,
  Loader2,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';

/**
 * Extract error message from TanStack Form / Zod validation errors.
 * Handles both string errors and Zod error objects with message property.
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return String(error);
}

export const Route = createFileRoute('/dashboard/inventory/transfer-stock')({
  component: TransferStockPage,
});

interface TransferItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  items: TransferItem[];
  totalItems: number;
  status: 'Completed' | 'Pending' | 'Cancelled';
  transferredBy: string;
  transferDate: string;
  notes?: string;
}

// Transfer history is now stored in component state
/**
 * Render the Stock Transfer page and manage the UI, state, data fetching, and mutations
 * required to create and view inventory transfers between warehouses.
 *
 * This component:
 * - Fetches warehouses and products, derives active warehouses, and loads per-product inventory for a selected source warehouse.
 * - Maintains local transfer history, pagination, search/filtering, and transient form/drawer state for creating transfers.
 * - Provides UI for building transfer line items, validating stock and warehouse selections, executing an inventory transfer via API, and viewing transfer details.
 *
 * @returns The React element that renders the stock transfer interface and related drawers, tables, and controls.
 */

function TransferStockPage() {
  const queryClient = useQueryClient();

  // Fetch warehouses from API
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];
  const activeWarehouses = warehouses.filter((wh) => wh.status === 'active');

  // Fetch all products from API
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const products = productsData?.products || [];

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [productInventories, setProductInventories] = useState<Record<string, any>>({});
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // TanStack Form
  const form = useForm({
    defaultValues: {
      sourceWarehouseId: '',
      destinationWarehouseId: '',
      notes: '',
    } satisfies TransferStockFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onChange: transferStockFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (transferItems.length === 0) {
        toast.error('No items to transfer', {
          description: 'Please add at least one product to transfer',
        });
        return;
      }

      if (value.sourceWarehouseId === value.destinationWarehouseId) {
        toast.error('Invalid warehouses', {
          description: 'Source and destination warehouses must be different',
        });
        return;
      }

      const sourceWarehouse = activeWarehouses.find((w) => w.id === value.sourceWarehouseId);
      const destinationWarehouse = activeWarehouses.find(
        (w) => w.id === value.destinationWarehouseId
      );

      if (!sourceWarehouse || !destinationWarehouse) {
        toast.error('Invalid warehouse selection');
        return;
      }

      const totalItems = transferItems.reduce((sum, item) => sum + item.quantity, 0);

      // Create transfer record for history
      const newTransfer: StockTransfer = {
        id: `TRF-${String(transfers.length + 1).padStart(3, '0')}`,
        transferNumber: `TRF-2024-${String(transfers.length + 1).padStart(3, '0')}`,
        sourceWarehouseId: value.sourceWarehouseId,
        sourceWarehouseName: sourceWarehouse.name,
        destinationWarehouseId: value.destinationWarehouseId,
        destinationWarehouseName: destinationWarehouse.name,
        items: transferItems,
        totalItems: totalItems,
        status: 'Completed',
        transferredBy: 'Admin User',
        transferDate: new Date().toISOString().split('T')[0],
        notes: value.notes,
      };

      // Execute the transfer via API
      try {
        await transferMutation.mutateAsync({
          items: transferItems,
          sourceWarehouseId: value.sourceWarehouseId,
          destinationWarehouseId: value.destinationWarehouseId,
        });

        // Add to local transfer history
        setTransfers([newTransfer, ...transfers]);
        setFormDrawerOpen(false);
        setTransferItems([]);
        form.reset();
      } catch (error) {
        // Error is already handled by mutation onError
        console.error('Transfer failed:', error);
      }
    },
  });

  // Transfer items
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState('');

  // Filter transfers based on search
  const filteredTransfers = useMemo(() => {
    return transfers.filter(
      (transfer) =>
        transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.sourceWarehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.destinationWarehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transfer.items.some((item) =>
          item.productName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [transfers, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransfers.length / itemsPerPage);
  const paginatedTransfers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransfers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransfers, currentPage, itemsPerPage]);

  // Get available products for selected source warehouse
  const availableProducts = useMemo(() => {
    const sourceWarehouseId = form.state.values.sourceWarehouseId;
    if (!sourceWarehouseId) return [];

    // Filter products that have inventory in the selected warehouse
    return products
      .filter((p) => {
        const inventory = productInventories[`${p.id}-${sourceWarehouseId}`];
        return inventory && inventory.quantityAvailable > 0;
      })
      .filter((p) => !transferItems.some((item) => item.productId === p.id))
      .map((p) => {
        const inventory = productInventories[`${p.id}-${sourceWarehouseId}`];
        return {
          value: p.id,
          label: `${p.name} (${p.sku}) - ${inventory?.quantityAvailable || 0} available`,
        };
      });
  }, [form.state.values.sourceWarehouseId, transferItems, products, productInventories]);

  // Fetch inventory when source warehouse changes
  React.useEffect(() => {
    const sourceWarehouseId = form.state.values.sourceWarehouseId;
    if (sourceWarehouseId && products.length > 0) {
      // Fetch inventory for all products in the selected warehouse
      const fetchInventory = async () => {
        setLoadingInventory(true);
        try {
          const inventoryPromises = products.map(async (product) => {
            try {
              const inv = await inventoryApi.getByProductAndWarehouse(
                product.id,
                sourceWarehouseId
              );
              return { key: `${product.id}-${sourceWarehouseId}`, data: inv };
            } catch (error) {
              // Product doesn't have inventory in this warehouse
              return null;
            }
          });

          const results = await Promise.all(inventoryPromises);
          const inventoryMap: Record<string, any> = {};
          results.forEach((result) => {
            if (result) {
              inventoryMap[result.key] = result.data;
            }
          });
          setProductInventories(inventoryMap);
        } finally {
          setLoadingInventory(false);
        }
      };

      fetchInventory();
    } else {
      setProductInventories({});
    }
  }, [form.state.values.sourceWarehouseId, products]);

  // Create transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData: {
      items: TransferItem[];
      sourceWarehouseId: string;
      destinationWarehouseId: string;
    }) => {
      // Perform inventory adjustments for each item
      const transferPromises = transferData.items.map(async (item) => {
        // Decrease from source warehouse
        await inventoryApi.adjust({
          productId: item.productId,
          warehouseId: transferData.sourceWarehouseId,
          quantity: item.quantity,
          movementType: 'out',
          reason: `Transfer to warehouse ${transferData.destinationWarehouseId}`,
        });

        // Increase in destination warehouse
        await inventoryApi.adjust({
          productId: item.productId,
          warehouseId: transferData.destinationWarehouseId,
          quantity: item.quantity,
          movementType: 'in',
          reason: `Transfer from warehouse ${transferData.sourceWarehouseId}`,
        });
      });

      await Promise.all(transferPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Stock transfer completed successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to complete transfer', {
        description: error.message,
      });
    },
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewTransfer = (transfer: StockTransfer) => {
    setSelectedTransfer(transfer);
    setViewDrawerOpen(true);
  };

  const handleAddTransfer = () => {
    setFormData({
      sourceWarehouseId: '',
      destinationWarehouseId: '',
      notes: '',
    });
    setTransferItems([]);
    setSelectedProduct('');
    setItemQuantity('');
    setFormDrawerOpen(true);
  };

  const handleAddItem = () => {
    if (!selectedProduct || !itemQuantity) {
      toast.error('Missing information', {
        description: 'Please select a product and enter quantity',
      });
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const quantity = Number.parseInt(itemQuantity);
    if (quantity <= 0) {
      toast.error('Invalid quantity', {
        description: 'Quantity must be greater than 0',
      });
      return;
    }

    // Check available inventory
    const inventory = productInventories[`${product.id}-${form.state.values.sourceWarehouseId}`];
    const availableStock = inventory?.quantityAvailable || 0;

    if (quantity > availableStock) {
      toast.error('Insufficient stock', {
        description: `Only ${availableStock} units available`,
      });
      return;
    }

    const newItem: TransferItem = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: quantity,
    };

    setTransferItems([...transferItems, newItem]);
    setSelectedProduct('');
    setItemQuantity('');
    toast.success('Item added to transfer');
  };

  const handleRemoveItem = (productId: string) => {
    setTransferItems(transferItems.filter((item) => item.productId !== productId));
  };

  // Show loading state while data is being fetched
  if (warehousesLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Transfer</h1>
            <p className="text-muted-foreground mt-1">
              Manage inventory movement between warehouses
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading data...</span>
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
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfer</h1>
          <p className="text-muted-foreground mt-1">Manage inventory movement between warehouses</p>
        </div>
        <Button
          onClick={handleAddTransfer}
          className="gap-2 self-start sm:self-auto"
          disabled={activeWarehouses.length < 2}
        >
          <Plus className="h-4 w-4" />
          New Transfer
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transfers.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {transfers.filter((t) => t.status === 'Completed').length}
            </div>
            <p className="text-xs text-muted-foreground">Successful transfers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Transferred</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {transfers.reduce((sum, t) => sum + t.totalItems, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total units moved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {
                transfers.filter((t) => {
                  const transferMonth = new Date(t.transferDate).getMonth();
                  const currentMonth = new Date().getMonth();
                  return transferMonth === currentMonth;
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Recent transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Transfer History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transfer History</CardTitle>
              <CardDescription>
                {filteredTransfers.length} of {transfers.length} transfers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfers..."
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
                  <TableHead>Transfer #</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Items</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Quantity</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransfers.map((transfer) => (
                  <TableRow
                    key={transfer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewTransfer(transfer)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell className="text-sm">{transfer.sourceWarehouseName}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        {transfer.destinationWarehouseName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium hidden md:table-cell">
                      {transfer.items.length}
                    </TableCell>
                    <TableCell className="text-right font-medium hidden lg:table-cell">
                      {transfer.totalItems}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                      {transfer.transferDate}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={transfer.status === 'Completed' ? 'default' : 'secondary'}
                        className={
                          transfer.status === 'Completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : transfer.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                              : ''
                        }
                      >
                        {transfer.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewTransfer(transfer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
              totalItems={filteredTransfers.length}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Transfer Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle>{selectedTransfer?.transferNumber}</DrawerTitle>
            <DrawerDescription>Stock Transfer Details</DrawerDescription>
          </DrawerHeader>

          {selectedTransfer && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Transfer Number</Label>
                    <p className="text-sm font-mono font-medium mt-1">
                      {selectedTransfer.transferNumber}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedTransfer.status === 'Completed' ? 'default' : 'secondary'}
                        className={
                          selectedTransfer.status === 'Completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {selectedTransfer.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Source Warehouse</Label>
                  <p className="text-sm font-medium mt-1">{selectedTransfer.sourceWarehouseName}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Destination Warehouse</Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedTransfer.destinationWarehouseName}
                  </p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground mb-2">Transfer Items</Label>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransfer.items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-bold">{selectedTransfer.totalItems} units</span>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Transfer Date</Label>
                    <p className="text-sm mt-1">{selectedTransfer.transferDate}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Transferred By</Label>
                    <p className="text-sm mt-1">{selectedTransfer.transferredBy}</p>
                  </div>
                </div>

                {selectedTransfer.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{selectedTransfer.notes}</p>
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

      {/* Add Transfer Form Drawer (Left Side) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader className="relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle>New Stock Transfer</DrawerTitle>
            <DrawerDescription>Transfer products between warehouses</DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <form.Field name="sourceWarehouseId">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="sourceWarehouse">Source Warehouse</Label>
                  <select
                    id="sourceWarehouse"
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value);
                      setTransferItems([]);
                      setSelectedProduct('');
                    }}
                    onBlur={field.handleBlur}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    required
                  >
                    <option value="">Select source warehouse...</option>
                    {activeWarehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Warehouse to transfer items from</p>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="destinationWarehouseId">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="destinationWarehouse">Destination Warehouse</Label>
                  <select
                    id="destinationWarehouse"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    required
                  >
                    <option value="">Select destination warehouse...</option>
                    {activeWarehouses
                      .filter((w) => w.id !== form.state.values.sourceWarehouseId)
                      .map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Warehouse to transfer items to</p>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <Separator />

            <div className="space-y-3">
              <Label>Add Products to Transfer</Label>

              <div className="space-y-2">
                <Combobox
                  options={availableProducts}
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  placeholder={loadingInventory ? 'Loading products...' : 'Search products...'}
                  emptyText={
                    loadingInventory ? 'Loading...' : 'No products with stock in this warehouse'
                  }
                  disabled={!form.state.values.sourceWarehouseId || loadingInventory}
                />
                {!form.state.values.sourceWarehouseId && (
                  <p className="text-xs text-muted-foreground">Select source warehouse first</p>
                )}
                {form.state.values.sourceWarehouseId && loadingInventory && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Fetching products from warehouse...
                  </p>
                )}
                {form.state.values.sourceWarehouseId &&
                  !loadingInventory &&
                  availableProducts.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      No products with available stock in selected warehouse
                    </p>
                  )}
              </div>

              <div className="grid grid-cols-[1fr,auto] gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Quantity"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  disabled={!selectedProduct}
                />
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProduct || !itemQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {transferItems.length > 0 && (
              <div className="space-y-2">
                <Label>Items to Transfer ({transferItems.length})</Label>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transferItems.map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">{item.sku}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between text-sm font-medium px-1">
                  <span>Total Units:</span>
                  <span>{transferItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
              </div>
            )}

            <Separator />

            <form.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add notes about this transfer..."
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <DrawerFooter className="px-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={transferItems.length === 0}
                >
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Execute Transfer
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
    </div>
  );
}
