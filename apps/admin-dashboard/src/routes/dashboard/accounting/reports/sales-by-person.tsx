import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Download, Users, TrendingUp, ShoppingCart, Tag } from 'lucide-react';

export const Route = createFileRoute('/dashboard/accounting/reports/sales-by-person')({
  component: SalesByPersonPage,
});

interface SalesPersonData {
  sales_person_id: string;
  sales_channel: string;
  total_sales: number;
  transaction_count: number;
  avg_transaction_value: number;
}

interface ReportSummary {
  totalSalesPeople: number;
  totalSales: number;
  totalTransactions: number;
}

function SalesByPersonPage() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });

  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [data, setData] = useState<SalesPersonData[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Group data by sales person
  const groupedData = data.reduce((acc, row) => {
    if (!acc[row.sales_person_id]) {
      acc[row.sales_person_id] = {
        sales_person_id: row.sales_person_id,
        total_sales: 0,
        transaction_count: 0,
        channels: [],
      };
    }
    acc[row.sales_person_id].total_sales += row.total_sales;
    acc[row.sales_person_id].transaction_count += row.transaction_count;
    acc[row.sales_person_id].channels.push({
      channel: row.sales_channel,
      sales: row.total_sales,
      count: row.transaction_count,
    });
    return acc;
  }, {} as Record<string, any>);

  const loadReport = async () => {
    try {
      setLoading(true);

      // Call accounting service API
      const params = new URLSearchParams();
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);

      const response = await fetch(
        `http://localhost:8794/api/reports/sales-by-person?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const result = await response.json();
      setData(result.data || []);
      setSummary(result.summary || null);
    } catch (error) {
      console.error('Failed to load sales by person:', error);
      alert('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data.length) return;

    // Create CSV content
    const lines = [
      ['Sales by Person Report (Commission)'],
      [`Period: ${fromDate} to ${toDate}`],
      [''],
      ['Sales Person ID', 'Sales Channel', 'Total Sales', 'Transaction Count', 'Avg Transaction Value'],
      ...data.map(row => [
        row.sales_person_id || 'Unknown',
        row.sales_channel || 'Unknown',
        row.total_sales.toFixed(2),
        row.transaction_count.toString(),
        row.avg_transaction_value.toFixed(2),
      ]),
      [''],
      ['Summary'],
      ['Total Sales People', summary?.totalSalesPeople.toString() || '0'],
      ['Total Sales', summary?.totalSales.toFixed(2) || '0.00'],
      ['Total Transactions', summary?.totalTransactions.toString() || '0'],
    ];

    const csv = lines.map(l => l.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-by-person-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const channelColors: Record<string, string> = {
    POS: 'bg-blue-100 text-blue-800',
    Wholesale: 'bg-green-100 text-green-800',
    Online: 'bg-purple-100 text-purple-800',
    B2B: 'bg-amber-100 text-amber-800',
    Marketplace: 'bg-pink-100 text-pink-800',
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales by Person (Commission Report)</h1>
          <p className="text-gray-600 mt-1">Track sales performance by sales person and channel</p>
        </div>
        {data.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Date Range Selector */}
      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Period Selection</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales People</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {summary.totalSalesPeople}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-green-50/50 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  Rp {summary.totalSales.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white to-purple-50/50 rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {summary.totalTransactions.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Data */}
      {loading ? (
        <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading report data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">No data available for the selected period</p>
          <p className="text-sm text-gray-500 mt-2">Try adjusting the date range or check if there are any sales transactions</p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Sales Person Performance Details</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {Object.values(groupedData).map((person: any, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{person.sales_person_id}</h3>
                      <p className="text-sm text-gray-500">
                        {person.transaction_count} transactions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {person.total_sales.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {summary ? ((person.total_sales / summary.totalSales) * 100).toFixed(1) : '0.0'}% of total
                    </p>
                  </div>
                </div>

                {/* Channel Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {person.channels.map((channel: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${channelColors[channel.channel] || 'bg-gray-100 text-gray-800'}`}>
                          <Tag className="h-3 w-3 mr-1" />
                          {channel.channel}
                        </span>
                        <span className="text-xs text-gray-500">{channel.count} txn</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        Rp {channel.sales.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
