import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { Warehouse as WarehouseIcon, Plus, Edit, MapPin, Building2, Loader2, X } from 'lucide-react';
import { warehouseApi, type Warehouse } from '@/lib/api';
import { warehouseFormSchema, type WarehouseFormData } from '@/lib/form-schemas';
import { warehouseListSearchSchema } from '@/lib/route-search-schemas';
import { queryKeys } from '@/lib/query-client';
import { DataTable } from '@/components/ui/data-table';
import { getWarehouseColumns } from '@/components/ui/data-table/columns/warehouse-columns';

/**
 * Extract error message from TanStack Form / Zod validation errors.
 * Handles both string errors and Zod error objects with message property.
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return String(error);
}

/**
 * Warehouse Management Route
 *
 * Features:
 * - Zod-validated search params
 * - Route loader for data prefetching
 * - TanStack Table integration
 */
export const Route = createFileRoute('/dashboard/inventory/warehouse')({
  validateSearch: warehouseListSearchSchema,

  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData({
      queryKey: queryKeys.warehouses.all,
      queryFn: () => warehouseApi.getAll(),
    });
  },

  component: WarehouseManagementPage,
});

/**
 * Warehouse management page component that provides a UI for listing, viewing, creating, editing, and deleting warehouse records.
 *
 * Renders a header, summary stats, a searchable/filterable table of warehouses, detail and form drawers for viewing and editing, and a delete confirmation dialog. Internally coordinates data fetching and mutations for warehouse CRUD operations.
 *
 * @returns The rendered warehouse management interface as a React element.
 */
function WarehouseManagementPage() {
  const queryClient = useQueryClient();
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);

  // TanStack Form
  const form = useForm({
    defaultValues: {
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
      status: 'active' as const,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: warehouseFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (formMode === 'add') {
        await createWarehouseMutation.mutateAsync(value);
      } else if (formMode === 'edit' && selectedWarehouse) {
        await updateWarehouseMutation.mutateAsync({ id: selectedWarehouse.id, data: value });
      }
    },
  });

  // Fetch warehouses using centralized query keys
  const { data: warehousesData, isLoading, error } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: (data: WarehouseFormData) => warehouseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      toast.success('Warehouse created successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to create warehouse', {
        description: error.message,
      });
    },
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WarehouseFormData> }) =>
      warehouseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
      toast.success('Warehouse updated successfully');
      setFormDrawerOpen(false);
      form.reset();
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
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all });
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
    form.reset();
    setFormDrawerOpen(true);
  };

  const handleEditWarehouse = (warehouse: Warehouse) => {
    setFormMode('edit');
    setSelectedWarehouse(warehouse);
    form.setFieldValue('code', warehouse.code);
    form.setFieldValue('name', warehouse.name);
    form.setFieldValue('addressLine1', warehouse.addressLine1);
    form.setFieldValue('addressLine2', warehouse.addressLine2 || '');
    form.setFieldValue('city', warehouse.city);
    form.setFieldValue('province', warehouse.province);
    form.setFieldValue('postalCode', warehouse.postalCode);
    form.setFieldValue('country', warehouse.country);
    form.setFieldValue('contactName', warehouse.contactName || '');
    form.setFieldValue('contactPhone', warehouse.contactPhone || '');
    form.setFieldValue('contactEmail', warehouse.contactEmail || '');
    form.setFieldValue('status', warehouse.status);
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

  // Memoize columns with callbacks
  const columns = useMemo(
    () =>
      getWarehouseColumns({
        onView: handleViewWarehouse,
        onEdit: handleEditWarehouse,
        onDelete: handleDeleteWarehouse,
      }),
    []
  );

  // Status filter options for the table
  const statusFilterOptions = [
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Warehouse</h1>
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
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all })}
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

      {/* Warehouses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Warehouses</CardTitle>
          <CardDescription>View and manage all warehouse locations</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={warehouses}
            searchKey="name"
            searchPlaceholder="Search warehouses..."
            isLoading={isLoading}
            onRowClick={handleViewWarehouse}
            filterableColumns={[
              {
                id: 'status',
                title: 'Status',
                options: statusFilterOptions,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* View Drawer - Warehouse Details */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedWarehouse?.name}</DrawerTitle>
            <DrawerDescription>Warehouse Details</DrawerDescription>
          </DrawerHeader>

          {selectedWarehouse && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
              <Edit className="h-4 w-4 mr-2" />
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <form.Field name="code">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Warehouse Code</Label>
                    <Input
                      id={field.name}
                      placeholder="WH-JKT-01"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="name">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Warehouse Name</Label>
                    <Input
                      id={field.name}
                      placeholder="Main Warehouse Jakarta"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="addressLine1">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Address Line 1</Label>
                  <Input
                    id={field.name}
                    placeholder="Jl. Raya Industri No. 123"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="addressLine2">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Address Line 2</Label>
                  <Input
                    id={field.name}
                    placeholder="Kelurahan Sunter, Kecamatan Tanjung Priok"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="city">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>City</Label>
                    <Input
                      id={field.name}
                      placeholder="Jakarta"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="province">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Province</Label>
                    <Input
                      id={field.name}
                      placeholder="DKI Jakarta"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="postalCode">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Postal Code</Label>
                    <Input
                      id={field.name}
                      placeholder="12345"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name="country">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Country</Label>
                    <Input
                      id={field.name}
                      placeholder="Indonesia"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="contactName">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Contact Name</Label>
                    <Input
                      id={field.name}
                      placeholder="Budi Santoso"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="contactPhone">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Contact Phone</Label>
                    <Input
                      id={field.name}
                      placeholder="+62 21 1234 5678"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="contactEmail">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Contact Email</Label>
                  <Input
                    id={field.name}
                    type="email"
                    placeholder="budi@warehouse.com"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            <form.Field name="status">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Status</Label>
                  <select
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value as 'active' | 'inactive')}
                    onBlur={field.handleBlur}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </form.Field>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                className="w-full"
                disabled={form.state.isSubmitting || !form.state.canSubmit}
              >
                {form.state.isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {formMode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  formMode === 'add' ? 'Create Warehouse' : 'Update Warehouse'
                )}
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