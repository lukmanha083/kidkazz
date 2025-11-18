import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warehouse, Package, AlertCircle, TrendingDown } from 'lucide-react';

export const Route = createFileRoute('/dashboard/inventory/')({
  component: InventoryPage,
});

function InventoryPage() {
  // Sample data for warehouse-specific inventory
  const warehouseInventory = [
    {
      id: 1,
      name: 'Main Warehouse',
      location: 'Jakarta',
      totalItems: 734,
      lowStock: 5,
      value: '$124,500',
    },
    {
      id: 2,
      name: 'Distribution Center',
      location: 'Surabaya',
      totalItems: 456,
      lowStock: 4,
      value: '$89,200',
    },
    {
      id: 3,
      name: 'Regional Hub',
      location: 'Bandung',
      totalItems: 234,
      lowStock: 3,
      value: '$45,800',
    },
  ];

  // Sample data for low stock items
  const lowStockItems = [
    {
      sku: 'KK-001',
      name: 'Baby Bottle Set',
      warehouse: 'Main Warehouse',
      currentStock: 5,
      minStock: 20,
      status: 'Critical',
    },
    {
      sku: 'KK-002',
      name: 'Kids Backpack',
      warehouse: 'Main Warehouse',
      currentStock: 8,
      minStock: 15,
      status: 'Low',
    },
    {
      sku: 'KK-045',
      name: 'Toy Car Collection',
      warehouse: 'Distribution Center',
      currentStock: 3,
      minStock: 10,
      status: 'Critical',
    },
    {
      sku: 'KK-078',
      name: 'Children Books',
      warehouse: 'Distribution Center',
      currentStock: 6,
      minStock: 12,
      status: 'Low',
    },
    {
      sku: 'KK-091',
      name: 'Baby Stroller',
      warehouse: 'Distribution Center',
      currentStock: 4,
      minStock: 8,
      status: 'Critical',
    },
    {
      sku: 'KK-103',
      name: 'Puzzle Set',
      warehouse: 'Regional Hub',
      currentStock: 7,
      minStock: 15,
      status: 'Low',
    },
    {
      sku: 'KK-125',
      name: 'Educational Toys',
      warehouse: 'Regional Hub',
      currentStock: 2,
      minStock: 10,
      status: 'Critical',
    },
    {
      sku: 'KK-156',
      name: 'Baby Monitor',
      warehouse: 'Regional Hub',
      currentStock: 5,
      minStock: 8,
      status: 'Low',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Report</h1>
        <p className="text-muted-foreground mt-1">
          Overview of inventory across all warehouse locations
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,424</div>
            <p className="text-xs text-muted-foreground">Across all warehouses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$259,500</div>
            <p className="text-xs text-muted-foreground">Inventory valuation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse-Specific Inventory */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Inventory by Warehouse</h2>
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
                  <span className="text-lg font-bold">{warehouse.totalItems}</span>
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
      </div>

      {/* Low Stock Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>Items that need restocking across all warehouses</CardDescription>
        </CardHeader>
        <CardContent>
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
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
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
                      <span className={item.currentStock <= 5 ? 'text-destructive font-medium' : ''}>
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
        </CardContent>
      </Card>
    </div>
  );
}
