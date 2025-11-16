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
import { Pagination } from '@/components/ui/pagination';
import { Plus, Search, Edit, Trash2, Eye, Check, X, Star, Image as ImageIcon } from 'lucide-react';

export const Route = createFileRoute('/dashboard/products')({
  component: ProductsPage,
});

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
}

const mockProducts: Product[] = [
  { id: '1', barcode: '8901234567890', name: 'Baby Bottle Set', description: 'BPA-free baby bottles with anti-colic nipples', sku: 'BB-001', image: '/placeholder-product.jpg', category: 'Feeding', price: 29.99, stock: 145, status: 'Active', rating: 4.5, reviews: 89 },
  { id: '2', barcode: '8901234567891', name: 'Kids Backpack', description: 'Durable school backpack with ergonomic design', sku: 'BP-002', image: '/placeholder-product.jpg', category: 'School', price: 45.00, stock: 89, status: 'Active', rating: 4.8, reviews: 124 },
  { id: '3', barcode: '8901234567892', name: 'Toy Car Collection', description: 'Set of 10 die-cast toy cars with realistic details', sku: 'TC-003', image: '/placeholder-product.jpg', category: 'Toys', price: 89.99, stock: 234, status: 'Active', rating: 4.3, reviews: 67 },
  { id: '4', barcode: '8901234567893', name: 'Children Books Set', description: 'Educational books for early learning', sku: 'BK-004', image: '/placeholder-product.jpg', category: 'Education', price: 34.50, stock: 67, status: 'Active', rating: 4.9, reviews: 201 },
  { id: '5', barcode: '8901234567894', name: 'Baby Crib', description: 'Solid wood convertible crib with adjustable mattress', sku: 'CR-005', image: '/placeholder-product.jpg', category: 'Furniture', price: 299.99, stock: 12, status: 'Inactive', rating: 4.7, reviews: 45 },
  { id: '6', barcode: '8901234567895', name: 'Toddler Shoes', description: 'Comfortable first walker shoes with soft sole', sku: 'SH-006', image: '/placeholder-product.jpg', category: 'Clothing', price: 35.50, stock: 78, status: 'Active', rating: 4.6, reviews: 92 },
  { id: '7', barcode: '8901234567896', name: 'Educational Puzzle', description: 'Wooden alphabet puzzle for cognitive development', sku: 'PZ-007', image: '/placeholder-product.jpg', category: 'Toys', price: 19.99, stock: 156, status: 'Active', rating: 4.8, reviews: 134 },
  { id: '8', barcode: '8901234567897', name: 'Baby Monitor', description: 'HD video monitor with night vision and two-way audio', sku: 'BM-008', image: '/placeholder-product.jpg', category: 'Electronics', price: 129.99, stock: 34, status: 'Active', rating: 4.4, reviews: 78 },
  { id: '9', barcode: '8901234567898', name: 'Diaper Bag', description: 'Large capacity diaper bag with multiple pockets', sku: 'DB-009', image: '/placeholder-product.jpg', category: 'Accessories', price: 49.99, stock: 92, status: 'Active', rating: 4.5, reviews: 156 },
  { id: '10', barcode: '8901234567899', name: 'Kids Lunch Box', description: 'Insulated lunch box with compartments', sku: 'LB-010', image: '/placeholder-product.jpg', category: 'School', price: 15.99, stock: 203, status: 'Active', rating: 4.7, reviews: 234 },
];

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
        <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
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
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Table with horizontal scroll */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] sticky left-0 bg-muted/50 z-10">Barcode</TableHead>
                  <TableHead className="min-w-[250px]">Product Description</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[100px]">Image</TableHead>
                  <TableHead className="w-[120px]">Category</TableHead>
                  <TableHead className="w-[100px] text-right">Price</TableHead>
                  <TableHead className="w-[80px] text-right">Stock</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Ratings</TableHead>
                  <TableHead className="w-[140px] text-right sticky right-0 bg-muted/50">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    {/* Barcode - Sticky */}
                    <TableCell className="font-mono text-sm sticky left-0 bg-background border-r">
                      {product.barcode}
                    </TableCell>

                    {/* Product Description */}
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {product.description}
                        </div>
                      </div>
                    </TableCell>

                    {/* SKU */}
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {product.sku}
                    </TableCell>

                    {/* Image */}
                    <TableCell>
                      <div className="flex items-center justify-center">
                        <div className="w-12 h-12 rounded border bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                        {product.category}
                      </span>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right font-semibold">
                      ${product.price.toFixed(2)}
                    </TableCell>

                    {/* Stock */}
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

                    {/* Status */}
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {product.status}
                      </span>
                    </TableCell>

                    {/* Ratings */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">
                          ({product.reviews})
                        </span>
                      </div>
                    </TableCell>

                    {/* Actions - Sticky */}
                    <TableCell className="text-right sticky right-0 bg-background border-l">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </div>
  );
}
