import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Star,
  Image as ImageIcon,
  Settings2,
  Package,
  Warehouse as WarehouseIcon,
  X
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/all')({
  component: AllProductsPage,
});

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

interface UnitOfMeasure {
  code: string;
  name: string;
  conversionFactor: number;
  isBaseUnit: boolean;
}

interface WarehouseStock {
  warehouseId: string;
  warehouseName: string;
  stockQuantity: number;
  retailPrice: number;
  wholesalePrice: number | null;
}

interface Product {
  id: string;
  barcode: string;
  name: string;
  description: string;
  sku: string;
  image: string;
  category: string;
  price: number;
  stock: number;
  status: 'Active' | 'Inactive';
  rating: number;
  reviews: number;
  // Existing fields
  warehouse: string;
  warehouseId: string;
  isBundle: boolean;
  bundleItems?: string[];
  variants?: ProductVariant[];
  // UOM fields
  baseUnit: string;
  alternateUnits: UnitOfMeasure[];
  wholesaleThreshold: number;
  warehouseStock: WarehouseStock[];
}

// Standard UOM for all products
const standardUOMs: UnitOfMeasure[] = [
  { code: 'PCS', name: 'Pieces', conversionFactor: 1, isBaseUnit: true },
  { code: 'DOZEN', name: 'Dozen', conversionFactor: 12, isBaseUnit: false },
  { code: 'BOX6', name: 'Box of 6', conversionFactor: 6, isBaseUnit: false },
];

