import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
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
import { Plus, Search, Edit, Trash2, MapPin, Package, Loader2, X } from 'lucide-react';
import {
  productLocationApi,
  productApi,
  warehouseApi,
  type ProductLocation,
  type CreateProductLocationInput,
} from '@/lib/api';

export const Route = createFileRoute('/dashboard/inventory/product-locations')({
  component: ProductLocationsPage,
});

function ProductLocationsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [selectedLocation, setSelectedLocation] = useState<ProductLocation | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<ProductLocation | null>(null);

  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    rack: '',
    bin: '',
    zone: '',
    aisle: '',
    quantity: '',
  });

  // Fetch product locations
  const { data: locationsData, isLoading, error } = useQuery({
    queryKey: ['product-locations'],
    queryFn: () => productLocationApi.getAll(),
  });

  const locations = locationsData?.locations || [];

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const products = productsData?.products || [];

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Create location mutation
  const createLocationMutation = useMutation({
    mutationFn: (data: CreateProductLocationInput) => productLocationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-locations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Location created successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create location', {
        description: error.message,
      });
    },
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<CreateProductLocationInput, 'productId'>> }) =>
      productLocationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-locations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Location updated successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update location', {
        description: error.message,
      });
    },
  });

  // Delete location mutation
  const deleteLocationMutation = useMutation({
    mutationFn: (id: string) => productLocationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-locations'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Location deleted successfully');
      setDeleteDialogOpen(false);
      setLocationToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete location', {
        description: error.message,
      });
    },
  });

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const product = products.find(p => p.id === location.productId);
      const warehouse = warehouses.find(w => w.id === location.warehouseId);

      const matchesSearch =
        product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.rack?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.bin?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesWarehouse = !filterWarehouse || location.warehouseId === filterWarehouse;
      const matchesProduct = !filterProduct || location.productId === filterProduct;

      return matchesSearch && matchesWarehouse && matchesProduct;
    });
  }, [locations, products, warehouses, searchTerm, filterWarehouse, filterProduct]);

  const handleAddLocation = () => {
    setFormMode('add');
    setFormData({
      productId: '',
      warehouseId: '',
      rack: '',
      bin: '',
      zone: '',
      aisle: '',
      quantity: '0',
    });
    setFormDrawerOpen(true);
  };

  const handleEditLocation = (location: ProductLocation) => {
    setFormMode('edit');
    setSelectedLocation(location);
    setFormData({
      productId: location.productId,
      warehouseId: location.warehouseId,
      rack: location.rack || '',
      bin: location.bin || '',
      zone: location.zone || '',
      aisle: location.aisle || '',
      quantity: location.quantity.toString(),
    });
    setFormDrawerOpen(true);
  };

  const handleDeleteLocation = (location: ProductLocation) => {
    setLocationToDelete(location);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (locationToDelete) {
      deleteLocationMutation.mutate(locationToDelete.id);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const quantity = parseInt(formData.quantity);
    if (quantity < 0) {
      toast.error('Invalid quantity', {
        description: 'Quantity cannot be negative'
      });
      return;
    }

    if (formMode === 'add') {
      const locationData: CreateProductLocationInput = {
        productId: formData.productId,
        warehouseId: formData.warehouseId,
        rack: formData.rack || null,
        bin: formData.bin || null,
        zone: formData.zone || null,
        aisle: formData.aisle || null,
        quantity: quantity,
      };
      createLocationMutation.mutate(locationData);
    } else if (formMode === 'edit' && selectedLocation) {
      const updateData = {
        warehouseId: formData.warehouseId,
        rack: formData.rack || null,
        bin: formData.bin || null,
        zone: formData.zone || null,
        aisle: formData.aisle || null,
        quantity: quantity,
      };
      updateLocationMutation.mutate({ id: selectedLocation.id, data: updateData });
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Locations</h1>
            <p className="text-muted-foreground mt-1">
              Manage precise locations of products in warehouses
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading product locations</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['product-locations'] })}
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
          <h1 className="text-3xl font-bold tracking-tight">Product Locations</h1>
          <p className="text-muted-foreground mt-1">
            Manage precise locations of products in warehouses
          </p>
        </div>
        <Button onClick={handleAddLocation}>
          <Plus className="mr-2 h-4 w-4" />
          Add Location
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
                <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{locations.length}</div>
                <p className="text-xs text-muted-foreground">Across all warehouses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Products with Locations</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(locations.map(l => l.productId)).size}
                </div>
                <p className="text-xs text-muted-foreground">Unique products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Warehouses Used</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Set(locations.map(l => l.warehouseId)).size}
                </div>
                <p className="text-xs text-muted-foreground">Different warehouses</p>
              </CardContent>
            </Card>
          </div>

          {/* Locations Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Product Locations</CardTitle>
                  <CardDescription>
                    {filteredLocations.length} of {locations.length} locations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Warehouse Filter */}
                  <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Warehouses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Warehouses</SelectItem>
                      {warehouses.map(warehouse => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Product Filter */}
                  <Select value={filterProduct} onValueChange={setFilterProduct}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Products</SelectItem>
                      {products
                        .filter(p => locations.some(l => l.productId === p.id))
                        .map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search locations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Rack</TableHead>
                      <TableHead>Bin</TableHead>
                      <TableHead>Zone</TableHead>
                      <TableHead>Aisle</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No locations found. Add your first location to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLocations.map((location) => {
                        const product = products.find(p => p.id === location.productId);
                        const warehouse = warehouses.find(w => w.id === location.warehouseId);

                        return (
                          <TableRow key={location.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{product?.name || 'Unknown Product'}</div>
                                <div className="text-sm text-muted-foreground">{product?.sku}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{warehouse?.name || 'Unknown'}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {location.rack || '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {location.bin || '-'}
                            </TableCell>
                            <TableCell>{location.zone || '-'}</TableCell>
                            <TableCell>{location.aisle || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {location.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditLocation(location)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteLocation(location)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add Product Location' : 'Edit Product Location'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Set the warehouse location for a product'
                    : 'Update product location information'}
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
              <Label htmlFor="productId">Product *</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
                disabled={formMode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formMode === 'edit' && (
                <p className="text-xs text-muted-foreground">
                  Product cannot be changed after creation
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse *</Label>
              <Select
                value={formData.warehouseId}
                onValueChange={(value) => setFormData({ ...formData, warehouseId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(warehouse => (
                    <SelectItem key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} - {warehouse.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rack">Rack</Label>
                <Input
                  id="rack"
                  placeholder="A1, B3, R-01"
                  value={formData.rack}
                  onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin">Bin</Label>
                <Input
                  id="bin"
                  placeholder="01, A, TOP"
                  value={formData.bin}
                  onChange={(e) => setFormData({ ...formData, bin: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="zone">Zone</Label>
                <Input
                  id="zone"
                  placeholder="Zone A, Cold Storage"
                  value={formData.zone}
                  onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aisle">Aisle</Label>
                <Input
                  id="aisle"
                  placeholder="1, 2A, Main"
                  value={formData.aisle}
                  onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity at Location *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                placeholder="100"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                How many units are stored at this location
              </p>
            </div>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                className="w-full"
                disabled={createLocationMutation.isPending || updateLocationMutation.isPending}
              >
                {createLocationMutation.isPending || updateLocationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {formMode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  formMode === 'add' ? 'Create Location' : 'Update Location'
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
            <AlertDialogTitle>Delete Location?</AlertDialogTitle>
            <AlertDialogDescription>
              {locationToDelete && (
                <>
                  Are you sure you want to delete this location? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLocationMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteLocationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLocationMutation.isPending ? (
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
