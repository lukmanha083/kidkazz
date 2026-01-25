import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { customerApi, employeeApi, supplierApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { ArrowRight, Building2, Loader2, TrendingUp, UserCheck, Users } from 'lucide-react';

export const Route = createFileRoute('/dashboard/business-partner/')({
  component: BusinessPartnerOverviewPage,
});

function BusinessPartnerOverviewPage() {
  // Fetch customers
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: queryKeys.customers.all,
    queryFn: () => customerApi.getAll(),
  });

  // Fetch suppliers
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: queryKeys.suppliers.all,
    queryFn: () => supplierApi.getAll(),
  });

  // Fetch employees
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: queryKeys.employees.all,
    queryFn: () => employeeApi.getAll(),
  });

  const customers = customersData?.customers || [];
  const suppliers = suppliersData?.suppliers || [];
  const employees = employeesData?.employees || [];

  const activeCustomers = customers.filter((c) => c.status === 'active').length;
  const activeSuppliers = suppliers.filter((s) => s.status === 'active').length;
  const activeEmployees = employees.filter((e) => e.employmentStatus === 'active').length;

  const retailCustomers = customers.filter((c) => c.customerType === 'retail').length;
  const wholesaleCustomers = customers.filter((c) => c.customerType === 'wholesale').length;

  const isLoading = isLoadingCustomers || isLoadingSuppliers || isLoadingEmployees;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Business Partner</h1>
        <p className="text-muted-foreground mt-1">Manage customers, suppliers, and employees</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingCustomers ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{customers.length}</div>
                <p className="text-xs text-muted-foreground">{activeCustomers} active</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSuppliers ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{suppliers.length}</div>
                <p className="text-xs text-muted-foreground">{activeSuppliers} active</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingEmployees ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">{activeEmployees} active</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Mix</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingCustomers ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {retailCustomers} / {wholesaleCustomers}
                </div>
                <p className="text-xs text-muted-foreground">Retail / Wholesale</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Customers Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customers
            </CardTitle>
            <CardDescription>Manage retail and wholesale customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{activeCustomers} Active</Badge>
              <Badge variant="secondary">{retailCustomers} Retail</Badge>
              <Badge variant="outline">{wholesaleCustomers} Wholesale</Badge>
            </div>
            <Button asChild className="w-full">
              <Link to="/dashboard/business-partner/customers">
                Manage Customers
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Suppliers Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Suppliers
            </CardTitle>
            <CardDescription>Manage product and material suppliers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{activeSuppliers} Active</Badge>
              <Badge variant="secondary">{suppliers.length - activeSuppliers} Inactive</Badge>
            </div>
            <Button asChild className="w-full">
              <Link to="/dashboard/business-partner/suppliers">
                Manage Suppliers
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Employees Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Employees
            </CardTitle>
            <CardDescription>Manage company employees and staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">{activeEmployees} Active</Badge>
              <Badge variant="secondary">
                {employees.filter((e) => e.employmentStatus === 'on_leave').length} On Leave
              </Badge>
            </div>
            <Button asChild className="w-full">
              <Link to="/dashboard/business-partner/employees">
                Manage Employees
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
