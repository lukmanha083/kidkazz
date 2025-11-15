import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, DollarSign, ShoppingCart, Package, Users } from 'lucide-react';

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
});

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: React.ElementType;
}

function StatCard({ title, value, change, isPositive, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          ) : (
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
          <span className="text-xs text-muted-foreground">from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHome() {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231.89',
      change: '+20.1%',
      isPositive: true,
      icon: DollarSign,
    },
    {
      title: 'Orders',
      value: '+2,350',
      change: '+15.3%',
      isPositive: true,
      icon: ShoppingCart,
    },
    {
      title: 'Products',
      value: '1,234',
      change: '+5.2%',
      isPositive: true,
      icon: Package,
    },
    {
      title: 'Customers',
      value: '+573',
      change: '-3.1%',
      isPositive: false,
      icon: Users,
    },
  ];

  const recentOrders = [
    { id: 'ORD-001', customer: 'John Doe', product: 'Baby Bottle Set', amount: '$29.99', status: 'Completed' },
    { id: 'ORD-002', customer: 'Jane Smith', product: 'Kids Backpack', amount: '$45.00', status: 'Processing' },
    { id: 'ORD-003', customer: 'Bob Johnson', product: 'Toy Car Collection', amount: '$89.99', status: 'Completed' },
    { id: 'ORD-004', customer: 'Alice Brown', product: 'Children Books', amount: '$34.50', status: 'Pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's an overview of your store performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>You have {recentOrders.length} new orders today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.customer}</p>
                    <p className="text-xs text-muted-foreground">{order.product}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-bold">{order.amount}</p>
                    <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                      order.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      order.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <CardDescription>Best selling products this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Baby Bottle Set</p>
                  <p className="text-xs text-muted-foreground">245 sold</p>
                </div>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-black h-2 rounded-full" style={{ width: '95%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Kids Backpack</p>
                  <p className="text-xs text-muted-foreground">189 sold</p>
                </div>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-black h-2 rounded-full" style={{ width: '73%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Toy Car Collection</p>
                  <p className="text-xs text-muted-foreground">156 sold</p>
                </div>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-black h-2 rounded-full" style={{ width: '60%' }} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Children Books</p>
                  <p className="text-xs text-muted-foreground">134 sold</p>
                </div>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className="bg-black h-2 rounded-full" style={{ width: '52%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used actions for your convenience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted transition-colors">
              <Package className="h-8 w-8" />
              <span className="text-sm font-medium">Add Product</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted transition-colors">
              <ShoppingCart className="h-8 w-8" />
              <span className="text-sm font-medium">View Orders</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted transition-colors">
              <Users className="h-8 w-8" />
              <span className="text-sm font-medium">Manage Users</span>
            </button>
            <button className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-muted transition-colors">
              <DollarSign className="h-8 w-8" />
              <span className="text-sm font-medium">View Reports</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
