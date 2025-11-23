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
import { Checkbox } from '@/components/ui/checkbox';
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
  Star,
  Image as ImageIcon,
  Settings2,
  Package,
  X,
  Loader2,
} from 'lucide-react';
import {
  Product,
  ProductUOM,
  CreateProductInput,
  productApi,
  categoryApi,
  warehouseApi,
  uomApi,
  productLocationApi,
} from '@/lib/api';
import { ImageUpload, ImageUploadResult } from '@/components/ImageUpload';
import { VideoUpload, VideoUploadResult } from '@/components/VideoUpload';

export const Route = createFileRoute('/dashboard/products/all')({
  component: AllProductsPage,
});

// Available columns configuration
const availableColumns = [
  { id: 'barcode', label: 'Barcode', default: true },
  { id: 'name', label: 'Product Name', default: true },
  { id: 'sku', label: 'SKU', default: true },
  { id: 'category', label: 'Category', default: true },
  { id: 'price', label: 'Price', default: true },
  { id: 'stock', label: 'Stock', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'rating', label: 'Rating', default: false },
];

function AllProductsPage() {
  const queryClient = useQueryClient();

  // Rupiah currency formatter
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Drawer states
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [formDrawerOpen, setFormDrawerOpen] = useState(false);
  const [productDetailDrawerOpen, setProductDetailDrawerOpen] = useState(false);
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
    categoryId: '',
    price: '',
    stock: '',
    baseUnit: 'PCS',
    wholesaleThreshold: '12',
    status: 'active' as 'active' | 'inactive' | 'discontinued',
    // Optional location fields
    warehouseId: '',
    rack: '',
    bin: '',
    zone: '',
    aisle: '',
  });

  // Product UOM management states
  const [productUOMs, setProductUOMs] = useState<ProductUOM[]>([]);
  const [selectedUOM, setSelectedUOM] = useState('');
  const [uomBarcode, setUomBarcode] = useState('');
  const [uomStock, setUomStock] = useState('');

  // Delete confirmation states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [uomToDelete, setUomToDelete] = useState<ProductUOM | null>(null);

  // Media upload states
  const [uploadedImages, setUploadedImages] = useState<ImageUploadResult[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<VideoUploadResult[]>([]);

  // Fetch products - removed searchTerm from queryKey to fix invalidation issue
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getAll(),
  });

  const products = productsData?.products || [];

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.getAll(),
  });

  const categories = categoriesData?.categories || [];

  // Fetch warehouses
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseApi.getAll(),
  });

  const warehouses = warehousesData?.warehouses || [];

  // Fetch UOMs from master data
  const { data: uomsData } = useQuery({
    queryKey: ['uoms'],
    queryFn: () => uomApi.getAll(),
  });

  const availableUOMs = uomsData?.uoms || [];

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductInput) => productApi.create(data),
    onSuccess: () => {
      // Invalidate all products queries (including those with search term)
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to create product', {
        description: error.message,
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductInput> }) =>
      productApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', selectedProduct?.id] });
      toast.success('Product updated successfully');
      setFormDrawerOpen(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to update product', {
        description: error.message,
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete product', {
        description: error.message,
      });
    },
  });

  // Helper function: Generate barcode (EAN-13 format)
  const generateBarcode = () => {
    const randomDigits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(randomDigits[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return randomDigits + checksum;
  };

  // Helper function: Check if barcode is unique
  const isBarcodeUnique = (barcode: string, excludeProductId?: string) => {
    const existsInProducts = products.some(p =>
      p.barcode === barcode && p.id !== excludeProductId
    );
    if (existsInProducts) return false;

    const existsInCurrentUOMs = productUOMs.some(uom =>
      uom.barcode === barcode && uom.uomCode !== 'PCS'
    );
    if (existsInCurrentUOMs) return false;

    return true;
  };

  // Helper function: Generate unique barcode
  const generateUniqueBarcode = () => {
    let barcode = generateBarcode();
    let attempts = 0;
    const excludeId = formMode === 'edit' ? selectedProduct?.id : undefined;

    while (!isBarcodeUnique(barcode, excludeId) && attempts < 100) {
      barcode = generateBarcode();
      attempts++;
    }

    if (attempts >= 100) {
      toast.error('Failed to generate unique barcode', {
        description: 'Please try again or enter manually'
      });
      return '';
    }

    return barcode;
  };

  // Helper function: Generate SKU from category and product name
  const generateSKU = (categoryId: string, productName: string) => {
    if (!categoryId || !productName) return '';

    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';

    const categoryCode = category.name
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    const nameCode = productName
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    const prefix = `${categoryCode}-${nameCode}`;
    const existingProducts = products.filter(p => p.sku.startsWith(prefix));
    const nextNumber = String(existingProducts.length + 1).padStart(2, '0');

    return `${prefix}-${nextNumber}`;
  };

  // Auto-generate SKU when category or name changes
  const handleCategoryOrNameChange = (field: 'categoryId' | 'name', value: string) => {
    const updatedFormData = { ...formData, [field]: value };

    if (formMode === 'add' || !formData.sku) {
      const categoryId = field === 'categoryId' ? value : formData.categoryId;
      const name = field === 'name' ? value : formData.name;

      if (categoryId && name) {
        updatedFormData.sku = generateSKU(categoryId, name);
      }
    }

    setFormData(updatedFormData);
  };

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode.includes(searchTerm)
    );
  }, [products, searchTerm]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleViewProduct = async (product: Product) => {
    // Fetch full product details with variants and UOMs
    const fullProduct = await productApi.getById(product.id);
    setSelectedProduct(fullProduct);
    setProductDetailDrawerOpen(true);
  };

  const handleAddProduct = () => {
    setFormMode('add');
    setFormData({
      barcode: '',
      name: '',
      description: '',
      sku: '',
      categoryId: '',
      price: '',
      stock: '',
      baseUnit: 'PCS',
      wholesaleThreshold: '12',
      status: 'active',
      // Optional location fields
      warehouseId: '',
      rack: '',
      bin: '',
      zone: '',
      aisle: '',
    });
    setProductUOMs([]);
    setSelectedUOM('');
    setUomBarcode('');
    setUomStock('');
    setFormDrawerOpen(true);
  };

  const handleEditProduct = async (product: Product) => {
    setFormMode('edit');
    // Fetch full product details
    const fullProduct = await productApi.getById(product.id);
    setSelectedProduct(fullProduct);

    // Get first location if exists (for editing)
    const firstLocation = fullProduct.productLocations?.[0];

    setFormData({
      barcode: fullProduct.barcode,
      name: fullProduct.name,
      description: fullProduct.description || '',
      sku: fullProduct.sku,
      categoryId: fullProduct.categoryId || '',
      price: fullProduct.price.toString(),
      stock: fullProduct.stock.toString(),
      baseUnit: fullProduct.baseUnit,
      wholesaleThreshold: fullProduct.wholesaleThreshold.toString(),
      status: fullProduct.status,
      // Optional location fields - populate from first location if exists
      warehouseId: firstLocation?.warehouseId || '',
      rack: firstLocation?.rack || '',
      bin: firstLocation?.bin || '',
      zone: firstLocation?.zone || '',
      aisle: firstLocation?.aisle || '',
    });
    setProductUOMs(fullProduct.productUOMs || []);
    setSelectedUOM('');
    setUomBarcode('');
    setUomStock('');
    setFormDrawerOpen(true);
  };

  // Calculate total PCS allocated to UOMs
  const calculateAllocatedPCS = (uoms: ProductUOM[]) => {
    return uoms.reduce((total, uom) => {
      return total + (uom.stock * uom.conversionFactor);
    }, 0);
  };

  // Get remaining PCS available for UOMs
  const getRemainingPCS = () => {
    const totalStock = parseInt(formData.stock) || 0;
    const allocatedPCS = calculateAllocatedPCS(productUOMs);
    return totalStock - allocatedPCS;
  };

  const handleAddUOM = () => {
    if (!selectedUOM || !uomBarcode || !uomStock) {
      toast.error('Missing UOM information', {
        description: 'Please fill in UOM, barcode, and stock quantity'
      });
      return;
    }

    const uom = availableUOMs.find(u => u.code === selectedUOM);
    if (!uom) return;

    if (productUOMs.some(pu => pu.uomCode === selectedUOM)) {
      toast.error('UOM already added', {
        description: 'This UOM has already been added to the product'
      });
      return;
    }

    const excludeId = formMode === 'edit' ? selectedProduct?.id : undefined;
    if (!isBarcodeUnique(uomBarcode, excludeId)) {
      toast.error('Barcode already exists', {
        description: 'This barcode is already used by another product or UOM. Please click the refresh button to generate a new barcode.'
      });
      return;
    }

    if (uomBarcode === formData.barcode && uom.code !== 'PCS') {
      toast.error('Duplicate barcode', {
        description: 'This barcode is the same as the main product barcode. Please use a different barcode for additional UOMs.'
      });
      return;
    }

    const uomStockInPCS = parseInt(uomStock) * uom.conversionFactor;
    const remainingPCS = getRemainingPCS();

    if (uomStockInPCS > remainingPCS) {
      toast.error('Insufficient stock', {
        description: `Cannot allocate ${uomStockInPCS} PCS to this UOM. Only ${remainingPCS} PCS available. Reduce UOM quantity or increase product stock.`
      });
      return;
    }

    const newUOM: ProductUOM = {
      id: `uom-temp-${Date.now()}`,
      productId: selectedProduct?.id || '',
      uomCode: uom.code,
      uomName: uom.name,
      barcode: uomBarcode,
      conversionFactor: uom.conversionFactor,
      stock: parseInt(uomStock),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setProductUOMs([...productUOMs, newUOM]);
    setSelectedUOM('');
    setUomBarcode('');
    setUomStock('');
    toast.success('UOM added', {
      description: `${uom.name} has been added successfully`
    });
  };

  const handleRemoveUOM = (uom: ProductUOM) => {
    setUomToDelete(uom);
    setDeleteDialogOpen(true);
  };

  const handleSetDefaultUOM = (uomId: string) => {
    const clickedUOM = productUOMs.find(u => u.id === uomId);

    if (clickedUOM?.isDefault) {
      setProductUOMs(productUOMs.map(uom => ({
        ...uom,
        isDefault: uom.id === uomId ? false : uom.isDefault
      })));
      toast.info('Default unchecked', {
        description: 'Leave all unchecked to use PCS as default, or check another UOM'
      });
    } else {
      setProductUOMs(productUOMs.map(uom => ({
        ...uom,
        isDefault: uom.id === uomId
      })));
      if (clickedUOM) {
        toast.success('Default UOM updated', {
          description: `${clickedUOM.uomName} is now the default unit`
        });
      }
    }
  };

  const confirmDeleteUOM = () => {
    if (uomToDelete) {
      setProductUOMs(productUOMs.filter(uom => uom.id !== uomToDelete.id));
      toast.success('UOM removed', {
        description: `${uomToDelete.uomName} has been removed`
      });
      setDeleteDialogOpen(false);
      setUomToDelete(null);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const excludeId = formMode === 'edit' ? selectedProduct?.id : undefined;
    if (!isBarcodeUnique(formData.barcode, excludeId)) {
      toast.error('Barcode already exists', {
        description: 'This barcode is already used by another product. Please use a different barcode or click refresh to generate a new one.'
      });
      return;
    }

    // Auto-create PCS UOM if not added manually
    let finalProductUOMs = [...productUOMs];
    if (!finalProductUOMs.some(u => u.uomCode === 'PCS')) {
      const hasDefault = finalProductUOMs.some(u => u.isDefault);

      const pcsUOM: ProductUOM = {
        id: `uom-pcs-${Date.now()}`,
        productId: selectedProduct?.id || '',
        uomCode: 'PCS',
        uomName: 'Pieces',
        barcode: formData.barcode,
        conversionFactor: 1,
        stock: parseInt(formData.stock),
        isDefault: !hasDefault,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (pcsUOM.isDefault) {
        finalProductUOMs = finalProductUOMs.map(u => ({ ...u, isDefault: false }));
      }

      finalProductUOMs = [pcsUOM, ...finalProductUOMs];
    }

    if (!finalProductUOMs.some(u => u.isDefault) && finalProductUOMs.length > 0) {
      finalProductUOMs[0].isDefault = true;
    }

    const productData: CreateProductInput = {
      barcode: formData.barcode,
      name: formData.name,
      sku: formData.sku,
      description: formData.description,
      categoryId: formData.categoryId || undefined,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      baseUnit: formData.baseUnit,
      wholesaleThreshold: parseInt(formData.wholesaleThreshold),
      status: formData.status,
      availableForRetail: true,
      availableForWholesale: true,
      minimumOrderQuantity: 1,
    };

    if (formMode === 'add') {
      try {
        // Create product first
        const createdProduct = await productApi.create(productData);

        // Create all product UOMs
        if (finalProductUOMs.length > 0) {
          try {
            for (const uom of finalProductUOMs) {
              await uomApi.addProductUOM({
                productId: createdProduct.id,
                uomCode: uom.uomCode,
                uomName: uom.uomName,
                barcode: uom.barcode,
                conversionFactor: uom.conversionFactor,
                stock: uom.stock,
                isDefault: uom.isDefault,
              });
            }
          } catch (uomError) {
            console.error('Failed to create product UOMs:', uomError);
            toast.warning('Product created, but some UOMs could not be added', {
              description: 'You can add UOMs later by editing the product'
            });
          }
        }

        // If warehouse is selected, create location (optional)
        if (formData.warehouseId) {
          try {
            await productLocationApi.create({
              productId: createdProduct.id,
              warehouseId: formData.warehouseId,
              rack: formData.rack || null,
              bin: formData.bin || null,
              zone: formData.zone || null,
              aisle: formData.aisle || null,
              quantity: parseInt(formData.stock),
            });
          } catch (locationError) {
            console.error('Failed to create product location:', locationError);
            toast.info('Product created, but location could not be set', {
              description: 'You can add the location later'
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast.success('Product created successfully');
        setFormDrawerOpen(false);
      } catch (error: any) {
        toast.error('Failed to create product', {
          description: error.message,
        });
      }
    } else if (formMode === 'edit' && selectedProduct) {
      try {
        // Update product first
        await productApi.update(selectedProduct.id, productData);

        // Sync Product UOMs
        if (finalProductUOMs.length > 0) {
          try {
            const existingUOMs = selectedProduct.productUOMs || [];

            // Add or update UOMs
            for (const uom of finalProductUOMs) {
              const existingUOM = existingUOMs.find(e => e.uomCode === uom.uomCode);

              if (existingUOM) {
                // Update existing UOM if there are changes
                if (
                  existingUOM.barcode !== uom.barcode ||
                  existingUOM.stock !== uom.stock ||
                  existingUOM.isDefault !== uom.isDefault
                ) {
                  await uomApi.updateProductUOM(existingUOM.id, {
                    barcode: uom.barcode,
                    stock: uom.stock,
                    isDefault: uom.isDefault,
                  });
                }
              } else {
                // Add new UOM
                await uomApi.addProductUOM({
                  productId: selectedProduct.id,
                  uomCode: uom.uomCode,
                  uomName: uom.uomName,
                  barcode: uom.barcode,
                  conversionFactor: uom.conversionFactor,
                  stock: uom.stock,
                  isDefault: uom.isDefault,
                });
              }
            }

            // Delete removed UOMs
            for (const existingUOM of existingUOMs) {
              const stillExists = finalProductUOMs.find(u => u.uomCode === existingUOM.uomCode);
              if (!stillExists) {
                await uomApi.deleteProductUOM(existingUOM.id);
              }
            }
          } catch (uomError) {
            console.error('Failed to sync product UOMs:', uomError);
            toast.warning('Product updated, but some UOM changes could not be saved', {
              description: 'You may need to update UOMs separately'
            });
          }
        }

        // Handle location update (optional)
        if (formData.warehouseId) {
          // Check if location already exists for this product-warehouse combo
          const existingLocations = selectedProduct.productLocations || [];
          const existingLocation = existingLocations.find(
            loc => loc.warehouseId === formData.warehouseId
          );

          try {
            if (existingLocation) {
              // Update existing location
              await productLocationApi.update(existingLocation.id, {
                rack: formData.rack || null,
                bin: formData.bin || null,
                zone: formData.zone || null,
                aisle: formData.aisle || null,
                quantity: parseInt(formData.stock),
              });
            } else {
              // Create new location
              await productLocationApi.create({
                productId: selectedProduct.id,
                warehouseId: formData.warehouseId,
                rack: formData.rack || null,
                bin: formData.bin || null,
                zone: formData.zone || null,
                aisle: formData.aisle || null,
                quantity: parseInt(formData.stock),
              });
            }
          } catch (locationError) {
            console.error('Failed to update product location:', locationError);
            toast.info('Product updated, but location could not be set', {
              description: 'You can update the location later'
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['product', selectedProduct.id] });
        toast.success('Product updated successfully');
        setFormDrawerOpen(false);
      } catch (error: any) {
        toast.error('Failed to update product', {
          description: error.message,
        });
      }
    }
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  // Handle image upload success
  const handleImageUploadSuccess = (result: ImageUploadResult) => {
    setUploadedImages(prev => [...prev, result]);
    toast.success('Image uploaded successfully', {
      description: 'Your product image has been uploaded and optimized'
    });
  };

  // Handle image upload error
  const handleImageUploadError = (error: string) => {
    toast.error('Image upload failed', {
      description: error
    });
  };

  // Handle video upload success
  const handleVideoUploadSuccess = (result: VideoUploadResult) => {
    setUploadedVideos(prev => [...prev, result]);
    toast.success('Video uploaded successfully', {
      description: 'Your product video has been uploaded'
    });
  };

  // Handle video upload error
  const handleVideoUploadError = (error: string) => {
    toast.error('Video upload failed', {
      description: error
    });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1">
              Manage your product inventory and catalog
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Error loading products</p>
              <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No products yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Get started by creating your first product
              </p>
              <Button onClick={handleAddProduct} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          ) : (
            <>
              {/* Table */}
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
                      {visibleColumns.includes('rating') && (
                        <TableHead className="w-[120px]">Rating</TableHead>
                      )}
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => {
                      const category = categories.find(c => c.id === product.categoryId);
                      return (
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
                              <Badge variant="secondary">{category?.name || 'Uncategorized'}</Badge>
                            </TableCell>
                          )}
                          {visibleColumns.includes('price') && (
                            <TableCell className="text-right font-semibold">
                              {formatRupiah(product.price)}
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
                                variant={product.status === 'active' ? 'default' : 'secondary'}
                                className={
                                  product.status === 'active'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                                    : ''
                                }
                              >
                                {product.status}
                              </Badge>
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
                                onClick={() => handleDelete(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Product Detail Report Drawer (Right Side) */}
      <Drawer open={productDetailDrawerOpen} onOpenChange={setProductDetailDrawerOpen}>
        <DrawerContent side="right">
          <DrawerHeader>
            <div className="flex items-start justify-between">
              <div>
                <DrawerTitle>{selectedProduct?.name}</DrawerTitle>
                <DrawerDescription>Product Details & Inventory Report</DrawerDescription>
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
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Product Name</Label>
                  <p className="text-sm font-medium mt-1">{selectedProduct.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">SKU</Label>
                    <p className="text-sm font-mono mt-1">{selectedProduct.sku}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Barcode</Label>
                    <p className="text-sm font-mono mt-1">{selectedProduct.barcode}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm mt-1">{selectedProduct.description || 'No description'}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1">
                      {categories.find(c => c.id === selectedProduct.categoryId)?.name || 'Uncategorized'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedProduct.status === 'active' ? 'default' : 'secondary'}
                        className={
                          selectedProduct.status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500'
                            : ''
                        }
                      >
                        {selectedProduct.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <p className="text-lg font-bold mt-1">{formatRupiah(selectedProduct.price)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Stock</Label>
                    <p className="text-lg font-bold mt-1">{selectedProduct.stock}</p>
                  </div>
                </div>

                {selectedProduct.productUOMs && selectedProduct.productUOMs.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Product UOMs</Label>
                      <div className="mt-2 space-y-2">
                        {selectedProduct.productUOMs.map((uom) => (
                          <div key={uom.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="text-sm font-medium">{uom.uomName} ({uom.uomCode})</p>
                              <p className="text-xs text-muted-foreground">Barcode: {uom.barcode}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">Stock: {uom.stock}</p>
                              {uom.isDefault && (
                                <Badge variant="outline" className="text-xs">Default</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {selectedProduct.productLocations && selectedProduct.productLocations.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Product Locations</Label>
                      <div className="mt-2 space-y-2">
                        {selectedProduct.productLocations.map((location) => {
                          const warehouse = warehouses.find(w => w.id === location.warehouseId);
                          return (
                            <div key={location.id} className="p-3 border rounded bg-muted/30">
                              <p className="text-sm font-medium mb-2">{warehouse?.name || 'Unknown Warehouse'}</p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {location.rack && (
                                  <div>
                                    <span className="text-muted-foreground">Rack:</span>
                                    <span className="ml-1 font-medium">{location.rack}</span>
                                  </div>
                                )}
                                {location.bin && (
                                  <div>
                                    <span className="text-muted-foreground">Bin:</span>
                                    <span className="ml-1 font-medium">{location.bin}</span>
                                  </div>
                                )}
                                {location.zone && (
                                  <div>
                                    <span className="text-muted-foreground">Zone:</span>
                                    <span className="ml-1 font-medium">{location.zone}</span>
                                  </div>
                                )}
                                {location.aisle && (
                                  <div>
                                    <span className="text-muted-foreground">Aisle:</span>
                                    <span className="ml-1 font-medium">{location.aisle}</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 pt-2 border-t">
                                <span className="text-xs text-muted-foreground">Quantity at location:</span>
                                <span className="ml-1 text-sm font-semibold">{location.quantity}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
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

      {/* Add/Edit Product Form Drawer (Left Side) - Simplified for now */}
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
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  placeholder="8901234567890"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const newBarcode = generateUniqueBarcode();
                    if (newBarcode) {
                      setFormData({ ...formData, barcode: newBarcode });
                      toast.success('Barcode generated');
                    }
                  }}
                  title="Generate unique barcode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                placeholder="Baby Bottle Set"
                value={formData.name}
                onChange={(e) => handleCategoryOrNameChange('name', e.target.value)}
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
              />
            </div>

            {/* Image Upload Section - Only available in edit mode */}
            {formMode === 'edit' && selectedProduct && (
              <>
                <Separator className="my-4" />
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Product Images</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload product images. Images will be automatically optimized and resized.
                    </p>
                  </div>
                  <ImageUpload
                    productId={selectedProduct.id}
                    onUploadSuccess={handleImageUploadSuccess}
                    onUploadError={handleImageUploadError}
                    maxSizeMB={5}
                  />
                </div>
                <Separator className="my-4" />
              </>
            )}

            {/* Video Upload Section - Only available in edit mode */}
            {formMode === 'edit' && selectedProduct && (
              <>
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Product Videos</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload product demonstration or promotional videos.
                    </p>
                  </div>
                  <VideoUpload
                    productId={selectedProduct.id}
                    onUploadSuccess={handleVideoUploadSuccess}
                    onUploadError={handleVideoUploadError}
                    maxSizeMB={500}
                    defaultMode="stream"
                  />
                </div>
                <Separator className="my-4" />
              </>
            )}

            {/* Notice for add mode */}
            {formMode === 'add' && (
              <>
                <Separator className="my-4" />
                <div className="p-4 bg-muted/50 border border-border rounded-lg">
                  <div className="flex items-start gap-3">
                    <ImageIcon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">Upload images and videos after creation</p>
                      <p className="text-muted-foreground mt-1">
                        Create the product first, then edit it to add images and videos with our optimized upload features.
                      </p>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU (Auto-generated)</Label>
                <Input
                  id="sku"
                  placeholder="TO-TA-01"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  required
                  readOnly
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category</Label>
                <select
                  id="categoryId"
                  value={formData.categoryId}
                  onChange={(e) => handleCategoryOrNameChange('categoryId', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (Rp)</Label>
                <Input
                  id="price"
                  type="number"
                  step="1000"
                  placeholder="50000"
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'discontinued' })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <Separator className="my-4" />

            {/* Product UOMs Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-base font-semibold">Product UOMs (Units of Measure)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add different packaging units for this product (e.g., Box, Dozen, Carton).
                    Each UOM can have its own barcode and stock quantity.
                  </p>
                </div>
              </div>

              {/* Stock allocation info */}
              <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded">
                <div className="text-sm">
                  <span className="font-medium text-foreground">Total Stock: </span>
                  <span className="text-muted-foreground">{formData.stock || 0} PCS</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Allocated: </span>
                  <span className="text-muted-foreground">{calculateAllocatedPCS(productUOMs)} PCS</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-foreground">Available: </span>
                  <span className="text-primary font-bold">{getRemainingPCS()} PCS</span>
                </div>
              </div>

              {/* Existing UOMs List */}
              {productUOMs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Added UOMs</Label>
                  <div className="space-y-2">
                    {productUOMs.map((uom) => (
                      <div key={uom.id} className="flex items-center justify-between p-3 border rounded bg-background">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{uom.uomName} ({uom.uomCode})</span>
                            {uom.isDefault && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground space-x-3">
                            <span>Barcode: {uom.barcode}</span>
                            <span>Stock: {uom.stock} {uom.uomCode}</span>
                            <span>({uom.stock * uom.conversionFactor} PCS)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Checkbox
                            checked={uom.isDefault}
                            onCheckedChange={() => handleSetDefaultUOM(uom.id)}
                            id={`default-${uom.id}`}
                          />
                          <Label htmlFor={`default-${uom.id}`} className="text-xs text-muted-foreground cursor-pointer mr-2">
                            Default
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemoveUOM(uom)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add UOM Form */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Add New UOM</Label>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="uom-select" className="text-xs">UOM Type</Label>
                    <select
                      id="uom-select"
                      value={selectedUOM}
                      onChange={(e) => setSelectedUOM(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      <option value="">Select UOM...</option>
                      {availableUOMs.filter(u => u.code !== 'PCS' && !u.isBaseUnit).map(uom => (
                        <option key={uom.id} value={uom.code}>
                          {uom.name} (1 = {uom.conversionFactor} PCS)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uom-barcode" className="text-xs">Barcode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="uom-barcode"
                        placeholder="UOM Barcode"
                        value={uomBarcode}
                        onChange={(e) => setUomBarcode(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newBarcode = generateUniqueBarcode();
                          if (newBarcode) {
                            setUomBarcode(newBarcode);
                            toast.success('Barcode generated');
                          }
                        }}
                        title="Generate unique barcode"
                        className="h-9 w-9"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                        </svg>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uom-stock" className="text-xs">Stock Quantity</Label>
                    <Input
                      id="uom-stock"
                      type="number"
                      placeholder="Stock"
                      value={uomStock}
                      onChange={(e) => setUomStock(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddUOM}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add UOM
                </Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Optional Location Section */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex items-start justify-between">
                <div>
                  <Label className="text-base font-semibold">Product Location (Optional)</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set the warehouse and precise location for this product. This is optional and can be added later.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="warehouseId">Warehouse</Label>
                <select
                  id="warehouseId"
                  value={formData.warehouseId}
                  onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="">No warehouse selected</option>
                  {warehouses.map(warehouse => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
              </div>

              {formData.warehouseId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="rack">Rack (Optional)</Label>
                      <Input
                        id="rack"
                        placeholder="A1, B3, R-01"
                        value={formData.rack}
                        onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bin">Bin (Optional)</Label>
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
                      <Label htmlFor="zone">Zone (Optional)</Label>
                      <Input
                        id="zone"
                        placeholder="Zone A, Cold Storage"
                        value={formData.zone}
                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="aisle">Aisle (Optional)</Label>
                      <Input
                        id="aisle"
                        placeholder="1, 2A, Main"
                        value={formData.aisle}
                        onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <DrawerFooter className="px-0">
              <Button
                type="submit"
                className="w-full"
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
              >
                {createProductMutation.isPending || updateProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {formMode === 'add' ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  formMode === 'add' ? 'Create Product' : 'Update Product'
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
              {productToDelete && (
                <>
                  You are about to delete <strong>"{productToDelete.name}"</strong>.
                  This action cannot be undone. This will permanently delete the product
                  and remove all associated data.
                </>
              )}
              {uomToDelete && (
                <>
                  You are about to remove <strong>{uomToDelete.uomName}</strong> from this product.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setProductToDelete(null);
              setUomToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (productToDelete) {
                  confirmDeleteProduct();
                } else if (uomToDelete) {
                  confirmDeleteUOM();
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProductMutation.isPending ? (
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
