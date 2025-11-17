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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Warehouse,
  MapPin,
  Phone,
  Mail,
  User,
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/warehouse')({
  component: WarehousePage,
});

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  location: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  manager: string;
  capacity: number;
  currentStock: number;
  status: 'Active' | 'Inactive';
  createdDate: string;
}

// Mock warehouses
const mockWarehouses: WarehouseData[] = [
  {
    id: 'WH-001',
    name: 'Main Warehouse',
    code: 'WH-001',
    location: 'Jakarta',
    address: 'Jl. Industri No. 123',
    city: 'Jakarta',
    postalCode: '12345',
    country: 'Indonesia',
    phone: '+62 21 1234567',
    email: 'main@kidkazz.com',
    manager: 'John Doe',
    capacity: 10000,
    currentStock: 7450,
    status: 'Active',
    createdDate: '2024-01-15',
  },
  {
    id: 'WH-002',
    name: 'North Branch',
    code: 'WH-002',
    location: 'Surabaya',
    address: 'Jl. Raya Utara No. 456',
    city: 'Surabaya',
    postalCode: '60123',
    country: 'Indonesia',
    phone: '+62 31 7654321',
    email: 'north@kidkazz.com',
    manager: 'Jane Smith',
    capacity: 5000,
    currentStock: 3200,
    status: 'Active',
    createdDate: '2024-02-20',
  },
  {
    id: 'WH-003',
    name: 'South Branch',
    code: 'WH-003',
    location: 'Bandung',
    address: 'Jl. Selatan No. 789',
    city: 'Bandung',
    postalCode: '40123',
    country: 'Indonesia',
    phone: '+62 22 9876543',
    email: 'south@kidkazz.com',
    manager: 'Bob Johnson',
    capacity: 3000,
    currentStock: 1850,
    status: 'Active',
    createdDate: '2024-03-10',
  },
];

