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
import { Combobox } from '@/components/ui/combobox';
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

interface ProductUOM {
  id: string;
  uomCode: string;
  uomName: string;
  barcode: string;
  conversionFactor: number;
  price: number;
  isDefault: boolean;
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
  barcode: string; // Keep for backward compatibility (will be primary UOM barcode)
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
  // Multi-UOM barcode system
  productUOMs: ProductUOM[];
}

// Standard UOM for all products
const standardUOMs: UnitOfMeasure[] = [
  { code: 'PCS', name: 'Pieces', conversionFactor: 1, isBaseUnit: true },
  { code: 'DOZEN', name: 'Dozen', conversionFactor: 12, isBaseUnit: false },
  { code: 'BOX6', name: 'Box of 6', conversionFactor: 6, isBaseUnit: false },
  { code: 'CARTON18', name: 'Carton (18 PCS)', conversionFactor: 18, isBaseUnit: false },
  { code: 'BOX24', name: 'Box (24 PCS)', conversionFactor: 24, isBaseUnit: false },
];

// Available UOMs from master data (for selection in product form)
const availableUOMs = [
  { code: 'PCS', name: 'Pieces', conversionFactor: 1 },
  { code: 'DOZEN', name: 'Dozen', conversionFactor: 12 },
  { code: 'BOX6', name: 'Box of 6', conversionFactor: 6 },
  { code: 'CARTON18', name: 'Carton (18 PCS)', conversionFactor: 18 },
  { code: 'BOX24', name: 'Box (24 PCS)', conversionFactor: 24 },
];

// Mock Categories
const mockCategories = [
  { id: 'cat-001', name: 'Feeding' },
  { id: 'cat-002', name: 'School' },
  { id: 'cat-003', name: 'Toys' },
  { id: 'cat-004', name: 'Education' },
  { id: 'cat-005', name: 'Furniture' },
  { id: 'cat-006', name: 'Clothing' },
  { id: 'cat-007', name: 'Electronics' },
  { id: 'cat-008', name: 'Accessories' },
];

