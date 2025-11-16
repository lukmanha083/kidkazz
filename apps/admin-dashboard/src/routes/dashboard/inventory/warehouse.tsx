import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, MapPin, Package } from 'lucide-react';

export const Route = createFileRoute('/dashboard/inventory/warehouse')({
  component: WarehousePage,
});

function WarehousePage() {
  const warehouses = [
    {
      id: 1,
      name: 'Main Warehouse',
      location: 'Jakarta, Indonesia',
      capacity: '10,000 items',
      current: '7,234 items',
      utilization: 72,
    },
    {
      id: 2,
      name: 'Distribution Center',
      location: 'Surabaya, Indonesia',
      capacity: '5,000 items',
      current: '3,456 items',
      utilization: 69,
    },
    {
      id: 3,
      name: 'Regional Hub',
      location: 'Bandung, Indonesia',
      capacity: '3,000 items',
      current: '1,234 items',
      utilization: 41,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse</h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse locations and inventory distribution
          </p>
        </div>
        <Button>
          <Warehouse className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((warehouse) => (
          <Card key={warehouse.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Warehouse className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{warehouse.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {warehouse.location}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Capacity */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium">{warehouse.utilization}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      warehouse.utilization > 80
                        ? 'bg-destructive'
                        : warehouse.utilization > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${warehouse.utilization}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Current</p>
                  <p className="text-sm font-medium">{warehouse.current}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-sm font-medium">{warehouse.capacity}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Package className="h-3 w-3 mr-1" />
                  View Items
                </Button>
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse Summary</CardTitle>
          <CardDescription>Overview of all warehouse locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Warehouses</p>
              <p className="text-2xl font-bold">{warehouses.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">11,924</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Average Utilization</p>
              <p className="text-2xl font-bold">61%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
