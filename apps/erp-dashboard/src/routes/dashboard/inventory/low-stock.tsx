import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Package, Warehouse } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { inventoryApi, warehouseApi, productApi } from '@/lib/api';
import { lowStockSearchSchema } from '@/lib/route-search-schemas';
import { queryKeys } from '@/lib/query-client';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table/data-table-column-header';

/**
 * Low Stock Report Route
 *
 * Features:
 * - Zod-validated search params
 * - Route loader for data prefetching
 * - TanStack Table integration
 */
export const Route = createFileRoute('/dashboard/inventory/low-stock')({
  validateSearch: lowStockSearchSchema,

  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: queryKeys.inventory.all,
        queryFn: () => inventoryApi.getAll(),
      }),
      queryClient.ensureQueryData({
        queryKey: queryKeys.warehouses.all,
        queryFn: () => warehouseApi.getAll(),
      }),
      queryClient.ensureQueryData({
        queryKey: queryKeys.products.all,
        queryFn: () => productApi.getAll(),
      }),
    ]);
  },

  component: LowStockPage,
});

interface LowStockItem {
  productId: string;
  productName: string;
  productSKU: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  minimumStock: number;
  deficit: number;
  price: number;
}

// Rupiah currency formatter
const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Column definitions for the low stock table
const lowStockColumns: ColumnDef<LowStockItem>[] = [
  {
    accessorKey: 'productName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Product" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('productName')}</span>
    ),
  },
  {
    accessorKey: 'productSKU',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="SKU" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.getValue('productSKU')}</span>
    ),
  },
  {
    accessorKey: 'warehouseName',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Warehouse" />
    ),
    cell: ({ row }) => row.getValue('warehouseName'),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: 'currentStock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Current Stock" />
    ),
    cell: ({ row }) => (
      <Badge variant="destructive" className="font-mono">
        {row.getValue('currentStock')}
      </Badge>
    ),
  },
  {
    accessorKey: 'minimumStock',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Min Stock" />
    ),
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {row.getValue('minimumStock')}
      </span>
    ),
  },
  {
    accessorKey: 'deficit',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Deficit" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="font-mono text-orange-600 border-orange-300">
        -{row.getValue('deficit')}
      </Badge>
    ),
  },
  {
    accessorKey: 'price',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Unit Price" />
    ),
    cell: ({ row }) => formatRupiah(row.getValue('price')),
  },
];

/**
 * Renders the Low Stock Report page showing products that are below their minimum stock levels.
 *
 * Displays a loading state while inventory, product, and warehouse data are being fetched. Once loaded,
 * shows summary metrics (total low stock items, total deficit, affected warehouses) and a table of low-stock
 * items with search and warehouse filtering. If no items are low, displays an empty-state message.
 *
 * @returns The page's JSX element containing the report UI.
 */
function LowStockPage() {
  // Fetch inventory data using centralized query keys
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: queryKeys.inventory.all,
    queryFn: () => inventoryApi.getAll(),
  });

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: queryKeys.warehouses.all,
    queryFn: () => warehouseApi.getAll(),
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.all,
    queryFn: () => productApi.getAll(),
  });

  const inventory = inventoryData?.inventory || [];
  const warehouses = warehousesData?.warehouses || [];
  const products = productsData?.products || [];

  const isLoading = inventoryLoading || warehousesLoading || productsLoading;

  // Calculate low stock items
  const lowStockItems = useMemo((): LowStockItem[] => {
    return inventory
      .filter(inv => inv.quantityAvailable < inv.minimumStock)
      .map(inv => {
        const product = products.find(p => p.id === inv.productId);
        const warehouse = warehouses.find(w => w.id === inv.warehouseId);

        return {
          productId: inv.productId,
          productName: product?.name || 'Unknown Product',
          productSKU: product?.sku || '-',
          warehouseId: inv.warehouseId,
          warehouseName: warehouse?.name || 'Unknown Warehouse',
          currentStock: inv.quantityAvailable,
          minimumStock: inv.minimumStock,
          deficit: inv.minimumStock - inv.quantityAvailable,
          price: product?.price || 0,
        };
      });
  }, [inventory, products, warehouses]);

  // Calculate summary stats
  const totalLowStockItems = lowStockItems.length;
  const totalDeficit = lowStockItems.reduce((sum, item) => sum + item.deficit, 0);
  const affectedWarehouses = new Set(lowStockItems.map(item => item.warehouseId)).size;

  // Warehouse filter options
  const warehouseFilterOptions = useMemo(() => {
    const uniqueWarehouses = Array.from(new Set(lowStockItems.map(item => item.warehouseName)));
    return uniqueWarehouses.map(name => ({
      label: name,
      value: name,
    }));
  }, [lowStockItems]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Low Stock Report</h1>
            <p className="text-muted-foreground mt-1">
              Products below minimum stock levels
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Low Stock Report</h1>
          <p className="text-muted-foreground mt-1">
            Products below minimum stock levels by warehouse
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Products below minimum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deficit</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeficit}</div>
            <p className="text-xs text-muted-foreground">
              Units needed to reach minimum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Affected Warehouses</CardTitle>
            <Warehouse className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affectedWarehouses}</div>
            <p className="text-xs text-muted-foreground">
              Warehouses with low stock
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>
            View and manage products that are below their minimum stock levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No low stock items</p>
              <p className="text-sm text-muted-foreground mt-2">
                All products are above minimum stock levels
              </p>
            </div>
          ) : (
            <DataTable
              columns={lowStockColumns}
              data={lowStockItems}
              searchKey="productName"
              searchPlaceholder="Search by product name..."
              filterableColumns={[
                {
                  id: 'warehouseName',
                  title: 'Warehouse',
                  options: warehouseFilterOptions,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}