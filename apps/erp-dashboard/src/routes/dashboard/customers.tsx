import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/customers')({
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-1">
          Manage your customer base
        </p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">Customer management coming soon...</p>
      </div>
    </div>
  );
}
