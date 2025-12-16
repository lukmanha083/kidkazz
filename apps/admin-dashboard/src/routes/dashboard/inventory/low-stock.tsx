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
import { AlertCircle, Search, Loader2, Package, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { inventoryApi, warehouseApi, productApi } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { lowStockSearchSchema } from '@/lib/route-search-schemas';
import { queryKeys } from '@/lib/query-client';

/**
 * Low Stock Report Route
 *
 * Features:
 * - Zod-validated search params
 * - Route loader for data prefetching
 */
export const Route = createFileRoute('/dashboard/inventory/low-stock')({
  validateSearch: lowStockSearchSchema,

  // Prefetch data for the low stock page
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: queryKeys.inventory.all,
        queryFn: () => inventoryApi.getAll(),
      }),
      queryClient.ensureQueryData({
        queryKey: queryKeys.warehouses.all,
        queryFn: () => warehouseApi.getAll(),
      }),
      queryClient.ensureQueryData({
        queryKey: queryKeys.products.all,
        queryFn: () => productApi.getAll(),
      }),
    ]);
  },

  component: LowStockPage,
});

interface LowStockItem {
  productId: string;
  productName: string;
  productSKU: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
  price: number;
}

/**
 * Render the Low Stock Report page, including summary cards, filters, and a sortable table of products that are below their minimum stock levels.
 *
 * Fetches inventory, warehouse, and product data, computes low-stock items (with resilient fallbacks for missing product/warehouse info), and provides warehouse filtering, text search, and multi-field sorting.
 *
 * @returns A React element representing the Low Stock Report page
 */
function LowStockPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [sortField, setSortField] = useState<'deficit' | 'productName' | 'warehouseName'>('deficit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch inventory data using centralized query keys
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: () => inventoryApi.getAll(),
  });

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: () => warehouseApi.getAll(),
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: () => productApi.getAll(),
  });

  const inventory = inventoryData?.inventory || [];
  const warehouses = warehousesData?.warehouses || [];
  const products = productsData?.products || [];

  const isLoading = inventoryLoading || warehousesLoading || productsLoading;

  // Calculate low stock items
  const lowStockItems = useMemo((): LowStockItem[] => {
    return inventory
      .filter(inv => inv.quantityAvailable < inv.minimumStock)
      .map(inv => {
        const product = products.find(p => p.id === inv.productId);
        const warehouse = warehouses.find(w => w.id === inv.warehouseId);

        return {
          productId: inv.productId,
          productName: product?.name || 'Unknown Product',
          productSKU: product?.sku || '-',
          warehouseId: inv.warehouseId,
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          currentStock: inv.quantityAvailable,
          minimumStock: inv.minimumStock,
          deficit: inv.minimumStock - inv.quantityAvailable,
          price: product?.price || 0,
        };
      });
  }, [inventory, products, warehouses]);

  // Filter and sort
  const filteredAndSortedItems = useMemo(() => {
    let filtered = lowStockItems;

    // Filter by warehouse
    if (selectedWarehouse !== 'all') {
      filtered = filtered.filter(item => item.warehouseId === selectedWarehouse);
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
  }, [lowStockItems, selectedWarehouse, searchTerm, sortField, sortOrder]);

  // Calculate summary stats
  const totalLowStockItems = lowStockItems.length;
  const totalDeficit = lowStockItems.reduce((sum, item) => sum + item.deficit, 0);
  const affectedWarehouses = new Set(lowStockItems.map(item => item.warehouseId)).size;

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Low Stock Report</h1>
            <p className="text-muted-foreground mt-1">
              Products below minimum stock levels
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
          <h1 className="text-3xl font-bold tracking-tight">Low Stock Report</h1>
          <p className="text-muted-foreground mt-1">
            Products below minimum stock levels by warehouse
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Products below minimum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deficit</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeficit}</div>
            <p className="text-xs text-muted-foreground">
              Units needed to reach minimum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affected Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affectedWarehouses}</div>
            <p className="text-xs text-muted-foreground">
              Warehouses with low stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>
            View and manage products that are below their minimum stock levels
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
          </div>

          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No low stock items found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm || selectedWarehouse !== 'all'
                  ? 'Try adjusting your filters'
                  : 'All products are above minimum stock levels'}
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
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Minimum Stock</TableHead>
                    <TableHead
                      className="text-right cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('deficit')}
                    >
                      Deficit {sortField === 'deficit' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedItems.map((item, index) => (
                    <TableRow key={`${item.productId}-${item.warehouseId}-${index}`}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="font-mono text-sm">{item.productSKU}</TableCell>
                      <TableCell>{item.warehouseName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-mono">
                          {item.currentStock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.minimumStock}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="font-mono text-orange-600">
                          -{item.deficit}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatRupiah(item.price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredAndSortedItems.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredAndSortedItems.length} of {totalLowStockItems} low stock items
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}