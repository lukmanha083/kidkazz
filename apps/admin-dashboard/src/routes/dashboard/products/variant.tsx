import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
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
  Palette
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/variant')({
  component: ProductVariantPage,
});

interface ProductVariant {
  id: string;
  productName: string;
  productSKU: string;
  variantName: string;
  variantSKU: string;
  variantType: 'Color' | 'Size' | 'Material' | 'Style';
  price: number;
  stock: number;
  status: 'Active' | 'Inactive';
  image?: string;
}

const mockVariants: ProductVariant[] = [
  {
    id: '1',
    productName: 'Baby Bottle Set',
    productSKU: 'BB-001',
    variantName: 'Pink',
    variantSKU: 'BB-001-PNK',
    variantType: 'Color',
    price: 29.99,
    stock: 50,
    status: 'Active'
  },
  {
    id: '2',
    productName: 'Baby Bottle Set',
    productSKU: 'BB-001',
    variantName: 'Blue',
    variantSKU: 'BB-001-BLU',
    variantType: 'Color',
    price: 29.99,
    stock: 95,
    status: 'Active'
  },
  {
    id: '3',
    productName: 'Kids Backpack',
    productSKU: 'BP-002',
    variantName: 'Red',
    variantSKU: 'BP-002-RED',
    variantType: 'Color',
    price: 45.00,
    stock: 30,
    status: 'Active'
  },
  {
    id: '4',
    productName: 'Kids Backpack',
    productSKU: 'BP-002',
    variantName: 'Blue',
    variantSKU: 'BP-002-BLU',
    variantType: 'Color',
    price: 45.00,
    stock: 34,
    status: 'Active'
  },
  {
    id: '5',
    productName: 'Kids Backpack',
    productSKU: 'BP-002',
    variantName: 'Green',
    variantSKU: 'BP-002-GRN',
    variantType: 'Color',
    price: 45.00,
    stock: 25,
    status: 'Active'
  },
  {
    id: '6',
    productName: 'Toddler Shoes',
    productSKU: 'SH-006',
    variantName: 'Size 3',
    variantSKU: 'SH-006-S3',
    variantType: 'Size',
    price: 35.50,
    stock: 20,
    status: 'Active'
  },
  {
    id: '7',
    productName: 'Toddler Shoes',
    productSKU: 'SH-006',
    variantName: 'Size 4',
    variantSKU: 'SH-006-S4',
    variantType: 'Size',
    price: 35.50,
    stock: 28,
    status: 'Active'
  },
  {
    id: '8',
    productName: 'Toddler Shoes',
    productSKU: 'SH-006',
    variantName: 'Size 5',
    variantSKU: 'SH-006-S5',
    variantType: 'Size',
    price: 35.50,
    stock: 30,
    status: 'Active'
  },
  {
    id: '9',
    productName: 'Baby Crib',
    productSKU: 'CR-005',
    variantName: 'White Oak',
    variantSKU: 'CR-005-WOK',
    variantType: 'Material',
    price: 299.99,
    stock: 7,
    status: 'Active'
  },
  {
    id: '10',
    productName: 'Baby Crib',
    productSKU: 'CR-005',
    variantName: 'Walnut',
    variantSKU: 'CR-005-WNT',
    variantType: 'Material',
    price: 319.99,
    stock: 5,
    status: 'Inactive'
  },
  {
    id: '11',
    productName: 'Diaper Bag',
    productSKU: 'DB-009',
    variantName: 'Black',
    variantSKU: 'DB-009-BLK',
    variantType: 'Color',
    price: 49.99,
    stock: 45,
    status: 'Active'
  },
  {
    id: '12',
    productName: 'Diaper Bag',
    productSKU: 'DB-009',
    variantName: 'Gray',
    variantSKU: 'DB-009-GRY',
    variantType: 'Color',
    price: 49.99,
    stock: 47,
    status: 'Active'
  },
];

