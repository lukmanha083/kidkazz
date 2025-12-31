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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import {
  Plus,
  X,
  Package,
  Loader2,
} from 'lucide-react';
import { uomApi, type UOM } from '@/lib/api';
import { uomFormSchema, type UOMFormData } from '@/lib/form-schemas';
import { DataTable } from '@/components/ui/data-table';
import { getUOMColumns, uomTypeOptions } from '@/components/ui/data-table/columns';

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

export const Route = createFileRoute('/dashboard/products/uom')({
  component: UOMPage,
});

/**
 * Page component for managing units of measure (UOM), providing list, view, create, and delete workflows.
 *
 * Fetches UOMs, displays summary statistics and a searchable/filterable table, and exposes UI for viewing
 * details in a drawer, adding new units via a form drawer (including base-unit binding and conversion preview),
 * and confirming deletions with a dialog. Mutations update the cached list and show user feedback on success or error.
 *
 * @returns A React element rendering the UOM management user interface.
 */
function UOMPage() {
  const queryClient = useQueryClient();

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedUOM, setSelectedUOM] = useState<UOM | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uomToDelete, setUomToDelete] = useState<UOM | null>(null);

  // TanStack Form
  const form = useForm({
    defaultValues: {
      code: '',
      name: '',
      isBaseUnit: false,
      baseUnitCode: null as string | null,
      conversionFactor: 1,
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: uomFormSchema,
    },
    onSubmit: async ({ value }) => {
      // Conditional validation: baseUnitCode is required only for non-base units
      if (!value.isBaseUnit && (!value.baseUnitCode || value.baseUnitCode.trim().length === 0)) {
        toast.error('Validation Error', {
          description: 'Please select a base unit for this custom UOM',
        });
        return;
      }

      if (formMode === 'add') {
        await createUOMMutation.mutateAsync(value);
      } else if (formMode === 'edit' && selectedUOM) {
        await updateUOMMutation.mutateAsync({ id: selectedUOM.id, data: value });
      }
    },
  });

  // Fetch UOMs
  const { data: uomsData, isLoading, error } = useQuery({
    queryKey: ['uoms'],
    queryFn: () => uomApi.getAll(),
  });

  const uoms = uomsData?.uoms || [];

  // Create UOM mutation
  const createUOMMutation = useMutation({
    mutationFn: (data: UOMFormData) => {
      // Transform data for API: convert null to undefined, remove baseUnitCode for base units
      const apiData = {
        code: data.code,
        name: data.name,
        conversionFactor: data.conversionFactor,
        isBaseUnit: data.isBaseUnit,
        // Only include baseUnitCode if it's not a base unit and has a value
        ...(data.isBaseUnit ? {} : { baseUnitCode: data.baseUnitCode || undefined }),
      };
      return uomApi.create(apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
      toast.success('UOM created successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Failed to create UOM', {
        description: message,
      });
    },
  });

  // Update UOM mutation
  const updateUOMMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UOMFormData }) => {
      // Transform data for API: convert null to undefined, remove baseUnitCode for base units
      const apiData = {
        code: data.code,
        name: data.name,
        conversionFactor: data.conversionFactor,
        isBaseUnit: data.isBaseUnit,
        // Only include baseUnitCode if it's not a base unit and has a value
        ...(data.isBaseUnit ? {} : { baseUnitCode: data.baseUnitCode || undefined }),
      };
      return uomApi.update(id, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
      toast.success('UOM updated successfully');
      setFormDrawerOpen(false);
      form.reset();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Failed to update UOM', {
        description: message,
      });
    },
  });

  // Delete UOM mutation
  const deleteUOMMutation = useMutation({
    mutationFn: (id: string) => uomApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
      toast.success('UOM deleted successfully');
      setDeleteDialogOpen(false);
      setUomToDelete(null);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Failed to delete UOM', {
        description: message,
      });
    },
  });

  const handleDelete = (uom: UOM) => {
    if (uom.isBaseUnit) {
      toast.error('Cannot delete base unit', {
        description: 'Base units cannot be deleted from the system'
      });
      return;
    }
    setUomToDelete(uom);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (uomToDelete) {
      deleteUOMMutation.mutate(uomToDelete.id);
    }
  };

  const handleViewUOM = (uom: UOM) => {
    setSelectedUOM(uom);
    setViewDrawerOpen(true);
  };

  const handleAddUOM = () => {
    setFormMode('add');
    form.reset();
    setFormDrawerOpen(true);
  };

  const handleEditUOM = (uom: UOM) => {
    setFormMode('edit');
    setSelectedUOM(uom);
    form.setFieldValue('code', uom.code);
    form.setFieldValue('name', uom.name);
    form.setFieldValue('conversionFactor', uom.conversionFactor);
    form.setFieldValue('isBaseUnit', uom.isBaseUnit);
    form.setFieldValue('baseUnitCode', uom.baseUnitCode || null);
    setViewDrawerOpen(false);
    setFormDrawerOpen(true);
  };

  // Memoize columns with callbacks
  const columns = useMemo(
    () =>
      getUOMColumns({
        onView: handleViewUOM,
        onEdit: handleEditUOM,
        onDelete: handleDelete,
      }),
    []
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Unit of Measure (UOM)</h1>
            <p className="text-muted-foreground mt-1">
              Manage custom units of measurement and conversion factors
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading UOMs</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['uoms'] })}
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
          <h1 className="text-3xl font-bold tracking-tight">Unit of Measure (UOM)</h1>
          <p className="text-muted-foreground mt-1">
            Manage custom units of measurement and conversion factors
          </p>
        </div>
        <Button onClick={handleAddUOM} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Add Custom UOM
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total UOMs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uoms.length}</div>
            <p className="text-xs text-muted-foreground">All units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Units</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {uoms.filter(u => u.isBaseUnit).length}
            </div>
            <p className="text-xs text-muted-foreground">Standard units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Units</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {uoms.filter(u => !u.isBaseUnit).length}
            </div>
            <p className="text-xs text-muted-foreground">User-defined</p>
          </CardContent>
        </Card>
      </div>

      {/* UOM Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Units of Measure</CardTitle>
          <CardDescription>
            {uoms.length} units total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={uoms}
            searchKey="name"
            searchPlaceholder="Search by name, abbreviation..."
            isLoading={isLoading}
            onRowClick={handleViewUOM}
            filterableColumns={[
              {
                id: 'type',
                title: 'Type',
                options: uomTypeOptions,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* View UOM Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedUOM?.name}</DrawerTitle>
                <DrawerDescription>Unit of Measure Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedUOM && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Code</Label>
                  <p className="text-sm font-mono font-medium mt-1">{selectedUOM.code}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Unit Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedUOM.name}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Unit Type</Label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedUOM.isBaseUnit ? 'default' : 'secondary'}
                      className={
                        selectedUOM.isBaseUnit
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500'
                      }
                    >
                      {selectedUOM.isBaseUnit ? 'Base Unit' : 'Custom Unit'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Conversion Factor</Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedUOM.isBaseUnit ? '1 (Base)' : selectedUOM.conversionFactor}
                  </p>
                </div>

                {!selectedUOM.isBaseUnit && (
                  <>
                    {selectedUOM.baseUnitCode && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Bound to Base Unit</Label>
                        <p className="text-sm font-medium mt-1">{selectedUOM.baseUnitCode}</p>
                      </div>
                    )}

                    <div className="rounded-md bg-muted p-3">
                      <p className="text-sm font-medium mb-2">Conversion Formula</p>
                      <p className="text-sm">
                        1 {selectedUOM.code} = {selectedUOM.conversionFactor} {selectedUOM.baseUnitCode || 'base units'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Example: 5 {selectedUOM.code} = {5 * selectedUOM.conversionFactor} {selectedUOM.baseUnitCode || 'base units'}
                      </p>
                      {selectedUOM.baseUnitCode && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          This custom UOM is bound to {selectedUOM.baseUnitCode} base unit
                        </p>
                      )}
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Created Date</Label>
                  <p className="text-sm mt-1">
                    {new Date(selectedUOM.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit UOM Form Drawer (Left Side) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add Custom Unit of Measure' : 'Edit Unit of Measure'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Create a custom unit with conversion factor'
                    : 'Update unit of measure information'}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <form.Field name="code">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="code">UOM Code *</Label>
                  <Input
                    id="code"
                    placeholder="CARTON18"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
                    onBlur={field.handleBlur}
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{getErrorMessage(field.state.meta.errors[0])}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Unique code for this unit (e.g., CARTON18, BOX24)
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="name">Unit Name *</Label>
                  <Input
                    id="name"
                    placeholder="Carton (18 units)"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    required
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{getErrorMessage(field.state.meta.errors[0])}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Descriptive name for this unit
                  </p>
                </div>
              )}
            </form.Field>

            <Separator />

            <form.Field name="conversionFactor">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor="conversionFactor">Conversion Factor *</Label>
                  <Input
                    id="conversionFactor"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="18"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(parseInt(e.target.value, 10) || 0)}
                    onBlur={field.handleBlur}
                    required
                    disabled={form.getFieldValue('isBaseUnit')}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-xs text-destructive">{getErrorMessage(field.state.meta.errors[0])}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Whole number only. How many base units equals 1 of this unit.
                  </p>
                </div>
              )}
            </form.Field>

            <form.Field name="isBaseUnit">
              {(field) => (
                <>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isBaseUnit"
                      checked={field.state.value}
                      onChange={(e) => {
                        const isBase = e.target.checked;
                        field.handleChange(isBase);
                        if (isBase) {
                          form.setFieldValue('conversionFactor', 1);
                          form.setFieldValue('baseUnitCode', null);
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="isBaseUnit" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      This is a base unit
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    Check this if creating a new base unit (conversion factor will be set to 1)
                  </p>
                </>
              )}
            </form.Field>

            {!form.getFieldValue('isBaseUnit') && (
              <>
                <Separator />
                <form.Field name="baseUnitCode">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor="baseUnitCode">Bound to Base Unit *</Label>
                      <select
                        id="baseUnitCode"
                        value={field.state.value || ''}
                        onChange={(e) => field.handleChange(e.target.value || null)}
                        onBlur={field.handleBlur}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">Select base unit...</option>
                        {uoms.filter(uom => uom.isBaseUnit).map(baseUom => (
                          <option key={baseUom.id} value={baseUom.code}>
                            {baseUom.code} - {baseUom.name}
                          </option>
                        ))}
                      </select>
                      {field.state.meta.errors.length > 0 && (
                        <p className="text-xs text-destructive">{getErrorMessage(field.state.meta.errors[0])}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Select which base unit this custom UOM is bound to (e.g., PCS, KG, L, etc.)
                      </p>
                    </div>
                  )}
                </form.Field>
              </>
            )}

            {form.getFieldValue('conversionFactor') > 0 && !form.getFieldValue('isBaseUnit') && form.getFieldValue('baseUnitCode') && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium mb-2">Conversion Preview</p>
                <p className="text-sm">
                  1 {form.getFieldValue('code') || 'UNIT'} = {form.getFieldValue('conversionFactor')} {form.getFieldValue('baseUnitCode')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: 5 {form.getFieldValue('code') || 'UNIT'} = {form.getFieldValue('conversionFactor') * 5} {form.getFieldValue('baseUnitCode')}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  This custom UOM is bound to {form.getFieldValue('baseUnitCode')} base unit
                </p>
              </div>
            )}

            <DrawerFooter className="px-0">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={createUOMMutation.isPending || updateUOMMutation.isPending || form.state.isSubmitting}
                >
                  {createUOMMutation.isPending || updateUOMMutation.isPending || form.state.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {formMode === 'add' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    formMode === 'add' ? 'Create UOM' : 'Update UOM'
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {uomToDelete && (
                <>
                  You are about to delete <strong>"{uomToDelete.name}"</strong>.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteUOMMutation.isPending}
              onClick={() => {
                setDeleteDialogOpen(false);
                setUomToDelete(null);
              }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteUOMMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUOMMutation.isPending ? (
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