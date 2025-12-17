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
  FolderTree,
  Loader2,
} from 'lucide-react';
import { Category, categoryApi, CreateCategoryInput } from '@/lib/api';
import { DataTable } from '@/components/ui/data-table';
import { getCategoryColumns, categoryStatusOptions } from '@/components/ui/data-table/columns';

export const Route = createFileRoute('/dashboard/products/category')({
  component: CategoryPage,
});

/**
 * Render the Categories management page for viewing, creating, editing, and deleting product categories.
 *
 * Displays a searchable, filterable table of categories, provides a drawer-based form for adding or editing a category
 * (including parent selection and status), and presents a confirmation dialog for deletions. Handles data fetching
 * and mutation side effects such as query invalidation and success/error toasts.
 *
 * @returns The Categories management page UI as a React element.
 */
function CategoryPage() {
  const queryClient = useQueryClient();

  // Drawer states
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    color: '',
    status: 'active' as 'active' | 'inactive',
    parentId: '' as string | null,
  });

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Fetch categories
  const { data: categoriesData, isLoading, error } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const categories = categoriesData?.categories || [];

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: CreateCategoryInput) => categoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create category', {
        description: error.message,
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCategoryInput> }) =>
      categoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category updated successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update category', {
        description: error.message,
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted successfully');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete category', {
        description: error.message,
      });
    },
  });

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
    }
  };

  const handleAddCategory = () => {
    setFormMode('add');
    setFormData({
      name: '',
      description: '',
      icon: '',
      color: '',
      status: 'active',
      parentId: null,
    });
    setFormDrawerOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setFormMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '',
      status: category.status,
      parentId: category.parentId || null,
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    const categoryData: CreateCategoryInput = {
      name: formData.name,
      description: formData.description || undefined,
      icon: formData.icon || undefined,
      color: formData.color || undefined,
      status: formData.status,
      parentId: formData.parentId || null,
    };

    if (formMode === 'add') {
      createCategoryMutation.mutate(categoryData);
    } else if (formMode === 'edit' && selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data: categoryData });
    }
  };

  // Memoize columns with callbacks
  const columns = useMemo(
    () =>
      getCategoryColumns({
        onEdit: handleEditCategory,
        onDelete: handleDelete,
      }),
    []
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
            <p className="text-muted-foreground mt-1">
              Manage product categories
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading categories</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['categories'] })}
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
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Manage product categories
          </p>
        </div>
        <Button onClick={handleAddCategory} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            {categories.length} categories total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 && !isLoading ? (
            <div className="text-center py-12">
              <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No categories yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Get started by creating your first category
              </p>
              <Button onClick={handleAddCategory} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={categories}
              searchKey="name"
              searchPlaceholder="Search categories..."
              isLoading={isLoading}
              filterableColumns={[
                {
                  id: 'status',
                  title: 'Status',
                  options: categoryStatusOptions,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Category Form Drawer */}
      <Drawer open={formDrawerOpen} onOpenChange={setFormDrawerOpen}>
        <DrawerContent side="left">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>
                  {formMode === 'add' ? 'Add New Category' : 'Edit Category'}
                </DrawerTitle>
                <DrawerDescription>
                  {formMode === 'add'
                    ? 'Create a new product category'
                    : 'Update category information'}
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
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                placeholder="e.g., Toys, Feeding, Clothing"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">
                Parent Category
                <span className="text-xs text-muted-foreground ml-1">(Optional)</span>
              </Label>
              <select
                id="parentId"
                value={formData.parentId || ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="">None (Top-level category)</option>
                {categories
                  .filter(cat => {
                    // Don't show the current category being edited as an option
                    if (formMode === 'edit' && cat.id === selectedCategory?.id) {
                      return false;
                    }
                    // Only show top-level categories (categories without parents) as selectable parents
                    return !cat.parentId;
                  })
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Only top-level categories can be selected as parents. We support 2 levels: category and subcategory.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                className="w-full"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending || updateCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {formMode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  formMode === 'add' ? 'Create Category' : 'Update Category'
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
              {categoryToDelete && (
                <>
                  You are about to delete the category <strong>"{categoryToDelete.name}"</strong>.
                  This action cannot be undone. Products in this category will become uncategorized.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCategoryToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? (
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