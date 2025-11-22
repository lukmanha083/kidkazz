import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Warehouse as WarehouseIcon, Plus, Pencil, Trash2, MapPin, Building2, Loader2 } from 'lucide-react';
import { warehouseApi, type Warehouse, type CreateWarehouseInput } from '@/lib/api';

export const Route = createFileRoute('/dashboard/inventory/warehouse')({
  component: WarehouseManagementPage,
});

function WarehouseManagementPage() {
  const queryClient = useQueryClient();
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    province: '',
    postalCode: '',
    country: 'Indonesia',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch warehouses
  const { data: warehousesData, isLoading, error } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: (data: CreateWarehouseInput) => warehouseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse created successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create warehouse', {
        description: error.message,
      });
    },
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWarehouseInput> }) =>
      warehouseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse updated successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update warehouse', {
        description: error.message,
      });
    },
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: (id: string) => warehouseApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('Warehouse deleted successfully');
      setDeleteDialogOpen(false);
      setWarehouseToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete warehouse', {
        description: error.message,
      });
    },
  });

  const handleViewWarehouse = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setViewDrawerOpen(true);
  };

  const handleAddWarehouse = () => {
    setFormMode('add');
    setFormData({
      code: '',
      name: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      province: '',
      postalCode: '',
      country: 'Indonesia',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      status: 'active',
    });
    setFormDrawerOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setFormMode('edit');
    setSelectedWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      addressLine1: warehouse.addressLine1,
      addressLine2: warehouse.addressLine2 || '',
      city: warehouse.city,
      province: warehouse.province,
      postalCode: warehouse.postalCode,
      country: warehouse.country,
      contactName: warehouse.contactName || '',
      contactPhone: warehouse.contactPhone || '',
      contactEmail: warehouse.contactEmail || '',
      status: warehouse.status,
    });
    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleDeleteWarehouse = (warehouse: Warehouse) => {
    setWarehouseToDelete(warehouse);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (warehouseToDelete) {
      deleteWarehouseMutation.mutate(warehouseToDelete.id);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const warehouseData: CreateWarehouseInput = {
      code: formData.code,
      name: formData.name,
      addressLine1: formData.addressLine1,
      addressLine2: formData.addressLine2 || undefined,
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode,
      country: formData.country,
      contactName: formData.contactName || undefined,
      contactPhone: formData.contactPhone || undefined,
      contactEmail: formData.contactEmail || undefined,
      status: formData.status,
    };

    if (formMode === 'add') {
      createWarehouseMutation.mutate(warehouseData);
    } else if (formMode === 'edit' && selectedWarehouse) {
      updateWarehouseMutation.mutate({ id: selectedWarehouse.id, data: warehouseData });
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Warehouse Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage warehouse locations and inventory centers
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading warehouses</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['warehouses'] })}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
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
                  {warehouses.filter(w => w.status === 'active').length}
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
        </>
      )}

      {!isLoading && (
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
                    <TableHead>Province</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No warehouses found. Add your first warehouse to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouses.map((warehouse) => (
                      <TableRow
                        key={warehouse.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewWarehouse(warehouse)}
                      >
                        <TableCell className="font-mono text-sm">{warehouse.code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{warehouse.name}</div>
                            <div className="text-sm text-muted-foreground">{warehouse.addressLine1}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span>{warehouse.city}</span>
                          </div>
                        </TableCell>
                        <TableCell>{warehouse.province}</TableCell>
                        <TableCell>{warehouse.contactName || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{warehouse.contactPhone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={warehouse.status === 'active' ? 'default' : 'secondary'}>
                            {warehouse.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditWarehouse(warehouse);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWarehouse(warehouse);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Drawer - Warehouse Details */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedWarehouse?.name}</DrawerTitle>
            <DrawerDescription>Warehouse Details</DrawerDescription>
          </DrawerHeader>

          {selectedWarehouse && (
            <div className="px-4 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Warehouse Code</p>
                    <p className="font-mono font-medium">{selectedWarehouse.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={selectedWarehouse.status === 'active' ? 'default' : 'secondary'}>
                      {selectedWarehouse.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warehouse Name</p>
                  <p className="font-medium">{selectedWarehouse.name}</p>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Address</h3>
                <div>
                  <p className="text-sm text-muted-foreground">Address Line 1</p>
                  <p className="font-medium">{selectedWarehouse.addressLine1}</p>
                </div>
                {selectedWarehouse.addressLine2 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Address Line 2</p>
                    <p className="font-medium">{selectedWarehouse.addressLine2}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{selectedWarehouse.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Province</p>
                    <p className="font-medium">{selectedWarehouse.province}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Postal Code</p>
                    <p className="font-mono font-medium">{selectedWarehouse.postalCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{selectedWarehouse.country}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">Contact Information</h3>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Name</p>
                  <p className="font-medium">{selectedWarehouse.contactName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-mono font-medium">{selectedWarehouse.contactPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedWarehouse.contactEmail || '-'}</p>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button onClick={() => selectedWarehouse && handleEditWarehouse(selectedWarehouse)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Warehouse
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
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

          <form onSubmit={handleSubmitForm} className="px-4 space-y-4">
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
              <Label htmlFor="addressLine1">Address Line 1 *</Label>
              <Input
                id="addressLine1"
                placeholder="Jl. Raya Industri No. 123"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                placeholder="Kelurahan Sunter, Kecamatan Tanjung Priok"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
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
                <Label htmlFor="province">Province *</Label>
                <Input
                  id="province"
                  placeholder="DKI Jakarta"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="Indonesia"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  placeholder="Budi Santoso"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="+62 21 1234 5678"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                placeholder="budi@warehouse.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
              >
                {createWarehouseMutation.isPending || updateWarehouseMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {formMode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  formMode === 'add' ? 'Create Warehouse' : 'Update Warehouse'
                )}
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
            <AlertDialogCancel disabled={deleteWarehouseMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteWarehouseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWarehouseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
