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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  FolderTree
} from 'lucide-react';

export const Route = createFileRoute('/dashboard/products/category')({
  component: CategoryPage,
});

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentCategory: string | null;
  productsCount: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Feeding',
    slug: 'feeding',
    description: 'Baby feeding essentials including bottles, bibs, and utensils',
    parentCategory: null,
    productsCount: 45,
    status: 'Active',
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Baby Bottles',
    slug: 'baby-bottles',
    description: 'Various types of baby bottles and accessories',
    parentCategory: 'Feeding',
    productsCount: 15,
    status: 'Active',
    createdAt: '2024-01-15'
  },
  {
    id: '3',
    name: 'Toys',
    slug: 'toys',
    description: 'Educational and entertainment toys for children',
    parentCategory: null,
    productsCount: 78,
    status: 'Active',
    createdAt: '2024-01-16'
  },
  {
    id: '4',
    name: 'Educational Toys',
    slug: 'educational-toys',
    description: 'Learning and development toys',
    parentCategory: 'Toys',
    productsCount: 32,
    status: 'Active',
    createdAt: '2024-01-16'
  },
  {
    id: '5',
    name: 'School',
    slug: 'school',
    description: 'School supplies and accessories',
    parentCategory: null,
    productsCount: 56,
    status: 'Active',
    createdAt: '2024-01-17'
  },
  {
    id: '6',
    name: 'Backpacks',
    slug: 'backpacks',
    description: 'School backpacks and bags',
    parentCategory: 'School',
    productsCount: 23,
    status: 'Active',
    createdAt: '2024-01-17'
  },
  {
    id: '7',
    name: 'Clothing',
    slug: 'clothing',
    description: 'Kids and baby clothing',
    parentCategory: null,
    productsCount: 134,
    status: 'Active',
    createdAt: '2024-01-18'
  },
  {
    id: '8',
    name: 'Shoes',
    slug: 'shoes',
    description: 'Footwear for children',
    parentCategory: 'Clothing',
    productsCount: 45,
    status: 'Active',
    createdAt: '2024-01-18'
  },
  {
    id: '9',
    name: 'Furniture',
    slug: 'furniture',
    description: 'Children and baby furniture',
    parentCategory: null,
    productsCount: 28,
    status: 'Active',
    createdAt: '2024-01-19'
  },
  {
    id: '10',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Baby monitors and electronic devices',
    parentCategory: null,
    productsCount: 12,
    status: 'Inactive',
    createdAt: '2024-01-20'
  },
];

function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentCategory: '',
  });

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    return categories.filter((category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categories, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const paginatedCategories = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCategories.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCategories, currentPage, itemsPerPage]);

  const handleDelete = (id: string) => {
    const category = categories.find(c => c.id === id);
    setCategories(categories.filter((c) => c.id !== id));
    toast.success('Category deleted', {
      description: category ? `"${category.name}" has been deleted successfully` : 'Category has been deleted'
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewCategory = (category: Category) => {
    setSelectedCategory(category);
    setViewDrawerOpen(true);
  };

  const handleAddCategory = () => {
    setFormMode('add');
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentCategory: '',
    });
    setFormDrawerOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setFormMode('edit');
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentCategory: category.parentCategory || '',
    });
    setFormDrawerOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (formMode === 'add') {
      const newCategory: Category = {
        id: String(categories.length + 1),
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        parentCategory: formData.parentCategory || null,
        productsCount: 0,
        status: 'Active',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setCategories([...categories, newCategory]);
      toast.success('Category created', {
        description: `"${formData.name}" has been created successfully`
      });
    } else if (formMode === 'edit' && selectedCategory) {
      setCategories(categories.map(c =>
        c.id === selectedCategory.id
          ? {
              ...c,
              name: formData.name,
              slug: formData.slug,
              description: formData.description,
              parentCategory: formData.parentCategory || null,
            }
          : c
      ));
      toast.success('Category updated', {
        description: `"${formData.name}" has been updated successfully`
      });
    }
    setFormDrawerOpen(false);
  };

  // Get parent categories for dropdown
  const parentCategories = categories.filter(c => c.parentCategory === null);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Organize products into categories and subcategories
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {filteredCategories.length} of {categories.length} categories
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
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
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead className="w-[150px]">Slug</TableHead>
                  <TableHead className="min-w-[250px]">Description</TableHead>
                  <TableHead className="w-[150px]">Parent Category</TableHead>
                  <TableHead className="w-[100px] text-right">Products</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.map((category) => (
                  <TableRow
                    key={category.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewCategory(category)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {category.parentCategory && (
                          <FolderTree className="h-4 w-4 text-muted-foreground" />
                        )}
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {category.slug}
                    </TableCell>
                    <TableCell className="text-sm">
                      {category.description}
                    </TableCell>
                    <TableCell>
                      {category.parentCategory ? (
                        <Badge variant="outline">{category.parentCategory}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Root</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {category.productsCount}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={category.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          category.status === 'Active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {category.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewCategory(category)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(category.id)}
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
              totalItems={filteredCategories.length}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Category Drawer (Right Side) */}
      <Drawer open={viewDrawerOpen} onOpenChange={setViewDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedCategory?.name}</DrawerTitle>
                <DrawerDescription>Category Details</DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          {selectedCategory && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Category Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedCategory.name}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Slug</Label>
                  <p className="text-sm font-mono mt-1">{selectedCategory.slug}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedCategory.description}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Parent Category</Label>
                  <p className="text-sm mt-1">
                    {selectedCategory.parentCategory ? (
                      <Badge variant="outline">{selectedCategory.parentCategory}</Badge>
                    ) : (
                      <span className="text-muted-foreground">Root Category</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Products Count</Label>
                  <p className="text-2xl font-bold mt-1">{selectedCategory.productsCount}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge
                      variant={selectedCategory.status === 'Active' ? 'default' : 'secondary'}
                      className={
                        selectedCategory.status === 'Active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                          : ''
                      }
                    >
                      {selectedCategory.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Created At</Label>
                  <p className="text-sm mt-1">{selectedCategory.createdAt}</p>
                </div>
              </div>
            </div>
          )}

          <DrawerFooter>
            <Button onClick={() => selectedCategory && handleEditCategory(selectedCategory)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Category
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Add/Edit Category Form Drawer (Left Side) */}
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
                placeholder="Feeding"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="feeding"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                URL-friendly version of the name. Use lowercase and hyphens.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Baby feeding essentials..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentCategory">Parent Category (Optional)</Label>
              <select
                id="parentCategory"
                value={formData.parentCategory}
                onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">None (Root Category)</option>
                {parentCategories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <DrawerFooter className="px-0">
              <Button type="submit" className="w-full">
                {formMode === 'add' ? 'Create Category' : 'Update Category'}
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
