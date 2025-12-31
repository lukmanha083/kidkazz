import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Download, TrendingUp, TrendingDown } from 'lucide-react';
import { accountingApi, type IncomeStatement } from '@/lib/api';

export const Route = createFileRoute('/dashboard/accounting/income-statement')({
  component: IncomeStatementPage,
});

function IncomeStatementPage() {
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });

  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [report, setReport] = useState<IncomeStatement | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    try {
      setLoading(true);
      const data = await accountingApi.reports.incomeStatement(fromDate, toDate);
      setReport(data);
    } catch (error) {
      console.error('Failed to load income statement:', error);
      alert('Failed to load income statement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    // Create CSV content
    const lines = [
      ['Income Statement'],
      [`Period: ${report.period.from} to ${report.period.to}`],
      [''],
      ['REVENUE'],
      ...report.revenue.accounts.map(a => [a.name, a.balance.toFixed(2)]),
      ['Total Revenue', report.revenue.total.toFixed(2)],
      [''],
      ['COST OF GOODS SOLD'],
      ...report.cogs.accounts.map(a => [a.name, a.balance.toFixed(2)]),
      ['Total COGS', report.cogs.total.toFixed(2)],
      [''],
      ['GROSS PROFIT', report.grossProfit.toFixed(2)],
      [''],
      ['EXPENSES'],
      ...report.expenses.accounts.map(a => [a.name, a.balance.toFixed(2)]),
      ['Total Expenses', report.expenses.total.toFixed(2)],
      [''],
      ['NET INCOME', report.netIncome.toFixed(2)],
    ];

    const csv = lines.map(l => l.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `income-statement-${fromDate}-to-${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Income Statement (P&L)</h1>
        {report && (
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Period Selection</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date *
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date *
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={loadReport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setFromDate(firstDay.toISOString().split('T')[0]);
              setToDate(today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
              setFromDate(firstDay.toISOString().split('T')[0]);
              setToDate(lastDay.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), 0, 1);
              setFromDate(firstDay.toISOString().split('T')[0]);
              setToDate(today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Year to Date
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const yearAgo = new Date(today);
              yearAgo.setFullYear(today.getFullYear() - 1);
              setFromDate(yearAgo.toISOString().split('T')[0]);
              setToDate(today.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Last 12 Months
          </button>
        </div>
      </div>

      {/* Report Display */}
      {!report ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-lg">
            Select a period and generate the report to view the Income Statement
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Report Header */}
          <div className="text-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Income Statement</h2>
            <p className="text-gray-600 mt-1">
              For the period {new Date(report.period.from).toLocaleDateString()} to{' '}
              {new Date(report.period.to).toLocaleDateString()}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Revenue</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                ${report.revenue.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="text-sm text-amber-600 font-medium">Total COGS</div>
              <div className="text-2xl font-bold text-amber-900 mt-1">
                ${report.cogs.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Gross Profit</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                ${report.grossProfit.toLocaleString()}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                {report.revenue.total > 0
                  ? `${((report.grossProfit / report.revenue.total) * 100).toFixed(1)}% margin`
                  : 'N/A'}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              report.netIncome >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className={`text-sm font-medium flex items-center gap-1 ${
                report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {report.netIncome >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                Net Income
              </div>
              <div className={`text-2xl font-bold mt-1 ${
                report.netIncome >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                ${Math.abs(report.netIncome).toLocaleString()}
                {report.netIncome < 0 && ' Loss'}
              </div>
              <div className={`text-xs mt-1 ${
                report.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {report.revenue.total > 0
                  ? `${((report.netIncome / report.revenue.total) * 100).toFixed(1)}% margin`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">
                REVENUE
              </h3>
              {report.revenue.accounts.length === 0 ? (
                <div className="text-gray-500 italic pl-4">No revenue accounts</div>
              ) : (
                <div className="space-y-2">
                  {report.revenue.accounts.map((account, index) => (
                    <div key={index} className="flex justify-between pl-4 py-1 hover:bg-gray-50">
                      <span className="text-gray-700">{account.name}</span>
                      <span className="font-medium text-gray-900">
                        ${account.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                    <span>Total Revenue</span>
                    <span>${report.revenue.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* COGS Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">
                COST OF GOODS SOLD
              </h3>
              {report.cogs.accounts.length === 0 ? (
                <div className="text-gray-500 italic pl-4">No COGS accounts</div>
              ) : (
                <div className="space-y-2">
                  {report.cogs.accounts.map((account, index) => (
                    <div key={index} className="flex justify-between pl-4 py-1 hover:bg-gray-50">
                      <span className="text-gray-700">{account.name}</span>
                      <span className="font-medium text-gray-900">
                        ${account.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                    <span>Total COGS</span>
                    <span>${report.cogs.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between font-bold text-lg py-3 bg-purple-50 px-4 rounded">
              <span>Gross Profit</span>
              <span>${report.grossProfit.toLocaleString()}</span>
            </div>

            {/* Expenses Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">
                EXPENSES
              </h3>
              {report.expenses.accounts.length === 0 ? (
                <div className="text-gray-500 italic pl-4">No expense accounts</div>
              ) : (
                <div className="space-y-2">
                  {report.expenses.accounts.map((account, index) => (
                    <div key={index} className="flex justify-between pl-4 py-1 hover:bg-gray-50">
                      <span className="text-gray-700">{account.name}</span>
                      <span className="font-medium text-gray-900">
                        ${account.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                    <span>Total Expenses</span>
                    <span>${report.expenses.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Net Income */}
            <div className={`flex justify-between font-bold text-xl py-4 px-4 rounded ${
              report.netIncome >= 0
                ? 'bg-green-100 text-green-900'
                : 'bg-red-100 text-red-900'
            }`}>
              <span>Net Income {report.netIncome < 0 ? '(Loss)' : ''}</span>
              <span>
                {report.netIncome < 0 && '('}
                ${Math.abs(report.netIncome).toLocaleString()}
                {report.netIncome < 0 && ')'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
