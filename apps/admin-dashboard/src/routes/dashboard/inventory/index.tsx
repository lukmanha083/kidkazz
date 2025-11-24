import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, Package, AlertCircle, TrendingDown, Loader2, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { inventoryApi, warehouseApi, productApi } from '@/lib/api';

export const Route = createFileRoute('/dashboard/inventory/')({
  component: InventoryPage,
});

function InventoryPage() {
  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch inventory data from API
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll(),
  });

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  // Fetch products for names and prices
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const inventory = inventoryData?.inventory || [];
  const warehouses = warehousesData?.warehouses || [];
  const products = productsData?.products || [];

  const isLoading = inventoryLoading || warehousesLoading || productsLoading;

  // Helper function to get product details
  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  // Helper function to get warehouse details
  const getWarehouse = (warehouseId: string) => {
    return warehouses.find(w => w.id === warehouseId);
  };

  // Calculate warehouse-specific inventory
  const warehouseInventory = warehouses.map(warehouse => {
    const warehouseItems = inventory.filter(inv => inv.warehouseId === warehouse.id);
    const totalItems = warehouseItems.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
    const lowStockCount = warehouseItems.filter(inv => inv.quantityAvailable < inv.minimumStock).length;

    // Calculate total value
    const totalValue = warehouseItems.reduce((sum, inv) => {
      const product = getProduct(inv.productId);
      return sum + (product ? product.price * inv.quantityAvailable : 0);
    }, 0);

    return {
      id: warehouse.id,
      name: warehouse.name,
      location: `${warehouse.city}${warehouse.province ? ', ' + warehouse.province : ''}`,
      totalItems,
      lowStock: lowStockCount,
      value: formatRupiah(totalValue),
    };
  });

  // Calculate overall stats
  const totalItems = inventory.reduce((sum, inv) => sum + inv.quantityAvailable, 0);
  const totalValue = inventory.reduce((sum, inv) => {
    const product = getProduct(inv.productId);
    return sum + (product ? product.price * inv.quantityAvailable : 0);
  }, 0);
  const lowStockItemsCount = inventory.filter(inv => inv.quantityAvailable < inv.minimumStock).length;

  // Get low stock items with details
  const lowStockItems = inventory
    .filter(inv => inv.quantityAvailable < inv.minimumStock)
    .map(inv => {
      const product = getProduct(inv.productId);
      const warehouse = getWarehouse(inv.warehouseId);
      const status = inv.quantityAvailable <= Math.floor(inv.minimumStock * 0.4) ? 'Critical' : 'Low';

      return {
        productId: inv.productId,
        sku: product?.sku || 'N/A',
        name: product?.name || 'Unknown Product',
        warehouse: warehouse?.name || 'Unknown Warehouse',
        currentStock: inv.quantityAvailable,
        minStock: inv.minimumStock,
        status,
      };
    })
    .sort((a, b) => {
      // Sort by status (Critical first), then by stock level
      if (a.status !== b.status) {
        return a.status === 'Critical' ? -1 : 1;
      }
      return a.currentStock - b.currentStock;
    });

  // Get products with expiration dates from inventory
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Group expiring products by warehouse
  const expiringProductsByWarehouse = inventory
    .map(inv => {
      const product = getProduct(inv.productId);
      const warehouse = getWarehouse(inv.warehouseId);

      if (!product?.expirationDate) return null;

      const expirationDate = new Date(product.expirationDate);
      expirationDate.setHours(0, 0, 0, 0);

      if (expirationDate < today || expirationDate > thirtyDaysFromNow) return null;

      const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        productId: inv.productId,
        sku: product.sku,
        name: product.name,
        warehouse: warehouse?.name || 'Unknown Warehouse',
        warehouseId: inv.warehouseId,
        expirationDate: product.expirationDate,
        alertDate: product.alertDate,
        stock: inv.quantityAvailable,
        daysUntilExpiration,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a!.daysUntilExpiration - b!.daysUntilExpiration));

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Report</h1>
          <p className="text-muted-foreground mt-1">
            Overview of inventory across all warehouse locations
          </p>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-lg">Loading inventory data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Report</h1>
          <p className="text-muted-foreground mt-1">
            Overview of inventory across all warehouse locations
          </p>
        </div>
        <Link to="/dashboard/products">
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" />
            View Product Report
          </Button>
        </Link>
      </div>

      {/* Info Notice */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                <Warehouse className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Warehouse-Specific Inventory Data
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This <strong>Inventory Report</strong> shows detailed warehouse-specific data including stock levels, alerts, and expiration dates broken down by each warehouse location.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all warehouses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Inventory valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItemsCount}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse-Specific Inventory */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Inventory by Warehouse</h2>
        {warehouses.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Warehouse className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="font-medium">No warehouses found</p>
                <p className="text-sm mt-1">Add warehouses to start tracking inventory</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {warehouseInventory.map((warehouse) => (
              <Card key={warehouse.id}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-base">{warehouse.name}</CardTitle>
                      <CardDescription>{warehouse.location}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Items</span>
                    <span className="text-lg font-bold">{warehouse.totalItems.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Inventory Value</span>
                    <span className="text-lg font-bold">{warehouse.value}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-destructive flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Low Stock
                    </span>
                    <span className="text-sm font-medium text-destructive">{warehouse.lowStock} items</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Expiring Products by Warehouse */}
      {expiringProductsByWarehouse.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              Products Expiring Soon (By Warehouse)
            </CardTitle>
            <CardDescription>Products expiring within the next 30 days, broken down by warehouse location</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringProductsByWarehouse.map((item, index) => {
                const isUrgent = item!.daysUntilExpiration <= 7;
                const isWarning = item!.daysUntilExpiration <= 14 && item!.daysUntilExpiration > 7;

                return (
                  <div
                    key={`${item!.productId}-${item!.warehouseId}-${index}`}
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      isUrgent
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                        : isWarning
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
                        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{item!.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {item!.warehouse}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            isUrgent
                              ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                              : isWarning
                              ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400'
                          }
                        >
                          {item!.daysUntilExpiration} {item!.daysUntilExpiration === 1 ? 'day' : 'days'} left
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{item!.sku}</span>
                        <span>Stock: {item!.stock}</span>
                        <span>Expires: {formatDate(item!.expirationDate)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items by Warehouse</CardTitle>
          <CardDescription>Items that need restocking, organized by warehouse location</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="font-medium">All items have sufficient stock</p>
              <p className="text-sm mt-1">No restocking needed at this time</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      SKU
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Product Name
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Warehouse
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Current Stock
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Min Stock
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockItems.map((item, index) => (
                    <tr key={`${item.productId}-${item.warehouse}-${index}`} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <span className="font-mono text-sm">{item.sku}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="font-medium">{item.name}</span>
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground">
                        {item.warehouse}
                      </td>
                      <td className="p-4 align-middle">
                        <span className={item.currentStock <= Math.floor(item.minStock * 0.4) ? 'text-destructive font-medium' : ''}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {item.minStock}
                      </td>
                      <td className="p-4 align-middle">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            item.status === 'Critical'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
