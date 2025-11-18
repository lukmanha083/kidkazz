import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
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
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  Package,
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/uom')({
  component: UOMPage,
});

interface UnitOfMeasure {
  id: string;
  code: string;
  name: string;
  conversionFactor: number;
  baseUnit: string;
  isBaseUnit: boolean;
  status: 'Active' | 'Inactive';
  createdDate: string;
  description?: string;
}

// Mock UOM data - includes standard and custom units
const mockUOMs: UnitOfMeasure[] = [
  {
    id: 'uom-001',
    code: 'PCS',
    name: 'Pieces',
    conversionFactor: 1,
    baseUnit: 'PCS',
    isBaseUnit: true,
    status: 'Active',
    createdDate: '2024-01-01',
    description: 'Individual pieces - base unit',
  },
  {
    id: 'uom-002',
    code: 'DOZEN',
    name: 'Dozen',
    conversionFactor: 12,
    baseUnit: 'PCS',
    isBaseUnit: false,
    status: 'Active',
    createdDate: '2024-01-01',
    description: '12 pieces',
  },
  {
    id: 'uom-003',
    code: 'BOX6',
    name: 'Box of 6',
    conversionFactor: 6,
    baseUnit: 'PCS',
    isBaseUnit: false,
    status: 'Active',
    createdDate: '2024-01-01',
    description: '6 pieces per box',
  },
  {
    id: 'uom-004',
    code: 'CARTON18',
    name: 'Carton (18 PCS)',
    conversionFactor: 18,
    baseUnit: 'PCS',
    isBaseUnit: false,
    status: 'Active',
    createdDate: '2024-02-15',
    description: '18 pieces per carton',
  },
  {
    id: 'uom-005',
    code: 'BOX24',
    name: 'Box (24 PCS)',
    conversionFactor: 24,
    baseUnit: 'PCS',
    isBaseUnit: false,
    status: 'Active',
    createdDate: '2024-02-20',
    description: '24 pieces per box',
  },
];

