import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { DashboardStats } from '@/components/DashboardStats';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

async function fetchDashboardStats() {
  const response = await fetch('http://localhost:8787/api/admin/dashboard/stats');
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return response.json();
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading dashboard</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your wholesale platform
        </p>
      </div>

      <DashboardStats stats={data?.stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          {data?.recentOrders?.length > 0 ? (
            <div className="space-y-3">
              {data.recentOrders.map((order: any) => (
                <div key={order.id} className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{order.status}</p>
                  </div>
                  <p className="font-semibold">${order.totalAmount}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No orders yet</p>
          )}
        </div>

        {/* Low Stock Products */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
          {data?.lowStockProducts?.length > 0 ? (
            <div className="space-y-3">
              {data.lowStockProducts.map((product: any) => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-muted rounded">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <p className="text-destructive font-semibold">{product.stockQuantity} left</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">All products are well stocked</p>
          )}
        </div>
      </div>
    </div>
  );
}