// Mock Warehouses
const mockWarehouses = [
  { id: 'WH-001', name: 'Main Warehouse' },
  { id: 'WH-002', name: 'Secondary Warehouse' },
  { id: 'WH-003', name: 'Regional Hub Jakarta' },
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
    productUOMs: [
      { id: 'uom-1-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567890', conversionFactor: 1, price: 29.99, isDefault: true },
      { id: 'uom-1-2', uomCode: 'BOX6', uomName: 'Box of 6', barcode: '8901234567906', conversionFactor: 6, price: 170.00, isDefault: false },
      { id: 'uom-1-3', uomCode: 'CARTON18', uomName: 'Carton (18 PCS)', barcode: '8901234567918', conversionFactor: 18, price: 485.00, isDefault: false },
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
    productUOMs: [
      { id: 'uom-2-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567891', conversionFactor: 1, price: 45.00, isDefault: true },
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
    productUOMs: [
      { id: 'uom-3-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567892', conversionFactor: 1, price: 89.99, isDefault: true },
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
    bundleItems: ['ABC Book', 'Numbers Book', 'Colors Book', 'Shapes Book', 'Animals Book'],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-003', warehouseName: 'Regional Hub Jakarta', stockQuantity: 67, retailPrice: 34.50, wholesalePrice: 30.00 },
    ],
    productUOMs: [
      { id: 'uom-4-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567893', conversionFactor: 1, price: 34.50, isDefault: true },
    ],
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
    ],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 12, retailPrice: 299.99, wholesalePrice: 270.00 },
    ],
    productUOMs: [
      { id: 'uom-5-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567894', conversionFactor: 1, price: 299.99, isDefault: true },
    ],
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
    ],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-002', warehouseName: 'Secondary Warehouse', stockQuantity: 78, retailPrice: 35.50, wholesalePrice: 32.00 },
    ],
    productUOMs: [
      { id: 'uom-6-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567895', conversionFactor: 1, price: 35.50, isDefault: true },
    ],
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
    isBundle: false,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-003', warehouseName: 'Regional Hub Jakarta', stockQuantity: 156, retailPrice: 19.99, wholesalePrice: 17.00 },
    ],
    productUOMs: [
      { id: 'uom-7-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567896', conversionFactor: 1, price: 19.99, isDefault: true },
    ],
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
    isBundle: false,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-001', warehouseName: 'Main Warehouse', stockQuantity: 34, retailPrice: 129.99, wholesalePrice: 115.00 },
    ],
    productUOMs: [
      { id: 'uom-8-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567897', conversionFactor: 1, price: 129.99, isDefault: true },
    ],
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
    ],
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-002', warehouseName: 'Secondary Warehouse', stockQuantity: 92, retailPrice: 49.99, wholesalePrice: 45.00 },
    ],
    productUOMs: [
      { id: 'uom-9-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567898', conversionFactor: 1, price: 49.99, isDefault: true },
    ],
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
    isBundle: false,
    baseUnit: 'PCS',
    alternateUnits: standardUOMs,
    wholesaleThreshold: 12,
    warehouseStock: [
      { warehouseId: 'WH-003', warehouseName: 'Regional Hub Jakarta', stockQuantity: 203, retailPrice: 15.99, wholesalePrice: 14.00 },
    ],
    productUOMs: [
      { id: 'uom-10-1', uomCode: 'PCS', uomName: 'Pieces', barcode: '8901234567899', conversionFactor: 1, price: 15.99, isDefault: true },
    ],
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
    category: '',
    price: '',
    stock: '',
    warehouse: '',
    warehouseId: '',
    baseUnit: 'PCS',
    wholesaleThreshold: '12',
  });

  // Product UOM management states
  const [productUOMs, setProductUOMs] = useState<ProductUOM[]>([]);
  const [selectedUOM, setSelectedUOM] = useState('');
  const [uomBarcode, setUomBarcode] = useState('');
  const [uomPrice, setUomPrice] = useState('');

  // Helper function: Generate barcode (EAN-13 format)
  const generateBarcode = () => {
    // Generate 12 random digits, then calculate checksum
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
    // Check in products (main barcodes)
    const existsInProducts = products.some(p =>
      p.barcode === barcode && p.id !== excludeProductId
    );
    if (existsInProducts) return false;

    // Check in product UOMs (but exclude PCS UOMs that match main barcode)
    const existsInUOMs = products.some(p => {
      if (p.id === excludeProductId) return false;
      return p.productUOMs?.some(uom =>
        uom.barcode === barcode && !(uom.uomCode === 'PCS' && p.barcode === barcode)
      );
    });
    if (existsInUOMs) return false;

    // Check in current form's additional UOMs (not PCS, as PCS uses main barcode)
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
  const generateSKU = (category: string, productName: string) => {
    if (!category || !productName) return '';

    // Get 2 letters from category (uppercase)
    const categoryCode = category
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    // Get 2 letters from product name (uppercase)
    const nameCode = productName
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    // Count existing products with same category+name prefix
    const prefix = `${categoryCode}-${nameCode}`;
    const existingProducts = products.filter(p => p.sku.startsWith(prefix));
    const nextNumber = String(existingProducts.length + 1).padStart(2, '0');

    return `${prefix}-${nextNumber}`;
  };

  // Auto-generate SKU when category or name changes
  const handleCategoryOrNameChange = (field: 'category' | 'name', value: string) => {
    const updatedFormData = { ...formData, [field]: value };

    // Only auto-generate SKU in add mode or if SKU is empty
    if (formMode === 'add' || !formData.sku) {
      const category = field === 'category' ? value : formData.category;
      const name = field === 'name' ? value : formData.name;

      if (category && name) {
        updatedFormData.sku = generateSKU(category, name);
      }
    }

    setFormData(updatedFormData);
  };

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
    const product = products.find(p => p.id === id);
    setProducts(products.filter((p) => p.id !== id));
    toast.success('Product deleted', {
      description: product ? `"${product.name}" has been deleted successfully` : 'Product has been deleted'
    });
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
    setProductDetailDrawerOpen(true);
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
      baseUnit: 'PCS',
      wholesaleThreshold: '12',
    });
    setProductUOMs([]);
    setSelectedUOM('');
    setUomBarcode('');
    setUomPrice('');
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
      baseUnit: product.baseUnit,
      wholesaleThreshold: product.wholesaleThreshold.toString(),
    });
    setProductUOMs(product.productUOMs || []);
    setSelectedUOM('');
    setUomBarcode('');
    setUomPrice('');
    setFormDrawerOpen(true);
  };

  const handleAddUOM = () => {
    if (!selectedUOM || !uomBarcode || !uomPrice) {
      toast.error('Missing UOM information', {
        description: 'Please fill in UOM, barcode, and price'
      });
      return;
    }

    const uom = availableUOMs.find(u => u.code === selectedUOM);
    if (!uom) return;

    // Check if UOM already added
    if (productUOMs.some(pu => pu.uomCode === selectedUOM)) {
      toast.error('UOM already added', {
        description: 'This UOM has already been added to the product'
      });
      return;
    }

    // Check if barcode is unique across all products and UOMs
    const excludeId = formMode === 'edit' ? selectedProduct?.id : undefined;
    if (!isBarcodeUnique(uomBarcode, excludeId)) {
      toast.error('Barcode already exists', {
        description: 'This barcode is already used by another product or UOM. Please use a different barcode.'
      });
      return;
    }

    // Check if same as main barcode (shouldn't happen for non-PCS)
    if (uomBarcode === formData.barcode && uom.code !== 'PCS') {
      toast.error('Duplicate barcode', {
        description: 'This barcode is the same as the main product barcode. Please use a different barcode for additional UOMs.'
      });
      return;
    }

    const newUOM: ProductUOM = {
      id: `uom-temp-${Date.now()}`,
      uomCode: uom.code,
      uomName: uom.name,
      barcode: uomBarcode,
      conversionFactor: uom.conversionFactor,
      price: parseFloat(uomPrice),
      isDefault: false, // Never default since PCS is auto-created as default
    };

    setProductUOMs([...productUOMs, newUOM]);
    setSelectedUOM('');
    setUomBarcode('');
    setUomPrice('');
    toast.success('UOM added', {
      description: `${uom.name} has been added successfully`
    });
  };

  const handleRemoveUOM = (id: string) => {
    setProductUOMs(productUOMs.filter(uom => uom.id !== id));
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate barcode uniqueness
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
      const pcsUOM: ProductUOM = {
        id: `uom-pcs-${Date.now()}`,
        uomCode: 'PCS',
        uomName: 'Pieces',
        barcode: formData.barcode,
        conversionFactor: 1,
        price: parseFloat(formData.price),
        isDefault: true,
      };
      finalProductUOMs = [pcsUOM, ...finalProductUOMs];
    }

    if (formMode === 'add') {
      const newProduct: Product = {
        id: String(products.length + 1),
        barcode: productUOMs.find(u => u.isDefault)?.barcode || productUOMs[0].barcode,
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
        isBundle: false,
        baseUnit: formData.baseUnit,
        alternateUnits: standardUOMs,
        wholesaleThreshold: parseInt(formData.wholesaleThreshold),
        warehouseStock: [
          {
            warehouseId: formData.warehouseId,
            warehouseName: formData.warehouse,
            stockQuantity: parseInt(formData.stock),
            retailPrice: parseFloat(formData.price),
            wholesalePrice: parseInt(formData.stock) >= parseInt(formData.wholesaleThreshold)
              ? parseFloat(formData.price) * 0.85
              : null,
          },
        ],
        productUOMs: finalProductUOMs,
      };
      setProducts([...products, newProduct]);
      toast.success('Product created', {
        description: `"${formData.name}" has been created successfully`
      });
    } else if (formMode === 'edit' && selectedProduct) {
      setProducts(products.map(p =>
        p.id === selectedProduct.id
          ? {
              ...p,
              barcode: productUOMs.find(u => u.isDefault)?.barcode || productUOMs[0].barcode,
              name: formData.name,
              description: formData.description,
              sku: formData.sku,
              category: formData.category,
              price: parseFloat(formData.price),
              stock: parseInt(formData.stock),
              warehouse: formData.warehouse,
              warehouseId: formData.warehouseId,
              baseUnit: formData.baseUnit,
              wholesaleThreshold: parseInt(formData.wholesaleThreshold),
              productUOMs: finalProductUOMs,
            }
          : p
      ));
      toast.success('Product updated', {
        description: `"${formData.name}" has been updated successfully`
      });
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
                      toast.success('Barcode generated', {
                        description: 'Unique barcode has been generated automatically'
                      });
                    }
                  }}
                  title="Generate unique barcode"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                  </svg>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click refresh to auto-generate a unique barcode
              </p>
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
                required
              />
            </div>

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
                <p className="text-xs text-muted-foreground">
                  Auto-generated from category + product name
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleCategoryOrNameChange('category', e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  <option value="">Select category...</option>
                  {mockCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
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

            <div className="space-y-2">
              <Label htmlFor="warehouseId">Warehouse</Label>
              <select
                id="warehouseId"
                value={formData.warehouseId}
                onChange={(e) => {
                  const warehouse = mockWarehouses.find(w => w.id === e.target.value);
                  setFormData({
                    ...formData,
                    warehouseId: e.target.value,
                    warehouse: warehouse?.name || ''
                  });
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                required
              >
                <option value="">Select warehouse...</option>
                {mockWarehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Stock will be added to this warehouse
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="baseUnit">Base Unit (UOM)</Label>
                <select
                  id="baseUnit"
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  required
                >
                  {standardUOMs
                    .filter(uom => uom.isBaseUnit)
                    .map(uom => (
                      <option key={uom.code} value={uom.code}>{uom.name} ({uom.code})</option>
                    ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  All inventory stored in this unit
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wholesaleThreshold">Wholesale Threshold</Label>
                <Input
                  id="wholesaleThreshold"
                  type="number"
                  min="1"
                  placeholder="12"
                  value={formData.wholesaleThreshold}
                  onChange={(e) => setFormData({ ...formData, wholesaleThreshold: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum {formData.baseUnit} for wholesale
                </p>
              </div>
            </div>

            <Separator />

            {/* Product UOMs Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Additional UOMs (Optional)</Label>
              <p className="text-xs text-muted-foreground">
                PCS will use barcode and price from above. Add other units like Box, Carton if needed.
                Each UOM needs a unique barcode and price.
              </p>

              {/* Add UOM Form */}
              <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Select UOM</Label>
                    <select
                      value={selectedUOM}
                      onChange={(e) => setSelectedUOM(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                      <option value="">Select UOM...</option>
                      {availableUOMs
                        .filter(u => u.code !== 'PCS' && !productUOMs.some(pu => pu.uomCode === u.code))
                        .map(uom => (
                          <option key={uom.code} value={uom.code}>
                            {uom.name} ({uom.conversionFactor} {formData.baseUnit})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Barcode</Label>
                    <Input
                      placeholder="8901234567890"
                      value={uomBarcode}
                      onChange={(e) => setUomBarcode(e.target.value)}
                      className="h-9"
                      disabled={!selectedUOM}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Price</Label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={uomPrice}
                        onChange={(e) => setUomPrice(e.target.value)}
                        className="h-9"
                        disabled={!selectedUOM}
                      />
                      <Button
                        type="button"
                        onClick={handleAddUOM}
                        disabled={!selectedUOM || !uomBarcode || !uomPrice}
                        className="h-9"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* UOM List */}
              {productUOMs.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">UOM</TableHead>
                        <TableHead>Barcode</TableHead>
                        <TableHead className="w-[80px] text-right">Factor</TableHead>
                        <TableHead className="w-[100px] text-right">Price</TableHead>
                        <TableHead className="w-[60px]">Default</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productUOMs.map((uom) => (
                        <TableRow key={uom.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium text-sm">{uom.uomCode}</div>
                              <div className="text-xs text-muted-foreground">{uom.uomName}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{uom.barcode}</TableCell>
                          <TableCell className="text-right">×{uom.conversionFactor}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${uom.price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {uom.isDefault && (
                              <Badge variant="outline" className="text-xs">Default</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleRemoveUOM(uom.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {productUOMs.length === 0 && (
                <div className="text-center py-6 border rounded-md border-dashed">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No UOMs added yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add at least one UOM (including PCS base unit)
                  </p>
                </div>
              )}
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
                {/* Basic Product Info */}
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <p className="text-sm mt-1">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={selectedProduct.status === 'Active' ? 'default' : 'secondary'}
                        className={
                          selectedProduct.status === 'Active'
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

                {/* UOM Information */}
                <div>
                  <Label className="text-xs text-muted-foreground">Base Unit</Label>
                  <p className="text-sm font-medium mt-1">{selectedProduct.baseUnit}</p>
                  <p className="text-xs text-muted-foreground">All inventory stored in this unit</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Unit of Measure Conversions</Label>
                  <div className="mt-2 space-y-2">
                    {selectedProduct.alternateUnits.map((uom) => (
                      <div key={uom.code} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{uom.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {uom.code}</p>
                        </div>
                        <Badge variant={uom.isBaseUnit ? 'default' : 'secondary'}>
                          {uom.isBaseUnit ? 'Base' : `1 = ${uom.conversionFactor} ${selectedProduct.baseUnit}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Wholesale Threshold */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                  <Label className="text-xs text-muted-foreground">Wholesale Threshold Rule</Label>
                  <p className="text-sm font-medium mt-1">
                    {selectedProduct.wholesaleThreshold} {selectedProduct.baseUnit} minimum
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Warehouses with stock ≥ {selectedProduct.wholesaleThreshold} can sell retail AND wholesale
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Warehouses with stock &lt; {selectedProduct.wholesaleThreshold} can only sell retail
                  </p>
                </div>

                <Separator />

                {/* Total Stock */}
                <div>
                  <Label className="text-xs text-muted-foreground">Total Stock (All Warehouses)</Label>
                  <p className="text-2xl font-bold mt-1">
                    {selectedProduct.stock} {selectedProduct.baseUnit}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    {selectedProduct.alternateUnits
                      .filter(uom => !uom.isBaseUnit)
                      .map(uom => (
                        <div key={uom.code} className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">{uom.name}</p>
                          <p className="font-semibold">
                            {Math.floor(selectedProduct.stock / uom.conversionFactor)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <Separator />

                {/* Warehouse-Specific Stock */}
                <div>
                  <Label className="text-xs text-muted-foreground">Stock by Warehouse</Label>
                  <div className="mt-2 space-y-2">
                    {selectedProduct.warehouseStock.map((ws) => {
                      const canWholesale = ws.stockQuantity >= selectedProduct.wholesaleThreshold;

                      return (
                        <div key={ws.warehouseId} className="p-3 border rounded-md">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-medium">{ws.warehouseName}</p>
                              <p className="text-xs text-muted-foreground font-mono">{ws.warehouseId}</p>
                            </div>
                            <Badge variant={canWholesale ? 'default' : 'secondary'}>
                              {canWholesale ? 'Retail & Wholesale' : 'Retail Only'}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Stock Quantity</Label>
                              <p className="text-lg font-bold">
                                {ws.stockQuantity} {selectedProduct.baseUnit}
                              </p>
                              <div className="flex gap-2 mt-1">
                                {selectedProduct.alternateUnits
                                  .filter(uom => !uom.isBaseUnit)
                                  .map(uom => (
                                    <span key={uom.code} className="text-xs text-muted-foreground">
                                      ≈ {Math.floor(ws.stockQuantity / uom.conversionFactor)} {uom.code}
                                    </span>
                                  ))}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              <div>
                                <Label className="text-xs text-muted-foreground">Retail Price</Label>
                                <p className="text-sm font-semibold text-green-600">
                                  ${ws.retailPrice.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Wholesale Price</Label>
                                <p className="text-sm font-semibold">
                                  {ws.wholesalePrice !== null ? (
                                    <span className="text-blue-600">${ws.wholesalePrice.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">Not Available</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {!canWholesale && (
                              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
                                <p className="text-yellow-700 dark:text-yellow-500">
                                  Need {selectedProduct.wholesaleThreshold - ws.stockQuantity} more {selectedProduct.baseUnit} for wholesale
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedProduct.warehouseStock.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No warehouse stock information available
                  </div>
                )}

                {/* Variants Section */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-xs text-muted-foreground">Product Variants</Label>
                      <div className="mt-2 space-y-2">
                        {selectedProduct.variants.map((variant) => (
                          <div key={variant.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="text-sm font-medium">{variant.name}</p>
                              <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">${variant.price.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">Stock: {variant.stock}</p>
                            </div>
                          </div>
                        ))}
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
    </div>
  );
}
