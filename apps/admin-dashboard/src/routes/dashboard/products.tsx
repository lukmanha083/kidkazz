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
import { Plus, Search, Edit, Trash2, Eye, Check, X } from 'lucide-react';

export const Route = createFileRoute('/dashboard/products')({
  component: ProductsPage,
});

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  status: 'Active' | 'Inactive';
}

const mockProducts: Product[] = [
  { id: '1', name: 'Baby Bottle Set', sku: 'BB-001', category: 'Feeding', price: 29.99, stock: 145, status: 'Active' },
  { id: '2', name: 'Kids Backpack', sku: 'BP-002', category: 'School', price: 45.00, stock: 89, status: 'Active' },
  { id: '3', name: 'Toy Car Collection', sku: 'TC-003', category: 'Toys', price: 89.99, stock: 234, status: 'Active' },
  { id: '4', name: 'Children Books Set', sku: 'BK-004', category: 'Education', price: 34.50, stock: 67, status: 'Active' },
  { id: '5', name: 'Baby Crib', sku: 'CR-005', category: 'Furniture', price: 299.99, stock: 12, status: 'Inactive' },
  { id: '6', name: 'Toddler Shoes', sku: 'SH-006', category: 'Clothing', price: 35.50, stock: 78, status: 'Active' },
  { id: '7', name: 'Educational Puzzle', sku: 'PZ-007', category: 'Toys', price: 19.99, stock: 156, status: 'Active' },
  { id: '8', name: 'Baby Monitor', sku: 'BM-008', category: 'Electronics', price: 129.99, stock: 34, status: 'Active' },
  { id: '9', name: 'Diaper Bag', sku: 'DB-009', category: 'Accessories', price: 49.99, stock: 92, status: 'Active' },
  { id: '10', name: 'Kids Lunch Box', sku: 'LB-010', category: 'School', price: 15.99, stock: 203, status: 'Active' },
  { id: '11', name: 'Baby Stroller', sku: 'ST-011', category: 'Transport', price: 399.99, stock: 15, status: 'Active' },
  { id: '12', name: 'Teething Toys', sku: 'TT-012', category: 'Baby Care', price: 12.99, stock: 187, status: 'Active' },
  { id: '13', name: 'Kids Helmet', sku: 'HM-013', category: 'Safety', price: 29.99, stock: 65, status: 'Active' },
  { id: '14', name: 'Baby Blanket', sku: 'BL-014', category: 'Bedding', price: 24.99, stock: 124, status: 'Active' },
  { id: '15', name: 'Play Mat', sku: 'PM-015', category: 'Toys', price: 39.99, stock: 8, status: 'Inactive' },
];

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    price: '',
    stock: '',
  });

  const [editData, setEditData] = useState<Product | null>(null);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: String(products.length + 1),
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      status: 'Active',
    };
    setProducts([...products, newProduct]);
    setFormData({ name: '', sku: '', category: '', price: '', stock: '' });
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({ ...product });
  };

  const handleSaveEdit = () => {
    if (editData && editingId) {
      setProducts(products.map((p) => (p.id === editingId ? editData : p)));
      setEditingId(null);
      setEditData(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when search changes
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

      {/* Add Product Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Product</CardTitle>
            <CardDescription>Fill in the details to create a new product</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
                  <Label htmlFor="stock">Stock Quantity</Label>
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
              <div className="flex gap-2">
                <Button type="submit">Create Product</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

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
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => {
                  const isEditing = editingId === product.id;
                  const displayProduct = isEditing && editData ? editData : product;

                  return (
                    <TableRow key={product.id} className={isEditing ? 'bg-muted/30' : ''}>
                      {/* Product Name */}
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editData?.name || ''}
                            onChange={(e) =>
                              setEditData({ ...editData!, name: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          displayProduct.name
                        )}
                      </TableCell>

                      {/* SKU */}
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {isEditing ? (
                          <Input
                            value={editData?.sku || ''}
                            onChange={(e) =>
                              setEditData({ ...editData!, sku: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          displayProduct.sku
                        )}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editData?.category || ''}
                            onChange={(e) =>
                              setEditData({ ...editData!, category: e.target.value })
                            }
                            className="h-8"
                          />
                        ) : (
                          displayProduct.category
                        )}
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right font-semibold">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData?.price || ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData!,
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          `$${displayProduct.price.toFixed(2)}`
                        )}
                      </TableCell>

                      {/* Stock */}
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editData?.stock || ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData!,
                                stock: parseInt(e.target.value) || 0,
                              })
                            }
                            className="h-8 text-right"
                          />
                        ) : (
                          <span
                            className={
                              displayProduct.stock < 20 ? 'text-red-600 font-medium' : ''
                            }
                          >
                            {displayProduct.stock}
                          </span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {isEditing ? (
                          <select
                            value={editData?.status || 'Active'}
                            onChange={(e) =>
                              setEditData({
                                ...editData!,
                                status: e.target.value as 'Active' | 'Inactive',
                              })
                            }
                            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              displayProduct.status === 'Active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {displayProduct.status}
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                onClick={handleSaveEdit}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(product)}
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
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 flex items-center justify-between">
            {/* Items per page selector */}
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

            {/* Pagination component */}
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
