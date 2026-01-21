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
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  customerStatusOptions,
  customerTypeOptions,
  getCustomerColumns,
} from '@/components/ui/data-table/columns';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Customer, customerApi } from '@/lib/api';
import { type CustomerFormData, customerFormSchema } from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-client';
import { cn } from '@/lib/utils';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { format } from 'date-fns';
import {
  Ban,
  CalendarIcon,
  CheckCircle,
  Edit,
  Loader2,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
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

export const Route = createFileRoute('/dashboard/business-partner/customers')({
  component: CustomersManagementPage,
});

function CustomersManagementPage() {
  const queryClient = useQueryClient();
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      customerType: 'retail' as const,
      birthDate: '',
      companyName: '',
      npwp: '',
      creditLimit: 0,
      paymentTermDays: 0,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: customerFormSchema,
    },
    onSubmit: async ({ value }) => {
      const submitData = {
        ...value,
        email: value.email || undefined,
        phone: value.phone || undefined,
        birthDate: value.birthDate || undefined,
        companyName: value.companyName || undefined,
        npwp: value.npwp || undefined,
        creditLimit: value.creditLimit ?? undefined,
        paymentTermDays: value.paymentTermDays ?? undefined,
      };
      if (formMode === 'add') {
        await createCustomerMutation.mutateAsync(submitData);
      } else if (formMode === 'edit' && selectedCustomer) {
        await updateCustomerMutation.mutateAsync({ id: selectedCustomer.id, data: submitData });
      }
    },
  });

  const {
    data: customersData,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: () => customerApi.getAll(),
  });

  const customers = customersData?.customers || [];

  const createCustomerMutation = useMutation({
    mutationFn: (data: CustomerFormData) => customerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer created successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to create customer', { description: error.message });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CustomerFormData> }) =>
      customerApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer updated successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error('Failed to update customer', { description: error.message });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer deleted successfully');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete customer', { description: error.message });
    },
  });

  const blockCustomerMutation = useMutation({
    mutationFn: (id: string) => customerApi.block(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer blocked successfully');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to block customer', { description: error.message });
    },
  });

  const activateCustomerMutation = useMutation({
    mutationFn: (id: string) => customerApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      toast.success('Customer activated successfully');
      setViewDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to activate customer', { description: error.message });
    },
  });

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDrawerOpen(true);
  };

  const handleAddCustomer = () => {
    setFormMode('add');
    form.reset();
    setFormDrawerOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setFormMode('edit');
    setSelectedCustomer(customer);
    form.setFieldValue('name', customer.name);
    form.setFieldValue('email', customer.email || '');
    form.setFieldValue('phone', customer.phone || '');
    form.setFieldValue('customerType', customer.customerType);
    form.setFieldValue('companyName', customer.companyName || '');
    form.setFieldValue('npwp', customer.npwp || '');
    form.setFieldValue('creditLimit', customer.creditLimit || 0);
    form.setFieldValue('paymentTermDays', customer.paymentTermDays || 0);
    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are stable
  const columns = useMemo(
    () =>
      getCustomerColumns({
        onView: handleViewCustomer,
        onEdit: handleEditCustomer,
        onDelete: handleDeleteCustomer,
      }),
    []
  );

  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const retailCustomers = customers.filter((c) => c.customerType === 'retail').length;
  const wholesaleCustomers = customers.filter((c) => c.customerType === 'wholesale').length;
  const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent ?? 0), 0);

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage customer records</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading customers</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })}
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
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage retail and wholesale customers</p>
        </div>
        <Button onClick={handleAddCustomer} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">{activeCustomers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retail Customers</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{retailCustomers}</div>
            <p className="text-xs text-muted-foreground">Individual buyers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wholesale Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wholesaleCustomers}</div>
            <p className="text-xs text-muted-foreground">Business buyers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0,
              }).format(totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime value</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>View and manage customer records</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={customers}
            searchKey="name"
            searchPlaceholder="Search by name, code..."
            isLoading={isLoading}
            onRowClick={handleViewCustomer}
            filterableColumns={[
              { id: 'status', title: 'Status', options: customerStatusOptions },
              { id: 'customerType', title: 'Type', options: customerTypeOptions },
            ]}
          />
        </CardContent>
      </Card>

      {/* View Drawer */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <DrawerTitle>{selectedCustomer?.name}</DrawerTitle>
            <DrawerDescription>Customer Details</DrawerDescription>
          </DrawerHeader>

          {selectedCustomer && (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <p className="font-mono font-medium">{selectedCustomer.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge
                      variant={
                        selectedCustomer.customerType === 'wholesale' ? 'default' : 'secondary'
                      }
                    >
                      {selectedCustomer.customerType}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                {selectedCustomer.companyName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{selectedCustomer.companyName}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedCustomer.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-mono font-medium">{selectedCustomer.phone || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedCustomer.status === 'active'
                        ? 'default'
                        : selectedCustomer.status === 'blocked'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {selectedCustomer.status}
                  </Badge>
                </div>
              </div>

              {selectedCustomer.customerType === 'retail' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    Loyalty Program
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Membership Tier</p>
                      <Badge variant="outline">{selectedCustomer.membershipTier ?? 'bronze'}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loyalty Points</p>
                      <p className="font-medium">
                        {(selectedCustomer.loyaltyPoints ?? 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCustomer.customerType === 'wholesale' && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                    Credit Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Limit</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0,
                        }).format(selectedCustomer.creditLimit ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Credit Used</p>
                      <p className="font-medium">
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          maximumFractionDigits: 0,
                        }).format(selectedCustomer.creditUsed ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Terms</p>
                    <p className="font-medium">
                      {selectedCustomer.paymentTermDays != null
                        ? `${selectedCustomer.paymentTermDays} days`
                        : '-'}
                    </p>
                  </div>
                  {selectedCustomer.npwp && (
                    <div>
                      <p className="text-sm text-muted-foreground">NPWP</p>
                      <p className="font-mono font-medium">{selectedCustomer.npwp}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                  Order Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="font-medium">{selectedCustomer.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="font-medium">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        maximumFractionDigits: 0,
                      }).format(selectedCustomer.totalSpent)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => selectedCustomer && handleEditCustomer(selectedCustomer)}
                className="w-full sm:w-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              {selectedCustomer?.status === 'active' ? (
                <Button
                  variant="destructive"
                  onClick={() =>
                    selectedCustomer && blockCustomerMutation.mutate(selectedCustomer.id)
                  }
                  disabled={blockCustomerMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Block
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() =>
                    selectedCustomer && activateCustomerMutation.mutate(selectedCustomer.id)
                  }
                  disabled={activateCustomerMutation.isPending}
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
            <DrawerTitle>{formMode === 'add' ? 'Add New Customer' : 'Edit Customer'}</DrawerTitle>
            <DrawerDescription>
              {formMode === 'add' ? 'Create a new customer record' : 'Update customer information'}
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
                    placeholder="John Doe"
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

            <form.Field name="customerType">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Customer Type *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as 'retail' | 'wholesale')}
                    disabled={formMode === 'edit'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>
                  {formMode === 'edit' && (
                    <p className="text-xs text-muted-foreground">
                      Customer type cannot be changed after creation
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
                      placeholder="john@example.com"
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
                      placeholder="+62812345678"
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

            {/* Birth date only for retail customers */}
            <form.Subscribe selector={(state) => state.values.customerType}>
              {(customerType) =>
                customerType === 'retail' && (
                  <form.Field name="birthDate">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor={field.name}>Birth Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id={field.name}
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.state.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.state.value
                                ? format(new Date(field.state.value), 'PPP')
                                : 'Pick a date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              selected={field.state.value ? new Date(field.state.value) : undefined}
                              onSelect={(date) =>
                                field.handleChange(date ? date.toISOString().split('T')[0] : '')
                              }
                              defaultMonth={
                                field.state.value ? new Date(field.state.value) : new Date(1990, 0)
                              }
                              startMonth={new Date(1920, 0)}
                              endMonth={new Date()}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1920-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </form.Field>
                )
              }
            </form.Subscribe>

            <form.Field name="companyName">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>Company Name</Label>
                  <Input
                    id={field.name}
                    placeholder="PT Example Corp"
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

            {/* Credit limit and payment terms only for wholesale customers */}
            <form.Subscribe selector={(state) => state.values.customerType}>
              {(customerType) =>
                customerType === 'wholesale' && (
                  <div className="grid grid-cols-2 gap-4">
                    <form.Field name="creditLimit">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Credit Limit</Label>
                          <Input
                            id={field.name}
                            type="number"
                            placeholder="0"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(Number(e.target.value))}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name="paymentTermDays">
                      {(field) => (
                        <div className="space-y-2">
                          <Label htmlFor={field.name}>Payment Terms (days)</Label>
                          <Input
                            id={field.name}
                            type="number"
                            placeholder="0"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(Number(e.target.value))}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                )
              }
            </form.Subscribe>

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
                    'Create Customer'
                  ) : (
                    'Update Customer'
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
            <AlertDialogTitle>Delete Customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This will deactivate the
              customer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCustomerMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCustomerMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCustomerMutation.isPending ? (
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