function WarehousePage() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>(mockWarehouses);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseData | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    phone: '',
    email: '',
    manager: '',
    capacity: '',
  });

  // Filter warehouses based on search
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter((warehouse) =>
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.manager.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [warehouses, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredWarehouses.length / itemsPerPage);
  const paginatedWarehouses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredWarehouses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredWarehouses, currentPage, itemsPerPage]);

  const handleDelete = (id: string) => {
    setWarehouses(warehouses.filter((w) => w.id !== id));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewWarehouse = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    setViewDrawerOpen(true);
  };

  const handleAddWarehouse = () => {
    setFormMode('add');
    setFormData({
      name: '',
      code: '',
      location: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Indonesia',
      phone: '',
      email: '',
      manager: '',
      capacity: '',
    });
    setFormDrawerOpen(true);
  };

  const handleEditWarehouse = (warehouse: WarehouseData) => {
    setFormMode('edit');
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code,
      location: warehouse.location,
      address: warehouse.address,
      city: warehouse.city,
      postalCode: warehouse.postalCode,
      country: warehouse.country,
      phone: warehouse.phone,
      email: warehouse.email,
      manager: warehouse.manager,
      capacity: warehouse.capacity.toString(),
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (formMode === 'add') {
      const newWarehouse: WarehouseData = {
        id: `WH-${String(warehouses.length + 1).padStart(3, '0')}`,
        name: formData.name,
        code: formData.code,
        location: formData.location,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        country: formData.country,
        phone: formData.phone,
        email: formData.email,
        manager: formData.manager,
        capacity: parseInt(formData.capacity),
        currentStock: 0,
        status: 'Active',
        createdDate: new Date().toISOString().split('T')[0],
      };
      setWarehouses([...warehouses, newWarehouse]);
    } else if (formMode === 'edit' && selectedWarehouse) {
      setWarehouses(warehouses.map(w =>
        w.id === selectedWarehouse.id
          ? {
              ...w,
              name: formData.name,
              code: formData.code,
              location: formData.location,
              address: formData.address,
              city: formData.city,
              postalCode: formData.postalCode,
              country: formData.country,
              phone: formData.phone,
              email: formData.email,
              manager: formData.manager,
              capacity: parseInt(formData.capacity),
            }
          : w
      ));
    }
    setFormDrawerOpen(false);
  };

  const calculateUtilization = (current: number, capacity: number): number => {
    return Math.round((current / capacity) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse locations, capacity, and inventory
          </p>
        </div>
        <Button onClick={handleAddWarehouse} className="gap-2">
          <Plus className="h-4 w-4" />
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
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.reduce((sum, w) => sum + w.capacity, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Units capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.reduce((sum, w) => sum + w.currentStock, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Units in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Utilization</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                (warehouses.reduce((sum, w) => sum + w.currentStock, 0) /
                  warehouses.reduce((sum, w) => sum + w.capacity, 0)) *
                  100
              )}%
            </div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Warehouses</CardTitle>
              <CardDescription>
                {filteredWarehouses.length} of {warehouses.length} warehouses
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search warehouses..."
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
                  <TableHead className="w-[180px]">Warehouse</TableHead>
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead className="w-[150px]">Location</TableHead>
                  <TableHead className="w-[150px]">Manager</TableHead>
                  <TableHead className="w-[120px] text-right">Capacity</TableHead>
                  <TableHead className="w-[120px] text-right">Stock</TableHead>
                  <TableHead className="w-[100px] text-right">Usage</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWarehouses.map((warehouse) => {
                  const utilization = calculateUtilization(warehouse.currentStock, warehouse.capacity);

                  return (
                    <TableRow
                      key={warehouse.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewWarehouse(warehouse)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{warehouse.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {warehouse.city}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {warehouse.code}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {warehouse.location}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {warehouse.manager}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {warehouse.capacity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {warehouse.currentStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                utilization >= 90
                                  ? 'bg-destructive'
                                  : utilization >= 70
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">
                            {utilization}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={warehouse.status === 'Active' ? 'default' : 'secondary'}
                          className={
                            warehouse.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                              : ''
                          }
                        >
                          {warehouse.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewWarehouse(warehouse)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditWarehouse(warehouse)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(warehouse.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
              totalItems={filteredWarehouses.length}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Warehouse Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedWarehouse?.name}</DrawerTitle>
                <DrawerDescription>Warehouse Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedWarehouse && (() => {
            const utilization = calculateUtilization(selectedWarehouse.currentStock, selectedWarehouse.capacity);

            return (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Warehouse Name</Label>
                    <p className="text-sm font-medium mt-1">{selectedWarehouse.name}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Code</Label>
                      <p className="text-sm font-mono mt-1">{selectedWarehouse.code}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge
                          variant={selectedWarehouse.status === 'Active' ? 'default' : 'secondary'}
                          className={
                            selectedWarehouse.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                              : ''
                          }
                        >
                          {selectedWarehouse.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Location</Label>
                    <p className="text-sm mt-1">{selectedWarehouse.location}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Full Address</Label>
                    <p className="text-sm mt-1">
                      {selectedWarehouse.address}<br />
                      {selectedWarehouse.city}, {selectedWarehouse.postalCode}<br />
                      {selectedWarehouse.country}
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-xs text-muted-foreground">Manager</Label>
                    <p className="text-sm mt-1">{selectedWarehouse.manager}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p className="text-sm mt-1">{selectedWarehouse.phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <p className="text-sm mt-1">{selectedWarehouse.email}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Capacity</Label>
                      <p className="text-lg font-bold mt-1">
                        {selectedWarehouse.capacity.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">units</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Current Stock</Label>
                      <p className="text-lg font-bold mt-1">
                        {selectedWarehouse.currentStock.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">units</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Utilization</Label>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl font-bold">{utilization}%</span>
                        <span className="text-xs text-muted-foreground">
                          {selectedWarehouse.capacity - selectedWarehouse.currentStock} units available
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            utilization >= 90
                              ? 'bg-destructive'
                              : utilization >= 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Created Date</Label>
                    <p className="text-sm mt-1">{selectedWarehouse.createdDate}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <DrawerFooter>
            <Button onClick={() => selectedWarehouse && handleEditWarehouse(selectedWarehouse)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Warehouse
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Warehouse Form Drawer (Left Side) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add New Warehouse' : 'Edit Warehouse'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Create a new warehouse location'
                    : 'Update warehouse information'}
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
              <Label htmlFor="name">Warehouse Name</Label>
              <Input
                id="name"
                placeholder="Main Warehouse"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Warehouse Code</Label>
              <Input
                id="code"
                placeholder="WH-001"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Jakarta"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                placeholder="Jl. Industri No. 123"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Jakarta"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="12345"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="Indonesia"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="manager">Manager Name</Label>
              <Input
                id="manager"
                placeholder="John Doe"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+62 21 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="warehouse@kidkazz.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="capacity">Storage Capacity (units)</Label>
              <Input
                id="capacity"
                type="number"
                min="0"
                placeholder="10000"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of units this warehouse can hold
              </p>
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create Warehouse' : 'Update Warehouse'}
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
