import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, TrendingDown, Wallet, Boxes, AlertCircle, ShoppingCart, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { productApi, categoryApi, inventoryApi } from '@/lib/api';

export const Route = createFileRoute('/dashboard/products/')({
  component: ProductsReportPage,
});

function ProductsReportPage() {
  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Fetch all products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const products = productsData?.products || [];

  // Fetch all categories
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const categories = categoriesData?.categories || [];

  // Fetch inventory data (Phase 2B: Using Inventory Service as single source of truth)
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.getAll(),
  });

  const inventory = inventoryData?.inventory || [];

  const isLoading = productsLoading || categoriesLoading || inventoryLoading;

  // Aggregate stock by product ID from Inventory Service (DDD: Single Source of Truth)
  const productStockMap = inventory.reduce((acc, inv) => {
    if (!acc[inv.productId]) {
      acc[inv.productId] = {
        totalStock: 0,
        minimumStock: inv.minimumStock || 0,
      };
    }
    acc[inv.productId].totalStock += inv.quantityAvailable || 0;
    // Use the highest minimumStock across all warehouses
    if (inv.minimumStock && inv.minimumStock > acc[inv.productId].minimumStock) {
      acc[inv.productId].minimumStock = inv.minimumStock;
    }
    return acc;
  }, {} as Record<string, { totalStock: number; minimumStock: number }>);

  // Helper function to get stock for a product
  const getProductStock = (productId: string): number => {
    return productStockMap[productId]?.totalStock || 0;
  };

  // Helper function to get minimum stock for a product
  const getMinimumStock = (productId: string, fallback: number = 50): number => {
    return productStockMap[productId]?.minimumStock || fallback;
  };

  // Calculate statistics from real data (Phase 2B: Using Inventory Service data)
  const productStats = {
    totalProducts: products.length,
    // Phase 3: Updated to match ProductStatus enum (online sales, offline sales, omnichannel sales are "active")
    activeProducts: products.filter(p => ['online sales', 'offline sales', 'omnichannel sales'].includes(p.status)).length,
    inactiveProducts: products.filter(p => p.status === 'inactive').length + products.filter(p => p.status === 'discontinued').length,
    totalValue: products.reduce((sum, p) => sum + (p.price * getProductStock(p.id)), 0),
    // Use custom minimumStock if set, otherwise default to 50 for low stock and 20 for out of stock
    lowStockProducts: products.filter(p => {
      const stock = getProductStock(p.id);
      const minStock = getMinimumStock(p.id, p.minimumStock || 50);
      const criticalStock = Math.floor(minStock * 0.4); // Critical is 40% of minimum
      return stock < minStock && stock >= criticalStock;
    }).length,
    outOfStock: products.filter(p => {
      const stock = getProductStock(p.id);
      const minStock = getMinimumStock(p.id, p.minimumStock || 50);
      const criticalStock = Math.floor(minStock * 0.4);
      return stock < criticalStock;
    }).length,
  };

  // Top selling products (sorted by stock sold - assuming lower stock means higher sales for demo)
  // In production, you'd have actual sales data
  const topSellingProducts = products
    .filter(p => p.reviews > 0)
    .sort((a, b) => b.reviews - a.reviews)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      sales: p.reviews, // Using reviews as proxy for sales
      revenue: formatRupiah(p.price * p.reviews),
      trend: p.rating >= 4.5 ? 'up' : 'down',
    }));

  // Low stock products (Phase 2B: Using Inventory Service data)
  const lowStockProducts = products
    .filter(p => {
      const stock = getProductStock(p.id);
      const minStock = getMinimumStock(p.id, p.minimumStock || 50);
      return stock < minStock;
    })
    .sort((a, b) => getProductStock(a.id) - getProductStock(b.id))
    .slice(0, 4)
    .map(p => {
      const stock = getProductStock(p.id);
      const minStock = getMinimumStock(p.id, p.minimumStock || 50);
      const criticalStock = Math.floor(minStock * 0.4);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        stock: stock,
        minStock: minStock,
        status: stock < criticalStock ? 'Critical' : 'Low',
      };
    });

  // Category breakdown (Phase 2B: Using Inventory Service data)
  const categoryBreakdown = categories.map(cat => {
    const categoryProducts = products.filter(p => p.categoryId === cat.id);
    const categoryValue = categoryProducts.reduce((sum, p) => sum + (p.price * getProductStock(p.id)), 0);
    const percentage = products.length > 0 ? Math.round((categoryProducts.length / products.length) * 100) : 0;

    return {
      category: cat.name,
      products: categoryProducts.length,
      percentage,
      value: formatRupiah(categoryValue),
    };
  }).filter(c => c.products > 0); // Only show categories with products

  // Products approaching expiration
  // Normalize dates to start of day to avoid timezone and time-of-day comparison issues
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  thirtyDaysFromNow.setHours(23, 59, 59, 999); // End of day

  const expiringProducts = products
    .filter(p => {
      if (!p.expirationDate) return false;
      const expirationDate = new Date(p.expirationDate);
      expirationDate.setHours(0, 0, 0, 0); // Normalize to start of day
      return expirationDate >= today && expirationDate <= thirtyDaysFromNow;
    })
    .sort((a, b) => {
      const dateA = new Date(a.expirationDate!).getTime();
      const dateB = new Date(b.expirationDate!).getTime();
      return dateA - dateB;
    })
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      expirationDate: p.expirationDate!,
      alertDate: p.alertDate,
      daysUntilExpiration: Math.ceil((new Date(p.expirationDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      status: p.status,
    }));

  const expiredProducts = products.filter(p => {
    if (!p.expirationDate) return false;
    const expirationDate = new Date(p.expirationDate);
    expirationDate.setHours(0, 0, 0, 0); // Normalize to start of day
    return expirationDate < today;
  }).length;

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Reports</h1>
            <p className="text-muted-foreground mt-1">
              Analytics and insights about your product inventory
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground text-lg">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Reports</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and insights about your product inventory
          </p>
        </div>
        <Link to="/dashboard/products/all">
          <Button className="gap-2">
            <Package className="h-4 w-4" />
            Manage Products
          </Button>
        </Link>
      </div>

      {/* Info Notice about Reports */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Product vs Inventory Reports
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                This <strong>Product Report</strong> shows aggregate product data across all warehouses. Stock levels, expiration dates, and alerts shown here are totals.
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                For detailed warehouse-specific information including:
              </p>
              <ul className="list-disc list-inside text-sm text-blue-800 dark:text-blue-200 mt-1 ml-2">
                <li>Stock breakdown by warehouse location</li>
                <li>Warehouse-specific stock alerts</li>
                <li>Product expiration dates per warehouse</li>
              </ul>
              <Link to="/dashboard/inventory" className="inline-block mt-3">
                <Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  View Inventory Report
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productStats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">All products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{productStats.activeProducts}</div>
            <p className="text-xs text-muted-foreground">Available for sale</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productStats.inactiveProducts}</div>
            <p className="text-xs text-muted-foreground">Not available</p>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatRupiah(productStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{productStats.lowStockProducts}</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{productStats.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Critical</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringProducts.length}</div>
            <p className="text-xs text-muted-foreground">Within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expiredProducts}</div>
            <p className="text-xs text-muted-foreground">Needs removal</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Selling Products */}
      {topSellingProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
            <CardDescription>Products with highest ratings and reviews</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Product Name
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      SKU
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      Reviews
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      Est. Revenue
                    </th>
                    <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topSellingProducts.map((product) => (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4 align-middle">
                        <span className="font-medium">{product.name}</span>
                      </td>
                      <td className="p-4 align-middle">
                        <span className="font-mono text-sm text-muted-foreground">{product.sku}</span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <span className="font-semibold">{product.sales}</span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <span className="font-semibold text-green-600">{product.revenue}</span>
                      </td>
                      <td className="p-4 align-middle text-center">
                        {product.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600 inline" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expiring Products Card - Full Width */}
      {expiringProducts.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Expiration Alert
            </CardTitle>
            <CardDescription>Products expiring within the next 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringProducts.map((product) => {
                const isUrgent = product.daysUntilExpiration <= 7;
                const isWarning = product.daysUntilExpiration <= 14 && product.daysUntilExpiration > 7;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-4 border rounded-md ${
                      isUrgent
                        ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                        : isWarning
                        ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-900'
                        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{product.name}</p>
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
                          {product.daysUntilExpiration} {product.daysUntilExpiration === 1 ? 'day' : 'days'} left
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{product.sku}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Expires: </span>
                          <span className="font-medium">{formatDate(product.expirationDate)}</span>
                        </div>
                        {product.alertDate && (
                          <div>
                            <span className="text-muted-foreground">Alert: </span>
                            <span className="font-medium">{formatDate(product.alertDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Calendar className={`h-8 w-8 ${
                        isUrgent
                          ? 'text-red-600'
                          : isWarning
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                      }`} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link to="/dashboard/products/all" className="block mt-4">
              <Button variant="outline" className="w-full">
                View All Products
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Low Stock Products */}
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Stock: {product.stock} / Min: {product.minStock}
                      </p>
                    </div>
                    <Badge
                      variant={product.status === 'Critical' ? 'destructive' : 'secondary'}
                      className={
                        product.status === 'Critical'
                          ? ''
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500'
                      }
                    >
                      {product.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>All products have sufficient stock</p>
              </div>
            )}
            <Link to="/dashboard/products/all" className="block mt-4">
              <Button variant="outline" className="w-full">
                View All Products
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{cat.products} products</span>
                        <span className="font-semibold">{cat.value}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Boxes className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>No categories with products yet</p>
              </div>
            )}
            <Link to="/dashboard/products/category" className="block mt-4">
              <Button variant="outline" className="w-full">
                Manage Categories
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common product management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Link to="/dashboard/products/all">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Package className="h-4 w-4" />
                All Products
              </Button>
            </Link>
            <Link to="/dashboard/products/category">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Boxes className="h-4 w-4" />
                Categories
              </Button>
            </Link>
            <Link to="/dashboard/products/bundle">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ShoppingCart className="h-4 w-4" />
                Bundles
              </Button>
            </Link>
            <Link to="/dashboard/products/variant">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Package className="h-4 w-4" />
                Variants
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
