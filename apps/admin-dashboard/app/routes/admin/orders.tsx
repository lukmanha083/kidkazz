import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const Route = createFileRoute('/admin/orders')({
  component: OrdersPage,
});

async function fetchOrders() {
  const response = await fetch('http://localhost:8787/api/admin/orders');
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

function OrdersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading orders...</div>;
  }

  if (error) {
    return <div className="text-destructive">Error loading orders</div>;
  }

  const getOrderStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'shipped':
        return 'info';
      case 'processing':
        return 'warning';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orders</h1>
        <p className="text-muted-foreground">Manage customer orders</p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.orders?.length > 0 ? (
              data.orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{new Date(order.orderDate * 1000).toLocaleDateString()}</TableCell>
                  <TableCell>{order.buyerId}</TableCell>
                  <TableCell className="font-semibold">${order.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(order.paymentStatus)}>
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
