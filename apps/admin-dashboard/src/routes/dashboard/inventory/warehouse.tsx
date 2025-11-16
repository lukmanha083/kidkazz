import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, MapPin, Package, Edit, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/inventory/warehouse')({
  component: WarehousePage,
});

function WarehousePage() {
  const warehouses = [
    {
      id: 1,
      name: 'Main Warehouse',
      code: 'WH-001',
      address: 'Jl. Raya Industri No. 45, Kawasan Industri MM2100, Cibitung, Bekasi, West Java 17520',
      phone: '+62 21 8998 7766',
      capacity: '10,000 items',
      manager: 'Ahmad Santoso',
    },
    {
      id: 2,
      name: 'Distribution Center',
      code: 'WH-002',
      address: 'Jl. Margomulyo Indah Blok A-12, Tandes, Surabaya, East Java 60186',
      phone: '+62 31 7456 7890',
      capacity: '5,000 items',
      manager: 'Siti Rahayu',
    },
    {
      id: 3,
      name: 'Regional Hub',
      code: 'WH-003',
      address: 'Jl. Soekarno Hatta No. 590, Sekejati, Buahbatu, Bandung, West Java 40286',
      phone: '+62 22 8765 4321',
      capacity: '3,000 items',
      manager: 'Budi Wijaya',
    },
    {
      id: 4,
      name: 'Express Fulfillment Center',
      code: 'WH-004',
      address: 'Jl. Raya Serang KM 16.8, Bitung Jaya, Cikupa, Tangerang, Banten 15710',
      phone: '+62 21 5977 8899',
      capacity: '7,500 items',
      manager: 'Dewi Kusuma',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse locations and their details
          </p>
        </div>
        <Button>
          <Warehouse className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25,500</div>
            <p className="text-xs text-muted-foreground">Total items capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">11,924</div>
            <p className="text-xs text-muted-foreground">Items in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilization</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">46.7%</div>
            <p className="text-xs text-muted-foreground">Average capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse Table */}
      <Card>
        <CardHeader>
          <CardTitle>Warehouse List</CardTitle>
          <CardDescription>All warehouse locations with their complete details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Code
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Warehouse Name
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Address
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Phone
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Manager
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Capacity
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <span className="font-mono text-sm font-medium">{warehouse.code}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-primary" />
                        <span className="font-medium">{warehouse.name}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground line-clamp-2">
                          {warehouse.address}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="text-sm text-muted-foreground">{warehouse.phone}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="text-sm">{warehouse.manager}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <span className="text-sm font-medium">{warehouse.capacity}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
