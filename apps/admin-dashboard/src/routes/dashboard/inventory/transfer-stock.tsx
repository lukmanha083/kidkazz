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
import { Combobox } from '@/components/ui/combobox';
import {
  Plus,
  Search,
  Eye,
  X,
  ArrowRightLeft,
  Trash2,
  Package,
  Calendar,
} from 'lucide-react';
import { mockWarehouses } from '@/data/warehouses';

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

// Mock products for transfer
const mockProducts = [
  { id: '1', name: 'Baby Bottle Set', sku: 'BB-001', warehouseId: 'WH-001', stock: 145 },
  { id: '2', name: 'Kids Backpack', sku: 'BP-002', warehouseId: 'WH-002', stock: 89 },
  { id: '3', name: 'Toy Car Collection', sku: 'TC-003', warehouseId: 'WH-001', stock: 234 },
  { id: '4', name: 'Children Books Set', sku: 'BK-004', warehouseId: 'WH-003', stock: 67 },
  { id: '5', name: 'Baby Crib', sku: 'CR-005', warehouseId: 'WH-001', stock: 12 },
  { id: '6', name: 'Toddler Shoes', sku: 'SH-006', warehouseId: 'WH-002', stock: 78 },
  { id: '7', name: 'Educational Puzzle', sku: 'PZ-007', warehouseId: 'WH-001', stock: 156 },
  { id: '8', name: 'Baby Monitor', sku: 'BM-008', warehouseId: 'WH-002', stock: 34 },
  { id: '9', name: 'Diaper Bag', sku: 'DB-009', warehouseId: 'WH-003', stock: 91 },
  { id: '10', name: 'Kids Lunch Box', sku: 'LB-010', warehouseId: 'WH-001', stock: 203 },
];

// Mock transfer history
const mockTransfers: StockTransfer[] = [
  {
    id: 'TRF-001',
    transferNumber: 'TRF-2024-001',
    sourceWarehouseId: 'WH-001',
    sourceWarehouseName: 'Main Warehouse Jakarta',
    destinationWarehouseId: 'WH-002',
    destinationWarehouseName: 'Distribution Center Surabaya',
    items: [
      { productId: '1', productName: 'Baby Bottle Set', sku: 'BB-001', quantity: 50 },
      { productId: '7', productName: 'Educational Puzzle', sku: 'PZ-007', quantity: 30 },
    ],
    totalItems: 80,
    status: 'Completed',
    transferredBy: 'Admin User',
    transferDate: '2024-11-15',
    notes: 'Restocking North Branch',
  },
  {
    id: 'TRF-002',
    transferNumber: 'TRF-2024-002',
    sourceWarehouseId: 'WH-003',
    sourceWarehouseName: 'Regional Hub Bandung',
    destinationWarehouseId: 'WH-001',
    destinationWarehouseName: 'Main Warehouse Jakarta',
    items: [
      { productId: '4', productName: 'Children Books Set', sku: 'BK-004', quantity: 20 },
    ],
    totalItems: 20,
    status: 'Completed',
    transferredBy: 'Admin User',
    transferDate: '2024-11-14',
  },
  {
    id: 'TRF-003',
    transferNumber: 'TRF-2024-003',
    sourceWarehouseId: 'WH-001',
    sourceWarehouseName: 'Main Warehouse Jakarta',
    destinationWarehouseId: 'WH-003',
    destinationWarehouseName: 'Regional Hub Bandung',
    items: [
      { productId: '3', productName: 'Toy Car Collection', sku: 'TC-003', quantity: 40 },
      { productId: '5', productName: 'Baby Crib', sku: 'CR-005', quantity: 5 },
      { productId: '10', productName: 'Kids Lunch Box', sku: 'LB-010', quantity: 25 },
    ],
    totalItems: 70,
    status: 'Completed',
    transferredBy: 'Admin User',
    transferDate: '2024-11-13',
    notes: 'Regional distribution',
  },
];