function ProductVariantPage() {
  const [variants, setVariants] = useState<ProductVariant[]>(mockVariants);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    productName: '',
    productSKU: '',
    variantName: '',
    variantSKU: '',
    variantType: 'Color' as 'Color' | 'Size' | 'Material' | 'Style',
    price: '',
    stock: '',
  });

  // Extract unique products from variants with stock tracking
  const availableProducts = useMemo(() => {
    const productsMap = new Map<string, { name: string; sku: string; totalStock: number; allocatedStock: number }>();

    // Mock total stock for products (in real app, this would come from products API)
    const mockProductStocks: Record<string, number> = {
      'BB-001': 150,
      'BF-002': 200,
      'ST-003': 180,
      'DB-004': 120,
      'SH-006': 100,
      'CR-005': 50,
      'DB-009': 200,
    };

    mockVariants.forEach(variant => {
      if (!productsMap.has(variant.productSKU)) {
        productsMap.set(variant.productSKU, {
          name: variant.productName,
          sku: variant.productSKU,
          totalStock: mockProductStocks[variant.productSKU] || 100,
          allocatedStock: 0
        });
      }
      // Sum up allocated stock from all variants
      const product = productsMap.get(variant.productSKU)!;
      product.allocatedStock += variant.stock;
    });

    return Array.from(productsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [variants]);

  // Convert products to combobox options
  const productOptions: ComboboxOption[] = useMemo(() => {
    return availableProducts.map(product => ({
      value: product.sku,
      label: `${product.name} (${product.sku})`,
      name: product.name,
      sku: product.sku,
    }));
  }, [availableProducts]);

  // Get remaining stock for selected product
  const getRemainingStock = (productSKU: string) => {
    const product = availableProducts.find(p => p.sku === productSKU);
    if (!product) return 0;
    return product.totalStock - product.allocatedStock;
  };

  // Auto-generate variant SKU from product SKU and variant name
  const generateVariantSKU = (productSKU: string, variantName: string) => {
    if (!productSKU || !variantName) return '';

    // Get 2-3 letters from variant name
    const variantCode = variantName
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 3);

    return `${productSKU}-${variantCode}`;
  };

  // Handle product selection
  const handleProductSelect = (productSKU: string) => {
    const product = availableProducts.find(p => p.sku === productSKU);
    if (product) {
      setFormData({
        ...formData,
        productName: product.name,
        productSKU: product.sku,
        variantSKU: generateVariantSKU(product.sku, formData.variantName)
      });
    }
  };

  // Handle variant name change (auto-update variant SKU)
  const handleVariantNameChange = (variantName: string) => {
    setFormData({
      ...formData,
      variantName,
      variantSKU: generateVariantSKU(formData.productSKU, variantName)
    });
  };

  // Filter variants based on search
  const filteredVariants = useMemo(() => {
    return variants.filter((variant) =>
      variant.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.productSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.variantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.variantSKU.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [variants, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredVariants.length / itemsPerPage);
  const paginatedVariants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVariants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVariants, currentPage, itemsPerPage]);

  const handleDelete = (id: string) => {
    const variant = variants.find(v => v.id === id);
    setVariants(variants.filter((v) => v.id !== id));
    toast.success('Variant deleted', {
      description: variant ? `"${variant.variantName}" has been deleted successfully` : 'Variant has been deleted'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewVariant = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setViewDrawerOpen(true);
  };

  const handleAddVariant = () => {
    setFormMode('add');
    setFormData({
      productName: '',
      productSKU: '',
      variantName: '',
      variantSKU: '',
      variantType: 'Color',
      price: '',
      stock: '',
    });
    setFormDrawerOpen(true);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setFormMode('edit');
    setSelectedVariant(variant);
    setFormData({
      productName: variant.productName,
      productSKU: variant.productSKU,
      variantName: variant.variantName,
      variantSKU: variant.variantSKU,
      variantType: variant.variantType,
      price: variant.price.toString(),
      stock: variant.stock.toString(),
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'add') {
      const newVariant: ProductVariant = {
        id: String(variants.length + 1),
        productName: formData.productName,
        productSKU: formData.productSKU,
        variantName: formData.variantName,
        variantSKU: formData.variantSKU,
        variantType: formData.variantType,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        status: 'Active',
      };
      setVariants([...variants, newVariant]);
      toast.success('Variant created', {
        description: `"${formData.variantName}" has been created successfully`
      });
    } else if (formMode === 'edit' && selectedVariant) {
      setVariants(variants.map(v =>
        v.id === selectedVariant.id
          ? {
              ...v,
              productName: formData.productName,
              productSKU: formData.productSKU,
              variantName: formData.variantName,
              variantSKU: formData.variantSKU,
              variantType: formData.variantType,
              price: parseFloat(formData.price),
              stock: parseInt(formData.stock),
            }
          : v
      ));
      toast.success('Variant updated', {
        description: `"${formData.variantName}" has been updated successfully`
      });
    }
    setFormDrawerOpen(false);
  };

  // Get variant type badge color
  const getVariantTypeBadge = (type: string) => {
    const colors = {
      Color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      Size: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      Material: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      Style: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    };
    return colors[type as keyof typeof colors] || '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Variants</h1>
          <p className="text-muted-foreground mt-1">
            Manage product variations such as colors, sizes, and materials
          </p>
        </div>
        <Button onClick={handleAddVariant} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Variant
        </Button>
      </div>

      {/* Variants Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Product Variants</CardTitle>
              <CardDescription>
                {filteredVariants.length} of {variants.length} variants
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search variants..."
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
                  <TableHead className="w-[180px]">Product Name</TableHead>
                  <TableHead className="w-[120px]">Product SKU</TableHead>
                  <TableHead className="w-[150px]">Variant Name</TableHead>
                  <TableHead className="w-[120px]">Variant SKU</TableHead>
                  <TableHead className="w-[100px]">Type</TableHead>
                  <TableHead className="w-[100px] text-right">Price</TableHead>
                  <TableHead className="w-[80px] text-right">Stock</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVariants.map((variant) => (
                  <TableRow
                    key={variant.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewVariant(variant)}
                  >
                    <TableCell className="font-medium">
                      {variant.productName}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {variant.productSKU}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{variant.variantName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {variant.variantSKU}
                    </TableCell>
                    <TableCell>
                      <Badge className={getVariantTypeBadge(variant.variantType)}>
                        {variant.variantType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ${variant.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          variant.stock < 10
                            ? 'text-destructive font-medium'
                            : variant.stock < 30
                            ? 'text-yellow-600 font-medium'
                            : ''
                        }
                      >
                        {variant.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={variant.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          variant.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {variant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewVariant(variant)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditVariant(variant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(variant.id)}
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
              totalItems={filteredVariants.length}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Variant Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedVariant?.variantName}</DrawerTitle>
                <DrawerDescription>Variant Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedVariant && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Product Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedVariant.productName}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Product SKU</Label>
                  <p className="text-sm font-mono mt-1">{selectedVariant.productSKU}</p>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Variant Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedVariant.variantName}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Variant SKU</Label>
                  <p className="text-sm font-mono mt-1">{selectedVariant.variantSKU}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Variant Type</Label>
                  <div className="mt-1">
                    <Badge className={getVariantTypeBadge(selectedVariant.variantType)}>
                      {selectedVariant.variantType}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <p className="text-lg font-bold mt-1">${selectedVariant.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Stock</Label>
                    <p className="text-lg font-bold mt-1">{selectedVariant.stock}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedVariant.status === 'Active' ? 'default' : 'secondary'}
                      className={
                        selectedVariant.status === 'Active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                          : ''
                      }
                    >
                      {selectedVariant.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button onClick={() => selectedVariant && handleEditVariant(selectedVariant)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Variant
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Variant Form Drawer (Left Side) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add New Variant' : 'Edit Variant'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Create a new product variant'
                    : 'Update variant information'}
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
              <Label>Select Product</Label>
              <Combobox
                options={productOptions}
                value={formData.productSKU}
                onValueChange={handleProductSelect}
                placeholder="Search products..."
                searchPlaceholder="Type to search..."
                emptyText="No products found."
              />
              <p className="text-xs text-muted-foreground">
                Search and select the product this variant belongs to
              </p>
            </div>

            {formData.productSKU && (
              <div className="p-3 bg-muted/30 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{formData.productName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SKU:</span>
                  <span className="font-mono">{formData.productSKU}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Available Stock:</span>
                  <span className={`font-medium ${getRemainingStock(formData.productSKU) <= 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {getRemainingStock(formData.productSKU)} units
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Variant stock cannot exceed available stock
                </p>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="variantName">Variant Name</Label>
              <Input
                id="variantName"
                placeholder="Pink, Large, Cotton, etc."
                value={formData.variantName}
                onChange={(e) => handleVariantNameChange(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                e.g., "Pink" for color, "Large" for size, "Cotton" for material
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variantSKU">Variant SKU (Auto-generated)</Label>
              <Input
                id="variantSKU"
                placeholder="BB-001-PIN"
                value={formData.variantSKU}
                readOnly
                className="bg-muted/30"
                required
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from product SKU + variant name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="variantType">Variant Type</Label>
              <select
                id="variantType"
                value={formData.variantType}
                onChange={(e) => setFormData({ ...formData, variantType: e.target.value as any })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Color">Color</option>
                <option value="Size">Size</option>
                <option value="Material">Material</option>
                <option value="Style">Style</option>
              </select>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="29.99"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  placeholder="100"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  max={formData.productSKU ? getRemainingStock(formData.productSKU) : undefined}
                  min="0"
                  required
                />
                {formData.productSKU && (
                  <p className="text-xs text-muted-foreground">
                    Max: {getRemainingStock(formData.productSKU)} units available
                  </p>
                )}
              </div>
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create Variant' : 'Update Variant'}
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
