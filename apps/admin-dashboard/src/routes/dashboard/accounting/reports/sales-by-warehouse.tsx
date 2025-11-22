import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Download, Warehouse, TrendingUp, ShoppingCart } from 'lucide-react';
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

export const Route = createFileRoute('/dashboard/accounting/reports/sales-by-warehouse')({
  component: SalesByWarehousePage,
});

interface WarehouseSalesData {
  warehouse_id: string;
  total_sales: number;
  transaction_count: number;
  avg_transaction_value: number;
}

interface ReportSummary {
  totalWarehouses: number;
  totalSales: number;
  totalTransactions: number;
}

function SalesByWarehousePage() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });

  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [data, setData] = useState<WarehouseSalesData[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);

      // Call accounting service API
      const params = new URLSearchParams();
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);

      const response = await fetch(
        `http://localhost:8794/api/reports/sales-by-warehouse?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const result = await response.json();
      setData(result.data || []);
      setSummary(result.summary || null);
    } catch (error) {
      console.error('Failed to load sales by warehouse:', error);
      alert('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;

    // Create CSV content
    const lines = [
      ['Sales by Warehouse Report'],
      [`Period: ${fromDate} to ${toDate}`],
      [''],
      ['Warehouse ID', 'Total Sales', 'Transaction Count', 'Avg Transaction Value'],
      ...data.map(row => [
        row.warehouse_id || 'Unknown',
        row.total_sales.toFixed(2),
        row.transaction_count.toString(),
        row.avg_transaction_value.toFixed(2),
      ]),
      [''],
      ['Summary'],
      ['Total Warehouses', summary?.totalWarehouses.toString() || '0'],
      ['Total Sales', summary?.totalSales.toFixed(2) || '0.00'],
      ['Total Transactions', summary?.totalTransactions.toString() || '0'],
    ];

    const csv = lines.map(l => l.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-by-warehouse-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales by Warehouse</h1>
          <p className="text-muted-foreground mt-1">Track sales performance by warehouse location</p>
        </div>
        {data.length > 0 && (
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Date Range Selector */}
      <Card className="bg-gradient-to-br from-white to-blue-50/30">
        <CardHeader>
          <CardTitle>Period Selection</CardTitle>
          <CardDescription>Select the date range for the sales report</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={loadReport}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-white to-blue-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Warehouses</p>
                  <p className="text-3xl font-bold mt-1">
                    {summary.totalWarehouses}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Warehouse className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-3xl font-bold mt-1">
                    Rp {summary.totalSales.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white to-purple-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-3xl font-bold mt-1">
                    {summary.totalTransactions.toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Data */}
      {loading ? (
        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardContent className="py-12 text-center">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading report data...</p>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardContent className="py-12 text-center">
            <Warehouse className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No data available for the selected period</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting the date range or check if there are any sales transactions</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-white to-gray-50/50">
          <CardHeader>
            <CardTitle>Warehouse Sales Details</CardTitle>
            <CardDescription>Detailed breakdown of sales by warehouse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse ID</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Avg Transaction</TableHead>
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {row.warehouse_id || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        Rp {row.total_sales.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.transaction_count.toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        Rp {row.avg_transaction_value.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {summary ? ((row.total_sales / summary.totalSales) * 100).toFixed(1) : '0.0'}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
