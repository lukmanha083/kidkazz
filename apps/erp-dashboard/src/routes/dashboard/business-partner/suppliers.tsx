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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { getSupplierColumns, supplierStatusOptions } from '@/components/ui/data-table/columns';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Supplier, supplierApi } from '@/lib/api';
import {
  type SupplierBankInfoFormData,
  type SupplierFormData,
  supplierBankInfoFormSchema,
  supplierFormSchema,
} from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-client';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-form-adapter';
import {
  Ban,
  Building2,
  CheckCircle,
  CreditCard,
  Edit,
  Loader2,
  Plus,
  Star,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message;
  }
  return String(error);
}

export const Route = createFileRoute('/dashboard/business-partner/suppliers')({
  component: SuppliersManagementPage,
});

function SuppliersManagementPage() {
  const queryClient = useQueryClient();
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [bankDrawerOpen, setBankDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      companyName: '',
      npwp: '',
      paymentTermDays: 0,
      leadTimeDays: 0,
      minimumOrderAmount: 0,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: supplierFormSchema,
    },
    onSubmit: async ({ value }) => {
      const submitData = {
        ...value,
        email: value.email || undefined,
        phone: value.phone || undefined,
        companyName: value.companyName || undefined,
        npwp: value.npwp || undefined,
        paymentTermDays: value.paymentTermDays ?? undefined,
        leadTimeDays: value.leadTimeDays ?? undefined,
        minimumOrderAmount: value.minimumOrderAmount ?? undefined,
      };
      if (formMode === 'add') {
        await createSupplierMutation.mutateAsync(submitData);
      } else if (formMode === 'edit' && selectedSupplier) {
        await updateSupplierMutation.mutateAsync({ id: selectedSupplier.id, data: submitData });
      }
    },
  });

  const bankForm = useForm({
    defaultValues: {
      bankName: '',
      bankAccountNumber: '',
      bankAccountName: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: supplierBankInfoFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (selectedSupplier) {
        await updateBankInfoMutation.mutateAsync({ id: selectedSupplier.id, data: value });
      }
    },
  });

  const {
    data: suppliersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: () => supplierApi.getAll(),
  });

  const suppliers = suppliersData?.suppliers || [];

  const createSupplierMutation = useMutation({
    mutationFn: (data: SupplierFormData) => supplierApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Supplier created successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to create supplier', { description: error.message });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SupplierFormData> }) =>
      supplierApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Supplier updated successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to update supplier', { description: error.message });
    },
  });

  const updateBankInfoMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { bankName: string; bankAccountNumber: string; bankAccountName: string };
    }) => supplierApi.updateBankInfo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Bank info updated successfully');
      setBankDrawerOpen(false);
      bankForm.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to update bank info', { description: error.message });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => supplierApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Supplier deleted successfully');
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete supplier', { description: error.message });
    },
  });

  const blockSupplierMutation = useMutation({
    mutationFn: (id: string) => supplierApi.block(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Supplier blocked successfully');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to block supplier', { description: error.message });
    },
  });

  const activateSupplierMutation = useMutation({
    mutationFn: (id: string) => supplierApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all });
      toast.success('Supplier activated successfully');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to activate supplier', { description: error.message });
    },
  });

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setViewDrawerOpen(true);
  };

  const handleAddSupplier = () => {
    setFormMode('add');
    form.reset();
    setFormDrawerOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setFormMode('edit');
    setSelectedSupplier(supplier);
    form.setFieldValue('name', supplier.name);
    form.setFieldValue('email', supplier.email || '');
    form.setFieldValue('phone', supplier.phone || '');
    form.setFieldValue('companyName', supplier.companyName || '');
    form.setFieldValue('npwp', supplier.npwp || '');
    form.setFieldValue('paymentTermDays', supplier.paymentTermDays || 0);
    form.setFieldValue('leadTimeDays', supplier.leadTimeDays || 0);
    form.setFieldValue('minimumOrderAmount', supplier.minimumOrderAmount || 0);
    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleEditBankInfo = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    bankForm.setFieldValue('bankName', supplier.bankName || '');
    bankForm.setFieldValue('bankAccountNumber', supplier.bankAccountNumber || '');
    bankForm.setFieldValue('bankAccountName', supplier.bankAccountName || '');
    setViewDrawerOpen(false);
    setBankDrawerOpen(true);
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete.id);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are stable
  const columns = useMemo(
    () =>
      getSupplierColumns({
        onView: handleViewSupplier,
        onEdit: handleEditSupplier,
        onDelete: handleDeleteSupplier,
      }),
    []
  );

  const activeSuppliers = suppliers.filter((s) => s.status === 'active').length;
  const totalPurchased = suppliers.reduce((sum, s) => sum + (s.totalPurchased ?? 0), 0);
  const ratedSuppliers = suppliers.filter((s) => s.rating != null);
  const avgRating =
    ratedSuppliers.length > 0
      ? ratedSuppliers.reduce((sum, s) => sum + (s.rating ?? 0), 0) / ratedSuppliers.length
      : 0;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
            <p className="text-muted-foreground mt-1">Manage supplier records</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading suppliers</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">Manage product and material suppliers</p>
        </div>
        <Button onClick={handleAddSupplier} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">{activeSuppliers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(totalPurchased)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground">Across all suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.reduce((sum, s) => sum + s.totalOrders, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Purchase orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <CardDescription>View and manage supplier records</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={suppliers}
            searchKey="name"
            searchPlaceholder="Search by name, code..."
            isLoading={isLoading}
            onRowClick={handleViewSupplier}
            filterableColumns={[{ id: 'status', title: 'Status', options: supplierStatusOptions }]}
          />
        </CardContent>
      </Card>

      {/* View Drawer */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedSupplier?.name}</DrawerTitle>
            <DrawerDescription>Supplier Details</DrawerDescription>
          </DrawerHeader>

          {selectedSupplier && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <p className="font-mono font-medium">{selectedSupplier.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={
                        selectedSupplier.status === 'active'
                          ? 'default'
                          : selectedSupplier.status === 'blocked'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {selectedSupplier.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedSupplier.name}</p>
                </div>
                {selectedSupplier.companyName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{selectedSupplier.companyName}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedSupplier.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-mono font-medium">{selectedSupplier.phone || '-'}</p>
                  </div>
                </div>
                {selectedSupplier.npwp && (
                  <div>
                    <p className="text-sm text-muted-foreground">NPWP</p>
                    <p className="font-mono font-medium">{selectedSupplier.npwp}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Terms & Conditions
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">
                      {selectedSupplier.paymentTermDays != null
                        ? `${selectedSupplier.paymentTermDays} days`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Time</p>
                    <p className="font-medium">
                      {selectedSupplier.leadTimeDays != null
                        ? `${selectedSupplier.leadTimeDays} days`
                        : '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Order Amount</p>
                  <p className="font-medium">
                    {selectedSupplier.minimumOrderAmount != null
                      ? new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0,
                        }).format(selectedSupplier.minimumOrderAmount)
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    Bank Information
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBankInfo(selectedSupplier)}
                  >
                    <CreditCard className="h-3 w-3 mr-1" />
                    Edit Bank
                  </Button>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bank Name</p>
                  <p className="font-medium">{selectedSupplier.bankName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Number</p>
                  <p className="font-mono font-medium">
                    {selectedSupplier.bankAccountNumber || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Account Name</p>
                  <p className="font-medium">{selectedSupplier.bankAccountName || '-'}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1">
                      {selectedSupplier.rating != null ? (
                        <>
                          <span className="font-medium">{selectedSupplier.rating.toFixed(1)}</span>
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </>
                      ) : (
                        <span className="font-medium text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="font-medium">{selectedSupplier.totalOrders ?? 0}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchased</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      maximumFractionDigits: 0,
                    }).format(selectedSupplier.totalPurchased ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => selectedSupplier && handleEditSupplier(selectedSupplier)}
                className="w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {selectedSupplier?.status === 'active' ? (
                <Button
                  variant="destructive"
                  onClick={() =>
                    selectedSupplier && blockSupplierMutation.mutate(selectedSupplier.id)
                  }
                  disabled={blockSupplierMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    selectedSupplier && activateSupplierMutation.mutate(selectedSupplier.id)
                  }
                  disabled={activateSupplierMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>{formMode === 'add' ? 'Add New Supplier' : 'Edit Supplier'}</DrawerTitle>
            <DrawerDescription>
              {formMode === 'add' ? 'Create a new supplier record' : 'Update supplier information'}
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
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Name *</Label>
                  <Input
                    id={field.name}
                    placeholder="PT Supplier Utama"
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

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Email <span className="text-muted-foreground text-xs">(or phone)</span>
                    </Label>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder="contact@supplier.com"
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

              <form.Field name="phone">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>
                      Phone <span className="text-muted-foreground text-xs">(or email)</span>
                    </Label>
                    <Input
                      id={field.name}
                      placeholder="+6281234567890"
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

            <form.Field name="companyName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Company Name</Label>
                  <Input
                    id={field.name}
                    placeholder="PT Supplier Utama Indonesia"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="npwp">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>NPWP</Label>
                  <Input
                    id={field.name}
                    placeholder="01.234.567.8-901.000"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <div className="grid grid-cols-2 gap-4">
              <form.Field name="paymentTermDays">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Payment Terms (days)</Label>
                    <Input
                      id={field.name}
                      type="number"
                      placeholder="30"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>

              <form.Field name="leadTimeDays">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Lead Time (days)</Label>
                    <Input
                      id={field.name}
                      type="number"
                      placeholder="7"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                    />
                  </div>
                )}
              </form.Field>
            </div>

            <form.Field name="minimumOrderAmount">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Minimum Order Amount</Label>
                  <Input
                    id={field.name}
                    type="number"
                    placeholder="1000000"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    onBlur={field.handleBlur}
                  />
                </div>
              )}
            </form.Field>

            <DrawerFooter className="px-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={form.state.isSubmitting || !form.state.canSubmit}
                >
                  {form.state.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formMode === 'add' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : formMode === 'add' ? (
                    'Create Supplier'
                  ) : (
                    'Update Supplier'
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Bank Info Drawer */}
      <Drawer open={bankDrawerOpen} onOpenChange={setBankDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <DrawerTitle>Edit Bank Information</DrawerTitle>
            <DrawerDescription>Update supplier bank account details</DrawerDescription>
          </DrawerHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              bankForm.handleSubmit();
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <bankForm.Field name="bankName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Bank Name *</Label>
                  <Input
                    id={field.name}
                    placeholder="Bank Central Asia"
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
            </bankForm.Field>

            <bankForm.Field name="bankAccountNumber">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Account Number *</Label>
                  <Input
                    id={field.name}
                    placeholder="1234567890"
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
            </bankForm.Field>

            <bankForm.Field name="bankAccountName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Account Name *</Label>
                  <Input
                    id={field.name}
                    placeholder="PT Supplier Utama"
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
            </bankForm.Field>

            <DrawerFooter className="px-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={bankForm.state.isSubmitting || !bankForm.state.canSubmit}
                >
                  {bankForm.state.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Bank Info'
                  )}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    Cancel
                  </Button>
                </DrawerClose>
              </div>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{supplierToDelete?.name}"? This will deactivate the
              supplier record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSupplierMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteSupplierMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteSupplierMutation.isPending ? (
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
