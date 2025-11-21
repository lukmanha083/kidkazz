import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Package,
  Loader2,
} from 'lucide-react';
import { uomApi, type UOM, type CreateUOMInput } from '@/lib/api';

export const Route = createFileRoute('/dashboard/products/uom')({
  component: UOMPage,
});

function UOMPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Filter UOMs based on search
  const filteredUOMs = useMemo(() => {
    return uoms.filter((uom) =>
      uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uom.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uoms, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUOMs.length / itemsPerPage);
  const paginatedUOMs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUOMs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUOMs, currentPage, itemsPerPage]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
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

    if (formMode === 'add') {
      const uomData: CreateUOMInput = {
        code: formData.code.toUpperCase(),
        name: formData.name,
        conversionFactor: conversionFactor,
        isBaseUnit: formData.isBaseUnit,
      };
      createUOMMutation.mutate(uomData);
    }
  };

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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Units of Measure</CardTitle>
                  <CardDescription>
                    {filteredUOMs.length} of {uoms.length} units
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search UOMs..."
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
                      <TableHead className="w-[120px]">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-[150px] text-right">Conversion Factor</TableHead>
                      <TableHead className="w-[120px]">Type</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUOMs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No UOMs found. Add your first UOM to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUOMs.map((uom) => (
                        <TableRow
                          key={uom.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewUOM(uom)}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {uom.code}
                          </TableCell>
                          <TableCell className="font-medium">{uom.name}</TableCell>
                          <TableCell className="text-right font-medium">
                              {uom.isBaseUnit ? (
                                <span className="text-muted-foreground">1 (Base)</span>
                              ) : (
                                <span>{uom.conversionFactor}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={uom.isBaseUnit ? 'default' : 'secondary'}
                                className={
                                  uom.isBaseUnit
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500'
                                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500'
                                }
                              >
                                {uom.isBaseUnit ? 'Base' : 'Custom'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleViewUOM(uom)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleDelete(uom)}
                                  disabled={uom.isBaseUnit}
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
              totalItems={filteredUOMs.length}
            />
          </div>
            </CardContent>
          </Card>
        </>
      )}

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
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm font-medium mb-2">Conversion Formula</p>
                    <p className="text-sm">
                      1 {selectedUOM.code} = {selectedUOM.conversionFactor} PCS
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Example: 5 {selectedUOM.code} = {5 * selectedUOM.conversionFactor} PCS
                    </p>
                  </div>
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
                placeholder="Carton (18 PCS)"
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
                How many base units (PCS) equals 1 of this unit
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
                    conversionFactor: isBase ? '1' : formData.conversionFactor
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

            {formData.conversionFactor && parseFloat(formData.conversionFactor) > 0 && !formData.isBaseUnit && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium mb-2">Conversion Preview</p>
                <p className="text-sm">
                  1 {formData.code || 'UNIT'} = {formData.conversionFactor} PCS
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: 5 {formData.code || 'UNIT'} = {parseFloat(formData.conversionFactor) * 5} PCS
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
