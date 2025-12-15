import { createFileRoute } from '@tanstack/react-router';
import {
  useProducts,
  useCategories,
  useCreateProduct,
  useDeleteProduct,
} from '@/hooks/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/test')({
  component: ProductTestPage,
});

function ProductTestPage() {
  // TanStack Query hooks
  const { data: productsData, isLoading: productsLoading } = useProducts();
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories();
  const createProductMutation = useCreateProduct();
  const deleteProductMutation = useDeleteProduct();

  const products = productsData?.products || [];
  const categories = categoriesData?.categories || [];

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    sku: '',
    description: '',
    categoryId: '',
    price: 0,
    retailPrice: 0,
    wholesalePrice: 0,
    baseUnit: 'PCS',
    wholesaleThreshold: 100,
    minimumOrderQuantity: 1,
    availableForRetail: true,
    availableForWholesale: true,
    status: 'omnichannel sales' as const,
    isBundle: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProductMutation.mutateAsync(formData);
      toast.success('Product created successfully!');
      setShowForm(false);
      setFormData({
        barcode: '',
        name: '',
        sku: '',
        description: '',
        categoryId: '',
        price: 0,
        retailPrice: 0,
        wholesalePrice: 0,
        baseUnit: 'PCS',
        wholesaleThreshold: 100,
        minimumOrderQuantity: 1,
        availableForRetail: true,
        availableForWholesale: true,
        status: 'omnichannel sales',
        isBundle: false,
      });
      // No need to manually refetch - TanStack Query handles cache invalidation
    } catch (error) {
      toast.error('Failed to create product');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProductMutation.mutateAsync(id);
        toast.success('Product deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete product');
        console.error(error);
      }
    }
  };

  if (productsLoading || categoriesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Integration Test</h1>
          <p className="text-muted-foreground mt-1">
            Testing TanStack Query integration with backend (Phase F2)
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Product</CardTitle>
            <CardDescription>
              Add a new product to the catalog (stock managed via Inventory Service - DDD compliant)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Barcode</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Product Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Base Unit</Label>
                  <Input
                    value={formData.baseUnit}
                    onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Base Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label>Retail Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.retailPrice}
                    onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Wholesale Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Note about stock management */}
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Stock is managed separately via the Inventory Service.
                  After creating this product, assign it to warehouses in the Inventory section.
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createProductMutation.isPending}>
                  {createProductMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Product
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Products ({products.length})</CardTitle>
          <CardDescription>Products from real backend API (DDD-compliant - no stock field)</CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No products found. Create one to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      SKU: {product.sku} | Price: Rp {product.price.toLocaleString('id-ID')} | Status: {product.status}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      disabled={deleteProductMutation.isPending}
                    >
                      {deleteProductMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories ({categories.length})</CardTitle>
          <CardDescription>Available categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="p-2 border rounded">
                <strong>{category.name}</strong>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
