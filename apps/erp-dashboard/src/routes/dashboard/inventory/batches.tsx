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
import {
  batchStatusOptions,
  getBatchColumns,
} from '@/components/ui/data-table/columns/batch-columns';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DatePicker } from '@/components/ui/date-picker';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type InventoryBatch, batchApi } from '@/lib/api';
import {
  type BatchCreationFormData,
  type BatchQuantityAdjustmentFormData,
  type BatchStatusUpdateFormData,
  batchCreationFormSchema,
  batchQuantityAdjustmentFormSchema,
  batchStatusUpdateFormSchema,
  createFormValidator,
} from '@/lib/form-schemas';
import { queryKeys } from '@/lib/query-client';
import { type BatchListSearch, batchListSearchSchema } from '@/lib/route-search-schemas';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Loader2, Package, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
 * Batch Management Route
 *
 * Features:
 * - Zod-validated search params for filtering
 * - Route loader for data prefetching
 * - FEFO (First Expired, First Out) sorting
 */
export const Route = createFileRoute('/dashboard/inventory/batches')({
  // Validate search params with Zod schema
  validateSearch: batchListSearchSchema,

  // Loader dependencies - changes to search params trigger refetch
  loaderDeps: ({ search }) => ({
    status: search.status,
    expirationFilter: search.expirationFilter,
    warehouseId: search.warehouseId,
    productId: search.productId,
  }),

  // Prefetch data during route navigation
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = {
      status: deps.status,
      warehouseId: deps.warehouseId,
      productId: deps.productId,
    };

    // Ensure data is prefetched before route renders
    await queryClient.ensureQueryData({
      queryKey: queryKeys.batches.list(filters),
      queryFn: () => batchApi.getAll(filters),
    });
  },

  component: BatchManagementPage,
});

/**
 * Render the Batch Management page with URL-synced search filters and FEFO-based batch listing.
 *
 * The page provides UI for viewing, filtering, and managing inventory batches (create, update status,
 * adjust quantity, delete). Filters are kept in the URL so list state is shareable and navigable.
 *
 * @returns A React element rendering the batch management user interface.
 */
