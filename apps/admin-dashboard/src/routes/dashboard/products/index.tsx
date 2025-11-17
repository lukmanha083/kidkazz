import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, TrendingUp, TrendingDown, DollarSign, Boxes, AlertCircle, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/dashboard/products/')({
  component: ProductsReportPage,
});

function ProductsReportPage() {
  // Mock data for product analytics
  const productStats = {
    totalProducts: 542,
    activeProducts: 498,
    inactiveProducts: 44,
    totalValue: '$1,245,890',
    lowStockProducts: 23,
    outOfStock: 8,
  };

  const topSellingProducts = [
    { id: 1, name: 'Baby Bottle Set', sku: 'BB-001', sales: 1234, revenue: '$37,020', trend: 'up' },
    { id: 2, name: 'Kids Backpack', sku: 'BP-002', sales: 987, revenue: '$44,415', trend: 'up' },
    { id: 3, name: 'Educational Puzzle', sku: 'PZ-007', sales: 856, revenue: '$17,115', trend: 'down' },
    { id: 4, name: 'Diaper Bag', sku: 'DB-009', sales: 743, revenue: '$37,143', trend: 'up' },
    { id: 5, name: 'Kids Lunch Box', sku: 'LB-010', sales: 689, revenue: '$11,019', trend: 'up' },
  ];

  const lowStockProducts = [
    { id: 1, name: 'Baby Crib', sku: 'CR-005', stock: 8, minStock: 20, status: 'Critical' },
    { id: 2, name: 'Baby Monitor', sku: 'BM-008', stock: 34, minStock: 50, status: 'Low' },
    { id: 3, name: 'Toddler Shoes', sku: 'SH-006', stock: 78, minStock: 100, status: 'Low' },
    { id: 4, name: 'Kids Backpack', sku: 'BP-002', stock: 89, minStock: 120, status: 'Low' },
  ];

  const categoryBreakdown = [
    { category: 'Feeding', products: 87, percentage: 16, value: '$195,450' },
    { category: 'School', products: 124, percentage: 23, value: '$287,320' },
    { category: 'Toys', products: 156, percentage: 29, value: '$356,780' },
    { category: 'Clothing', products: 93, percentage: 17, value: '$234,560' },
    { category: 'Furniture', products: 45, percentage: 8, value: '$98,340' },
    { category: 'Electronics', products: 37, percentage: 7, value: '$73,440' },
  ];

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
            <div className="text-2xl font-bold">{productStats.totalValue}</div>
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
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Best performing products this month</CardDescription>
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
                    Sales
                  </th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                    Revenue
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

      {/* Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Low Stock Products */}
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Alert</CardTitle>
            <CardDescription>Products that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
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
