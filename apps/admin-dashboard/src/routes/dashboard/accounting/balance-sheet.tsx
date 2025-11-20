import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { accountingApi, type BalanceSheet } from '@/lib/api';

export const Route = createFileRoute('/dashboard/accounting/balance-sheet')({
  component: BalanceSheetPage,
});

function BalanceSheetPage() {
  const [asOfDate, setAsOfDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [report, setReport] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    if (!asOfDate) {
      alert('Please select a date');
      return;
    }

    try {
      setLoading(true);
      const data = await accountingApi.reports.balanceSheet(asOfDate);
      setReport(data);
    } catch (error) {
      console.error('Failed to load balance sheet:', error);
      alert('Failed to load balance sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report) return;

    // Create CSV content
    const lines = [
      ['Balance Sheet'],
      [`As of ${report.asOf}`],
      [''],
      ['ASSETS'],
      ...report.assets.accounts.map(a => [a.name, a.balance.toFixed(2)]),
      ['Total Assets', report.assets.total.toFixed(2)],
      [''],
      ['LIABILITIES'],
      ...report.liabilities.accounts.map(a => [a.name, a.balance.toFixed(2)]),
      ['Total Liabilities', report.liabilities.total.toFixed(2)],
      [''],
      ['EQUITY'],
      ...report.equity.accounts.map(a => [a.name, a.balance.toFixed(2)]),
      ['Total Equity', report.equity.total.toFixed(2)],
      [''],
      ['TOTAL LIABILITIES & EQUITY', report.totalLiabilitiesAndEquity.toFixed(2)],
      [''],
      ['Balance Check', report.isBalanced ? 'BALANCED' : 'NOT BALANCED'],
    ];

    const csv = lines.map(l => l.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Balance Sheet</h1>
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

      {/* Date Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">As Of Date</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Date *
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
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
            onClick={() => setAsOfDate(new Date().toISOString().split('T')[0])}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => {
              const lastMonth = new Date();
              lastMonth.setMonth(lastMonth.getMonth() - 1);
              lastMonth.setDate(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate());
              setAsOfDate(lastMonth.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            End of Last Month
          </button>
          <button
            onClick={() => {
              const lastYear = new Date();
              lastYear.setFullYear(lastYear.getFullYear() - 1);
              lastYear.setMonth(11);
              lastYear.setDate(31);
              setAsOfDate(lastYear.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            End of Last Year
          </button>
          <button
            onClick={() => {
              const yearEnd = new Date();
              yearEnd.setMonth(11);
              yearEnd.setDate(31);
              setAsOfDate(yearEnd.toISOString().split('T')[0]);
            }}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            End of This Year
          </button>
        </div>
      </div>

      {/* Report Display */}
      {!report ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-lg">
            Select a date and generate the report to view the Balance Sheet
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Report Header */}
          <div className="text-center mb-6 pb-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
            <p className="text-gray-600 mt-1">
              As of {new Date(report.asOf).toLocaleDateString()}
            </p>
          </div>

          {/* Balance Check Alert */}
          <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${
            report.isBalanced
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            {report.isBalanced ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Balance sheet is balanced: Assets = Liabilities + Equity
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  Warning: Balance sheet is not balanced! Assets ≠ Liabilities + Equity
                </span>
              </>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium">Total Assets</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                ${report.assets.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="text-sm text-amber-600 font-medium">Total Liabilities</div>
              <div className="text-2xl font-bold text-amber-900 mt-1">
                ${report.liabilities.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium">Total Equity</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                ${report.equity.total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Detailed Report */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">
                ASSETS
              </h3>
              {report.assets.accounts.length === 0 ? (
                <div className="text-gray-500 italic pl-4">No asset accounts</div>
              ) : (
                <div className="space-y-2">
                  {report.assets.accounts.map((account, index) => (
                    <div key={index} className="flex justify-between pl-4 py-1 hover:bg-gray-50">
                      <span className="text-gray-700">{account.name}</span>
                      <span className="font-medium text-gray-900">
                        ${account.balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-3 mt-3 border-t-2 border-gray-300">
                    <span>Total Assets</span>
                    <span>${report.assets.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Liabilities & Equity Section */}
            <div className="space-y-6">
              {/* Liabilities */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">
                  LIABILITIES
                </h3>
                {report.liabilities.accounts.length === 0 ? (
                  <div className="text-gray-500 italic pl-4">No liability accounts</div>
                ) : (
                  <div className="space-y-2">
                    {report.liabilities.accounts.map((account, index) => (
                      <div key={index} className="flex justify-between pl-4 py-1 hover:bg-gray-50">
                        <span className="text-gray-700">{account.name}</span>
                        <span className="font-medium text-gray-900">
                          ${account.balance.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                      <span>Total Liabilities</span>
                      <span>${report.liabilities.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Equity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-300">
                  EQUITY
                </h3>
                {report.equity.accounts.length === 0 ? (
                  <div className="text-gray-500 italic pl-4">No equity accounts</div>
                ) : (
                  <div className="space-y-2">
                    {report.equity.accounts.map((account, index) => (
                      <div key={index} className="flex justify-between pl-4 py-1 hover:bg-gray-50">
                        <span className="text-gray-700">{account.name}</span>
                        <span className="font-medium text-gray-900">
                          ${account.balance.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold pt-2 border-t border-gray-200">
                      <span>Total Equity</span>
                      <span>${report.equity.total.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Liabilities & Equity */}
              <div className="flex justify-between font-bold pt-3 border-t-2 border-gray-300">
                <span>Total Liabilities & Equity</span>
                <span>${report.totalLiabilitiesAndEquity.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Accounting Equation */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Accounting Equation</h4>
              <div className="flex items-center justify-center gap-4 text-lg">
                <span className="font-medium">
                  Assets: ${report.assets.total.toLocaleString()}
                </span>
                <span className="text-gray-400">=</span>
                <span className="font-medium">
                  Liabilities: ${report.liabilities.total.toLocaleString()}
                </span>
                <span className="text-gray-400">+</span>
                <span className="font-medium">
                  Equity: ${report.equity.total.toLocaleString()}
                </span>
              </div>
              {!report.isBalanced && (
                <div className="text-center text-red-600 mt-2 text-sm">
                  Difference: ${Math.abs(report.assets.total - report.totalLiabilitiesAndEquity).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
