import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Warehouse as WarehouseIcon, Plus, Pencil, Trash2, MapPin, Building2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/inventory/warehouse')({
  component: WarehouseManagementPage,
});

interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  manager: string;
  status: 'Active' | 'Inactive';
  createdAt: Date;
}

const mockWarehouses: Warehouse[] = [
  {
    id: 'WH-001',
    code: 'WH-JKT-01',
    name: 'Main Warehouse Jakarta',
    location: 'Jakarta',
    address: 'Jl. Raya Industri No. 123',
    city: 'Jakarta',
    postalCode: '12345',
    phone: '+62 21 1234 5678',
    manager: 'Budi Santoso',
    status: 'Active',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'WH-002',
    code: 'WH-SBY-01',
    name: 'Distribution Center Surabaya',
    location: 'Surabaya',
    address: 'Jl. Industri Raya No. 456',
    city: 'Surabaya',
    postalCode: '60234',
    phone: '+62 31 2345 6789',
    manager: 'Siti Rahayu',
    status: 'Active',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: 'WH-003',
    code: 'WH-BDG-01',
    name: 'Regional Hub Bandung',
    location: 'Bandung',
    address: 'Jl. Soekarno Hatta No. 789',
    city: 'Bandung',
    postalCode: '40293',
    phone: '+62 22 3456 7890',
    manager: 'Ahmad Wijaya',
    status: 'Active',
    createdAt: new Date('2024-03-10'),
  },
];

function WarehouseManagementPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(mockWarehouses);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    manager: '',
    status: 'Active' as 'Active' | 'Inactive',
  });

  const handleAddWarehouse = () => {
    setFormMode('add');
    setFormData({
      code: '',
      name: '',
      location: '',
      address: '',
      city: '',
      postalCode: '',
      phone: '',
      manager: '',
      status: 'Active',
    });
    setFormDrawerOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setFormMode('edit');
    setSelectedWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      location: warehouse.location,
      address: warehouse.address,
      city: warehouse.city,
      postalCode: warehouse.postalCode,
      phone: warehouse.phone,
      manager: warehouse.manager,
      status: warehouse.status,
    });
    setFormDrawerOpen(true);
  };

  const handleDeleteWarehouse = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (warehouseToDelete) {
      setWarehouses(warehouses.filter(w => w.id !== warehouseToDelete.id));
      toast.success('Warehouse deleted', {
        description: `${warehouseToDelete.name} has been deleted successfully`
      });
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (formMode === 'add') {
      const newWarehouse: Warehouse = {
        id: `WH-${Date.now()}`,
        code: formData.code,
        name: formData.name,
        location: formData.location,
        address: formData.address,
        city: formData.city,
        postalCode: formData.postalCode,
        phone: formData.phone,
        manager: formData.manager,
        status: formData.status,
        createdAt: new Date(),
      };

      setWarehouses([...warehouses, newWarehouse]);
      toast.success('Warehouse created', {
        description: `${newWarehouse.name} has been created successfully`
      });
    } else if (formMode === 'edit' && selectedWarehouse) {
      setWarehouses(warehouses.map(w =>
        w.id === selectedWarehouse.id
          ? { ...w, ...formData }
          : w
      ));
      toast.success('Warehouse updated', {
        description: `${formData.name} has been updated successfully`
      });
    }

    setFormDrawerOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse locations and inventory centers
          </p>
        </div>
        <Button onClick={handleAddWarehouse}>
          <Plus className="mr-2 h-4 w-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Warehouse Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Warehouses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Warehouses</CardTitle>
            <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {warehouses.filter(w => w.status === 'Active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(warehouses.map(w => w.city)).size}
            </div>
            <p className="text-xs text-muted-foreground">Different cities</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Warehouses</CardTitle>
          <CardDescription>View and manage all warehouse locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Warehouse Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className="font-mono text-sm">{warehouse.code}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{warehouse.name}</div>
                        <div className="text-sm text-muted-foreground">{warehouse.address}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>{warehouse.city}</span>
                      </div>
                    </TableCell>
                    <TableCell>{warehouse.manager}</TableCell>
                    <TableCell className="font-mono text-sm">{warehouse.phone}</TableCell>
                    <TableCell>
                      <Badge variant={warehouse.status === 'Active' ? 'default' : 'secondary'}>
                        {warehouse.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditWarehouse(warehouse)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => handleDeleteWarehouse(warehouse)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {formMode === 'add' ? 'Add New Warehouse' : 'Edit Warehouse'}
            </DrawerTitle>
            <DrawerDescription>
              {formMode === 'add'
                ? 'Create a new warehouse location'
                : 'Update warehouse information'}
            </DrawerDescription>
          </DrawerHeader>

          <form onSubmit={handleSubmitForm} className="px-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Warehouse Code *</Label>
                <Input
                  id="code"
                  placeholder="WH-JKT-01"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Warehouse Name *</Label>
                <Input
                  id="name"
                  placeholder="Main Warehouse Jakarta"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                placeholder="Jl. Raya Industri No. 123"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Jakarta"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  placeholder="12345"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="+62 21 1234 5678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager">Manager Name *</Label>
                <Input
                  id="manager"
                  placeholder="Budi Santoso"
                  value={formData.manager}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'Active' | 'Inactive') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit">
                {formMode === 'add' ? 'Create Warehouse' : 'Update Warehouse'}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Warehouse?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{warehouseToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