function TransferStockPage() {
  // Filter only active warehouses
  const activeWarehouses = mockWarehouses.filter(wh => wh.status === 'Active');

  const [transfers, setTransfers] = useState<StockTransfer[]>(mockTransfers);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    notes: '',
  });

  // Transfer items
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState('');

  // Filter transfers based on search
  const filteredTransfers = useMemo(() => {
    return transfers.filter((transfer) =>
      transfer.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.sourceWarehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.destinationWarehouseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transfer.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()))
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
    if (!formData.sourceWarehouseId) return [];
    return mockProducts
      .filter(p => p.warehouseId === formData.sourceWarehouseId)
      .filter(p => !transferItems.some(item => item.productId === p.id))
      .map(p => ({
        value: p.id,
        label: `${p.name} (${p.sku}) - ${p.stock} available`,
      }));
  }, [formData.sourceWarehouseId, transferItems]);

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
      alert('Please select a product and enter quantity');
      return;
    }

    const product = mockProducts.find(p => p.id === selectedProduct);
    if (!product) return;

    const quantity = parseInt(itemQuantity);
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    if (quantity > product.stock) {
      alert(`Insufficient stock. Available: ${product.stock} units`);
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
  };

  const handleRemoveItem = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.productId !== productId));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (transferItems.length === 0) {
      alert('Please add at least one product to transfer');
      return;
    }

    if (formData.sourceWarehouseId === formData.destinationWarehouseId) {
      alert('Source and destination warehouses must be different');
      return;
    }

    const sourceWarehouse = activeWarehouses.find(w => w.id === formData.sourceWarehouseId);
    const destinationWarehouse = activeWarehouses.find(w => w.id === formData.destinationWarehouseId);

    if (!sourceWarehouse || !destinationWarehouse) {
      alert('Invalid warehouse selection');
      return;
    }

    const totalItems = transferItems.reduce((sum, item) => sum + item.quantity, 0);

    const newTransfer: StockTransfer = {
      id: `TRF-${String(transfers.length + 1).padStart(3, '0')}`,
      transferNumber: `TRF-2024-${String(transfers.length + 1).padStart(3, '0')}`,
      sourceWarehouseId: formData.sourceWarehouseId,
      sourceWarehouseName: sourceWarehouse.name,
      destinationWarehouseId: formData.destinationWarehouseId,
      destinationWarehouseName: destinationWarehouse.name,
      items: transferItems,
      totalItems: totalItems,
      status: 'Completed',
      transferredBy: 'Admin User',
      transferDate: new Date().toISOString().split('T')[0],
      notes: formData.notes,
    };

    setTransfers([newTransfer, ...transfers]);
    setFormDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Transfer</h1>
          <p className="text-muted-foreground mt-1">
            Manage inventory movement between warehouses
          </p>
        </div>
        <Button onClick={handleAddTransfer} className="gap-2">
          <Plus className="h-4 w-4" />
          New Transfer
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
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
              {transfers.filter(t => t.status === 'Completed').length}
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
              {transfers.filter(t => {
                const transferMonth = new Date(t.transferDate).getMonth();
                const currentMonth = new Date().getMonth();
                return transferMonth === currentMonth;
              }).length}
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
                  <TableHead className="w-[140px]">Transfer #</TableHead>
                  <TableHead className="w-[160px]">From</TableHead>
                  <TableHead className="w-[160px]">To</TableHead>
                  <TableHead className="w-[100px] text-right">Items</TableHead>
                  <TableHead className="w-[100px] text-right">Quantity</TableHead>
                  <TableHead className="w-[120px]">Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
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
                    <TableCell className="text-sm">
                      {transfer.sourceWarehouseName}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1">
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        {transfer.destinationWarehouseName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {transfer.items.length}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {transfer.totalItems}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
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
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedTransfer?.transferNumber}</DrawerTitle>
                <DrawerDescription>Stock Transfer Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedTransfer && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
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
                  <p className="text-sm font-medium mt-1">
                    {selectedTransfer.sourceWarehouseName}
                  </p>
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

                <div className="grid grid-cols-2 gap-3">
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
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>New Stock Transfer</DrawerTitle>
                <DrawerDescription>
                  Transfer products between warehouses
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
              <Label htmlFor="sourceWarehouse">Source Warehouse</Label>
              <select
                id="sourceWarehouse"
                value={formData.sourceWarehouseId}
                onChange={(e) => {
                  setFormData({ ...formData, sourceWarehouseId: e.target.value });
                  setTransferItems([]);
                  setSelectedProduct('');
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="">Select source warehouse...</option>
                {activeWarehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Warehouse to transfer items from
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationWarehouse">Destination Warehouse</Label>
              <select
                id="destinationWarehouse"
                value={formData.destinationWarehouseId}
                onChange={(e) => {
                  setFormData({ ...formData, destinationWarehouseId: e.target.value });
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="">Select destination warehouse...</option>
                {activeWarehouses
                  .filter(w => w.id !== formData.sourceWarehouseId)
                  .map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Warehouse to transfer items to
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Add Products to Transfer</Label>

              <div className="space-y-2">
                <Combobox
                  options={availableProducts}
                  value={selectedProduct}
                  onValueChange={setSelectedProduct}
                  placeholder="Search products..."
                  emptyText="No products found"
                  disabled={!formData.sourceWarehouseId}
                />
                {!formData.sourceWarehouseId && (
                  <p className="text-xs text-muted-foreground">
                    Select source warehouse first
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
                        <TableHead className="w-[50px]"></TableHead>
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
                          <TableCell className="text-right font-medium">
                            {item.quantity}
                          </TableCell>
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

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="Add notes about this transfer..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full" disabled={transferItems.length === 0}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Execute Transfer
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
