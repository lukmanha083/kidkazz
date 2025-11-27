import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Search, Loader2, Package, Warehouse, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { inventoryApi, warehouseApi, productApi } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const Route = createFileRoute('/dashboard/inventory/expired-stock')({
  component: ExpiredStockPage,
});

interface ExpiredStockItem {
  productId: string;
  productName: string;
  productSKU: string;
  warehouseId: string;
  warehouseName: string;
  stock: number;
  expirationDate: string;
  alertDate?: string;
  daysUntilExpiration: number;
  status: 'expired' | 'expiring-soon' | 'alert';
  price: number;
}

function ExpiredStockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'daysUntilExpiration' | 'productName' | 'warehouseName'>('daysUntilExpiration');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate days until expiration
  const calculateDaysUntilExpiration = (expirationDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);

    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Fetch inventory data
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll(),
  });

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const inventory = inventoryData?.inventory || [];
  const warehouses = warehousesData?.warehouses || [];
  const products = productsData?.products || [];

  const isLoading = inventoryLoading || warehousesLoading || productsLoading;

  // Calculate expired and expiring stock items
  const expiredStockItems = useMemo((): ExpiredStockItem[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return inventory
      .map(inv => {
        const product = products.find(p => p.id === inv.productId);
        const warehouse = warehouses.find(w => w.id === inv.warehouseId);

        // Skip if no expiration date
        if (!product || !product.expirationDate) return null;

        const daysUntilExpiration = calculateDaysUntilExpiration(product.expirationDate);

        // Determine status
        let status: ExpiredStockItem['status'];
        if (daysUntilExpiration < 0) {
          status = 'expired';
        } else if (daysUntilExpiration <= 30) {
          status = 'expiring-soon';
        } else if (product.alertDate && calculateDaysUntilExpiration(product.alertDate) <= 0) {
          status = 'alert';
        } else {
          return null; // Not expired or expiring soon
        }

        return {
          productId: inv.productId,
          productName: product.name,
          productSKU: product.sku,
          warehouseId: inv.warehouseId,
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          stock: inv.quantityAvailable,
          expirationDate: product.expirationDate,
          alertDate: product.alertDate || undefined,
          daysUntilExpiration,
          status,
          price: product.price || 0,
        };
      })
      .filter((item): item is ExpiredStockItem => item !== null);
  }, [inventory, products, warehouses]);

  // Filter and sort
  const filteredAndSortedItems = useMemo(() => {
    let filtered = expiredStockItems;

    // Filter by warehouse
    if (selectedWarehouse !== 'all') {
      filtered = filtered.filter(item => item.warehouseId === selectedWarehouse);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(search) ||
        item.productSKU.toLowerCase().includes(search) ||
        item.warehouseName.toLowerCase().includes(search)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA: any = a[sortField];
      let compareB: any = b[sortField];

      if (typeof compareA === 'string') {
        compareA = compareA.toLowerCase();
        compareB = compareB.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1;
      } else {
        return compareA < compareB ? 1 : -1;
      }
    });

    return filtered;
  }, [expiredStockItems, selectedWarehouse, statusFilter, searchTerm, sortField, sortOrder]);

  // Calculate summary stats
  const expiredCount = expiredStockItems.filter(item => item.status === 'expired').length;
  const expiringSoonCount = expiredStockItems.filter(item => item.status === 'expiring-soon').length;
  const totalExpiredStock = expiredStockItems
    .filter(item => item.status === 'expired')
    .reduce((sum, item) => sum + item.stock, 0);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status: ExpiredStockItem['status']) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'expiring-soon':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700">Expiring Soon</Badge>;
      case 'alert':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-700">Alert</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expired Stock Report</h1>
            <p className="text-muted-foreground mt-1">
              Products that are expired or approaching expiration
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expired Stock Report</h1>
          <p className="text-muted-foreground mt-1">
            Products that are expired or approaching expiration by warehouse
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Products</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">
              Products past expiration date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringSoonCount}</div>
            <p className="text-xs text-muted-foreground">
              Within 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired Stock Units</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpiredStock}</div>
            <p className="text-xs text-muted-foreground">
              Total units expired
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expired & Expiring Stock</CardTitle>
          <CardDescription>
            Monitor products approaching or past their expiration dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by product name, SKU, or warehouse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warehouses</SelectItem>
                {warehouses.map(warehouse => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="expiring-soon">Expiring Soon</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No expired or expiring products found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || selectedWarehouse !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All products are within safe expiration ranges'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('productName')}
                    >
                      Product {sortField === 'productName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('warehouseName')}
                    >
                      Warehouse {sortField === 'warehouseName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('daysUntilExpiration')}
                    >
                      Expiration Date {sortField === 'daysUntilExpiration' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead>Days Until Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedItems.map((item, index) => (
                    <TableRow key={`${item.productId}-${item.warehouseId}-${index}`}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="font-mono text-sm">{item.productSKU}</TableCell>
                      <TableCell>{item.warehouseName}</TableCell>
                      <TableCell className="text-right font-mono">{item.stock}</TableCell>
                      <TableCell>{formatDate(item.expirationDate)}</TableCell>
                      <TableCell>
                        <span className={`font-mono ${item.daysUntilExpiration < 0 ? 'text-red-600 font-bold' : item.daysUntilExpiration <= 7 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {item.daysUntilExpiration < 0
                            ? `${Math.abs(item.daysUntilExpiration)} days ago`
                            : `${item.daysUntilExpiration} days`}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(item.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredAndSortedItems.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAndSortedItems.length} of {expiredStockItems.length} items
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