const mockProducts: Product[] = [
  {
    id: '1',
    barcode: '8901234567890',
    name: 'Baby Bottle Set',
    description: 'BPA-free baby bottles with anti-colic nipples, includes 3 different sizes',
    sku: 'BB-001',
    image: '/placeholder-product.jpg',
    category: 'Feeding',
    price: 29.99,
    stock: 145,
    status: 'Active',
    rating: 4.5,
    reviews: 89,
    warehouse: 'Main Warehouse',
    warehouseId: 'WH-001',
    isBundle: true,
    bundleItems: ['4oz Bottle', '6oz Bottle', '9oz Bottle'],
    variants: [
      { id: 'v1', name: 'Pink', sku: 'BB-001-PNK', price: 29.99, stock: 50 },
      { id: 'v2', name: 'Blue', sku: 'BB-001-BLU', price: 29.99, stock: 95 }
    ],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 145, retailPrice: 29.99, wholesalePrice: 25.00 },
    ],
  },
  {
    id: '2',
    barcode: '8901234567891',
    name: 'Kids Backpack',
    description: 'Durable school backpack with ergonomic design and multiple compartments',
    sku: 'BP-002',
    image: '/placeholder-product.jpg',
    category: 'School',
    price: 45.00,
    stock: 89,
    status: 'Active',
    rating: 4.8,
    reviews: 124,
    warehouse: 'Secondary Warehouse',
    warehouseId: 'WH-002',
    isBundle: false,
    variants: [
      { id: 'v1', name: 'Red', sku: 'BP-002-RED', price: 45.00, stock: 30 },
      { id: 'v2', name: 'Blue', sku: 'BP-002-BLU', price: 45.00, stock: 34 },
      { id: 'v3', name: 'Green', sku: 'BP-002-GRN', price: 45.00, stock: 25 }
    ],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-002', warehouseName: 'Secondary Warehouse', stockQuantity: 89, retailPrice: 45.00, wholesalePrice: 40.00 },
    ],
  },
  {
    id: '3',
    barcode: '8901234567892',
    name: 'Toy Car Collection',
    description: 'Set of 10 die-cast toy cars with realistic details and moving parts',
    sku: 'TC-003',
    image: '/placeholder-product.jpg',
    category: 'Toys',
    price: 89.99,
    stock: 234,
    status: 'Active',
    rating: 4.3,
    reviews: 67,
    warehouse: 'Main Warehouse',
    warehouseId: 'WH-001',
    isBundle: true,
    bundleItems: ['Police Car', 'Fire Truck', 'Ambulance', 'Taxi', 'Bus', 'Sports Car', 'SUV', 'Pickup Truck', 'Monster Truck', 'Race Car'],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 234, retailPrice: 89.99, wholesalePrice: 80.00 },
    ],
  },
  {
    id: '4',
    barcode: '8901234567893',
    name: 'Children Books Set',
    description: 'Educational books for early learning with colorful illustrations',
    sku: 'BK-004',
    image: '/placeholder-product.jpg',
    category: 'Education',
    price: 34.50,
    stock: 67,
    status: 'Active',
    rating: 4.9,
    reviews: 201,
    warehouse: 'Regional Hub Jakarta',
    warehouseId: 'WH-003',
    isBundle: true,
    bundleItems: ['ABC Book', 'Numbers Book', 'Colors Book', 'Shapes Book', 'Animals Book']
  },
  {
    id: '5',
    barcode: '8901234567894',
    name: 'Baby Crib',
    description: 'Solid wood convertible crib with adjustable mattress height settings',
    sku: 'CR-005',
    image: '/placeholder-product.jpg',
    category: 'Furniture',
    price: 299.99,
    stock: 12,
    status: 'Inactive',
    rating: 4.7,
    reviews: 45,
    warehouse: 'Main Warehouse',
    warehouseId: 'WH-001',
    isBundle: false,
    variants: [
      { id: 'v1', name: 'White Oak', sku: 'CR-005-WOK', price: 299.99, stock: 7 },
      { id: 'v2', name: 'Walnut', sku: 'CR-005-WNT', price: 319.99, stock: 5 }
    ]
  },
  {
    id: '6',
    barcode: '8901234567895',
    name: 'Toddler Shoes',
    description: 'Comfortable first walker shoes with soft sole and breathable material',
    sku: 'SH-006',
    image: '/placeholder-product.jpg',
    category: 'Clothing',
    price: 35.50,
    stock: 78,
    status: 'Active',
    rating: 4.6,
    reviews: 92,
    warehouse: 'Secondary Warehouse',
    warehouseId: 'WH-002',
    isBundle: false,
    variants: [
      { id: 'v1', name: 'Size 3', sku: 'SH-006-S3', price: 35.50, stock: 20 },
      { id: 'v2', name: 'Size 4', sku: 'SH-006-S4', price: 35.50, stock: 28 },
      { id: 'v3', name: 'Size 5', sku: 'SH-006-S5', price: 35.50, stock: 30 }
    ]
  },
  {
    id: '7',
    barcode: '8901234567896',
    name: 'Educational Puzzle',
    description: 'Wooden alphabet puzzle for cognitive development and motor skills',
    sku: 'PZ-007',
    image: '/placeholder-product.jpg',
    category: 'Toys',
    price: 19.99,
    stock: 156,
    status: 'Active',
    rating: 4.8,
    reviews: 134,
    warehouse: 'Regional Hub Jakarta',
    warehouseId: 'WH-003',
    isBundle: false
  },
  {
    id: '8',
    barcode: '8901234567897',
    name: 'Baby Monitor',
    description: 'HD video monitor with night vision, two-way audio, and temperature sensor',
    sku: 'BM-008',
    image: '/placeholder-product.jpg',
    category: 'Electronics',
    price: 129.99,
    stock: 34,
    status: 'Active',
    rating: 4.4,
    reviews: 78,
    warehouse: 'Main Warehouse',
    warehouseId: 'WH-001',
    isBundle: false
  },
  {
    id: '9',
    barcode: '8901234567898',
    name: 'Diaper Bag',
    description: 'Large capacity diaper bag with multiple pockets and insulated bottle holders',
    sku: 'DB-009',
    image: '/placeholder-product.jpg',
    category: 'Accessories',
    price: 49.99,
    stock: 92,
    status: 'Active',
    rating: 4.5,
    reviews: 156,
    warehouse: 'Secondary Warehouse',
    warehouseId: 'WH-002',
    isBundle: false,
    variants: [
      { id: 'v1', name: 'Black', sku: 'DB-009-BLK', price: 49.99, stock: 45 },
      { id: 'v2', name: 'Gray', sku: 'DB-009-GRY', price: 49.99, stock: 47 }
    ]
  },
  {
    id: '10',
    barcode: '8901234567899',
    name: 'Kids Lunch Box',
    description: 'Insulated lunch box with compartments, leak-proof design',
    sku: 'LB-010',
    image: '/placeholder-product.jpg',
    category: 'School',
    price: 15.99,
    stock: 203,
    status: 'Active',
    rating: 4.7,
    reviews: 234,
    warehouse: 'Regional Hub Jakarta',
    warehouseId: 'WH-003',
    isBundle: false
  },
];

// Available columns configuration
const availableColumns = [
  { id: 'barcode', label: 'Barcode', default: true },
  { id: 'name', label: 'Product Name', default: true },
  { id: 'sku', label: 'SKU', default: true },
  { id: 'category', label: 'Category', default: true },
  { id: 'price', label: 'Price', default: true },
  { id: 'stock', label: 'Stock', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'warehouse', label: 'Warehouse', default: false },
  { id: 'bundle', label: 'Bundle', default: false },
  { id: 'variants', label: 'Variants', default: false },
  { id: 'rating', label: 'Rating', default: false },
];

