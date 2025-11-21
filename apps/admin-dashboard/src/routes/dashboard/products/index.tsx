import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, TrendingDown, DollarSign, Boxes, AlertCircle, ShoppingCart, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { productApi, categoryApi } from '@/lib/api';

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

  const isLoading = productsLoading || categoriesLoading;

  // Calculate statistics from real data
  const productStats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'active').length,
    inactiveProducts: products.filter(p => p.status === 'inactive').length + products.filter(p => p.status === 'discontinued').length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
    lowStockProducts: products.filter(p => p.stock < 50 && p.stock >= 20).length,
    outOfStock: products.filter(p => p.stock < 20).length,
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

  // Low stock products
  const lowStockProducts = products
    .filter(p => p.stock < 100)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 4)
    .map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      stock: p.stock,
      minStock: 100,
      status: p.stock < 20 ? 'Critical' : 'Low',
    }));

  // Category breakdown
  const categoryBreakdown = categories.map(cat => {
    const categoryProducts = products.filter(p => p.categoryId === cat.id);
    const categoryValue = categoryProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const percentage = products.length > 0 ? Math.round((categoryProducts.length / products.length) * 100) : 0;

    return {
      category: cat.name,
      products: categoryProducts.length,
      percentage,
      value: formatRupiah(categoryValue),
    };
  }).filter(c => c.products > 0); // Only show categories with products

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

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(productStats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">Inventory value</p>
          </CardContent>
        </Card>

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
