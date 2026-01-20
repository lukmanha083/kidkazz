import { type ChartOfAccount, type LedgerTransaction, accountingApi } from '@/lib/api';
import { createFileRoute } from '@tanstack/react-router';
import { Download, Filter } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export const Route = createFileRoute('/dashboard/accounting/general-ledger')({
  component: GeneralLedgerPage,
});

function GeneralLedgerPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [closingBalance, setClosingBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  // Date filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadAccounts = useCallback(async () => {
    try {
      const data = await accountingApi.accounts.getActive();
      setAccounts(data.accounts.filter((a) => a.isDetailAccount));
    } catch (error) {
      console.error('Failed to load accounts:', error);
      alert('Failed to load accounts. Please try again.');
    }
  }, []);

  const loadLedger = useCallback(async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      const params: { from?: string; to?: string } = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const data = await accountingApi.getLedger(selectedAccountId, params);
      setSelectedAccount(data.account);
      setTransactions(data.transactions);
      setClosingBalance(data.closingBalance);
    } catch (error) {
      console.error('Failed to load ledger:', error);
      alert('Failed to load ledger. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, fromDate, toDate]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger();
    }
  }, [selectedAccountId, loadLedger]);

  const handleExport = () => {
    if (!selectedAccount || transactions.length === 0) return;

    // Create CSV content
    const headers = [
      'Date',
      'Entry Number',
      'Description',
      'Reference',
      'Debit',
      'Credit',
      'Balance',
    ];
    const rows = transactions.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.entryNumber,
      t.description || '',
      t.reference || '',
      t.direction === 'Debit' ? t.amount.toFixed(2) : '',
      t.direction === 'Credit' ? t.amount.toFixed(2) : '',
      t.balance.toFixed(2),
    ]);

    const csv = [
      [`General Ledger - ${selectedAccount.code} ${selectedAccount.name}`],
      [`Period: ${fromDate || 'Beginning'} to ${toDate || 'Present'}`],
      [''],
      headers.join(','),
      ...rows.map((r) => r.join(',')),
      [''],
      ['Closing Balance', '', '', '', '', '', closingBalance.toFixed(2)],
    ].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${selectedAccount.code}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">General Ledger</h1>
        {transactions.length > 0 && (
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label
              htmlFor="account-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Account *
            </label>
            <select
              id="account-select"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select an account...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Ledger Display */}
      {!selectedAccountId ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 text-lg">Please select an account to view its ledger</div>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-500">Loading ledger...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Account Header */}
          {selectedAccount && (
            <div className="mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedAccount.code} - {selectedAccount.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm">
                <div>
                  <span className="text-gray-500">Account Type:</span>
                  <div className="font-medium">{selectedAccount.accountType}</div>
                </div>
                <div>
                  <span className="text-gray-500">Normal Balance:</span>
                  <div className="font-medium">{selectedAccount.normalBalance}</div>
                </div>
                <div>
                  <span className="text-gray-500">Currency:</span>
                  <div className="font-medium">{selectedAccount.currency}</div>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <div className="font-medium">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        selectedAccount.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {selectedAccount.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Table */}
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No transactions found for this account in the selected period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.journalEntryId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        <a
                          href={`/dashboard/accounting/journal-entry?id=${transaction.journalEntryId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {transaction.entryNumber}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{transaction.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {transaction.reference || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {transaction.direction === 'Debit'
                          ? `$${transaction.amount.toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {transaction.direction === 'Credit'
                          ? `$${transaction.amount.toFixed(2)}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                        ${transaction.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-right font-semibold text-gray-900">
                      Closing Balance:
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ${closingBalance.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