function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    availableColumns.filter(col => col.default).map(col => col.id)
  );

  // Form data
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    description: '',
    sku: '',
    category: '',
    price: '',
    stock: '',
    warehouse: '',
    warehouseId: '',
    isBundle: false,
  });

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewDrawerOpen(true);
  };

  const handleAddProduct = () => {
    setFormMode('add');
    setFormData({
      barcode: '',
      name: '',
      description: '',
      sku: '',
      category: '',
      price: '',
      stock: '',
      warehouse: '',
      warehouseId: '',
      isBundle: false,
    });
    setFormDrawerOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setFormMode('edit');
    setSelectedProduct(product);
    setFormData({
      barcode: product.barcode,
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
      warehouse: product.warehouse,
      warehouseId: product.warehouseId,
      isBundle: product.isBundle,
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'add') {
      const newProduct: Product = {
        id: String(products.length + 1),
        barcode: formData.barcode,
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        image: '/placeholder-product.jpg',
        category: formData.category,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        status: 'Active',
        rating: 0,
        reviews: 0,
        warehouse: formData.warehouse,
        warehouseId: formData.warehouseId,
        isBundle: formData.isBundle,
      };
      setProducts([...products, newProduct]);
    } else if (formMode === 'edit' && selectedProduct) {
      setProducts(products.map(p =>
        p.id === selectedProduct.id
          ? {
              ...p,
              barcode: formData.barcode,
              name: formData.name,
              description: formData.description,
              sku: formData.sku,
              category: formData.category,
              price: parseFloat(formData.price),
              stock: parseInt(formData.stock),
              warehouse: formData.warehouse,
              warehouseId: formData.warehouseId,
              isBundle: formData.isBundle,
            }
          : p
      ));
    }
    setFormDrawerOpen(false);
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product inventory and catalog
          </p>
        </div>
        <Button onClick={handleAddProduct} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Products</CardTitle>
              <CardDescription>
                {filteredProducts.length} of {products.length} products
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              {/* Column Chooser */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings2 className="h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={() => toggleColumn(column.id)}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simplified Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('barcode') && (
                    <TableHead className="w-[140px]">Barcode</TableHead>
                  )}
                  {visibleColumns.includes('name') && (
                    <TableHead className="min-w-[200px]">Product Name</TableHead>
                  )}
                  {visibleColumns.includes('sku') && (
                    <TableHead className="w-[120px]">SKU</TableHead>
                  )}
                  {visibleColumns.includes('category') && (
                    <TableHead className="w-[120px]">Category</TableHead>
                  )}
                  {visibleColumns.includes('price') && (
                    <TableHead className="w-[100px] text-right">Price</TableHead>
                  )}
                  {visibleColumns.includes('stock') && (
                    <TableHead className="w-[80px] text-right">Stock</TableHead>
                  )}
                  {visibleColumns.includes('stock') && (
                    <TableHead className="w-[70px]">UOM</TableHead>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableHead className="w-[100px]">Status</TableHead>
                  )}
                  {visibleColumns.includes('warehouse') && (
                    <TableHead className="w-[150px]">Warehouse</TableHead>
                  )}
                  {visibleColumns.includes('bundle') && (
                    <TableHead className="w-[80px]">Bundle</TableHead>
                  )}
                  {visibleColumns.includes('variants') && (
                    <TableHead className="w-[80px]">Variants</TableHead>
                  )}
                  {visibleColumns.includes('rating') && (
                    <TableHead className="w-[120px]">Rating</TableHead>
                  )}
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow
                    key={product.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewProduct(product)}
                  >
                    {visibleColumns.includes('barcode') && (
                      <TableCell className="font-mono text-sm">
                        {product.barcode}
                      </TableCell>
                    )}
                    {visibleColumns.includes('name') && (
                      <TableCell className="font-medium">{product.name}</TableCell>
                    )}
                    {visibleColumns.includes('sku') && (
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {product.sku}
                      </TableCell>
                    )}
                    {visibleColumns.includes('category') && (
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes('price') && (
                      <TableCell className="text-right font-semibold">
                        ${product.price.toFixed(2)}
                      </TableCell>
                    )}
                    {visibleColumns.includes('stock') && (
                      <TableCell className="text-right">
                        <span
                          className={
                            product.stock < 20
                              ? 'text-destructive font-medium'
                              : product.stock < 50
                              ? 'text-yellow-600 font-medium'
                              : ''
                          }
                        >
                          {product.stock}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('stock') && (
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {product.baseUnit || 'PCS'}
                      </TableCell>
                    )}
                    {visibleColumns.includes('status') && (
                      <TableCell>
                        <Badge
                          variant={product.status === 'Active' ? 'default' : 'secondary'}
                          className={
                            product.status === 'Active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                              : ''
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes('warehouse') && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{product.warehouse}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes('bundle') && (
                      <TableCell>
                        {product.isBundle && (
                          <Badge variant="outline" className="gap-1">
                            <Package className="h-3 w-3" />
                            Bundle
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('variants') && (
                      <TableCell>
                        {product.variants && product.variants.length > 0 && (
                          <Badge variant="outline">
                            {product.variants.length} variants
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.includes('rating') && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{product.rating}</span>
                          <span className="text-xs text-muted-foreground">
                            ({product.reviews})
                          </span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewProduct(product)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(product.id)}
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
              totalItems={filteredProducts.length}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Product Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedProduct?.name}</DrawerTitle>
                <DrawerDescription>Product Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedProduct && (
            <div className="flex-1 overflow-y-auto p-4">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {/* Image */}
                  <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Product Name</Label>
                      <p className="text-sm font-medium mt-1">{selectedProduct.name}</p>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <p className="text-sm mt-1">{selectedProduct.description}</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Barcode</Label>
                        <p className="text-sm font-mono mt-1">{selectedProduct.barcode}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">SKU</Label>
                        <p className="text-sm font-mono mt-1">{selectedProduct.sku}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Category</Label>
                        <p className="text-sm mt-1">{selectedProduct.category}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div className="mt-1">
                          <Badge variant={selectedProduct.status === 'Active' ? 'default' : 'secondary'}>
                            {selectedProduct.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Price</Label>
                        <p className="text-lg font-bold mt-1">${selectedProduct.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Stock</Label>
                        <p className="text-lg font-bold mt-1">{selectedProduct.stock}</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-xs text-muted-foreground">Warehouse</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{selectedProduct.warehouse}</span>
                        <Badge variant="outline" className="text-xs">{selectedProduct.warehouseId}</Badge>
                      </div>
                    </div>

                    {selectedProduct.isBundle && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-xs text-muted-foreground">Bundle Items</Label>
                          <div className="mt-2 space-y-1">
                            {selectedProduct.bundleItems?.map((item, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <Label className="text-xs text-muted-foreground">Rating</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(selectedProduct.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium">{selectedProduct.rating}</span>
                        <span className="text-xs text-muted-foreground">({selectedProduct.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="variants" className="space-y-4 mt-4">
                  {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProduct.variants.map((variant) => (
                        <div key={variant.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{variant.name}</h4>
                            <Badge variant="outline">{variant.sku}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Price:</span>{' '}
                              <span className="font-semibold">${variant.price.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Stock:</span>{' '}
                              <span className="font-semibold">{variant.stock}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No variants available for this product
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-xs text-muted-foreground">Total Stock</Label>
                      <p className="text-2xl font-bold mt-1">{selectedProduct.stock}</p>
                    </div>

                    {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <Label className="text-sm font-medium">Stock by Variant</Label>
                          <div className="mt-2 space-y-2">
                            {selectedProduct.variants.map((variant) => (
                              <div key={variant.id} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{variant.name}</span>
                                <Badge variant="secondary">{variant.stock} units</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <Label className="text-sm font-medium">Warehouse Location</Label>
                      <div className="mt-2 p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <WarehouseIcon className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{selectedProduct.warehouse}</p>
                            <p className="text-xs text-muted-foreground">{selectedProduct.warehouseId}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DrawerFooter>
            <Button onClick={() => selectedProduct && handleEditProduct(selectedProduct)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Product
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Product Form Drawer (Left Side) */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add New Product' : 'Edit Product'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Fill in the details to create a new product'
                    : 'Update product information'}
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
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                placeholder="8901234567890"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="Baby Bottle Set"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="BPA-free baby bottles..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="BB-001"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="Feeding"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                />
              </div>
            </div>

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
                  required
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="warehouse">Warehouse</Label>
                <Input
                  id="warehouse"
                  placeholder="Main Warehouse"
                  value={formData.warehouse}
                  onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouseId">Warehouse ID</Label>
                <Input
                  id="warehouseId"
                  placeholder="WH-001"
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isBundle"
                checked={formData.isBundle}
                onChange={(e) => setFormData({ ...formData, isBundle: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isBundle" className="cursor-pointer">
                This is a bundle product
              </Label>
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create Product' : 'Update Product'}
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