function BatchManagementPage() {
  // Get search params from route - these are URL-synced
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  // Local UI state (not persisted in URL)
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [adjustDrawerOpen, setAdjustDrawerOpen] = useState(false);
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatch | null>(null);

  // TanStack Forms
  const batchForm = useForm({
    defaultValues: {
      batchNumber: '',
      lotNumber: '',
      expirationDate: null as Date | null,
      manufactureDate: null as Date | null,
      quantityAvailable: 0,
      supplier: '',
      notes: '',
    } satisfies BatchCreationFormData,
    validators: {
      onChange: createFormValidator(batchCreationFormSchema),
    },
    onSubmit: async ({ value }) => {
      await createBatchMutation.mutateAsync({
        ...value,
        expirationDate: value.expirationDate?.toISOString() || null,
        manufactureDate: value.manufactureDate?.toISOString() || null,
      });
    },
  });

  const statusForm = useForm({
    defaultValues: {
      status: 'active' as InventoryBatch['status'],
      reason: '',
    } satisfies BatchStatusUpdateFormData,
    validators: {
      onChange: createFormValidator(batchStatusUpdateFormSchema),
    },
    onSubmit: async ({ value }) => {
      if (!selectedBatch) return;
      await updateStatusMutation.mutateAsync({
        id: selectedBatch.id,
        status: value.status,
        reason: value.reason,
      });
    },
  });

  const adjustmentForm = useForm({
    defaultValues: {
      quantity: 0,
      reason: '',
    } satisfies BatchQuantityAdjustmentFormData,
    validators: {
      onChange: createFormValidator(batchQuantityAdjustmentFormSchema),
    },
    onSubmit: async ({ value }) => {
      if (!selectedBatch) return;

      // Validate that new quantity is non-negative
      const newQuantity = (selectedBatch?.quantityAvailable || 0) + value.quantity;
      if (newQuantity < 0) {
        toast.error('Invalid adjustment', {
          description: 'Adjustment would result in negative quantity',
        });
        return;
      }

      await adjustQuantityMutation.mutateAsync({
        id: selectedBatch.id,
        quantity: value.quantity,
        reason: value.reason,
      });
    },
  });

  // Build filters from search params
  const filters = useMemo(
    () => ({
      status: search.status,
      warehouseId: search.warehouseId,
      productId: search.productId,
    }),
    [search.status, search.warehouseId, search.productId]
  );

  // Fetch batches using query keys from centralized config
  const { data: batchesData, isLoading } = useQuery({
    queryKey: queryKeys.batches.list(filters),
    queryFn: () => batchApi.getAll(filters),
  });

  const batches = batchesData?.batches || [];

  // Helper to update search params in URL
  const updateSearch = (updates: Partial<BatchListSearch>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    });
  };

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: (data: Partial<InventoryBatch>) => batchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch created successfully');
      setFormDrawerOpen(false);
      batchForm.reset();
    },
    onError: (error: any) => {
      toast.error('Failed to create batch', {
        description: error.message,
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: string;
      status: string;
      reason: string;
    }) => batchApi.updateStatus(id, status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch status updated');
      setStatusDrawerOpen(false);
      statusForm.reset();
    },
    onError: (error: any) => {
      toast.error('Failed to update status', {
        description: error.message,
      });
    },
  });

  // Adjust quantity mutation
  const adjustQuantityMutation = useMutation({
    mutationFn: ({
      id,
      quantity,
      reason,
    }: {
      id: string;
      quantity: number;
      reason: string;
    }) => batchApi.adjustQuantity(id, quantity, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch quantity adjusted');
      setAdjustDrawerOpen(false);
      adjustmentForm.reset();
    },
    onError: (error: any) => {
      toast.error('Failed to adjust quantity', {
        description: error.message,
      });
    },
  });

  // Delete batch mutation
  const deleteBatchMutation = useMutation({
    mutationFn: (id: string) => batchApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch deleted successfully');
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error('Failed to delete batch', {
        description: error.message,
      });
    },
  });

  // Calculate days until expiration
  const calculateDaysUntilExpiration = (expirationDate: string | null): number => {
    if (!expirationDate) return Number.POSITIVE_INFINITY;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Configure columns with callbacks
  // biome-ignore lint/correctness/useExhaustiveDependencies: callbacks are stable within component lifecycle
  const columns = useMemo(
    () =>
      getBatchColumns({
        onEdit: (batch) => {
          setSelectedBatch(batch);
          statusForm.setFieldValue('status', batch.status);
          statusForm.setFieldValue('reason', '');
          setStatusDrawerOpen(true);
        },
        onAdjust: (batch) => {
          setSelectedBatch(batch);
          adjustmentForm.setFieldValue('quantity', 0);
          adjustmentForm.setFieldValue('reason', '');
          setAdjustDrawerOpen(true);
        },
        onDelete: (batch) => {
          setSelectedBatch(batch);
          setDeleteDialogOpen(true);
        },
      }),
    []
  );

  // Filter batches using URL search params
  // biome-ignore lint/correctness/useExhaustiveDependencies: calculateDaysUntilExpiration is a stable helper function
  const filteredBatches = useMemo(() => {
    let filtered = batches;

    // Search filter (from URL params)
    if (search.search) {
      const searchLower = search.search.toLowerCase();
      filtered = filtered.filter(
        (batch) =>
          batch.batchNumber.toLowerCase().includes(searchLower) ||
          batch.lotNumber?.toLowerCase().includes(searchLower) ||
          batch.supplier?.toLowerCase().includes(searchLower)
      );
    }

    // Expiration filter (from URL params)
    if (search.expirationFilter && search.expirationFilter !== 'all') {
      filtered = filtered.filter((batch) => {
        const days = calculateDaysUntilExpiration(batch.expirationDate);

        switch (search.expirationFilter) {
          case 'expired':
            return days < 0;
          case 'expiring-7':
            return days >= 0 && days <= 7;
          case 'expiring-30':
            return days >= 0 && days <= 30;
          default:
            return true;
        }
      });
    }

    // Sort by FEFO (First Expired, First Out)
    return filtered.sort((a, b) => {
      const daysA = calculateDaysUntilExpiration(a.expirationDate);
      const daysB = calculateDaysUntilExpiration(b.expirationDate);

      // Expired batches first, then by expiration date
      if (daysA < 0 && daysB >= 0) return -1;
      if (daysA >= 0 && daysB < 0) return 1;
      return daysA - daysB;
    });
  }, [batches, search.search, search.expirationFilter]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Batch Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage inventory batches with FEFO (First Expired, First Out) tracking
          </p>
        </div>
        <Button onClick={() => setFormDrawerOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Batch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Batches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredBatches.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                filteredBatches.filter((b) => calculateDaysUntilExpiration(b.expirationDate) < 0)
                  .length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {
                filteredBatches.filter((b) => {
                  const days = calculateDaysUntilExpiration(b.expirationDate);
                  return days >= 0 && days <= 7;
                }).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quarantined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredBatches.filter((b) => b.status === 'quarantined').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters - synced with URL search params */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Batch number, lot, supplier..."
                  value={search.search || ''}
                  onChange={(e) => updateSearch({ search: e.target.value || undefined })}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={search.status || 'all'}
                onValueChange={(value) =>
                  updateSearch({
                    status: value === 'all' ? undefined : (value as BatchListSearch['status']),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="quarantined">Quarantined</SelectItem>
                  <SelectItem value="recalled">Recalled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select
                value={search.expirationFilter}
                onValueChange={(value) =>
                  updateSearch({
                    expirationFilter: value as BatchListSearch['expirationFilter'],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="expiring-7">Expiring in 7 days</SelectItem>
                  <SelectItem value="expiring-30">Expiring in 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Batches (FEFO Order)</CardTitle>
          <CardDescription>
            Batches sorted by expiration date - earliest first (FEFO strategy)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredBatches}
            searchKey="batchNumber"
            searchPlaceholder="Search batches..."
            isLoading={isLoading}
            enableColumnVisibility
            filterableColumns={[
              {
                id: 'status',
                title: 'Status',
                options: batchStatusOptions,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* Create Batch Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create New Batch</DrawerTitle>
            <DrawerDescription>
              Add a new inventory batch with expiration tracking
            </DrawerDescription>
          </DrawerHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              batchForm.handleSubmit();
            }}
            className="p-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <batchForm.Field name="batchNumber">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Batch Number *</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="e.g., BATCH-2024-001"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </batchForm.Field>
              <batchForm.Field name="lotNumber">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Lot Number</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="e.g., LOT-12345"
                    />
                  </div>
                )}
              </batchForm.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <batchForm.Field name="expirationDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Expiration Date</Label>
                    <DatePicker
                      date={field.state.value}
                      onDateChange={(date) => field.handleChange(date)}
                    />
                  </div>
                )}
              </batchForm.Field>
              <batchForm.Field name="manufactureDate">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Manufacture Date</Label>
                    <DatePicker
                      date={field.state.value}
                      onDateChange={(date) => field.handleChange(date)}
                    />
                  </div>
                )}
              </batchForm.Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <batchForm.Field name="quantityAvailable">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(Number.parseInt(e.target.value) || 0)}
                      onBlur={field.handleBlur}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">
                        {field.state.meta.errors.map(getErrorMessage).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </batchForm.Field>
              <batchForm.Field name="supplier">
                {(field) => (
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Supplier name"
                    />
                  </div>
                )}
              </batchForm.Field>
            </div>

            <batchForm.Field name="notes">
              {(field) => (
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Additional notes..."
                  />
                </div>
              )}
            </batchForm.Field>
          </form>
          <DrawerFooter>
            <Button
              onClick={() => batchForm.handleSubmit()}
              disabled={createBatchMutation.isPending}
            >
              {createBatchMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Batch
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Update Status Drawer */}
      <Drawer open={statusDrawerOpen} onOpenChange={setStatusDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Update Batch Status</DrawerTitle>
            <DrawerDescription>
              Change the status of batch: {selectedBatch?.batchNumber}
            </DrawerDescription>
          </DrawerHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              statusForm.handleSubmit();
            }}
            className="p-4 space-y-4"
          >
            <statusForm.Field name="status">
              {(field) => (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value as InventoryBatch['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="quarantined">Quarantined</SelectItem>
                      <SelectItem value="recalled">Recalled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </statusForm.Field>

            <statusForm.Field name="reason">
              {(field) => (
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g., Quality control failed, Reached expiration date..."
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </statusForm.Field>
          </form>
          <DrawerFooter>
            <Button
              onClick={() => statusForm.handleSubmit()}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Adjust Quantity Drawer */}
      <Drawer open={adjustDrawerOpen} onOpenChange={setAdjustDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Adjust Batch Quantity</DrawerTitle>
            <DrawerDescription>
              Adjust quantity for batch: {selectedBatch?.batchNumber}
              <div className="mt-2 text-sm">
                Current: {selectedBatch?.quantityAvailable} available
              </div>
            </DrawerDescription>
          </DrawerHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              adjustmentForm.handleSubmit();
            }}
            className="p-4 space-y-4"
          >
            <adjustmentForm.Field name="quantity">
              {(field) => (
                <div className="space-y-2">
                  <Label>Quantity Change</Label>
                  <Input
                    type="number"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number.parseInt(e.target.value) || 0)}
                    onBlur={field.handleBlur}
                    placeholder="Positive to add, negative to remove"
                  />
                  {(() => {
                    const newQuantity = (selectedBatch?.quantityAvailable || 0) + field.state.value;
                    const isNegative = newQuantity < 0;
                    return (
                      <div>
                        <p
                          className={`text-sm ${isNegative ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}
                        >
                          New quantity: {newQuantity}
                        </p>
                        {isNegative && (
                          <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Cannot adjust to negative quantity
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </adjustmentForm.Field>

            <adjustmentForm.Field name="reason">
              {(field) => (
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="e.g., Damage, spoilage, stock adjustment..."
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">
                      {field.state.meta.errors.map(getErrorMessage).join(', ')}
                    </p>
                  )}
                </div>
              )}
            </adjustmentForm.Field>
          </form>
          <DrawerFooter>
            <Button
              onClick={() => adjustmentForm.handleSubmit()}
              disabled={
                adjustQuantityMutation.isPending ||
                (selectedBatch?.quantityAvailable || 0) +
                  (adjustmentForm.state.values.quantity || 0) <
                  0
              }
            >
              {adjustQuantityMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Adjust Quantity
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete batch {selectedBatch?.batchNumber}? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBatchMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteBatchMutation.isPending && selectedBatch) {
                  deleteBatchMutation.mutate(selectedBatch.id);
                }
              }}
              disabled={deleteBatchMutation.isPending || !selectedBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBatchMutation.isPending ? (
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