function UOMPage() {
  const [uoms, setUoms] = useState<UnitOfMeasure[]>(mockUOMs);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedUOM, setSelectedUOM] = useState<UnitOfMeasure | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    conversionFactor: '',
    baseUnit: 'PCS',
    description: '',
  });

  // Filter UOMs based on search
  const filteredUOMs = useMemo(() => {
    return uoms.filter((uom) =>
      uom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uom.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      uom.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uoms, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredUOMs.length / itemsPerPage);
  const paginatedUOMs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUOMs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUOMs, currentPage, itemsPerPage]);

  const handleDelete = (id: string) => {
    const uom = uoms.find(u => u.id === id);
    if (uom?.isBaseUnit) {
      toast.error('Cannot delete base unit', {
        description: 'Base units cannot be deleted from the system'
      });
      return;
    }
    setUoms(uoms.filter((u) => u.id !== id));
    toast.success('UOM deleted', {
      description: uom ? `"${uom.name}" has been deleted successfully` : 'UOM has been deleted'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewUOM = (uom: UnitOfMeasure) => {
    setSelectedUOM(uom);
    setViewDrawerOpen(true);
  };

  const handleAddUOM = () => {
    setFormMode('add');
    setFormData({
      code: '',
      name: '',
      conversionFactor: '',
      baseUnit: 'PCS',
      description: '',
    });
    setFormDrawerOpen(true);
  };

  const handleEditUOM = (uom: UnitOfMeasure) => {
    if (uom.isBaseUnit) {
      alert('Cannot edit base unit');
      return;
    }
    setFormMode('edit');
    setSelectedUOM(uom);
    setFormData({
      code: uom.code,
      name: uom.name,
      conversionFactor: uom.conversionFactor.toString(),
      baseUnit: uom.baseUnit,
      description: uom.description || '',
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
      const newUOM: UnitOfMeasure = {
        id: `uom-${String(uoms.length + 1).padStart(3, '0')}`,
        code: formData.code.toUpperCase(),
        name: formData.name,
        conversionFactor: conversionFactor,
        baseUnit: formData.baseUnit,
        isBaseUnit: false,
        status: 'Active',
        createdDate: new Date().toISOString().split('T')[0],
        description: formData.description,
      };
      setUoms([...uoms, newUOM]);
      toast.success('UOM created', {
        description: `"${formData.name}" has been created successfully`
      });
    } else if (formMode === 'edit' && selectedUOM) {
      setUoms(uoms.map(u =>
        u.id === selectedUOM.id
          ? {
              ...u,
              code: formData.code.toUpperCase(),
              name: formData.name,
              conversionFactor: conversionFactor,
              baseUnit: formData.baseUnit,
              description: formData.description,
            }
          : u
      ));
      toast.success('UOM updated', {
        description: `"${formData.name}" has been updated successfully`
      });
    }
    setFormDrawerOpen(false);
  };

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
      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Units</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {uoms.filter(u => u.status === 'Active').length}
            </div>
            <p className="text-xs text-muted-foreground">In use</p>
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
                  <TableHead className="w-[100px]">Code</TableHead>
                  <TableHead className="w-[180px]">Name</TableHead>
                  <TableHead className="w-[200px]">Description</TableHead>
                  <TableHead className="w-[120px] text-right">Conversion</TableHead>
                  <TableHead className="w-[100px]">Base Unit</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUOMs.map((uom) => (
                  <TableRow
                    key={uom.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewUOM(uom)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {uom.code}
                    </TableCell>
                    <TableCell className="font-medium">{uom.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {uom.description || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {uom.isBaseUnit ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        <span>
                          1 = {uom.conversionFactor} {uom.baseUnit}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {uom.baseUnit}
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
                    <TableCell>
                      <Badge
                        variant={uom.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          uom.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {uom.status}
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
                          className="h-8 w-8"
                          onClick={() => handleEditUOM(uom)}
                          disabled={uom.isBaseUnit}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(uom.id)}
                          disabled={uom.isBaseUnit}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Code</Label>
                    <p className="text-sm font-mono font-medium mt-1">{selectedUOM.code}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedUOM.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          selectedUOM.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {selectedUOM.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Unit Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedUOM.name}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedUOM.description || 'No description'}</p>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Base Unit</Label>
                    <p className="text-sm font-mono font-medium mt-1">{selectedUOM.baseUnit}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Conversion Factor</Label>
                    <p className="text-sm font-medium mt-1">
                      {selectedUOM.isBaseUnit ? '1 (Base)' : selectedUOM.conversionFactor}
                    </p>
                  </div>
                </div>

                {!selectedUOM.isBaseUnit && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-sm font-medium mb-2">Conversion Formula</p>
                    <p className="text-sm">
                      1 {selectedUOM.code} = {selectedUOM.conversionFactor} {selectedUOM.baseUnit}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Example: 5 {selectedUOM.code} = {5 * selectedUOM.conversionFactor}{' '}
                      {selectedUOM.baseUnit}
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Created Date</Label>
                  <p className="text-sm mt-1">{selectedUOM.createdDate}</p>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            {selectedUOM && !selectedUOM.isBaseUnit && (
              <Button onClick={() => handleEditUOM(selectedUOM)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit UOM
              </Button>
            )}
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
              <Label htmlFor="code">UOM Code</Label>
              <Input
                id="code"
                placeholder="CARTON18"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique code for this unit (e.g., CARTON18, BOX24)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Unit Name</Label>
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

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="18 pieces per carton"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="baseUnit">Base Unit</Label>
                <select
                  id="baseUnit"
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  {uoms
                    .filter(u => u.isBaseUnit)
                    .map(u => (
                      <option key={u.id} value={u.code}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  The base unit to convert to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conversionFactor">Conversion Factor</Label>
                <Input
                  id="conversionFactor"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="18"
                  value={formData.conversionFactor}
                  onChange={(e) => setFormData({ ...formData, conversionFactor: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Number of base units
                </p>
              </div>
            </div>

            {formData.conversionFactor && parseFloat(formData.conversionFactor) > 0 && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium mb-2">Conversion Preview</p>
                <p className="text-sm">
                  1 {formData.code || 'UNIT'} = {formData.conversionFactor} {formData.baseUnit}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: 5 {formData.code || 'UNIT'} = {parseFloat(formData.conversionFactor) * 5}{' '}
                  {formData.baseUnit}
                </p>
              </div>
            )}

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create UOM' : 'Update UOM'}
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
