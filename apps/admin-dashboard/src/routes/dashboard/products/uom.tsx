import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { uomApi, type UOM, type CreateUOMInput } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { getUOMColumns, uomTypeOptions } from '@/components/ui/data-table/columns';

export const Route = createFileRoute('/dashboard/products/uom')({
  component: UOMPage,
});

function UOMPage() {
  const queryClient = useQueryClient();

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedUOM, setSelectedUOM] = useState<UOM | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    conversionFactor: '',
    isBaseUnit: false,
    baseUnitCode: '',
  });

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uomToDelete, setUomToDelete] = useState<UOM | null>(null);

  // Fetch UOMs
  const { data: uomsData, isLoading, error } = useQuery({
    queryKey: ['uoms'],
    queryFn: () => uomApi.getAll(),
  });

  const uoms = uomsData?.uoms || [];

  // Create UOM mutation
  const createUOMMutation = useMutation({
    mutationFn: (data: CreateUOMInput) => uomApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uoms'] });
      toast.success('UOM created successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create UOM', {
        description: error.message,
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
    onError: (error: Error) => {
      toast.error('Failed to delete UOM', {
        description: error.message,
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
    setFormData({
      code: '',
      name: '',
      conversionFactor: '',
      isBaseUnit: false,
      baseUnitCode: '',
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const conversionFactor = parseFloat(formData.conversionFactor);
    if (conversionFactor <= 0) {
      toast.error('Invalid conversion factor', {
        description: 'Conversion factor must be greater than 0'
      });
      return;
    }

    // Validate base unit selection for custom UOMs
    if (!formData.isBaseUnit && !formData.baseUnitCode) {
      toast.error('Base unit required', {
        description: 'Please select which base unit this custom UOM is bound to'
      });
      return;
    }

    if (formMode === 'add') {
      const uomData: CreateUOMInput = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        conversionFactor: conversionFactor,
        isBaseUnit: formData.isBaseUnit,
        baseUnitCode: formData.isBaseUnit ? undefined : formData.baseUnitCode,
      };
      createUOMMutation.mutate(uomData);
    }
  };

  // Memoize columns with callbacks
  const columns = useMemo(
    () =>
      getUOMColumns({
        onView: handleViewUOM,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unit of Measure (UOM)</h1>
          <p className="text-muted-foreground mt-1">
            Manage custom units of measurement and conversion factors
          </p>
        </div>
        <Button onClick={handleAddUOM} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Custom UOM
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
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
            searchPlaceholder="Search UOMs..."
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

          <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">UOM Code *</Label>
              <Input
                id="code"
                placeholder="CARTON18"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique code for this unit (e.g., CARTON18, BOX24)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Unit Name *</Label>
              <Input
                id="name"
                placeholder="Carton (18 units)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Descriptive name for this unit
              </p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="conversionFactor">Conversion Factor *</Label>
              <Input
                id="conversionFactor"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="18"
                value={formData.conversionFactor}
                onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                required
                disabled={formData.isBaseUnit}
              />
              <p className="text-xs text-muted-foreground">
                How many base units equals 1 of this unit (base unit depends on product: PCS, KG, L, etc.)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isBaseUnit"
                checked={formData.isBaseUnit}
                onChange={(e) => {
                  const isBase = e.target.checked;
                  setFormData({
                    ...formData,
                    isBaseUnit: isBase,
                    conversionFactor: isBase ? '1' : formData.conversionFactor,
                    baseUnitCode: isBase ? '' : formData.baseUnitCode
                  });
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

            {!formData.isBaseUnit && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="baseUnitCode">Bound to Base Unit *</Label>
                  <select
                    id="baseUnitCode"
                    value={formData.baseUnitCode}
                    onChange={(e) => setFormData({ ...formData, baseUnitCode: e.target.value })}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    required
                  >
                    <option value="">Select base unit...</option>
                    {uoms.filter(uom => uom.isBaseUnit).map(baseUom => (
                      <option key={baseUom.id} value={baseUom.code}>
                        {baseUom.code} - {baseUom.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Select which base unit this custom UOM is bound to (e.g., PCS, KG, L, etc.)
                  </p>
                </div>
              </>
            )}

            {formData.conversionFactor && parseFloat(formData.conversionFactor) > 0 && !formData.isBaseUnit && formData.baseUnitCode && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium mb-2">Conversion Preview</p>
                <p className="text-sm">
                  1 {formData.code || 'UNIT'} = {formData.conversionFactor} {formData.baseUnitCode}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: 5 {formData.code || 'UNIT'} = {parseFloat(formData.conversionFactor) * 5} {formData.baseUnitCode}
                </p>
                <p className="text-xs text-muted-foreground mt-1 italic">
                  This custom UOM is bound to {formData.baseUnitCode} base unit
                </p>
              </div>
            )}

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                className="w-full"
                disabled={createUOMMutation.isPending}
              >
                {createUOMMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create UOM'
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
